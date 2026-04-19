<p align="center">
  <img src="assets/logo.svg" alt="Arcane" width="400" />
</p>

<h3 align="center">Arcane MCP Server</h3>

<p align="center">
  Manage your entire Docker infrastructure through natural language.<br/>
  180 tools. One MCP server. Zero context switching.
</p>

<p align="center">
  <a href="https://github.com/RandomSynergy17/Arcane-MCP-Server/releases"><img src="https://img.shields.io/github/v/tag/RandomSynergy17/Arcane-MCP-Server?style=flat-square&color=7c3aed&label=release" alt="Release" /></a>
  <a href="https://www.npmjs.com/package/@randomsynergy/arcane-mcp-server"><img src="https://img.shields.io/npm/v/@randomsynergy/arcane-mcp-server?style=flat-square&color=7c3aed" alt="npm" /></a>
  <a href="https://opensource.org/licenses/MIT"><img src="https://img.shields.io/badge/license-MIT-7c3aed?style=flat-square" alt="License" /></a>
  <a href="https://modelcontextprotocol.io"><img src="https://img.shields.io/badge/MCP-2025--11--25-7c3aed?style=flat-square" alt="MCP Protocol" /></a>
</p>

<p align="center">
  <a href="#getting-started">Getting Started</a> &bull;
  <a href="#tool-filtering">Tool Filtering</a> &bull;
  <a href="#what-can-it-do">What Can It Do</a> &bull;
  <a href="#the-companion-skill">Companion Skill</a> &bull;
  <a href="#all-180-tools">All Tools</a> &bull;
  <a href="install_arcane_skill-mcp.md">Interactive Installer</a>
</p>

---

