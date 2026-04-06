# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.0.0] - 2026-04-06

### Added

#### MCP Protocol Enhancements
- MCP tool annotations (`readOnlyHint`, `destructiveHint`, `idempotentHint`) on all 180 tools
- Human-readable `title` field on all tools
- MCP Resources: `arcane://environments` (list environments), `arcane://version` (server info)
- MCP Prompts: `/deploy-stack`, `/troubleshoot-container`, `/security-audit`, `/cleanup-environment`

#### Image Build Tools (6 tools)
- `arcane_build_image` - Build Docker image from Dockerfile or Git URL
- `arcane_build_list` - List image builds
- `arcane_build_get` - Get build details and logs
- `arcane_build_workspace_browse` - Browse build workspace files
- `arcane_build_workspace_content` - Read file content from build workspace
- `arcane_build_workspace_upload` - Upload files to build workspace

#### Network Topology (1 tool)
- `arcane_network_topology` - Get full network topology with container connections

#### Additional Vulnerability Tools (4 tools)
- `arcane_vulnerability_get_scanner_status` - Get scanner status
- `arcane_vulnerability_list_all` - List all vulnerabilities across environments
- `arcane_vulnerability_list_ignored` - List ignored vulnerabilities
- `arcane_vulnerability_get_image_options` - Get image scan options

#### Project Build
- `arcane_project_build` - Build project images locally

#### Claude Code Plugin Format
- `.claude-plugin/` directory with plugin manifest
- `.mcp.json` for Claude Code auto-discovery
- `marketplace.json` for future plugin marketplace support

#### Docker Swarm Management (11 tools)
- `arcane_swarm_list_services` - List swarm services with pagination
- `arcane_swarm_get_service` - Get service details including tasks
- `arcane_swarm_create_service` - Create swarm services with ports, env, networks
- `arcane_swarm_update_service` - Update service configuration
- `arcane_swarm_delete_service` - Delete a swarm service
- `arcane_swarm_scale_service` - Scale service replicas
- `arcane_swarm_get_service_logs` - Get service logs
- `arcane_swarm_init_cluster` - Initialize a new swarm cluster
- `arcane_swarm_join_cluster` - Join an existing swarm cluster
- `arcane_swarm_leave_cluster` - Leave the swarm cluster
- `arcane_swarm_get_cluster_info` - Get cluster info and node counts

#### Webhook Management (4 tools)
- `arcane_webhook_list` - List configured webhooks
- `arcane_webhook_create` - Create inbound webhooks
- `arcane_webhook_update` - Update webhook configuration
- `arcane_webhook_delete` - Delete webhooks

#### Vulnerability Scanning (8 tools)
- `arcane_vulnerability_scan_image` - Trigger image vulnerability scan
- `arcane_vulnerability_get_scan_result` - Get full scan results
- `arcane_vulnerability_get_scan_summary` - Get scan summary for an image
- `arcane_vulnerability_get_scan_summaries` - Batch scan summaries
- `arcane_vulnerability_list` - List vulnerabilities with filtering
- `arcane_vulnerability_get_environment_summary` - Environment-wide summary
- `arcane_vulnerability_ignore` - Ignore a vulnerability
- `arcane_vulnerability_unignore` - Unignore a vulnerability

#### Image Update Checking (5 tools)
- `arcane_image_update_check` - Check update by image reference
- `arcane_image_update_check_by_id` - Check update by image ID
- `arcane_image_update_check_multiple` - Batch check multiple images
- `arcane_image_update_check_all` - Check all images for updates
- `arcane_image_update_get_summary` - Get update summary

#### Dashboard (2 tools)
- `arcane_dashboard_get` - Get consolidated dashboard snapshot
- `arcane_dashboard_get_action_items` - Get action items needing attention

#### Port Mappings (1 tool)
- `arcane_port_list` - List all port mappings across containers

#### Auto-Updater Management (4 tools)
- `arcane_updater_run` - Run auto-updater with optional dry run
- `arcane_updater_update_container` - Update a single container
- `arcane_updater_get_status` - Get updater status and schedule
- `arcane_updater_get_history` - Get update history

### Enhanced

#### Container Tools
- `arcane_container_redeploy` - Per-container redeploy support
- `arcane_container_set_auto_update` - Per-container auto-update toggle

#### Registry Tools
- Added ECR registry support (`awsRegion`, `awsAccessKeyId`, `awsSecretAccessKey` params)

