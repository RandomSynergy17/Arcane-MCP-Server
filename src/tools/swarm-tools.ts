/**
 * Docker Swarm management tools for Arcane MCP Server
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { toolHandler } from "../utils/tool-helpers.js";
import { moduleRegistrar, type ToolRegistry } from "./registry.js";
import { DEFAULT_LOG_TAIL, MAX_LOG_LINES } from "../constants.js";
import { formatLogResult } from "../utils/log-format.js";
import type { SwarmService, SwarmClusterInfo } from "../types/arcane-types.js";

export function registerSwarmTools(server: McpServer, registry?: ToolRegistry): void {
  const register = moduleRegistrar(server, registry, "swarm");

  // arcane_swarm_list_services
  register(
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
        pagination: { totalItems: number };
      }>(`/environments/${environmentId}/swarm/services`, { search, sort, order, start, limit });

      if (!response.data || response.data.length === 0) {
        return "No swarm services found.";
      }

      const lines = [`Found ${response.pagination.totalItems} swarm services:\n`];
      for (const svc of response.data) {
        lines.push(`${svc.name}`);
        lines.push(`    ID: ${svc.id}`);
        lines.push(`    Image: ${svc.image}`);
        lines.push(`    Replicas: ${svc.runningReplicas}/${svc.replicas}`);
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
  register(
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
      // Detail endpoint returns the raw Docker service object (Docker-cased spec)
      const response = await client.get<{
        data: {
          id: string;
          updatedAt?: string;
          version?: { Index?: number };
          spec?: {
            Name?: string;
            Mode?: { Replicated?: { Replicas?: number }; Global?: object };
            TaskTemplate?: { ContainerSpec?: { Image?: string } };
            EndpointSpec?: { Ports?: Array<{ Protocol?: string; TargetPort?: number; PublishedPort?: number }> };
          };
          endpoint?: { Ports?: Array<{ Protocol?: string; TargetPort?: number; PublishedPort?: number }> };
        };
      }>(`/environments/${environmentId}/swarm/services/${serviceId}`);

      const svc = response.data;
      const spec = svc.spec || {};
      const mode = spec.Mode?.Global ? "global" : "replicated";
      const replicas = spec.Mode?.Replicated?.Replicas;
      const lines = [
        `Swarm Service: ${spec.Name || svc.id}`,
        `  ID: ${svc.id}`,
        `  Image: ${spec.TaskTemplate?.ContainerSpec?.Image || "unknown"}`,
        `  Mode: ${mode}${replicas !== undefined ? ` (${replicas} replicas)` : ""}`,
        `  Updated: ${svc.updatedAt || "N/A"}`,
      ];

      const ports = svc.endpoint?.Ports || spec.EndpointSpec?.Ports;
      if (ports && ports.length > 0) {
        lines.push("  Ports:");
        for (const port of ports) {
          lines.push(`    - ${port.PublishedPort}:${port.TargetPort}/${port.Protocol}`);
        }
      }

      // Tasks live on their own endpoint
      const tasks = await client
        .get<{ data: Array<{ id: string; currentState: string; desiredState: string; nodeName?: string; error?: string }> }>(
          `/environments/${environmentId}/swarm/services/${serviceId}/tasks`,
          { limit: 20 }
        )
        .catch(() => undefined);
      if (tasks?.data && tasks.data.length > 0) {
        lines.push("  Tasks:");
        for (const task of tasks.data) {
          lines.push(`    - ${task.id}: ${task.currentState} (desired: ${task.desiredState})${task.nodeName ? ` on ${task.nodeName}` : ""}${task.error ? ` — ${task.error}` : ""}`);
        }
      }

      return lines.join("\n");
    })
  );

  // arcane_swarm_create_service
  register(
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
      // The API takes a raw Docker ServiceSpec
      const spec: Record<string, unknown> = {
        Name: name,
        Mode: { Replicated: { Replicas: replicas } },
        TaskTemplate: {
          ContainerSpec: {
            Image: image,
            ...(env ? { Env: Object.entries(env).map(([k, v]) => `${k}=${v}`) } : {}),
            ...(command ? { Command: command } : {}),
          },
          ...(networks ? { Networks: networks.map((target) => ({ Target: target })) } : {}),
        },
        ...(ports
          ? {
              EndpointSpec: {
                Ports: ports.map((p) => ({
                  Protocol: p.protocol,
                  TargetPort: p.targetPort,
                  PublishedPort: p.publishedPort,
                })),
              },
            }
          : {}),
      };

      const response = await client.post<{ data: { id: string; warnings?: string[] | null } }>(
        `/environments/${environmentId}/swarm/services`,
        { spec }
      );

      let text = `Swarm service created: ${name} (ID: ${response.data.id})`;
      if (response.data.warnings?.length) text += `\nWarnings: ${response.data.warnings.join("; ")}`;
      return text;
    })
  );

  // arcane_swarm_update_service
  register(
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
      // Updates require the full current spec plus the swarm version index
      const current = await client.get<{
        data: {
          version?: { Index?: number };
          spec?: {
            Mode?: { Replicated?: { Replicas?: number } };
            TaskTemplate?: { ContainerSpec?: Record<string, unknown> };
          } & Record<string, unknown>;
        };
      }>(`/environments/${environmentId}/swarm/services/${serviceId}`);

      const spec = (current.data.spec || {}) as Record<string, unknown> & {
        Mode?: { Replicated?: { Replicas?: number } };
        TaskTemplate?: { ContainerSpec?: Record<string, unknown> };
      };
      const version = current.data.version?.Index;
      if (version === undefined) {
        throw new Error("Could not determine the service version required for updates.");
      }

      spec.TaskTemplate = spec.TaskTemplate || {};
      spec.TaskTemplate.ContainerSpec = spec.TaskTemplate.ContainerSpec || {};
      if (image) spec.TaskTemplate.ContainerSpec.Image = image;
      if (env) spec.TaskTemplate.ContainerSpec.Env = Object.entries(env).map(([k, v]) => `${k}=${v}`);
      if (command) spec.TaskTemplate.ContainerSpec.Command = command;
      if (replicas !== undefined) {
        spec.Mode = { Replicated: { Replicas: replicas } };
      }

      await client.put(`/environments/${environmentId}/swarm/services/${serviceId}`, { spec, version });
      return `Swarm service ${serviceId} updated.`;
    })
  );

  // arcane_swarm_delete_service
  register(
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
  register(
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
  register(
    "arcane_swarm_get_service_logs",
    {
      title: "Get Swarm service logs",
      description: "Fetch recent log lines of a Swarm service. For live following, call repeatedly with 'since' set to the newest timestamp seen — each call then returns only new lines.",
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
      inputSchema: {
      environmentId: z.string().describe("Environment ID"),
      serviceId: z.string().describe("Swarm service ID"),
      tail: z.number().optional().default(DEFAULT_LOG_TAIL).describe("Number of most recent lines to return initially"),
      since: z.string().optional().describe("Only return lines after this time — RFC3339 timestamp (from a previous call) or relative duration like '5m'"),
      timestamps: z.boolean().optional().default(true).describe("Prefix each line with its timestamp (needed for incremental follow-up via 'since')"),
      maxLines: z.number().optional().default(200).describe(`Hard cap on returned lines to protect the context window (max ${MAX_LOG_LINES})`),
    },
    },
    toolHandler(async ({ environmentId, serviceId, tail, since, timestamps, maxLines }, client) => {
      const result = await client.fetchLogs(
        `/environments/${environmentId}/ws/swarm/services/${serviceId}/logs`,
        { follow: false, tail, since, timestamps },
        Math.min(maxLines, MAX_LOG_LINES)
      );

      return formatLogResult(`service ${serviceId}`, result, timestamps);
    })
  );

  // arcane_swarm_init_cluster
  register(
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
      const response = await client.post<{ data: { nodeId: string } }>(
        `/environments/${environmentId}/swarm/init`,
        { advertiseAddr, listenAddr, forceNewCluster, spec: {} }
      );

      return [
        "Swarm cluster initialized!",
        `  Node ID: ${response.data.nodeId}`,
        "Use the join-tokens endpoint in Arcane to retrieve worker/manager join tokens.",
      ].join("\n");
    })
  );

  // arcane_swarm_join_cluster
  register(
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
  register(
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
  register(
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
        `  Created: ${info.createdAt}`,
        `  Updated: ${info.updatedAt}`,
      ];

      // Node counts come from the nodes endpoint
      const nodes = await client
        .get<{ data: Array<{ role: string; status: string }> }>(
          `/environments/${environmentId}/swarm/nodes`,
          { limit: 100 }
        )
        .catch(() => undefined);
      if (nodes?.data) {
        const managers = nodes.data.filter((n) => n.role === "manager").length;
        const workers = nodes.data.length - managers;
        lines.push(`  Nodes: ${nodes.data.length} (${managers} managers, ${workers} workers)`);
      }

      return lines.join("\n");
    })
  );

}
