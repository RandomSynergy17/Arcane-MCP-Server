# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
