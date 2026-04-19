/**
 * MCP Resources for Arcane MCP Server
 * Provides read-only context data that clients can pull into conversations.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getArcaneClient } from "../client/arcane-client.js";
import { formatError } from "../utils/error-handler.js";
import { MCP_PROTOCOL_VERSION } from "../constants.js";
import { getConfig } from "../config.js";
import { getActiveRegistry } from "../tools/registry.js";
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
          `API Base URL: ${baseUrl}`,
          `Default Environment: ${defaultEnvId || "not set"}`,
          `Protocol: MCP ${MCP_PROTOCOL_VERSION}`,
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

  // Resource: Full tool inventory with module + current enabled state.
  // Consumed by the /arcane:configure slash command to compute the diff
  // between the user's proposed filter and what's currently live.
  server.resource(
    "arcane-tools",
    "arcane://tools",
    {
      description:
        "JSON inventory of every Arcane MCP tool (name, module, enabled) so clients can diff a proposed tool-filter change against the live set",
    },
    async (_uri) => {
      const registry = getActiveRegistry();
      if (!registry) {
        return {
          contents: [
            {
              uri: "arcane://tools",
              mimeType: "application/json",
              text: JSON.stringify({ tools: [], note: "registry not initialised" }, null, 2),
            },
          ],
        };
      }

      const tools = registry.all().map((entry) => ({
        name: entry.name,
        module: entry.module,
        enabled: entry.handle.enabled,
      }));

      const summary = {
        total: tools.length,
        enabled: tools.filter((t) => t.enabled).length,
        disabled: tools.filter((t) => !t.enabled).length,
        modules: registry.allModules(),
      };

      return {
        contents: [
          {
            uri: "arcane://tools",
            mimeType: "application/json",
            text: JSON.stringify({ summary, tools }, null, 2),
          },
        ],
      };
    },
  );

  // Resource: Upgrade notice for installs that haven't configured tool filtering yet.
  // Registered unconditionally; the body explains configuration and only flags an
  // action when the loaded config has no `tools` key.
  server.resource(
    "arcane-tools-config-notice",
    "arcane://tools-config-notice",
    {
      description:
        "Explains tool filtering and points the user at /arcane:configure when the server is running with the unfiltered full tool set",
    },
    async (_uri) => {
      let unconfigured = false;
      try {
        unconfigured = !!getConfig().toolsUnconfigured;
      } catch {
        unconfigured = false;
      }

      const lines: string[] = [];
      if (unconfigured) {
        lines.push("Arcane MCP Server is currently exposing all 180 tools.");
        lines.push("");
        lines.push("You can reduce context bloat by picking a preset:");
        lines.push("  - commonly-used — containers, images, projects, volumes, networks (~52 tools)");
        lines.push("  - read-only — list / get / inspect only (~60 tools)");
        lines.push("  - minimal — dashboard + container list/logs/stats (~5 tools)");
        lines.push("  - deploy — projects, gitops, templates, registries, build (~40 tools)");
        lines.push("");
        lines.push("Run /arcane:configure in Claude Code, or invoke the `arcane_configure_tools` prompt.");
      } else {
        lines.push("Tool filtering is configured. No action needed.");
        lines.push("Re-run /arcane:configure (or invoke the `arcane_configure_tools` prompt) to change the active preset.");
      }

      return {
        contents: [
          {
            uri: "arcane://tools-config-notice",
            mimeType: "text/plain",
            text: lines.join("\n"),
          },
        ],
      };
    },
  );

  logger.info("Registered 4 MCP resources");
}