#### GitOps Tools
- Added folder-level sync support (`folders` parameter on create/update)

#### Project Tools
- Added nested/symlinked directory support (`directory` parameter on create)

### Fixed
- Webhook update now uses PATCH method (was PUT)
- Updated Express from ^4.21.0 to ^4.21.2 (CVE-2024-47764 fix)

### Changed
- Migrated all tools from deprecated `server.tool()` to `server.registerTool()`
- OpenAPI spec updated from v1.14.1 to v1.17.0
- TypeScript types regenerated from v1.17.0 spec
- Total tool count: 180 (up from 130)
- Server version reported as 2.0.0

---

## [1.0.0] - 2024-02-03

### Added

#### Core Infrastructure
- MCP server with dual transport support (stdio and HTTP)
- Configuration management via environment variables and config file
- JWT authentication with automatic token refresh
- API key authentication support
- Type-safe HTTP client for Arcane API
- Comprehensive error handling and formatting
- stderr-safe logging for stdio transport compatibility

#### Container Management (9 tools)
- `arcane_container_list` - List Docker containers with filtering and pagination
- `arcane_container_get` - Get detailed container information
- `arcane_container_create` - Create new containers with full configuration
- `arcane_container_start` - Start stopped containers
- `arcane_container_stop` - Stop running containers
- `arcane_container_restart` - Restart containers
- `arcane_container_update` - Pull latest image and recreate container
- `arcane_container_delete` - Delete containers with optional volume removal
- `arcane_container_get_counts` - Get container status counts

#### Image Management (9 tools)
- `arcane_image_list` - List Docker images
- `arcane_image_get` - Get image details
- `arcane_image_pull` - Pull images from registries
- `arcane_image_delete` - Remove images
- `arcane_image_prune` - Prune unused images
- `arcane_image_get_counts` - Get image statistics
- `arcane_image_check_update` - Check single image for updates
- `arcane_image_check_updates_all` - Check all images for updates
- `arcane_image_get_update_summary` - Get update summary

#### Network Management (6 tools)
- `arcane_network_list` - List Docker networks
- `arcane_network_get` - Get network details with connected containers
- `arcane_network_create` - Create networks with IPAM configuration
- `arcane_network_delete` - Delete networks
- `arcane_network_prune` - Prune unused networks
- `arcane_network_get_counts` - Get network counts

#### Volume Management (14 tools)
- `arcane_volume_list` - List volumes with usage info
- `arcane_volume_get` - Get volume details
- `arcane_volume_create` - Create volumes with driver options
- `arcane_volume_delete` - Delete volumes
- `arcane_volume_prune` - Prune unused volumes
- `arcane_volume_get_counts` - Get volume statistics
- `arcane_volume_browse` - Browse volume file system
- `arcane_volume_browse_content` - Read file contents
- `arcane_volume_browse_mkdir` - Create directories
- `arcane_volume_backup_list` - List volume backups
- `arcane_volume_backup_create` - Create backups
- `arcane_volume_backup_delete` - Delete backups
- `arcane_volume_backup_restore` - Restore from backup
- `arcane_volume_backup_list_files` - List files in backup

#### Project/Stack Management (11 tools)
- `arcane_project_list` - List Docker Compose projects
- `arcane_project_get` - Get project details with services
- `arcane_project_create` - Create projects from compose content
- `arcane_project_update` - Update project configuration
- `arcane_project_up` - Deploy projects (docker-compose up)
- `arcane_project_down` - Stop projects (docker-compose down)
- `arcane_project_restart` - Restart all services
- `arcane_project_redeploy` - Down + up with optional pull
- `arcane_project_destroy` - Destroy projects with optional volume removal
- `arcane_project_pull_images` - Pull all project images
- `arcane_project_get_counts` - Get project status counts

#### GitOps (13 tools)
- `arcane_gitops_list` - List GitOps sync configurations
- `arcane_gitops_get` - Get sync details
- `arcane_gitops_create` - Create GitOps sync
- `arcane_gitops_update` - Update sync configuration
- `arcane_gitops_delete` - Delete sync
- `arcane_gitops_sync` - Trigger manual sync
- `arcane_gitops_get_status` - Get current sync status
- `arcane_git_repo_list` - List Git repositories
- `arcane_git_repo_create` - Add repository configuration
- `arcane_git_repo_test` - Test repository connectivity
- `arcane_git_repo_get_branches` - List repository branches
- `arcane_git_repo_browse_files` - Browse repository files
- `arcane_git_repo_delete` - Delete repository configuration

