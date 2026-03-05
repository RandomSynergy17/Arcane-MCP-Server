/**
 * MCP Server factory for Arcane
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { loadConfig } from "./config.js";
import { logger } from "./utils/logger.js";
import { registerAllTools } from "./tools/index.js";

const VERSION = "1.0.0";

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

  logger.info("Arcane MCP Server initialized");

  return server;
}

export default { createArcaneServer };
