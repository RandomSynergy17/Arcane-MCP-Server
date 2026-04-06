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
  <a href="#quick-start">Quick Start</a> &bull;
  <a href="#available-tools">Tools</a> &bull;
  <a href="#companion-skill">Skill</a> &bull;
  <a href="#resources--prompts">Prompts</a> &bull;
  <a href="install_arcane_skill-mcp.md">Installer</a>
</p>

---

> **Note:** This is an independent, community-built project. It is **not affiliated with, endorsed by, or maintained by** the [Arcane](https://github.com/getarcaneapp/arcane) project or its maintainers. We build on top of Arcane's public API.

A [Model Context Protocol](https://modelcontextprotocol.io) server that gives AI assistants full control over [Arcane](https://github.com/getarcaneapp/arcane) Docker infrastructure. Containers, images, volumes, networks, Compose stacks, Swarm clusters, vulnerability scanning, GitOps, builds, auto-updates — all through conversational commands.

### Why Arcane MCP Server?

- **Ask, don't click.** "What's broken?" returns a dashboard, action items, and container state in one shot.
- **Safe by default.** Every tool carries annotations (`readOnlyHint`, `destructiveHint`) so your AI won't accidentally prune your volumes.
- **Skill-guided workflows.** The companion skill teaches Claude deployment patterns, rollback sequences, and troubleshooting flows — not just tool names.
- **One install, everything works.** Plugin format bundles MCP server + skill. Or install them separately.

---

## Quick Start

### One-Line Install

```bash
npm install -g @randomsynergy/arcane-mcp-server
```

### Guided Install (Claude Code)

Paste this into any Claude Code session for interactive setup:

```
Fetch and follow: https://raw.githubusercontent.com/RandomSynergy17/Arcane-MCP-Server/main/install_arcane_skill-mcp.md
```

### Plugin Install

```bash
/plugin marketplace add RandomSynergy17/Arcane-MCP-Server
/plugin install arcane-mcp-server
```

You'll be prompted for your Arcane URL and API key.

### Manual Setup

<details>
<summary><strong>Claude Code</strong></summary>

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

---

## Companion Skill

The optional skill teaches Claude *how* to use the tools — deployment workflows, safety checks, troubleshooting patterns, and common gotchas.

```bash
# With the plugin (includes skill automatically)
/plugin install arcane-mcp-server

# Or manually
git clone --depth 1 https://github.com/RandomSynergy17/Arcane-MCP-Server.git /tmp/arcane
cp -r /tmp/arcane/skills/arcane-mcp-server ~/.claude/skills/arcane-mcp-server
rm -rf /tmp/arcane
```

**What the skill provides:**
- **Intent mapping** — "what's broken?" becomes `arcane_dashboard_get` + `arcane_dashboard_get_action_items`
- **Safety guardrails** — backup before prune, dry-run before update, confirm before destroy
- **Workflow chains** — deploy, rollback, troubleshoot, cleanup, security audit sequences
- **Gotchas** — `environmentId` required everywhere, ECR creds expire, pagination defaults to 20

---

## Available Tools

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

### Images (9) &bull; Image Updates (5) &bull; Image Builds (6)

<details>
<summary>Show 20 image tools</summary>

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

### Volumes (14) &bull; Networks (7) &bull; Ports (1)

<details>
<summary>Show 22 infrastructure tools</summary>

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

### GitOps (13) &bull; Webhooks (4) &bull; Auto-Updater (4) &bull; Dashboard (2)

<details>
<summary>Show 23 operations tools</summary>

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

### Additional Categories

| Category | Tools | Description |
|----------|-------|-------------|
| **Environments** | 10 | Multi-host Docker environment management |
| **Container Registries** | 7 | Docker Hub, GHCR, ECR, GCR, ACR |
| **Templates** | 8 | Docker Compose templates with variables |
| **Jobs** | 4 | Scheduled task management |
| **Notifications** | 6 | Alert configuration (Apprise) |
| **Events** | 4 | Activity tracking and logging |
| **Users** | 5 | User account management |
| **Settings** | 8 | Server configuration and API keys |
| **Authentication** | 8 | Login, logout, JWT, OIDC device flow |
| **System** | 9 | Health checks, pruning, upgrades |

---

## Resources & Prompts

**MCP Resources** (read-only context for the AI):

| URI | Description |
|-----|-------------|
| `arcane://environments` | Lists all available environments with IDs |
| `arcane://version` | Server version and configuration |

**MCP Prompts** (workflow templates):

| Prompt | Description |
|--------|-------------|
| `/deploy-stack` | Guided Docker Compose deployment |
| `/troubleshoot-container` | Systematic container diagnostics |
| `/security-audit` | Vulnerability scanning workflow |
| `/cleanup-environment` | Safe resource cleanup with confirmations |

---

## Configuration

| Variable | Description | Default |
|----------|-------------|---------|
| `ARCANE_BASE_URL` | Arcane API base URL | **Required** |
| `ARCANE_API_KEY` | API key authentication | - |
| `ARCANE_USERNAME` | Username (JWT auth) | - |
| `ARCANE_PASSWORD` | Password (JWT auth) | - |
| `ARCANE_TIMEOUT_MS` | Request timeout | `30000` |
| `ARCANE_SKIP_SSL_VERIFY` | Skip SSL verification | `false` |
| `ARCANE_DEFAULT_ENVIRONMENT_ID` | Default environment | - |
| `ARCANE_HTTP_PORT` | HTTP server port | `3000` |
| `ARCANE_HTTP_HOST` | HTTP server host | `localhost` |
| `LOG_LEVEL` | Logging level | `info` |

JWT tokens are automatically refreshed before expiry.

---

## Destructive Operations

These tools carry `destructiveHint: true` in their MCP annotations. The companion skill enforces pre-flight checks automatically.

| Tool | Risk |
|------|------|
| `arcane_container_delete` | HIGH |
| `arcane_volume_delete` | CRITICAL |
| `arcane_volume_prune` | CRITICAL |
| `arcane_project_destroy` | CRITICAL |
| `arcane_system_prune` | CRITICAL |
| `arcane_network_delete` | HIGH |
| `arcane_image_prune` | HIGH |
| `arcane_swarm_delete_service` | HIGH |
| `arcane_swarm_init_cluster` | CRITICAL |
| `arcane_swarm_leave_cluster` | CRITICAL |

---

## Development

```bash
git clone https://github.com/RandomSynergy17/Arcane-MCP-Server.git
cd Arcane-MCP-Server
npm install
npm run build
npm run dev          # stdio mode
npm run dev:tcp      # HTTP mode
```

<details>
<summary>Project Structure</summary>

```
src/
  index.ts              # stdio entry point
  tcp-server.ts         # HTTP/Streamable entry point
  server.ts             # MCP server factory (tools + resources + prompts)
  config.ts             # Configuration management
  client/
    arcane-client.ts    # HTTP client with retry logic
  auth/
    auth-manager.ts     # JWT + API key authentication
  tools/                # 25 tool modules, 180 tools
  resources/
    index.ts            # MCP Resources (environments, version)
  prompts/
    index.ts            # MCP Prompts (deploy, troubleshoot, audit, cleanup)
  types/
    generated/          # Auto-generated from OpenAPI v1.17.0
  utils/
    tool-helpers.ts     # Shared registerTool wrapper
skills/
  arcane-mcp-server/
    SKILL.md            # Companion Claude Code skill
```
</details>

---

## Contributing

Contributions welcome. See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

MIT License - see [LICENSE](LICENSE) for details.

## Links

- [Arcane](https://github.com/getarcaneapp/arcane) - The Docker management platform
- [npm package](https://www.npmjs.com/package/@randomsynergy/arcane-mcp-server)
- [Installation Guide](install_arcane_skill-mcp.md) - Interactive installer
- [Model Context Protocol](https://modelcontextprotocol.io) - MCP specification
- [MCP TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk) - SDK used by this server

---

<p align="center">
  A <a href="http://randomsynergy.com">RandomSynergy</a> production
</p>
