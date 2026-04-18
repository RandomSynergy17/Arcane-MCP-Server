# Tool Filtering Design — Arcane MCP Server

**Date:** 2026-04-14
**Status:** Approved, ready for implementation planning

## Context

Arcane MCP Server registers all 180 tools (across 25 modules) unconditionally at startup. Every tool's schema and description is sent to the client on `tools/list`, which bloats the LLM's context window — even when the user only cares about a fraction of them. We need to let users trim the active tool set to what they actually use, and change that set on the fly without rebuilding or reconfiguring from scratch.

**Goals:**
- Reduce context bloat by letting users filter which tools the MCP server exposes.
- Support three entry points: installer (first run), slash command (`/arcane:configure`), and an MCP prompt (`arcane_configure_tools`) for non-Claude-Code clients.
- Reload changes hot when feasible; fall back to "reconnect MCP" otherwise.
- Do not break existing installs on upgrade.

**Non-goals:**
- Per-environment tool filtering (e.g., "different tools for prod vs staging").
- Role-based access control on tools.
- Server-side authorization of who can flip the config.

## Architecture — "register-all, then filter"

Register all 180 tools at startup as today, but capture the `RegisteredTool` handles returned by `server.registerTool()` into a central `ToolRegistry`. Immediately after registration, walk the registry and call `.disable()` on anything outside the resolved enabled-set. The SDK automatically filters disabled tools out of `tools/list` and emits `notifications/tools/list_changed` — so Claude Code only ever sees the enabled subset.

**Why this over filtering-at-registration:**
- Mechanical, minimal refactor of the 25 tool modules (each `registerXTools()` just captures return values).
- Hot reload reduces to diff-and-call-`.enable()/.disable()`. SDK handles notifications.
- 180 handler closures in memory is negligible.
- Works identically in stdio + HTTP modes since both share `_registeredTools`.

**SDK capabilities validated** (see `node_modules/@modelcontextprotocol/sdk/dist/esm/server/mcp.d.ts:266-290` and `mcp.js:68-69, 618-646`):
- `registerTool()` returns `{ enable(), disable(), update(), remove(), enabled }`.
- `tools/list` handler filters on `tool.enabled`.
- `.enable()/.disable()/.update()` auto-emits `sendToolListChanged()` if connected.

## Config schema

Extend `ArcaneConfig` in [src/config.ts](../../src/config.ts):

```ts
interface ToolsConfig {
  preset?: "commonly-used" | "read-only" | "minimal" | "deploy" | "full" | "custom";
  modules?: string[];   // allowlist of module names
  enabled?: string[];   // per-tool overrides: additions
  disabled?: string[];  // per-tool overrides: subtractions
}

interface ArcaneConfig {
  // ...existing fields...
  tools?: ToolsConfig;
}
```

**Resolution order** (applied in `resolveEnabledTools(config, registry)`):
1. Start from `preset` expansion (or `full` if preset is absent and config is fresh; see "Upgrade behavior" below).
2. If `modules` is set, intersect with the union of those modules' tools.
3. Add anything in `enabled`.
4. Subtract anything in `disabled`.
5. Result = enabled-set.

**Sources** (existing priority preserved): env vars > `~/.arcane/config.json` > defaults.

New env vars:
- `ARCANE_TOOL_PRESET` — e.g., `commonly-used`
- `ARCANE_ENABLED_MODULES` — comma-separated module names
- `ARCANE_ENABLED_TOOLS` — comma-separated tool names
- `ARCANE_DISABLED_TOOLS` — comma-separated tool names

## Presets

Declarative data in a new [src/tools/presets.ts](../../src/tools/presets.ts). Editing presets = editing one file.

| Preset | Contents | Rough tool count | Intended user |
|---|---|---|---|
| `commonly-used` | dashboard, container, image, project (stacks), volume, network, environment, system | ~60–70 | Default for new installs — "I want to manage Docker" |
| `read-only` | every `*_list`, `*_get`, `*_inspect`, `*_stats` across all modules | ~60 | Status / observability assistants |
| `minimal` | dashboard + container list/logs/stats only | ~10 | Smallest viable footprint |
| `deploy` | project, gitops, template, registry, environment, build | ~40 | CI / deploy assistants |
| `full` | all 180 | 180 | Today's behavior; also the upgrade fallback |
| `custom` | implied when user has manually edited `modules`/`enabled`/`disabled` | variable | Power users |

## Entry points

### 1. Slash command `/arcane:configure` (Claude Code)

Ships as `commands/configure.md` inside the plugin. Uses `AskUserQuestion` to walk the user through:

1. **Preset picker** — single-select from the 6 presets.
2. **If `custom` or "fine-tune"** — module picker, multiSelect across the 25 modules, pre-checked to current selection.
3. **Per-tool step** — "Want to fine-tune individual tools? (yes/no)". If yes, iterate selected modules *one at a time*, showing a multiSelect of that module's tools so `AskUserQuestion` never exceeds ~10 options at a time.
4. Write resolved config to `~/.arcane/config.json` (preserve existing non-`tools` keys).
5. Touch config file mtime. If the hot-reload watcher picks it up, print "✓ tools refreshed". If the client doesn't observe `list_changed` within ~2s, print fallback: "Please run `/mcp` to reconnect the arcane server."

### 2. Interactive installer (first run)

Extend [install_arcane_skill-mcp.md](../../install_arcane_skill-mcp.md) with a "Step 4: Tool selection" section after env-var collection. Same logical flow as the slash command, extracted into a shared snippet referenced by both. Default-highlight `commonly-used`. New users never see the 180-tool firehose on day one.

### 3. MCP prompt `arcane_configure_tools`

