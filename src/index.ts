#!/usr/bin/env node
/**
 * Arcane MCP Server - stdio transport entry point
 *
 * This is the default entry point for Claude Code and Claude Desktop.
 * Uses stdio (stdin/stdout) for JSON-RPC communication.
 *
 * CRITICAL: Never use console.log in this mode - it corrupts JSON-RPC.
 * All logging goes to stderr via the logger utility.
 */

import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createArcaneServer, getStdioRegistry } from "./server.js";
import { startConfigWatcher, type ConfigWatcherHandle } from "./utils/config-watcher.js";
import { logger } from "./utils/logger.js";

async function main() {
  // Check for TCP mode flag
  if (process.argv.includes("--tcp") || process.argv.includes("--http")) {
    // Dynamically import and run TCP server
    const { startTcpServer } = await import("./tcp-server.js");
    await startTcpServer();
    return;
  }

  logger.info("Starting Arcane MCP Server (stdio transport)");

  try {
    const server = createArcaneServer();
    const transport = new StdioServerTransport();

    await server.connect(transport);

    logger.info("Arcane MCP Server running on stdio");

    // Start hot-reload watcher on the tool-filter config.
    let watcher: ConfigWatcherHandle | null = null;
    const registry = getStdioRegistry();
    if (registry) {
      watcher = startConfigWatcher(registry);
    }

    const shutdown = async (signal: string) => {
      logger.info(`Received ${signal}, shutting down...`);
      watcher?.stop();
      await server.close();
      process.exit(0);
    };

    process.on("SIGINT", () => void shutdown("SIGINT"));
    process.on("SIGTERM", () => void shutdown("SIGTERM"));
  } catch (error) {
    logger.error("Failed to start server:", error);
    process.exit(1);
  }
}

main().catch((error) => {
  logger.error("Fatal error:", error);
  process.exit(1);
});
