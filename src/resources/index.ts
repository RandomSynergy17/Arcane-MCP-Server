/**
 * MCP Resources for Arcane MCP Server
 * Provides read-only context data that clients can pull into conversations.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getArcaneClient } from "../client/arcane-client.js";
import { formatError } from "../utils/error-handler.js";
import { logger } from "../utils/logger.js";

interface Environment {
  id: string;
  name: string;
  apiUrl?: string;
  status?: string;
}

export function registerResources(server: McpServer): void {
  // Resource: List of available environments
  server.resource(
    "arcane-environments",
    "arcane://environments",
    { description: "Lists all available Arcane environments with IDs and names" },
    async (_uri) => {
      try {
        const client = getArcaneClient();
        const response = await client.get<{
          data: Environment[];
          pagination: { total: number; start: number; limit: number };
        }>("/environments", { start: 0, limit: 100 });

        if (!response.data || response.data.length === 0) {
          return {
            contents: [
              {
                uri: "arcane://environments",
                mimeType: "text/plain",
                text: "No environments found.",
              },
            ],
          };
        }

        const lines = [`Arcane Environments (${response.pagination.total} total):\n`];
        for (const env of response.data) {
          const status = env.status || "unknown";
          lines.push(`- ${env.name} (ID: ${env.id}) [${status.toUpperCase()}]`);
          if (env.apiUrl) lines.push(`  URL: ${env.apiUrl}`);
        }

        return {
          contents: [
            {
              uri: "arcane://environments",
              mimeType: "text/plain",
              text: lines.join("\n"),
            },
          ],
        };
      } catch (error) {
        logger.error("Failed to read environments resource", error);
        return {
          contents: [
            {
              uri: "arcane://environments",
              mimeType: "text/plain",
              text: `Error reading environments: ${formatError(error)}`,
            },
          ],
        };
      }
    }
  );

  // Resource: Server version info
  server.resource(
    "arcane-version",
    "arcane://version",
    { description: "Returns Arcane MCP server version and configuration info" },
    async (_uri) => {
      try {
        const client = getArcaneClient();
        const baseUrl = client.getBaseUrl();
        const defaultEnvId = client.getDefaultEnvironmentId();

        const versionInfo = [
          "Arcane MCP Server",
          `Version: 2.0.0`,
          `API Base URL: ${baseUrl}`,
          `Default Environment: ${defaultEnvId || "not set"}`,
          `MCP SDK: @modelcontextprotocol/sdk ^1.12.0`,
          `Protocol: MCP 2025-11-25`,
        ];

        return {
          contents: [
            {
              uri: "arcane://version",
              mimeType: "text/plain",
              text: versionInfo.join("\n"),
            },
          ],
        };
      } catch (error) {
        logger.error("Failed to read version resource", error);
        return {
          contents: [
            {
              uri: "arcane://version",
              mimeType: "text/plain",
              text: `Error reading version: ${formatError(error)}`,
            },
          ],
        };
      }
    }
  );

  logger.info("Registered 2 MCP resources");
}
