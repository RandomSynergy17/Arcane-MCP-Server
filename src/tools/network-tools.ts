/**
 * Network management tools for Arcane MCP Server
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { toolHandler } from "../utils/tool-helpers.js";
import { DOCKER_SHORT_ID_LENGTH } from "../constants.js";
import { logger } from "../utils/logger.js";
import type { Network } from "../types/arcane-types.js";

export function registerNetworkTools(server: McpServer): void {

  // arcane_network_list
  server.registerTool(
    "arcane_network_list",
    {
      title: "List networks",
      description: "List Docker networks in an environment",
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
      inputSchema: {
      environmentId: z.string().describe("Environment ID"),
      search: z.string().optional().describe("Search query to filter networks"),
      sort: z.string().optional().describe("Column to sort by"),
      order: z.enum(["asc", "desc"]).optional().default("asc").describe("Sort direction"),
      start: z.number().optional().default(0).describe("Pagination start index"),
      limit: z.number().optional().default(20).describe("Items per page"),
    },
    },
    toolHandler(async ({ environmentId, search, sort, order, start, limit }, client) => {
      const response = await client.get<{
        data: Network[];
        pagination: { total: number; start: number; limit: number };
      }>(`/environments/${environmentId}/networks`, { search, sort, order, start, limit });

      if (!response.data || response.data.length === 0) {
        return "No networks found.";
      }

      const lines = [`Found ${response.pagination.total} networks:\n`];
      for (const net of response.data) {
        lines.push(`${net.name}`);
        lines.push(`    ID: ${net.id.substring(0, DOCKER_SHORT_ID_LENGTH)}`);
        lines.push(`    Driver: ${net.driver}`);
        lines.push(`    Scope: ${net.scope}`);
        if (net.ipam?.config?.[0]?.subnet) {
          lines.push(`    Subnet: ${net.ipam.config[0].subnet}`);
        }
        lines.push("");
      }

      return lines.join("\n");
    })
  );

  // arcane_network_get
  server.registerTool(
    "arcane_network_get",
    {
      title: "Get network details",
      description: "Get detailed information about a Docker network",
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
      inputSchema: {
      environmentId: z.string().describe("Environment ID"),
      networkId: z.string().describe("Network ID or name"),
    },
    },
    toolHandler(async ({ environmentId, networkId }, client) => {
      const response = await client.get<{ data: Network }>(
        `/environments/${environmentId}/networks/${networkId}`
      );

      const net = response.data;
      const lines = [
        `Network: ${net.name}`,
        `  ID: ${net.id}`,
        `  Driver: ${net.driver}`,
        `  Scope: ${net.scope}`,
        `  Internal: ${net.internal}`,
        `  Attachable: ${net.attachable}`,
      ];

      if (net.ipam?.config?.[0]) {
        const config = net.ipam.config[0];
        if (config.subnet) lines.push(`  Subnet: ${config.subnet}`);
        if (config.gateway) lines.push(`  Gateway: ${config.gateway}`);
      }

      if (net.containers && Object.keys(net.containers).length > 0) {
        lines.push("  Connected Containers:");
        for (const [_id, container] of Object.entries(net.containers)) {
          lines.push(`    - ${container.name} (${container.ipv4Address || "no IP"})`);
        }
      }

      return lines.join("\n");
    })
  );

  // arcane_network_create
  server.registerTool(
    "arcane_network_create",
    {
      title: "Create network",
      description: "Create a new Docker network",
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: false,
      },
      inputSchema: {
      environmentId: z.string().describe("Environment ID"),
      name: z.string().describe("Network name"),
      driver: z.enum(["bridge", "overlay", "host", "none", "macvlan"]).optional().default("bridge").describe("Network driver"),
      internal: z.boolean().optional().default(false).describe("Restrict external access"),
      attachable: z.boolean().optional().default(false).describe("Allow manual container attachment (for overlay)"),
      subnet: z.string().optional().describe("Subnet in CIDR format (e.g., 172.20.0.0/16)"),
      gateway: z.string().optional().describe("Gateway IP address"),
      ipRange: z.string().optional().describe("IP range for allocation"),
    },
    },
    toolHandler(async ({ environmentId, name, driver, internal, attachable, subnet, gateway, ipRange }, client) => {
      const body: Record<string, unknown> = { name, driver, internal, attachable };

      if (subnet || gateway || ipRange) {
        body.ipam = {
          driver: "default",
          config: [{ subnet, gateway, ipRange }],
        };
      }

      const response = await client.post<{ data: { id: string; name: string } }>(
        `/environments/${environmentId}/networks`,
        body
      );

      return `Network created successfully!\n  Name: ${response.data.name}\n  ID: ${response.data.id}`;
    })
  );

  // arcane_network_delete
  server.registerTool(
    "arcane_network_delete",
    {
      title: "Delete network",
      description: "[HIGH RISK] Delete a Docker network. Connected containers will be disconnected.",
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: false,
        openWorldHint: false,
      },
      inputSchema: {
      environmentId: z.string().describe("Environment ID"),
      networkId: z.string().describe("Network ID or name to delete"),
    },
    },
    toolHandler(async ({ environmentId, networkId }, client) => {
      await client.delete(`/environments/${environmentId}/networks/${networkId}`);
      return `Network ${networkId} deleted successfully.`;
    })
  );

  // arcane_network_prune
  server.registerTool(
    "arcane_network_prune",
    {
      title: "Prune networks",
      description: "[HIGH RISK] Remove all unused Docker networks. This cannot be undone.",
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: false,
        openWorldHint: false,
      },
      inputSchema: {
      environmentId: z.string().describe("Environment ID"),
    },
    },
    toolHandler(async ({ environmentId }, client) => {
      const response = await client.post<{ networksDeleted?: string[] }>(
        `/environments/${environmentId}/networks/prune`
      );

      const deleted = response.networksDeleted?.length || 0;
      return deleted > 0
        ? `Pruned ${deleted} unused networks: ${response.networksDeleted?.join(", ")}`
        : "No unused networks to prune.";
    })
  );

  // arcane_network_get_counts
  server.registerTool(
    "arcane_network_get_counts",
    {
      title: "Get network counts",
      description: "Get network counts for an environment",
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
      inputSchema: {
      environmentId: z.string().describe("Environment ID"),
    },
    },
    toolHandler(async ({ environmentId }, client) => {
      const response = await client.get<{
        total: number;
        bridge: number;
        overlay: number;
        other: number;
      }>(`/environments/${environmentId}/networks/counts`);

      return `Network Counts:\n  Total: ${response.total}\n  Bridge: ${response.bridge || 0}\n  Overlay: ${response.overlay || 0}\n  Other: ${response.other || 0}`;
    })
  );

  logger.debug("Registered network tools");
}
