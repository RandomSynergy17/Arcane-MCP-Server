/**
 * Tool registry for Arcane MCP Server
 * Registers all available tools with the MCP server
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { logger } from "../utils/logger.js";
import { ToolRegistry } from "./registry.js";
import type { ToolsConfig } from "../config.js";

// Import tool registrars
import { registerAuthTools } from "./auth-tools.js";
import { registerEnvironmentTools } from "./environment-tools.js";
import { registerContainerTools } from "./container-tools.js";
import { registerImageTools } from "./image-tools.js";
import { registerNetworkTools } from "./network-tools.js";
import { registerVolumeTools } from "./volume-tools.js";
import { registerProjectTools } from "./project-tools.js";
import { registerGitopsTools } from "./gitops-tools.js";
import { registerRegistryTools } from "./registry-tools.js";
import { registerTemplateTools } from "./template-tools.js";
import { registerSystemTools } from "./system-tools.js";
import { registerJobTools } from "./job-tools.js";
import { registerNotificationTools } from "./notification-tools.js";
import { registerEventTools } from "./event-tools.js";
import { registerUserTools } from "./user-tools.js";
import { registerSettingsTools } from "./settings-tools.js";
import { registerSwarmTools } from "./swarm-tools.js";
import { registerWebhookTools } from "./webhook-tools.js";
import { registerVulnerabilityTools } from "./vulnerability-tools.js";
import { registerImageUpdateTools } from "./image-update-tools.js";
import { registerBuildTools } from "./build-tools.js";
import { registerNetworkTopologyTools } from "./network-topology-tools.js";
import { registerDashboardTools } from "./dashboard-tools.js";
import { registerPortTools } from "./port-tools.js";
import { registerUpdaterTools } from "./updater-tools.js";

/**
 * Register all tools with the MCP server, capturing each registration into a
 * fresh `ToolRegistry`. When `toolsConfig` is provided, the resolved
 * enabled-set is applied (tools outside the set are disabled).
 *
 * Returns the registry so callers can wire hot reload (see server.ts).
 */
export function registerAllTools(server: McpServer, toolsConfig?: ToolsConfig): ToolRegistry {
  logger.info("Registering Arcane tools...");

  const registry = new ToolRegistry();

  registerAuthTools(server, registry);
  registerEnvironmentTools(server, registry);
  registerContainerTools(server, registry);
  registerImageTools(server, registry);
  registerNetworkTools(server, registry);
  registerVolumeTools(server, registry);
  registerProjectTools(server, registry);
  registerGitopsTools(server, registry);
  registerRegistryTools(server, registry);
  registerTemplateTools(server, registry);
  registerSystemTools(server, registry);
  registerJobTools(server, registry);
  registerNotificationTools(server, registry);
  registerEventTools(server, registry);
  registerUserTools(server, registry);
  registerSettingsTools(server, registry);
  registerSwarmTools(server, registry);
  registerWebhookTools(server, registry);
  registerVulnerabilityTools(server, registry);
  registerImageUpdateTools(server, registry);
  registerBuildTools(server, registry);
  registerNetworkTopologyTools(server, registry);
  registerDashboardTools(server, registry);
  registerPortTools(server, registry);
  registerUpdaterTools(server, registry);

  const { enabled, disabled } = registry.applyFilter(toolsConfig);
  if (disabled > 0) {
    logger.info(`Registered ${registry.allToolNames().length} Arcane tools (${enabled} enabled, ${disabled} disabled by filter)`);
  } else {
    logger.info(`Registered ${registry.allToolNames().length} Arcane tools (all enabled)`);
  }

  return registry;
}
