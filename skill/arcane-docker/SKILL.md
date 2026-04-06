---
name: arcane-docker
description: Docker infrastructure management via Arcane MCP tools. Use when the user asks about Docker containers, images, volumes, networks, stacks, deployments, swarm, or any infrastructure management task — and the arcane_* MCP tools are available.
---

# Arcane Docker Management

Guides effective use of the Arcane MCP server's 165+ tools for Docker infrastructure management. This skill activates when users ask about Docker operations and `arcane_*` tools are available.

**Announce:** "Using the arcane-docker skill to guide this Docker operation."

## Prerequisites

Before any operation, you need an **environment ID**. If the user hasn't specified one:

1. Call `arcane_environment_list` to show available environments
2. If only one exists, use it automatically
3. If multiple exist, ask which one
4. If `ARCANE_DEFAULT_ENVIRONMENT_ID` is configured, use that as fallback

## Intent Mapping

When the user says something general, map it to the right tool sequence:

| User says | Tools to use |
|-----------|-------------|
| "What's running?" / "Show me my containers" | `arcane_container_list` |
| "How's everything looking?" / "Status" | `arcane_dashboard_get` then `arcane_dashboard_get_action_items` |
| "Deploy this compose file" | `arcane_project_create` then `arcane_project_up` |
| "Update everything" | `arcane_image_update_check_all` then `arcane_updater_run` (with `dryRun: true` first) |
| "What needs attention?" | `arcane_dashboard_get_action_items` |
| "Is anything vulnerable?" | `arcane_vulnerability_get_environment_summary` |
| "Set up a new stack" | `arcane_project_create` with compose YAML |
| "Scale this up" | `arcane_swarm_scale_service` (swarm) or redeploy with updated config (compose) |
| "Something's broken" / "Debug" | See Troubleshooting workflow below |
| "Clean up" / "Free space" | See Cleanup workflow below |
| "Show me the ports" | `arcane_port_list` |
| "Connect a new registry" | `arcane_registry_create` |

## Core Workflows

### Safe Deployment

Always follow this sequence for deploying or updating projects:

1. **Check current state** — `arcane_project_get` to see what's running
2. **Pull images first** — `arcane_project_pull_images` to fetch latest
3. **Deploy** — `arcane_project_up` or `arcane_project_redeploy`
4. **Verify** — `arcane_container_list` to confirm containers are running

For updates to running stacks:
1. `arcane_image_update_check_all` — see what has updates
2. `arcane_project_pull_images` — pull new images
3. `arcane_project_redeploy` — recreate with new images
4. `arcane_container_list` — verify healthy state

### Rollback

If a deployment goes wrong:
1. `arcane_project_down` — stop the broken deployment
2. Fix the compose content or roll back the image tag
3. `arcane_project_update` with corrected compose YAML
4. `arcane_project_up` — redeploy

### Troubleshooting

When something is broken, investigate systematically:

1. **Dashboard first** — `arcane_dashboard_get` + `arcane_dashboard_get_action_items`
2. **Container state** — `arcane_container_list` to find stopped/unhealthy containers
3. **Container detail** — `arcane_container_get` on the suspect container
4. **Port conflicts** — `arcane_port_list` if networking issues suspected
5. **Vulnerability check** — `arcane_vulnerability_get_environment_summary` if security related

### Cleanup

Free disk space safely:

1. `arcane_image_prune` — remove unused images (safe)
2. `arcane_network_prune` — remove unused networks (safe)
3. `arcane_volume_prune` — remove unused volumes (**confirm with user first** — data loss risk)
4. `arcane_system_prune` — nuclear option, **always confirm** before running

### GitOps Sync

For Git-based deployments:

1. `arcane_git_repo_list` — check configured repos
2. `arcane_git_repo_test` — verify connectivity
3. `arcane_gitops_create` — set up the sync with branch, path, and optional `folders`
4. `arcane_gitops_sync` — trigger initial sync
5. `arcane_gitops_get_status` — verify it succeeded

### Swarm Operations

For Docker Swarm clusters:

1. **Cluster setup** — `arcane_swarm_init_cluster` (first node) or `arcane_swarm_join_cluster` (additional nodes)
2. **Deploy services** — `arcane_swarm_create_service` with replicas, ports, networks
3. **Scale** — `arcane_swarm_scale_service` to adjust replica count
4. **Monitor** — `arcane_swarm_list_services` + `arcane_swarm_get_service` for task status
5. **Logs** — `arcane_swarm_get_service_logs` for debugging

### Auto-Update Management

Set up hands-off container updates:

1. `arcane_updater_get_status` — check current schedule
2. `arcane_container_set_auto_update` — enable per-container
3. `arcane_updater_run` with `dryRun: true` — preview what would update
4. `arcane_updater_run` — execute updates
5. `arcane_updater_get_history` — review what was updated

## Safety Rules

### Before Destructive Operations

**Always** do these before running destructive tools:

| Tool | Pre-flight check |
|------|-----------------|
| `arcane_container_delete` | Confirm container name with user. Ask about `volumes` flag. |
| `arcane_volume_delete` | Warn about data loss. Suggest `arcane_volume_backup_create` first. |
| `arcane_volume_prune` | List volumes first with `arcane_volume_list`. Get explicit confirmation. |
| `arcane_project_destroy` | Show project name and service count. Warn about `removeVolumes`. |
| `arcane_system_prune` | Explain this removes ALL unused resources. Get explicit "yes". |
| `arcane_swarm_leave_cluster` | Warn this disconnects from the cluster. Confirm `force` for managers. |
| `arcane_swarm_init_cluster` | Confirm this is a new cluster, not joining existing. |

### Never Do

- Never run `arcane_system_prune` without explicit user confirmation
- Never delete volumes without offering to back them up first
- Never run `arcane_updater_run` without `dryRun: true` first (unless user explicitly says to just do it)
- Never assume an environment ID — always verify or list them
- Never expose API keys, tokens, or passwords in tool output summaries

### Credential Handling

When creating registries (`arcane_registry_create`) or git repos (`arcane_git_repo_create`):
- Never echo back passwords or tokens in your response
- Mask sensitive values: "Registry created with credentials for user ***"
- For ECR: remind users that AWS credentials should use IAM roles when possible

## Quick Reference

### Container Lifecycle
```
create -> start -> stop -> restart -> update -> delete
                                  \-> redeploy
```

### Project Lifecycle
```
create -> up -> restart -> redeploy -> down -> destroy
             \-> pull_images (before redeploy)
```

### Swarm Service Lifecycle
```
create -> scale -> update -> delete
       \-> get_logs (anytime)
```

### Common Parameter Patterns

**Pagination** — Most list tools accept:
- `search` — filter by name/content
- `sort` — column to sort by
- `order` — `"asc"` or `"desc"`
- `start` — offset (default 0)
- `limit` — page size (default 20, max 100)

**Environment scoping** — Most tools require `environmentId` as the first parameter. Container registries and git repositories are global (no environment ID needed).
