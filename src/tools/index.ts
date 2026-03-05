/**
 * Tool registry for Arcane MCP Server
 * Registers all available tools with the MCP server
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { logger } from "../utils/logger.js";

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

/**
 * Register all tools with the MCP server
 */
export function registerAllTools(server: McpServer): void {
  logger.info("Registering Arcane tools...");

  // Authentication & OIDC
  registerAuthTools(server);

  // Environments
  registerEnvironmentTools(server);

  // Containers
  registerContainerTools(server);

  // Images
  registerImageTools(server);

  // Networks
  registerNetworkTools(server);

  // Volumes (including file operations and backups)
  registerVolumeTools(server);

  // Projects / Docker Compose Stacks
  registerProjectTools(server);

  // GitOps
  registerGitopsTools(server);

  // Container Registries
  registerRegistryTools(server);

  // Templates
  registerTemplateTools(server);

  // System operations
  registerSystemTools(server);

  // Jobs & Scheduling
  registerJobTools(server);

  // Notifications
  registerNotificationTools(server);

  // Events
  registerEventTools(server);

  // Users
  registerUserTools(server);

  // Settings
  registerSettingsTools(server);

  logger.info("Registered all Arcane tools");
}
