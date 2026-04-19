# Arcane MCP Server

MCP server for Docker management via the Arcane platform. 180 tools, 2 resources, 4 prompts, companion skill, Claude Code plugin.

**Not affiliated with the Arcane project.**

## Build & Test

```bash
npm install
npm run build          # TypeScript → dist/
npm test               # vitest (50 tests)
npm run dev            # stdio mode
npm run dev:tcp        # HTTP mode
npm run update-api-spec  # Refresh OpenAPI spec from live instance
```

## Architecture

- `src/index.ts` — stdio entry point (default)
- `src/tcp-server.ts` — HTTP/Streamable transport (--tcp flag)
- `src/server.ts` — McpServer factory, wires tools + resources + prompts
- `src/client/arcane-client.ts` — HTTP client with retry, SSL bypass, size limits
- `src/auth/auth-manager.ts` — JWT (auto-refresh) + API key auth
- `src/config.ts` — Config from env vars > config file > defaults
- `src/constants.ts` — All shared constants (timeouts, limits, versions)

### Tools (180 across 25 modules in `src/tools/`)

All tools use `server.registerTool()` with:
- `title` — human-readable name
- `description` — what it does and returns
- `annotations` — `readOnlyHint`, `destructiveHint`, `idempotentHint`, `openWorldHint`
- `inputSchema` — Zod schemas with `.describe()` on every param
- `toolHandler()` wrapper from `src/utils/tool-helpers.ts` — handles client init, error formatting, `isError: true` on failures

### Adding a new tool

1. Find or create the tool module in `src/tools/`
2. Use `server.registerTool()` with the config object pattern (not deprecated `server.tool()`)
3. Classify annotations: list/get = readOnly, delete/prune = destructive, external calls = openWorld
4. Use `toolHandler()` wrapper — return a plain string, it handles the MCP response envelope
5. Register in `src/tools/index.ts`
6. Verify: `npm run build && grep -rc 'register("arcane_' dist/tools/*.js | awk -F: '{sum+=$2} END {print sum}'` (expect 180)

### Resources & Prompts

- `src/resources/index.ts` — 3 resources (`arcane://environments`, `arcane://version`, `arcane://tools-config-notice`)
- `src/prompts/index.ts` — 5 prompts (deploy-stack, troubleshoot-container, security-audit, cleanup-environment, arcane_configure_tools)
- Prompts reference real tool names — cross-check if adding/renaming tools

### Tool filtering

- `src/tools/registry.ts` — `ToolRegistry` captures `RegisteredTool` handles from each module; `applyFilter()` disables tools outside the resolved enabled-set, `diffAndApply()` handles hot reload
- `src/tools/presets.ts` — declarative presets (`commonly-used`, `read-only`, `minimal`, `deploy`, `full`, `custom`) + `resolveEnabled(config, registry)` (preset → modules → enabled → disabled)
- `src/utils/config-watcher.ts` — debounced `fs.watch` on `~/.arcane/config.json`; calls `registry.diffAndApply()` on change
- `src/config.ts` — `ToolsConfig` field plus env vars: `ARCANE_TOOL_PRESET`, `ARCANE_ENABLED_MODULES`, `ARCANE_ENABLED_TOOLS`, `ARCANE_DISABLED_TOOLS`
- `commands/configure.md` — plugin slash command `/arcane:configure` walks users through preset + module + per-tool selection
- Unconfigured installs fall back to `full` (backwards-compatible); `arcane://tools-config-notice` resource flags the setup until a `tools` key is written

## Key Conventions

- Tool names: `arcane_{resource}_{action}` (e.g., `arcane_container_list`)
- Environment-scoped endpoints: `/environments/{id}/...`
- Global endpoints (no envId): container-registries, git-repositories, templates, users, settings
- Pagination params: `search`, `sort`, `order`, `start` (default 0), `limit` (default 20)
- Path params with file access: must pass through `validatePath()` from `src/utils/format.ts`
- Size formatting: use `formatSize()` / `formatSizeCompact()` from `src/utils/format.ts`, not inline math
- Constants: all in `src/constants.ts`, never hardcode timeouts/limits/magic numbers

## Plugin Structure

```
.claude-plugin/plugin.json    # Plugin manifest
.claude-plugin/marketplace.json  # Marketplace catalog
.mcp.json                     # MCP server auto-config
skills/arcane-mcp-server/SKILL.md  # Companion skill
```

## Tests

Tests in `src/**/__tests__/*.test.ts`. Run with `npm test`.

Current coverage: tool-helpers, format utilities, error-handler, config.

## Audit

- `_docs/AUDIT_PROMPT.md` — drop into Claude Code to run a full 13-category audit
- `_docs/AUDIT_REPORT_v2.md` — latest audit results
