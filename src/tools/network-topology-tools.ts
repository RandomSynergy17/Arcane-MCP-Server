/**
 * Network topology tools for Arcane MCP Server
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { toolHandler } from "../utils/tool-helpers.js";
import { logger } from "../utils/logger.js";

interface TopologyNode {
  id: string;
  type: string;
  name: string;
  status?: string;
}

interface TopologyEdge {
  source: string;
  target: string;
  type?: string;
}

interface NetworkTopology {
  nodes: TopologyNode[];
  edges: TopologyEdge[];
}

export function registerNetworkTopologyTools(server: McpServer): void {

  // arcane_network_get_topology
  server.registerTool(
    "arcane_network_get_topology",
    {
      title: "Get network topology",
      description: "Get the network topology graph showing containers, networks, and their connections",
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
      const response = await client.get<{ data: NetworkTopology }>(
        `/environments/${environmentId}/networks/topology`
      );

      const topology = response.data;
      const lines = [
        `Network Topology:`,
        `  Nodes: ${topology.nodes.length}`,
        `  Connections: ${topology.edges.length}`,
        "",
        "Nodes:",
      ];

      for (const node of topology.nodes) {
        const status = node.status ? ` [${node.status.toUpperCase()}]` : "";
        lines.push(`  [${node.type.toUpperCase()}] ${node.name}${status} (${node.id})`);
      }

      if (topology.edges.length > 0) {
        lines.push("");
        lines.push("Connections:");
        for (const edge of topology.edges) {
          const type = edge.type ? ` (${edge.type})` : "";
          lines.push(`  ${edge.source} -> ${edge.target}${type}`);
        }
      }

      return lines.join("\n");
    })
  );

  logger.debug("Registered network topology tools");
}
