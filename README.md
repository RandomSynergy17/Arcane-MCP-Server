# Arcane MCP Server

> Modern Docker Management for AI Assistants

A comprehensive [Model Context Protocol (MCP)](https://modelcontextprotocol.io) server that exposes the Arcane Docker Management API to AI assistants like Claude. Manage your Docker infrastructure through natural language commands.

**MCP Protocol Version**: 2025-11-25

## Features

- **130+ Tools** covering all aspects of Docker management
- **MCP 2025-11-25 Compliant**: Full conformance to latest MCP specification
- **Dual Transport Support**: stdio (for Claude Code/Desktop) and Streamable HTTP (for network access)
- **Security**: Origin validation, protocol version enforcement, secure session management
- **Full Docker Operations**: Containers, images, networks, volumes, and more
- **Docker Compose Support**: Manage projects/stacks with ease
- **GitOps Integration**: Git-based deployments and syncing
- **Multi-Environment**: Manage multiple Docker hosts from a single server
- **Type-Safe**: Generated TypeScript types from OpenAPI specification

## Quick Start

### Installation

```bash
npm install -g @randomsynergy/arcane-mcp-server
```

Or run directly with npx:

```bash
npx @randomsynergy/arcane-mcp-server
```

### Configuration

Set the required environment variables:

```bash
# Required
export ARCANE_BASE_URL=https://arcane.example.com:3552
export ARCANE_API_KEY=your-api-key
```

Or create a `~/.arcane/config.json` file:

```json
{
  "baseUrl": "https://arcane.example.com:3552",
  "auth": {
    "type": "apikey",
    "apiKey": "your-api-key"
  }
}
```

### Usage with Claude Code

```bash
# Add to Claude Code
claude mcp add --transport stdio arcane -- npx @randomsynergy/arcane-mcp-server

# With environment variables
claude mcp add --transport stdio \
  --env ARCANE_API_KEY=your-key \
  --env ARCANE_BASE_URL=https://arcane.example.com:3552 \
  arcane -- npx @randomsynergy/arcane-mcp-server
```

### Usage with Claude Desktop

Add to your Claude Desktop configuration (`~/.config/Claude/claude_desktop_config.json`):

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

### HTTP Mode (Network Access)

For network-based MCP clients:

```bash
# Start the HTTP server
ARCANE_API_KEY=your-key npx @randomsynergy/arcane-mcp-server --tcp

# Or specify a custom port
ARCANE_HTTP_PORT=8080 npx @randomsynergy/arcane-mcp-server --tcp
```

Then connect your MCP client to `http://localhost:3000/mcp`.

## Available Tools

### Containers (9 tools)
- `arcane_container_list` - List containers with filtering
- `arcane_container_get` - Get container details
- `arcane_container_create` - Create a new container
- `arcane_container_start` - Start a container
- `arcane_container_stop` - Stop a container
- `arcane_container_restart` - Restart a container
- `arcane_container_update` - Update (pull & recreate) a container
- `arcane_container_delete` - Delete a container
- `arcane_container_get_counts` - Get status counts

### Images (9 tools)
- `arcane_image_list` - List images
- `arcane_image_get` - Get image details
- `arcane_image_pull` - Pull an image
- `arcane_image_delete` - Remove an image
- `arcane_image_prune` - Prune unused images
- `arcane_image_get_counts` - Get image statistics
- `arcane_image_check_update` - Check for updates
- `arcane_image_check_updates_all` - Check all images
- `arcane_image_get_update_summary` - Get update summary

### Networks (6 tools)
- `arcane_network_list` - List networks
- `arcane_network_get` - Get network details
- `arcane_network_create` - Create a network
- `arcane_network_delete` - Delete a network
- `arcane_network_prune` - Prune unused networks
- `arcane_network_get_counts` - Get network counts

### Volumes (14 tools)
- `arcane_volume_list` - List volumes
- `arcane_volume_get` - Get volume details
- `arcane_volume_create` - Create a volume
- `arcane_volume_delete` - Delete a volume
- `arcane_volume_prune` - Prune unused volumes
- `arcane_volume_get_counts` - Get volume counts
- `arcane_volume_browse` - Browse volume files
- `arcane_volume_browse_content` - Read file content
- `arcane_volume_browse_mkdir` - Create directory
- `arcane_volume_backup_list` - List backups
- `arcane_volume_backup_create` - Create backup
- `arcane_volume_backup_delete` - Delete backup
- `arcane_volume_backup_restore` - Restore backup
- `arcane_volume_backup_list_files` - List files in backup

### Projects/Stacks (11 tools)
- `arcane_project_list` - List Docker Compose projects
- `arcane_project_get` - Get project details
- `arcane_project_create` - Create a project
- `arcane_project_update` - Update project config
- `arcane_project_up` - Deploy project
- `arcane_project_down` - Stop project
- `arcane_project_restart` - Restart project
- `arcane_project_redeploy` - Redeploy project
- `arcane_project_destroy` - Destroy project
- `arcane_project_pull_images` - Pull project images
- `arcane_project_get_counts` - Get project counts

### GitOps (13 tools)
- `arcane_gitops_list` - List GitOps syncs
- `arcane_gitops_get` - Get sync details
- `arcane_gitops_create` - Create a sync
- `arcane_gitops_update` - Update a sync
- `arcane_gitops_delete` - Delete a sync
- `arcane_gitops_sync` - Trigger sync
- `arcane_gitops_get_status` - Get sync status
- `arcane_git_repo_list` - List Git repositories
- `arcane_git_repo_create` - Add a repository
- `arcane_git_repo_test` - Test connectivity
- `arcane_git_repo_get_branches` - List branches
- `arcane_git_repo_browse_files` - Browse files
- `arcane_git_repo_delete` - Delete repository

### Environments (10 tools)
- `arcane_environment_list` - List environments
- `arcane_environment_get` - Get environment details
- `arcane_environment_create` - Create environment
- `arcane_environment_update` - Update environment
- `arcane_environment_delete` - Delete environment
- `arcane_environment_test` - Test connectivity
- `arcane_environment_pair_agent` - Pair with agent
- `arcane_environment_get_version` - Get agent version
- `arcane_environment_get_docker_info` - Get Docker info
- `arcane_environment_get_deployment_snippets` - Get deployment commands

### System (9 tools)
- `arcane_system_get_health` - Check server health
- `arcane_system_get_docker_info` - Get Docker system info
- `arcane_system_prune` - System-wide prune
- `arcane_system_check_upgrade` - Check for upgrades
- `arcane_system_upgrade` - Perform upgrade
- `arcane_system_containers_start_all` - Start all containers
- `arcane_system_containers_stop_all` - Stop all containers
- `arcane_system_containers_start_stopped` - Start stopped containers
- `arcane_version_get` - Get server version

### Additional Tools
- **Container Registries** (7 tools): Manage private registries
- **Templates** (8 tools): Docker Compose templates
- **Jobs** (4 tools): Scheduled tasks
- **Notifications** (6 tools): Alert configuration
- **Events** (4 tools): Activity tracking
- **Users** (5 tools): User management
- **Settings** (8 tools): Configuration and API keys
- **Authentication** (8 tools): Login, logout, OIDC

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `ARCANE_BASE_URL` | Arcane API base URL | Required |
| `ARCANE_API_KEY` | API key for authentication | - |
| `ARCANE_USERNAME` | Username (for JWT auth) | - |
| `ARCANE_PASSWORD` | Password (for JWT auth) | - |
| `ARCANE_TIMEOUT_MS` | Request timeout | `30000` |
| `ARCANE_SKIP_SSL_VERIFY` | Skip SSL verification | `false` |
| `ARCANE_DEFAULT_ENVIRONMENT_ID` | Default environment | - |
| `ARCANE_HTTP_PORT` | HTTP server port | `3000` |
| `ARCANE_HTTP_HOST` | HTTP server host | `localhost` |
| `LOG_LEVEL` | Log level (debug/info/warn/error) | `info` |

## Authentication

The server supports two authentication methods:

### API Key (Recommended)
```bash
export ARCANE_API_KEY=your-api-key
```

### JWT (Username/Password)
```bash
export ARCANE_USERNAME=admin
export ARCANE_PASSWORD=your-password
```

With JWT authentication, tokens are automatically refreshed when they expire.

## Development

### Build from Source

```bash
# Clone the repository
git clone https://github.com/RandomSynergy17/ArcaneClaude.git
cd ArcaneClaude

# Install dependencies
npm install

# Generate types from OpenAPI spec
npm run build:types

# Build the project
npm run build

# Run in development mode
npm run dev
```

### Project Structure

```
src/
├── index.ts              # stdio entry point
├── tcp-server.ts         # HTTP entry point
├── server.ts             # MCP server factory
├── config.ts             # Configuration management
├── client/
│   └── arcane-client.ts  # HTTP client
├── auth/
│   └── auth-manager.ts   # Authentication
├── tools/
│   ├── index.ts          # Tool registry
│   ├── container-tools.ts
│   ├── image-tools.ts
│   └── ...               # More tool modules
└── utils/
    ├── logger.ts         # stderr logging
    └── error-handler.ts  # Error formatting
```

## Dangerous Operations

Some tools perform destructive actions and include risk warnings:

| Tool | Risk Level |
|------|------------|
| `arcane_container_delete` | HIGH |
| `arcane_volume_delete` | CRITICAL |
| `arcane_volume_prune` | CRITICAL |
| `arcane_project_destroy` | CRITICAL |
| `arcane_system_prune` | CRITICAL |
| `arcane_network_delete` | HIGH |
| `arcane_image_prune` | HIGH |

Always review the tool descriptions before executing destructive operations.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT License - see [LICENSE](LICENSE) for details.

## Links

- [Arcane Docker Management](https://arcane.randomsynergy.xyz)
- [Model Context Protocol](https://modelcontextprotocol.io)
- [MCP TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk)
