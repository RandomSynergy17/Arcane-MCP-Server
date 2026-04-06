<p align="center">
  <img src="assets/logo.svg" alt="Arcane" width="400" />
</p>

<p align="center">
  <strong>MCP Server for Arcane Docker Management</strong><br/>
  Manage your Docker infrastructure through natural language.
</p>

<p align="center">
  <a href="https://github.com/RandomSynergy17/ArcaneClaude/releases"><img src="https://img.shields.io/github/v/release/RandomSynergy17/ArcaneClaude?style=flat-square&color=7c3aed" alt="Release" /></a>
  <a href="https://opensource.org/licenses/MIT"><img src="https://img.shields.io/badge/license-MIT-7c3aed?style=flat-square" alt="License" /></a>
  <a href="https://modelcontextprotocol.io"><img src="https://img.shields.io/badge/MCP-2025--11--25-7c3aed?style=flat-square" alt="MCP Protocol" /></a>
  <a href="https://www.npmjs.com/package/@randomsynergy/arcane-mcp-server"><img src="https://img.shields.io/badge/npm-@randomsynergy/arcane--mcp--server-7c3aed?style=flat-square" alt="npm" /></a>
</p>

---

A comprehensive [Model Context Protocol](https://modelcontextprotocol.io) server that exposes the [Arcane](https://github.com/getarcaneapp/arcane) Docker Management API to AI assistants like Claude. **180+ tools** covering containers, images, volumes, networks, Docker Compose stacks, Swarm clusters, vulnerability scanning, GitOps, and more.

## Highlights

| | |
|---|---|
| **180+ Tools** | Full Docker lifecycle management via MCP |
| **Dual Transport** | stdio (Claude Code/Desktop) and Streamable HTTP |
| **Docker Swarm** | Cluster init, service CRUD, scaling, logs |
| **Vulnerability Scanning** | Image security scans with severity filtering |
| **GitOps** | Git-based deployments with auto-sync |
| **Auto-Updater** | Hands-off container image updates |
| **Dashboard** | Consolidated environment overview in one call |
| **Companion Skill** | Optional Claude Code skill for workflow guidance |

## Quick Start

### Install

```bash
npm install -g @randomsynergy/arcane-mcp-server
```

### Configure

```bash
export ARCANE_BASE_URL=https://arcane.example.com:3552
export ARCANE_API_KEY=your-api-key
```

Or use a config file at `~/.arcane/config.json`:

```json
{
  "baseUrl": "https://arcane.example.com:3552",
  "auth": { "type": "apikey", "apiKey": "your-api-key" }
}
```

### Add to Claude Code

```bash
claude mcp add --transport stdio \
  --env ARCANE_API_KEY=your-key \
  --env ARCANE_BASE_URL=https://arcane.example.com:3552 \
  arcane -- npx @randomsynergy/arcane-mcp-server
```

### Add to Claude Desktop

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

### HTTP Mode

For network-based MCP clients:

```bash
ARCANE_API_KEY=your-key npx @randomsynergy/arcane-mcp-server --tcp
```

Connect at `http://localhost:3000/mcp`. Set `ARCANE_HTTP_PORT` to change the port.

---

## Companion Skill

ArcaneClaude ships with an optional Claude Code skill that teaches Claude *how* to use the tools — not just *that* they exist.

```bash
cp -r skill/arcane-docker ~/.claude/skills/arcane-docker
```

The skill provides:
- **Workflow chains** — safe deployment, rollback, troubleshooting, cleanup sequences
- **Safety guardrails** — pre-flight checks before destructive operations
- **Intent mapping** — translates "what's broken?" into the right tool sequence

---

## Available Tools

### Containers (11 tools)

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
| `arcane_container_get_counts` | Get status counts (running/stopped) |

### Images (9 tools)

| Tool | Description |
|------|-------------|
| `arcane_image_list` | List images |
| `arcane_image_get` | Get image details |
| `arcane_image_pull` | Pull an image from registry |
| `arcane_image_delete` | Remove an image |
| `arcane_image_prune` | Prune unused images |
| `arcane_image_get_counts` | Get image statistics |
| `arcane_image_check_update` | Check single image for updates |
| `arcane_image_check_updates_all` | Check all images for updates |
| `arcane_image_get_update_summary` | Get update summary |

### Docker Swarm (11 tools)

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

### Vulnerability Scanning (8 tools)

| Tool | Description |
|------|-------------|
| `arcane_vulnerability_scan_image` | Trigger a vulnerability scan |
| `arcane_vulnerability_get_scan_result` | Get full scan result |
| `arcane_vulnerability_get_scan_summary` | Get scan summary for an image |
| `arcane_vulnerability_get_scan_summaries` | Batch scan summaries |
| `arcane_vulnerability_list` | List vulnerabilities with filtering |
| `arcane_vulnerability_get_environment_summary` | Environment-wide summary |
| `arcane_vulnerability_ignore` | Ignore a vulnerability |
| `arcane_vulnerability_unignore` | Unignore a vulnerability |

### Projects / Docker Compose (11 tools)

| Tool | Description |
|------|-------------|
| `arcane_project_list` | List Docker Compose projects |
| `arcane_project_get` | Get project details |
| `arcane_project_create` | Create a project from compose YAML |
| `arcane_project_update` | Update project configuration |
| `arcane_project_up` | Deploy a project |
| `arcane_project_down` | Stop and remove project containers |
| `arcane_project_restart` | Restart all project services |
| `arcane_project_redeploy` | Redeploy (down + up) |
| `arcane_project_destroy` | Destroy project and optionally volumes |
| `arcane_project_pull_images` | Pull latest images for project |
| `arcane_project_get_counts` | Get project status counts |

### Volumes (14 tools)

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
| `arcane_volume_browse_mkdir` | Create directory in volume |
| `arcane_volume_backup_list` | List backups |
| `arcane_volume_backup_create` | Create backup |
| `arcane_volume_backup_delete` | Delete backup |
| `arcane_volume_backup_restore` | Restore from backup |
| `arcane_volume_backup_list_files` | List files in backup |

### Networks (6 tools)

| Tool | Description |
|------|-------------|
| `arcane_network_list` | List networks |
| `arcane_network_get` | Get network details |
| `arcane_network_create` | Create a network |
| `arcane_network_delete` | Delete a network |
| `arcane_network_prune` | Prune unused networks |
| `arcane_network_get_counts` | Get network counts |

### GitOps (13 tools)

| Tool | Description |
|------|-------------|
| `arcane_gitops_list` | List GitOps sync configurations |
| `arcane_gitops_get` | Get sync details |
| `arcane_gitops_create` | Create a sync (with folder-level support) |
| `arcane_gitops_update` | Update a sync |
| `arcane_gitops_delete` | Delete a sync |
| `arcane_gitops_sync` | Trigger sync |
| `arcane_gitops_get_status` | Get sync status |
| `arcane_git_repo_list` | List Git repositories |
| `arcane_git_repo_create` | Add a repository |
| `arcane_git_repo_test` | Test connectivity |
| `arcane_git_repo_get_branches` | List branches |
| `arcane_git_repo_browse_files` | Browse files in repo |
| `arcane_git_repo_delete` | Delete repository |

### Image Updates (5 tools)

| Tool | Description |
|------|-------------|
| `arcane_image_update_check` | Check update by image reference |
| `arcane_image_update_check_by_id` | Check update by image ID |
| `arcane_image_update_check_multiple` | Batch check multiple images |
| `arcane_image_update_check_all` | Check all images for updates |
| `arcane_image_update_get_summary` | Get update summary |

### Dashboard (2 tools)

| Tool | Description |
|------|-------------|
| `arcane_dashboard_get` | Get consolidated dashboard snapshot |
| `arcane_dashboard_get_action_items` | Get action items needing attention |

### Auto-Updater (4 tools)

| Tool | Description |
|------|-------------|
| `arcane_updater_run` | Run auto-updater (supports dry run) |
| `arcane_updater_update_container` | Update a single container |
| `arcane_updater_get_status` | Get updater status and schedule |
| `arcane_updater_get_history` | Get update history |

### Image Builds (6 tools)

| Tool | Description |
|------|-------------|
| `arcane_build_image` | Build a Docker image from Dockerfile or Git URL |
| `arcane_build_list` | List image builds |
| `arcane_build_get` | Get build details and logs |
| `arcane_build_workspace_browse` | Browse build workspace files |
| `arcane_build_workspace_content` | Read file content from build workspace |
| `arcane_build_workspace_upload` | Upload files to build workspace |

### Network Topology (1 tool)

| Tool | Description |
|------|-------------|
| `arcane_network_topology` | Get full network topology with container connections |

### Additional Tool Categories

| Category | Tools | Description |
|----------|-------|-------------|
| **Environments** | 10 | Multi-host Docker environment management |
| **Webhooks** | 4 | Inbound webhook configuration |
| **Port Mappings** | 1 | Cross-container port listing |
| **Container Registries** | 7 | Private registries (Docker Hub, GHCR, ECR, GCR, ACR) |
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

In addition to tools, the server exposes MCP Resources and Prompts:

**Resources** (read-only context):
- `arcane://environments` — Lists all available environments
- `arcane://version` — Server version and configuration

**Prompts** (workflow templates):
- `/deploy-stack` — Guided Docker Compose deployment
- `/troubleshoot-container` — Systematic container diagnostics
- `/security-audit` — Vulnerability scanning workflow
- `/cleanup-environment` — Safe resource cleanup

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

### Authentication

**API Key** (recommended):
```bash
export ARCANE_API_KEY=your-api-key
```

**JWT** (username/password):
```bash
export ARCANE_USERNAME=admin
export ARCANE_PASSWORD=your-password
```

JWT tokens are automatically refreshed before expiry.

---

## Destructive Operations

These tools perform irreversible actions. The companion skill enforces pre-flight checks automatically.

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
git clone https://github.com/RandomSynergy17/ArcaneClaude.git
cd ArcaneClaude
npm install
npm run build
npm run dev          # stdio mode
npm run dev:tcp      # HTTP mode
```

### Project Structure

```
src/
  index.ts              # stdio entry point
  tcp-server.ts         # HTTP/Streamable entry point
  server.ts             # MCP server factory
  config.ts             # Configuration management
  client/
    arcane-client.ts    # HTTP client with retry logic
  auth/
    auth-manager.ts     # JWT + API key authentication
  tools/                # Tool modules (180+ tools)
    index.ts            # Tool registry
    container-tools.ts
    swarm-tools.ts
    vulnerability-tools.ts
    ...
  types/
    generated/          # Auto-generated from OpenAPI
  utils/
    logger.ts           # stderr-safe logging
    error-handler.ts    # Error classes and formatting
    format.ts           # Display formatting
    tool-helpers.ts     # Shared tool handler wrapper
skill/
  arcane-docker/
    SKILL.md            # Companion Claude Code skill
```

---

## Contributing

Contributions are welcome. Please submit a Pull Request.

## License

MIT License - see [LICENSE](LICENSE) for details.

## Links

- [Arcane](https://github.com/getarcaneapp/arcane) - The Docker management platform this server connects to
- [Model Context Protocol](https://modelcontextprotocol.io) - The protocol specification
- [MCP TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk) - SDK used by this server
