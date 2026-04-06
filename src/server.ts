/**
 * MCP Server factory for Arcane
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { loadConfig } from "./config.js";
import { logger } from "./utils/logger.js";
import { registerAllTools } from "./tools/index.js";
import { registerResources } from "./resources/index.js";
import { registerPrompts } from "./prompts/index.js";

const VERSION = "2.0.1";

/**
 * Create and configure the Arcane MCP Server
 */
export function createArcaneServer(): McpServer {
  // Load configuration
  loadConfig();

  logger.info(`Creating Arcane MCP Server v${VERSION}`);

  const server = new McpServer({
    name: "arcane",
    version: VERSION,
  });

  // Register all tools
  registerAllTools(server);

  // Register MCP resources (read-only context data)
  registerResources(server);

  // Register MCP prompts (pre-built workflow templates)
  registerPrompts(server);

  logger.info("Arcane MCP Server initialized");

  return server;
}

export default { createArcaneServer };