#### Environment Management (10 tools)
- `arcane_environment_list` - List Docker environments
- `arcane_environment_get` - Get environment details
- `arcane_environment_create` - Create new environment
- `arcane_environment_update` - Update environment
- `arcane_environment_delete` - Delete environment
- `arcane_environment_test` - Test connectivity
- `arcane_environment_pair_agent` - Generate agent pairing token
- `arcane_environment_get_version` - Get agent version
- `arcane_environment_get_docker_info` - Get Docker system info
- `arcane_environment_get_deployment_snippets` - Get deployment commands

#### Container Registry Management (7 tools)
- `arcane_registry_list` - List container registries
- `arcane_registry_get` - Get registry details
- `arcane_registry_create` - Add registry configuration
- `arcane_registry_update` - Update registry
- `arcane_registry_delete` - Delete registry
- `arcane_registry_test` - Test registry connectivity
- `arcane_registry_sync` - Sync all registries

#### Template Management (8 tools)
- `arcane_template_list` - List compose templates
- `arcane_template_get` - Get template details
- `arcane_template_get_content` - Get template YAML
- `arcane_template_create` - Create template
- `arcane_template_update` - Update template
- `arcane_template_delete` - Delete template
- `arcane_template_get_variables` - Get global variables
- `arcane_template_update_variables` - Update global variables

#### System Operations (9 tools)
- `arcane_system_get_health` - Check server health
- `arcane_system_get_docker_info` - Get Docker system info
- `arcane_system_prune` - System-wide prune
- `arcane_system_check_upgrade` - Check for upgrades
- `arcane_system_upgrade` - Perform upgrade
- `arcane_system_containers_start_all` - Start all containers
- `arcane_system_containers_stop_all` - Stop all containers
- `arcane_system_containers_start_stopped` - Start previously stopped
- `arcane_version_get` - Get server version

#### Job/Scheduling (4 tools)
- `arcane_job_list` - List scheduled jobs
- `arcane_job_run` - Run job immediately
- `arcane_job_schedule_get` - Get job schedules
- `arcane_job_schedule_update` - Update schedules

#### Notification Management (6 tools)
- `arcane_notification_get_settings` - Get notification settings
- `arcane_notification_update_settings` - Update settings
- `arcane_notification_test` - Send test notification
- `arcane_notification_apprise_get` - Get Apprise config
- `arcane_notification_apprise_update` - Update Apprise config
- `arcane_notification_apprise_test` - Test Apprise

#### Event Tracking (4 tools)
- `arcane_event_list` - List all events
- `arcane_event_list_by_environment` - List environment events
- `arcane_event_create` - Create custom event
- `arcane_event_delete` - Delete event

#### User Management (5 tools)
- `arcane_user_list` - List users
- `arcane_user_get` - Get user details
- `arcane_user_create` - Create user
- `arcane_user_update` - Update user
- `arcane_user_delete` - Delete user

#### Settings & API Keys (8 tools)
- `arcane_settings_get` - Get environment settings
- `arcane_settings_update` - Update settings
- `arcane_settings_get_public` - Get public settings
- `arcane_settings_get_categories` - Get setting categories
- `arcane_settings_search` - Search settings
- `arcane_apikey_list` - List API keys
- `arcane_apikey_create` - Create API key
- `arcane_apikey_delete` - Delete API key

#### Authentication (8 tools)
- `arcane_auth_login` - Login with credentials
- `arcane_auth_logout` - Logout current session
- `arcane_auth_me` - Get current user info
- `arcane_auth_refresh` - Refresh access token
- `arcane_auth_change_password` - Change password
- `arcane_oidc_get_status` - Get OIDC status
- `arcane_oidc_get_config` - Get OIDC configuration
- `arcane_oidc_device_code` - Initiate device auth flow

### Security
- Dangerous operations clearly marked with risk levels
- API keys masked in output
- SSL verification enabled by default
- Token refresh prevents credential exposure

### Documentation
- Comprehensive README with quick start guide
- Full tool catalog with descriptions
- Environment variable reference
- Claude Code and Claude Desktop integration guides

[1.0.0]: https://github.com/RandomSynergy17/ArcaneClaude/releases/tag/v1.0.0
