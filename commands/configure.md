---
description: Configure which Arcane MCP tools are exposed to Claude
allowed-tools: [Read, Write, AskUserQuestion, Bash]
---

# /arcane:configure — Tool filter setup

Use this slash command to trim which Arcane MCP tools are exposed to Claude Code. The full server registers 180 tools; surfacing all of them in `tools/list` bloats the context window. This command writes a `tools` block to `~/.arcane/config.json` that selects a preset, module allowlist, and per-tool overrides. The Arcane MCP server picks up changes live when its config watcher is attached.

## Workflow

1. **Ask the user to pick a preset** with `AskUserQuestion`, single-select:
   - `commonly-used` — containers, images, stacks, networks, volumes, environment, system, dashboard (~65 tools) *(recommended default)*
   - `read-only` — every `*_list` / `*_get` / `*_inspect` / `*_stats` / `*_status` / `*_summary` tool (~60 tools)
   - `minimal` — dashboard + container list/logs/stats/get (~5 tools)
   - `deploy` — project, gitops, template, registry, environment, build (~40 tools)
   - `full` — all 180 tools (current default if the user has never configured this)
   - `custom` — fine-tune modules and individual tools

2. **If the user picks `custom`** (or says they want to fine-tune after picking another preset):
   - Ask which modules to enable via `AskUserQuestion` multi-select. The 25 module names:
     `auth`, `build`, `container`, `dashboard`, `environment`, `event`, `gitops`, `image`, `image-update`, `job`, `network`, `network-topology`, `notification`, `port`, `project`, `registry`, `settings`, `swarm`, `system`, `template`, `updater`, `user`, `volume`, `vulnerability`, `webhook`.
   - Optionally ask if they want per-tool adjustments. If yes, iterate module-by-module (never more than ~10 options per `AskUserQuestion` step) showing each module's tools so they can add/remove individual entries.

3. **Build the `tools` block** — only include the fields that are non-empty:
   ```json
   {
     "tools": {
       "preset": "<chosen>",
       "modules": ["<optional allowlist>"],
       "enabled": ["<optional additions>"],
       "disabled": ["<optional subtractions>"]
     }
   }
   ```

4. **Merge into `~/.arcane/config.json`**:
   - `Read` the existing file (tolerate missing — start from `{}`).
   - Preserve all existing keys (`baseUrl`, `auth`, `http`, `defaultEnvironmentId`, `timeout`, `skipSslVerify`).
   - Replace or add the `tools` field with the new block.
   - `Write` back with 2-space indent.

5. **Report to the user**:
   - If the server logged `Watching …/config.json for tool-filter changes` at startup (`tail ~/.arcane/logs/*.log` or check the server stderr if available), say: **"Config written — tool list will refresh automatically."**
   - Otherwise: **"Config written — reconnect the Arcane MCP server in your client (`/mcp` in Claude Code) for the filter to take effect."**

## Notes

- Keep the conversation tight. Do not dump the full 180-tool list — summarise the chosen preset and let the user opt into fine-tuning.
- Never remove other keys from `~/.arcane/config.json`. A malformed file will brick the server.
- For Claude Desktop and other MCP clients without slash commands, the same flow is available via the `arcane_configure_tools` prompt — this slash command is a Claude Code shortcut to the same outcome.