Added to [src/prompts/index.ts](../../src/prompts/index.ts). For Claude Desktop / other MCP clients without slash commands. Renders as a structured prompt that instructs the client's LLM to walk the user through preset → module → tool selection via plain chat and then write `~/.arcane/config.json`. Less polished than `AskUserQuestion` but keeps feature parity off Claude Code.

## Hot reload — hybrid

After `registerAllTools()`, [src/server.ts](../../src/server.ts) starts a debounced `fs.watch()` on `~/.arcane/config.json`. On change:

1. Re-run `loadConfig()`.
2. Compute new enabled-set.
3. Diff against the current enabled-set.
4. Call `.enable()` / `.disable()` per tool — SDK emits `list_changed` automatically.

**Fallback:** if the watcher can't attach (HTTP mode behind a proxy, env-var-only setup with no config file), we log a single warning at startup. The slash command detects this by checking a `hotReloadAvailable` flag on the registry and emits the "please reconnect" message instead of claiming success.

Debounce ~250ms to absorb editor save chatter. If `loadConfig()` throws on a malformed file, log and keep the old set live — never disable everything on a parse error.

## Upgrade behavior — one-time prompt

When the server boots with a config that has **no** `tools` key (either no config file or an older one), we treat it as "unconfigured":

1. Default preset is **`full`** (backwards-compatible — all 180 tools still enabled, existing workflows keep working).
2. A one-time startup notice is logged (stderr, visible in Claude Code's MCP log).
3. A static MCP resource `arcane://tools-config-notice` is registered, pointing the user to `/arcane:configure` with a short explanation of the context-bloat reason.
4. Once the user runs `/arcane:configure` (or any config write introduces a `tools` key), the notice resource disappears on the next reload.

Fresh installs via the interactive installer skip step 1's `full` default — they get `commonly-used` selected in the installer UI directly.

## Files to change

| File | Change |
|---|---|
| `src/tools/registry.ts` (new) | `ToolRegistry` class: `register(module, name, handle)`, `applyFilter(config)`, `diffAndApply(newConfig)`, `moduleOf(toolName)`, `hotReloadAvailable` flag. Holds `Map<string, { module, handle }>`. |
| `src/tools/presets.ts` (new) | Declarative preset definitions + `resolveEnabled(config, allTools)` helper. |
| `src/tools/*.ts` (all 25 modules) | Mechanical edit: each `registerXTools(server)` → `registerXTools(server, registry)`. Capture return values from `server.registerTool()` into `registry.register(...)`. Codemod-able. |
| [src/tools/index.ts](../../src/tools/index.ts) | `registerAllTools(server, config)` creates registry, calls each module with it, applies filter. Returns registry for reuse. |
| [src/config.ts](../../src/config.ts) | Add `tools` field + new env var parsing + preset name validation. Detect "unconfigured" state for upgrade notice. |
| [src/server.ts](../../src/server.ts) | Start debounced config file watcher, wire `registry.diffAndApply()` on change. Export registry for HTTP session reuse. Register upgrade notice resource conditionally. |
| [src/resources/index.ts](../../src/resources/index.ts) | New `arcane://tools-config-notice` resource, gated on "unconfigured" flag. |
| [src/prompts/index.ts](../../src/prompts/index.ts) | New `arcane_configure_tools` prompt. |
| `commands/configure.md` (new) | Plugin slash command `/arcane:configure`. |
| [install_arcane_skill-mcp.md](../../install_arcane_skill-mcp.md) | Add "Step 4: Tool selection" section. |
| [.claude-plugin/plugin.json](../../.claude-plugin/plugin.json) | Register the new command. |
| `src/__tests__/tool-registry.test.ts` (new) | Unit tests: preset expansion, diff resolution, modules+enabled+disabled precedence, hot reload diff. |
| `src/__tests__/presets.test.ts` (new) | Snapshot tests for each preset's resolved tool set. |

## Error handling

- **Unknown tool/module in config:** log warning, ignore (forward-compat — preset drift after downgrade shouldn't brick the server).
- **Unknown preset:** fall back to `full`, log warning, surface in the upgrade notice resource.
- **Config file parse error during hot reload:** keep current enabled-set live, log error. Never disable everything on a typo.
- **Watcher attach failure:** log once at startup, set `hotReloadAvailable = false`, slash command shows the reconnect fallback message.

## Verification / test plan

- **Unit tests:** preset expansion, config resolution order (preset → modules → enabled → disabled), diff logic for hot reload.
- **Integration test:** boot server with each preset, assert `tools/list` response size and exact tool names.
- **Hot reload test:** boot server, modify config file, assert `list_changed` notification fired and `tools/list` reflects new set within 500ms.
- **Upgrade test:** boot with old-shape config, assert notice resource present and default is `full`. Write new-shape config, assert notice resource removed on reload.
- **Manual:**
  1. Fresh install via installer → `commonly-used` preset → boot → Claude Code sees ~65 tools.
  2. Run `/arcane:configure` → switch to `minimal` → tools list shrinks live.
  3. Run `/arcane:configure` → custom module + per-tool fine-tune → specific tools toggle.
  4. Simulate "upgrade" by removing `tools` key from config → restart → notice appears → run `/arcane:configure` → notice clears.
  5. Install via Claude Desktop (no slash commands) → invoke `arcane_configure_tools` prompt → walk through conversation → config written → reconnect → filter applied.

## Open for implementation phase

- Exact tool list for `commonly-used` preset (curation pass across the 25 modules).
- Whether to ship a VS Code snippet / codemod for the 25-module `registerTool()` return-value capture, or just do it by hand.
- Whether `/arcane:configure` should show a diff ("3 tools added, 12 removed") before writing.
