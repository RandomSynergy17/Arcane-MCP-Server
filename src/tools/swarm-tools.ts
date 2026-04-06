/**
 * Docker Swarm management tools for Arcane MCP Server
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { toolHandler } from "../utils/tool-helpers.js";
import { logger } from "../utils/logger.js";
import type { SwarmService, SwarmClusterInfo } from "../types/arcane-types.js";

export function registerSwarmTools(server: McpServer): void {

  // arcane_swarm_list_services
  server.registerTool(
    "arcane_swarm_list_services",
    {
      title: "List Swarm services",
      description: "List Docker Swarm services in an environment with pagination",
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
      inputSchema: {
      environmentId: z.string().describe("Environment ID"),
      search: z.string().optional().describe("Search query to filter services"),
      sort: z.string().optional().describe("Column to sort by"),
      order: z.enum(["asc", "desc"]).optional().default("asc").describe("Sort direction"),
      start: z.number().optional().default(0).describe("Pagination start index"),
      limit: z.number().optional().default(20).describe("Items per page"),
    },
    },
    toolHandler(async ({ environmentId, search, sort, order, start, limit }, client) => {
      const response = await client.get<{
        data: SwarmService[];
        pagination: { total: number; start: number; limit: number };
      }>(`/environments/${environmentId}/swarm/services`, { search, sort, order, start, limit });

      if (!response.data || response.data.length === 0) {
        return "No swarm services found.";
      }

      const lines = [`Found ${response.pagination.total} swarm services:\n`];
      for (const svc of response.data) {
        lines.push(`${svc.name}`);
        lines.push(`    ID: ${svc.id}`);
        lines.push(`    Image: ${svc.image}`);
        lines.push(`    Replicas: ${svc.replicas}/${svc.desiredReplicas}`);
        if (svc.mode) lines.push(`    Mode: ${svc.mode}`);
        if (svc.ports && svc.ports.length > 0) {
          const portStr = svc.ports.map(p => `${p.publishedPort}:${p.targetPort}/${p.protocol}`).join(", ");
          lines.push(`    Ports: ${portStr}`);
        }
        lines.push("");
      }

      return lines.join("\n");
    })
  );

  // arcane_swarm_get_service
  server.registerTool(
    "arcane_swarm_get_service",
    {
      title: "Get Swarm service details",
      description: "Get detailed information about a Swarm service",
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
      inputSchema: {
      environmentId: z.string().describe("Environment ID"),
      serviceId: z.string().describe("Swarm service ID"),
    },
    },
    toolHandler(async ({ environmentId, serviceId }, client) => {
      const response = await client.get<{ data: SwarmService & { tasks?: Array<{ id: string; status: string; node?: string }> } }>(
        `/environments/${environmentId}/swarm/services/${serviceId}`
      );

      const svc = response.data;
      const lines = [
        `Swarm Service: ${svc.name}`,
        `  ID: ${svc.id}`,
        `  Image: ${svc.image}`,
        `  Replicas: ${svc.replicas}/${svc.desiredReplicas}`,
        `  Mode: ${svc.mode || "replicated"}`,
        `  Updated: ${svc.updatedAt || "N/A"}`,
      ];

      if (svc.ports && svc.ports.length > 0) {
        lines.push("  Ports:");
        for (const port of svc.ports) {
          lines.push(`    - ${port.publishedPort}:${port.targetPort}/${port.protocol}`);
        }
      }

      if (svc.tasks && svc.tasks.length > 0) {
        lines.push("  Tasks:");
        for (const task of svc.tasks) {
          lines.push(`    - ${task.id}: ${task.status}${task.node ? ` (node: ${task.node})` : ""}`);
        }
      }

      return lines.join("\n");
    })
  );

  // arcane_swarm_create_service
  server.registerTool(
    "arcane_swarm_create_service",
    {
      title: "Create Swarm service",
      description: "Create a new Docker Swarm service",
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: false,
      },
      inputSchema: {
        environmentId: z.string().describe("Environment ID"),
        name: z.string().describe("Service name"),
        image: z.string().describe("Docker image"),
        replicas: z.number().optional().default(1).describe("Number of replicas"),
        ports: z.array(z.object({
          publishedPort: z.number().describe("Published port"),
          targetPort: z.number().describe("Target port"),
          protocol: z.enum(["tcp", "udp"]).optional().default("tcp"),
        })).optional().describe("Port mappings"),
        env: z.record(z.string()).optional().describe("Environment variables"),
        networks: z.array(z.string()).optional().describe("Networks to attach"),
        command: z.array(z.string()).optional().describe("Command to run"),
      },
    },
    toolHandler(async ({ environmentId, name, image, replicas, ports, env, networks, command }, client) => {
      const response = await client.post<{ data: { id: string; name: string } }>(
        `/environments/${environmentId}/swarm/services`,
        { name, image, replicas, ports, env, networks, command }
      );

      return `Swarm service created: ${response.data.name} (ID: ${response.data.id})`;
    })
  );

  // arcane_swarm_update_service
  server.registerTool(
    "arcane_swarm_update_service",
    {
      title: "Update Swarm service",
      description: "Update a Docker Swarm service configuration",
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
      inputSchema: {
      environmentId: z.string().describe("Environment ID"),
      serviceId: z.string().describe("Swarm service ID"),
      image: z.string().optional().describe("New Docker image"),
      replicas: z.number().optional().describe("New replica count"),
      env: z.record(z.string()).optional().describe("Updated environment variables"),
      command: z.array(z.string()).optional().describe("Updated command"),
    },
    },
    toolHandler(async ({ environmentId, serviceId, image, replicas, env, command }, client) => {
      const body: Record<string, unknown> = {};
      if (image) body.image = image;
      if (replicas !== undefined) body.replicas = replicas;
      if (env) body.env = env;
      if (command) body.command = command;

      await client.put(`/environments/${environmentId}/swarm/services/${serviceId}`, body);
      return `Swarm service ${serviceId} updated.`;
    })
  );

  // arcane_swarm_delete_service
  server.registerTool(
    "arcane_swarm_delete_service",
    {
      title: "Delete Swarm service",
      description: "[HIGH RISK] Delete a Docker Swarm service permanently",
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: false,
        openWorldHint: false,
      },
      inputSchema: {
      environmentId: z.string().describe("Environment ID"),
      serviceId: z.string().describe("Swarm service ID"),
    },
    },
    toolHandler(async ({ environmentId, serviceId }, client) => {
      await client.delete(`/environments/${environmentId}/swarm/services/${serviceId}`);
      return `Swarm service ${serviceId} deleted.`;
    })
  );

  // arcane_swarm_scale_service
  server.registerTool(
    "arcane_swarm_scale_service",
    {
      title: "Scale Swarm service",
      description: "Scale a Swarm service to a specific number of replicas",
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: false,
      },
      inputSchema: {
      environmentId: z.string().describe("Environment ID"),
      serviceId: z.string().describe("Swarm service ID"),
      replicas: z.number().describe("Desired number of replicas"),
    },
    },
    toolHandler(async ({ environmentId, serviceId, replicas }, client) => {
      await client.post(`/environments/${environmentId}/swarm/services/${serviceId}/scale`, { replicas });
      return `Swarm service ${serviceId} scaled to ${replicas} replicas.`;
    })
  );

  // arcane_swarm_get_service_logs
  server.registerTool(
    "arcane_swarm_get_service_logs",
    {
      title: "Get Swarm service logs",
      description: "Get logs from a Swarm service",
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
      inputSchema: {
      environmentId: z.string().describe("Environment ID"),
      serviceId: z.string().describe("Swarm service ID"),
      tail: z.number().optional().default(100).describe("Number of log lines to return"),
      timestamps: z.boolean().optional().default(false).describe("Include timestamps"),
    },
    },
    toolHandler(async ({ environmentId, serviceId, tail, timestamps }, client) => {
      const response = await client.get<{ data: string }>(
        `/environments/${environmentId}/swarm/services/${serviceId}/logs`,
        { tail, timestamps }
      );

      return response.data || "No logs available.";
    })
  );

  // arcane_swarm_init_cluster
  server.registerTool(
    "arcane_swarm_init_cluster",
    {
      title: "Initialize Swarm cluster",
      description: "[CRITICAL] Initialize a new Docker Swarm cluster on this node",
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: false,
        openWorldHint: false,
      },
      inputSchema: {
      environmentId: z.string().describe("Environment ID"),
      advertiseAddr: z.string().optional().describe("Advertise address for the swarm manager"),
      listenAddr: z.string().optional().describe("Listen address for inter-node communication"),
      forceNewCluster: z.boolean().optional().default(false).describe("Force creation of a new cluster"),
    },
    },
    toolHandler(async ({ environmentId, advertiseAddr, listenAddr, forceNewCluster }, client) => {
      const response = await client.post<{ data: { nodeId: string; joinToken?: string } }>(
        `/environments/${environmentId}/swarm/init`,
        { advertiseAddr, listenAddr, forceNewCluster }
      );

      const lines = [
        "Swarm cluster initialized!",
        `  Node ID: ${response.data.nodeId}`,
      ];
      if (response.data.joinToken) {
        lines.push(`  Join Token: ${response.data.joinToken}`);
      }

      return lines.join("\n");
    })
  );

  // arcane_swarm_join_cluster
  server.registerTool(
    "arcane_swarm_join_cluster",
    {
      title: "Join Swarm cluster",
      description: "Join an existing Docker Swarm cluster",
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: false,
      },
      inputSchema: {
      environmentId: z.string().describe("Environment ID"),
      joinToken: z.string().describe("Swarm join token"),
      remoteAddrs: z.array(z.string()).describe("Manager addresses to join (host:port)"),
      advertiseAddr: z.string().optional().describe("Advertise address for this node"),
      listenAddr: z.string().optional().describe("Listen address for inter-node communication"),
    },
    },
    toolHandler(async ({ environmentId, joinToken, remoteAddrs, advertiseAddr, listenAddr }, client) => {
      await client.post(`/environments/${environmentId}/swarm/join`, {
        joinToken, remoteAddrs, advertiseAddr, listenAddr,
      });
      return "Successfully joined the swarm cluster.";
    })
  );

  // arcane_swarm_leave_cluster
  server.registerTool(
    "arcane_swarm_leave_cluster",
    {
      title: "Leave Swarm cluster",
      description: "[CRITICAL RISK] Leave the Docker Swarm cluster. Use force=true for managers.",
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: false,
        openWorldHint: false,
      },
      inputSchema: {
      environmentId: z.string().describe("Environment ID"),
      force: z.boolean().optional().default(false).describe("Force leave (required for managers)"),
    },
    },
    toolHandler(async ({ environmentId, force }, client) => {
      await client.post(`/environments/${environmentId}/swarm/leave`, { force });
      return "Successfully left the swarm cluster.";
    })
  );

  // arcane_swarm_get_cluster_info
  server.registerTool(
    "arcane_swarm_get_cluster_info",
    {
      title: "Get Swarm cluster info",
      description: "Get Docker Swarm cluster information and node counts",
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
      const response = await client.get<{ data: SwarmClusterInfo }>(
        `/environments/${environmentId}/swarm/info`
      );

      const info = response.data;
      const lines = [
        `Swarm Cluster Info:`,
        `  Cluster ID: ${info.id}`,
        `  Version: ${info.version}`,
        `  Created: ${info.createdAt}`,
        `  Updated: ${info.updatedAt}`,
        `  Nodes: ${info.nodeCount} (${info.managerCount} managers, ${info.workerCount} workers)`,
      ];

      return lines.join("\n");
    })
  );

  logger.debug("Registered swarm tools");
}