> **Note:** This is an independent, community-built project. It is **not affiliated with, endorsed by, or maintained by** the [Arcane](https://github.com/getarcaneapp/arcane) project or its maintainers. We build on top of Arcane's public API.

> **Coming from Portainer?** Check out [Portainer-Offload-Arcane](https://github.com/RandomSynergy17/Portainer-Offload-Arcane) — a guided migration wizard that moves your stacks, containers, volumes, registries, and users from Portainer CE/EE into Arcane. Run it once, then come back here to manage everything via natural language.

## What is this?

Arcane MCP Server is a complete AI-powered Docker management bundle — an **MCP server**, a **Claude Code plugin**, and a **companion skill**, all in one package.

- The **MCP server** gives your AI assistant 180 tools to control your [Arcane](https://github.com/getarcaneapp/arcane) Docker platform — containers, images, stacks, Swarm clusters, security scans, and more.
- The **plugin** wraps everything into a single install with guided configuration — no manual env vars or config files.
- The **companion skill** teaches your AI *how* to use those tools — safe deployment workflows, troubleshooting patterns, and guardrails so it doesn't accidentally nuke your volumes.

Instead of clicking through dashboards and running CLI commands, you just *talk* to your infrastructure:

> "What's running on production?"
>
> "Deploy this compose file to staging."
>
> "Are any images vulnerable? Show me the critical ones."
>
> "Scale the API service to 5 replicas."

Behind the scenes, the server translates your requests into the right API calls — with safety checks, retry logic, and formatted responses that actually make sense.

---

## Why use it?

| | Without | With Arcane MCP Server |
|---|---|---|
| **Check container status** | Open dashboard, navigate to environment, filter, scroll | *"What's broken?"* |
| **Deploy a stack** | Write compose, scp to server, ssh, docker compose up | *"Deploy this compose file"* |
| **Find vulnerabilities** | Configure Trivy, run scan, parse JSON output | *"Run a security audit"* |
| **Update containers** | Check each image, pull, recreate, verify | *"Update everything"* (dry-run first, obviously) |
| **Clean up disk space** | Prune images, volumes, networks one by one | *"Clean up unused resources"* |

Every tool carries **safety annotations** so your AI knows which operations are read-only and which ones need confirmation before running. No accidental `docker system prune` moments.

---

## Getting Started

The fastest way — paste this into Claude Code:

```
Fetch and follow: https://raw.githubusercontent.com/RandomSynergy17/Arcane-MCP-Server/main/install_arcane_skill-mcp.md
```

It'll walk you through setup interactively. Or pick your preferred method below.

### npm Install

```bash
npm install -g @randomsynergy/arcane-mcp-server
```

### Claude Code Plugin *(recommended)*

```bash
/plugin marketplace add RandomSynergy17/Arcane-MCP-Server
/plugin install arcane-mcp-server
```

You'll be prompted for your Arcane URL and API key during setup. That's it — MCP server and companion skill installed together.

<details>
<summary><strong>Claude Code (manual)</strong></summary>

```bash
claude mcp add --transport stdio \
  --env ARCANE_API_KEY=your-key \
  --env ARCANE_BASE_URL=https://arcane.example.com:3552 \
  arcane -- npx @randomsynergy/arcane-mcp-server
```
</details>

<details>
<summary><strong>Claude Desktop</strong></summary>

Add to `~/.config/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "arcane": {
      "command": "npx",
      "args": ["@randomsynergy/arcane-mcp-server"],
      "env": {
        "ARCANE_BASE_URL": "https://arcane.example.com:3552",
        "ARCANE_API_KEY": "your-api-key"
      }
    }
  }
}
```
</details>

<details>
<summary><strong>HTTP / Network Mode</strong></summary>

For remote or multi-client access:

```bash
ARCANE_API_KEY=your-key npx @randomsynergy/arcane-mcp-server --tcp
```

Connect at `http://localhost:3000/mcp`. Set `ARCANE_HTTP_PORT` to change the port.
</details>

<details>
<summary><strong>Config File</strong></summary>

Create `~/.arcane/config.json`:

```json
{
  "baseUrl": "https://arcane.example.com:3552",
  "auth": { "type": "apikey", "apiKey": "your-api-key" }
}
```
</details>

### Prerequisites

You need an **Arcane instance** running (see [getarcane.app](https://getarcane.app)) and an **API key** from Settings > API Keys.

---

## Tool Filtering

Exposing all 180 tools to Claude every turn chews through your context window. Pick a **preset** to trim the active tool set — only the tools in that preset appear in `tools/list`:

| Preset | Scope | Tools |
|---|---|---|
| `commonly-used` *(recommended)* | containers, images, projects, volumes, networks | ~52 |
| `read-only` | every `*_list` / `*_get` / `*_inspect` / `*_stats` across all modules | ~60 |
| `minimal` | dashboard + container list / get / counts | 5 |
| `deploy` | projects, gitops, templates, registries, environments, build | ~40 |
| `full` *(default if never configured)* | everything | 180 |
| `custom` | your own module + per-tool picks | variable |

**Configure interactively** in Claude Code:

```
/arcane:configure
```

Walks you through picking a preset (and optional fine-tuning), shows a `+X / −Y` diff against what's currently live, and writes the selection to `~/.arcane/config.json`. The server watches that file — changes apply **live** via `notifications/tools/list_changed`, no reconnect.

**Or set it by env var:**

```bash
ARCANE_TOOL_PRESET=commonly-used
ARCANE_ENABLED_MODULES=container,image,dashboard
ARCANE_ENABLED_TOOLS=arcane_system_get_health
ARCANE_DISABLED_TOOLS=arcane_system_prune
```

Resolution order: **preset → intersect with `modules` → add `enabled` → subtract `disabled`**. Unknown names log a warning and are ignored — never silent failures, never a bricked server.

Non-Claude-Code clients can use the `arcane_configure_tools` MCP prompt for the same flow.

---

## What Can It Do?

### Containers & Compose
Deploy, start, stop, restart, redeploy, and monitor Docker containers and Compose stacks. Inspect details, check ports, toggle auto-updates — all through conversation.

### Docker Swarm
Full cluster management. Initialize clusters, join nodes, deploy services, scale replicas, view logs, and manage the entire swarm lifecycle.

### Security & Vulnerability Scanning
Scan images for CVEs, get severity breakdowns, track which images need attention, and ignore known false positives. Environment-wide security summaries in one call.

### GitOps & Deployments
Connect Git repositories, set up automated sync, and deploy directly from branches. Supports folder-level sync and auto-deploy on push.

### Image Builds & Updates
Build images from Dockerfiles or Git URLs, check all running containers for available updates, and roll out updates with dry-run support.

### Infrastructure Management
Manage volumes (browse files, create backups, restore), networks (create, inspect topology), and registries (Docker Hub, GHCR, ECR, GCR, ACR).

### Operations Dashboard
Get a consolidated snapshot of your entire environment in one call — container counts, project status, available updates, action items that need attention.

---

## The Companion Skill

The MCP server gives Claude the *tools*. The companion skill gives it the *knowledge* — how to use those tools effectively, safely, and in the right order.

**Install with the plugin** (automatic) or **manually:**

```bash
git clone --depth 1 https://github.com/RandomSynergy17/Arcane-MCP-Server.git /tmp/arcane
cp -r /tmp/arcane/skills/arcane-mcp-server ~/.claude/skills/arcane-mcp-server
rm -rf /tmp/arcane
```

### What the skill teaches Claude:

**Intent mapping** — When you say "what's broken?", Claude knows to call `arcane_dashboard_get` + `arcane_dashboard_get_action_items` instead of listing every container one by one.

**Safety guardrails** — Before running `arcane_volume_prune`, Claude will suggest `arcane_volume_backup_create` first. Before `arcane_updater_run`, it'll do a dry run. Before `arcane_project_destroy`, it confirms twice.

**Workflow chains** — Multi-step operations like "deploy → pull images → start → verify" are sequenced correctly, not fired off randomly.

**Gotchas** — Things like "`environmentId` is required on almost every call", "ECR credentials expire", and "always use `dryRun: true` before running the auto-updater" are baked in so you don't learn them the hard way.

---

## Built-in Workflow Prompts

The server includes five pre-built prompts that guide Claude through common multi-step operations:

| Prompt | What it does |
|--------|-------------|
| `/deploy-stack` | Walks through creating a project, pulling images, deploying, and verifying all services are healthy |
| `/troubleshoot-container` | Systematic diagnosis: check state, inspect config, review action items, check ports, scan for vulnerabilities |
| `/security-audit` | Full environment scan: check scanner status, get vulnerability summary, review all findings by severity, check for image updates |
| `/cleanup-environment` | Safe cleanup: survey resources, present a plan, get confirmation, then prune images, networks, and volumes in the right order |
| `arcane_configure_tools` | Walks through selecting a tool-filter preset + module / per-tool overrides and writing them to `~/.arcane/config.json` (for clients without slash commands) |

Plus four **MCP Resources** that give Claude background context:

| Resource | What it provides |
|----------|-----------------|
| `arcane://environments` | All available environments with IDs and status — so Claude can pick the right one |
| `arcane://version` | Server configuration details — base URL, default environment, protocol version |
| `arcane://tools` | JSON inventory of every tool (name, module, enabled state) — consumed by `/arcane:configure` to compute the before/after diff |
| `arcane://tools-config-notice` | Flags installs that haven't configured tool filtering yet and points them at `/arcane:configure` |

And a Claude Code slash command:

| Command | What it does |
|---------|-------------|
| `/arcane:configure` | Interactive tool-filter picker — preset, module allowlist, per-tool overrides, with a live diff before writing |

---

## All 180 Tools

### Containers (11)

| Tool | Description |
|------|-------------|
| `arcane_container_list` | List containers with filtering and pagination |
| `arcane_container_get` | Get detailed container information |
| `arcane_container_create` | Create a new container |
| `arcane_container_start` | Start a stopped container |
| `arcane_container_stop` | Stop a running container |
| `arcane_container_restart` | Restart a container |
| `arcane_container_update` | Pull latest image and recreate |
| `arcane_container_redeploy` | Redeploy a single container |
| `arcane_container_set_auto_update` | Toggle per-container auto-update |
| `arcane_container_delete` | Delete a container |
| `arcane_container_get_counts` | Get running/stopped counts |

### Docker Swarm (11)

| Tool | Description |
|------|-------------|
| `arcane_swarm_list_services` | List swarm services |
| `arcane_swarm_get_service` | Get service details and tasks |
| `arcane_swarm_create_service` | Create a swarm service |
| `arcane_swarm_update_service` | Update service configuration |
| `arcane_swarm_delete_service` | Delete a swarm service |
| `arcane_swarm_scale_service` | Scale service replicas |
| `arcane_swarm_get_service_logs` | Get service logs |
| `arcane_swarm_init_cluster` | Initialize a new swarm cluster |
| `arcane_swarm_join_cluster` | Join an existing cluster |
| `arcane_swarm_leave_cluster` | Leave the swarm cluster |
| `arcane_swarm_get_cluster_info` | Get cluster info and node counts |

### Vulnerability Scanning (12)

| Tool | Description |
|------|-------------|
| `arcane_vulnerability_scan_image` | Trigger a vulnerability scan |
| `arcane_vulnerability_get_scan_result` | Get full scan result |
| `arcane_vulnerability_get_scan_summary` | Get summary for an image |
| `arcane_vulnerability_get_scan_summaries` | Batch scan summaries |
| `arcane_vulnerability_list` | List vulnerabilities with filtering |
| `arcane_vulnerability_get_environment_summary` | Environment-wide summary |
| `arcane_vulnerability_ignore` | Ignore a vulnerability |
| `arcane_vulnerability_unignore` | Unignore a vulnerability |
| `arcane_vulnerability_get_scanner_status` | Get Trivy scanner status |
| `arcane_vulnerability_list_all` | List all vulns across environment |
| `arcane_vulnerability_list_ignored` | List ignored vulnerabilities |
| `arcane_vulnerability_get_image_options` | List scannable images |

### Projects / Docker Compose (12)

| Tool | Description |
|------|-------------|
| `arcane_project_list` | List Docker Compose projects |
| `arcane_project_get` | Get project details |
| `arcane_project_create` | Create from compose YAML |
| `arcane_project_update` | Update project configuration |
| `arcane_project_up` | Deploy a project |
| `arcane_project_down` | Stop and remove containers |
| `arcane_project_restart` | Restart all services |
| `arcane_project_redeploy` | Redeploy (down + up) |
| `arcane_project_destroy` | Destroy project and volumes |
| `arcane_project_pull_images` | Pull latest images |
| `arcane_project_get_counts` | Get status counts |
| `arcane_project_build` | Build project images |

<details>
<summary><strong>Images, Builds & Updates (20 tools)</strong></summary>

| Tool | Description |
|------|-------------|
| `arcane_image_list` | List images |
| `arcane_image_get` | Get image details |
| `arcane_image_pull` | Pull from registry |
| `arcane_image_delete` | Remove an image |
| `arcane_image_prune` | Prune unused images |
| `arcane_image_get_counts` | Get image statistics |
| `arcane_image_check_update` | Check single image for updates |
| `arcane_image_check_updates_all` | Check all images |
| `arcane_image_get_update_summary` | Get update summary |
| `arcane_image_update_check` | Check update by reference |
| `arcane_image_update_check_by_id` | Check update by ID |
| `arcane_image_update_check_multiple` | Batch check |
| `arcane_image_update_check_all` | Check all for updates |
| `arcane_image_update_get_summary` | Get update summary |
| `arcane_build_image` | Build from Dockerfile or Git URL |
| `arcane_build_list` | List image builds |
| `arcane_build_get` | Get build details |
| `arcane_build_workspace_browse` | Browse workspace files |
| `arcane_build_workspace_content` | Read workspace file |
| `arcane_build_workspace_upload` | Upload to workspace |
</details>

<details>
<summary><strong>Volumes, Networks & Ports (22 tools)</strong></summary>

| Tool | Description |
|------|-------------|
| `arcane_volume_list` | List volumes |
| `arcane_volume_get` | Get volume details |
| `arcane_volume_create` | Create a volume |
| `arcane_volume_delete` | Delete a volume |
| `arcane_volume_prune` | Prune unused volumes |
| `arcane_volume_get_counts` | Get volume counts |
| `arcane_volume_browse` | Browse volume files |
| `arcane_volume_browse_content` | Read file content |
| `arcane_volume_browse_mkdir` | Create directory |
| `arcane_volume_backup_list` | List backups |
| `arcane_volume_backup_create` | Create backup |
| `arcane_volume_backup_delete` | Delete backup |
| `arcane_volume_backup_restore` | Restore from backup |
| `arcane_volume_backup_list_files` | List backup files |
| `arcane_network_list` | List networks |
| `arcane_network_get` | Get network details |
| `arcane_network_create` | Create a network |
| `arcane_network_delete` | Delete a network |
| `arcane_network_prune` | Prune unused networks |
| `arcane_network_get_counts` | Get network counts |
| `arcane_network_get_topology` | Get network topology graph |
| `arcane_port_list` | List all port mappings |
</details>

<details>
<summary><strong>GitOps, Webhooks, Auto-Updater & Dashboard (23 tools)</strong></summary>

| Tool | Description |
|------|-------------|
| `arcane_gitops_list` | List GitOps syncs |
| `arcane_gitops_get` | Get sync details |
| `arcane_gitops_create` | Create a sync |
| `arcane_gitops_update` | Update a sync |
| `arcane_gitops_delete` | Delete a sync |
| `arcane_gitops_sync` | Trigger sync |
| `arcane_gitops_get_status` | Get sync status |
| `arcane_git_repo_list` | List Git repositories |
| `arcane_git_repo_create` | Add a repository |
| `arcane_git_repo_test` | Test connectivity |
| `arcane_git_repo_get_branches` | List branches |
| `arcane_git_repo_browse_files` | Browse repo files |
| `arcane_git_repo_delete` | Delete repository |
| `arcane_webhook_list` | List webhooks |
| `arcane_webhook_create` | Create a webhook |
| `arcane_webhook_update` | Update a webhook |
| `arcane_webhook_delete` | Delete a webhook |
| `arcane_updater_run` | Run auto-updater (dry run supported) |
| `arcane_updater_update_container` | Update single container |
| `arcane_updater_get_status` | Get updater schedule |
| `arcane_updater_get_history` | Get update history |
| `arcane_dashboard_get` | Get dashboard snapshot |
| `arcane_dashboard_get_action_items` | Get action items |
</details>

<details>
<summary><strong>Environments, Registries, Auth & More (69 tools)</strong></summary>

| Category | Tools | What it covers |
|----------|-------|----------------|
| **Environments** | 10 | List, create, update, delete environments. Test connectivity, pair agents, get Docker info, deployment snippets |
| **Container Registries** | 7 | Docker Hub, GHCR, ECR, GCR, ACR. Create, update, delete, test, sync registries |
| **Templates** | 8 | Docker Compose templates with variables. Browse, create, download, manage |
| **Jobs** | 4 | Scheduled tasks. List jobs, get schedules, run on demand |
| **Notifications** | 6 | Alert configuration via Apprise. Get/set settings, test notifications |
| **Events** | 4 | Activity tracking. List events by environment, create, delete |
| **Users** | 5 | User management. List, create, update, delete users |
| **Settings** | 8 | Server configuration and API key management |
| **Authentication** | 8 | Login, logout, JWT token management, OIDC device flow |
| **System** | 9 | Health checks, Docker info, system prune, upgrade checks, start/stop all containers |
</details>

---

## Configuration

| Variable | Description | Default |
|----------|-------------|---------|
| `ARCANE_BASE_URL` | Your Arcane instance URL | **Required** |
| `ARCANE_API_KEY` | API key for authentication | - |
| `ARCANE_USERNAME` | Username (alternative JWT auth) | - |
| `ARCANE_PASSWORD` | Password (alternative JWT auth) | - |
| `ARCANE_TIMEOUT_MS` | Request timeout in milliseconds | `30000` |
| `ARCANE_SKIP_SSL_VERIFY` | Skip SSL cert verification (self-signed certs) | `false` |
| `ARCANE_DEFAULT_ENVIRONMENT_ID` | Auto-select this environment | - |
| `ARCANE_HTTP_PORT` | Port for HTTP/network mode | `3000` |
| `ARCANE_HTTP_HOST` | Host for HTTP/network mode | `localhost` |
| `ARCANE_TOOL_PRESET` | `commonly-used` / `read-only` / `minimal` / `deploy` / `full` / `custom` — see [Tool Filtering](#tool-filtering) | - |
| `ARCANE_ENABLED_MODULES` | Comma-separated module allowlist | - |
| `ARCANE_ENABLED_TOOLS` | Comma-separated tool names to force-enable | - |
| `ARCANE_DISABLED_TOOLS` | Comma-separated tool names to force-disable | - |
| `LOG_LEVEL` | `debug`, `info`, `warn`, or `error` | `info` |

**Authentication:** API Key is recommended. JWT tokens are automatically refreshed before they expire.

**Tool filter:** anything set via env var overrides the corresponding field in `~/.arcane/config.json`. Unset fields fall through to the file. Change at runtime by editing `~/.arcane/config.json` — the server hot-reloads.

---

## Safety & Destructive Operations

Every tool includes MCP annotations that tell your AI assistant whether it's safe to run without asking. Read-only tools (list, get, browse) run freely. Destructive tools require confirmation.

| Tool | Risk | What happens |
|------|------|-------------|
| `arcane_volume_delete` | CRITICAL | Permanently deletes a volume and its data |
| `arcane_volume_prune` | CRITICAL | Removes all unused volumes |
| `arcane_project_destroy` | CRITICAL | Destroys a project, optionally including volumes |
| `arcane_system_prune` | CRITICAL | Removes all unused containers, images, networks, volumes |
| `arcane_swarm_init_cluster` | CRITICAL | Converts a standalone node to a swarm manager |
| `arcane_swarm_leave_cluster` | CRITICAL | Disconnects from the swarm cluster |
| `arcane_container_delete` | HIGH | Deletes a container |
| `arcane_network_delete` | HIGH | Deletes a network |
| `arcane_image_prune` | HIGH | Removes unused images |
| `arcane_swarm_delete_service` | HIGH | Removes a swarm service |

The companion skill adds an additional safety layer — it teaches Claude to back up before deleting, dry-run before updating, and always confirm before destroying.

---

## Development

```bash
git clone https://github.com/RandomSynergy17/Arcane-MCP-Server.git
cd Arcane-MCP-Server
npm install
npm run build
npm test             # 119 tests (unit + integration)
npm run dev          # stdio mode
npm run dev:tcp      # HTTP mode
```

<details>
<summary><strong>Project Structure</strong></summary>

```
src/
  index.ts              # stdio entry point
  tcp-server.ts         # HTTP/Streamable entry point (rate-limited)
  server.ts             # MCP server factory (tools + resources + prompts)
  config.ts             # Configuration (env vars > config file > defaults)
  client/
    arcane-client.ts    # HTTP client (retry, SSL, size limits)
  auth/
    auth-manager.ts     # JWT auto-refresh + API key auth
  tools/                # 25 modules, 180 tools
    registry.ts         # ToolRegistry — captures RegisteredTool handles, applies filter
    presets.ts          # commonly-used / read-only / minimal / deploy / full / custom
  resources/            # 4 MCP Resources
  prompts/              # 5 MCP Prompts
  types/
    arcane-types.ts     # Shared interfaces (33 types)
    generated/          # Auto-generated from OpenAPI v1.17.0
  utils/
    tool-helpers.ts     # registerTool wrapper with isError handling
    config-watcher.ts   # debounced fs.watch on ~/.arcane/config.json → hot reload
    format.ts           # Size formatting + path validation
    error-handler.ts    # Error classes + formatting
  __tests__/
    integration/        # End-to-end boot-per-preset + hot-reload cycle tests
commands/
  configure.md          # /arcane:configure slash command (plugin)
skills/
  arcane-mcp-server/
    SKILL.md            # Companion Claude Code skill
```
</details>

---

## Contributing

Contributions welcome! See [CONTRIBUTING.md](CONTRIBUTING.md) for setup instructions and guidelines.

## License

MIT License - see [LICENSE](LICENSE) for details.

## Links

- [Arcane](https://github.com/getarcaneapp/arcane) — The Docker management platform this connects to
- [npm package](https://www.npmjs.com/package/@randomsynergy/arcane-mcp-server) — `npx @randomsynergy/arcane-mcp-server`
- [Interactive Installer](install_arcane_skill-mcp.md) — Guided setup for Claude Code
- [Model Context Protocol](https://modelcontextprotocol.io) — The MCP specification
- [MCP TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk) — SDK used by this server

---

<p align="center">
  A <a href="http://randomsynergy.com">RandomSynergy</a> production
</p>
