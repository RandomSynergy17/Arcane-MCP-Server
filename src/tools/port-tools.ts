/**
 * Port mapping tools for Arcane MCP Server
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { toolHandler } from "../utils/tool-helpers.js";
import { logger } from "../utils/logger.js";
import type { PortMapping } from "../types/arcane-types.js";

export function registerPortTools(server: McpServer): void {

  // arcane_port_list
  server.registerTool(
    "arcane_port_list",
    {
      title: "List port mappings",
      description: "List all port mappings across containers in an environment with pagination",
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
      inputSchema: {
      environmentId: z.string().describe("Environment ID"),
      search: z.string().optional().describe("Search query to filter ports"),
      sort: z.string().optional().describe("Column to sort by"),
      order: z.enum(["asc", "desc"]).optional().default("asc").describe("Sort direction"),
      start: z.number().optional().default(0).describe("Pagination start index"),
      limit: z.number().optional().default(20).describe("Items per page"),
    },
    },
    toolHandler(async ({ environmentId, search, sort, order, start, limit }, client) => {
      const response = await client.get<{
        data: PortMapping[];
        pagination: { total: number; start: number; limit: number };
      }>(`/environments/${environmentId}/ports`, { search, sort, order, start, limit });

      if (!response.data || response.data.length === 0) {
        return "No port mappings found.";
      }

      const lines = [`Found ${response.pagination.total} port mappings:\n`];
      for (const port of response.data) {
        const binding = port.publicPort
          ? `${port.ip || "0.0.0.0"}:${port.publicPort} -> ${port.privatePort}/${port.protocol}`
          : `${port.privatePort}/${port.protocol} (not published)`;
        lines.push(`${port.containerName}: ${binding}`);
      }

      return lines.join("\n");
    })
  );

  logger.debug("Registered port tools");
}
