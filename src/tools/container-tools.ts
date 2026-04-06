/**
 * Container management tools for Arcane MCP Server
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { toolHandler } from "../utils/tool-helpers.js";
import { DOCKER_SHORT_ID_LENGTH, MAX_DISPLAY_LABELS } from "../constants.js";
import { logger } from "../utils/logger.js";

interface Container {
  id: string;
  name: string;
  image: string;
  status: string;
  state: string;
  created: string;
  ports?: Array<{ privatePort: number; publicPort?: number; type: string }>;
  labels?: Record<string, string>;
}

export function registerContainerTools(server: McpServer): void {

  // arcane_container_list
  server.registerTool(
    "arcane_container_list",
    {
      title: "List containers",
      description: "List Docker containers in an environment with pagination and filtering",
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
      inputSchema: {
      environmentId: z.string().describe("Environment ID"),
      search: z.string().optional().describe("Search query to filter containers"),
      sort: z.string().optional().describe("Column to sort by"),
      order: z.enum(["asc", "desc"]).optional().default("asc").describe("Sort direction"),
      start: z.number().optional().default(0).describe("Pagination start index"),
      limit: z.number().optional().default(20).describe("Items per page"),
      includeInternal: z.boolean().optional().default(false).describe("Include internal containers"),
    },
    },
    toolHandler(async ({ environmentId, search, sort, order, start, limit, includeInternal }, client) => {
      const response = await client.get<{
        data: Container[];
        pagination: { total: number; start: number; limit: number };
      }>(`/environments/${environmentId}/containers`, { search, sort, order, start, limit, includeInternal });

      if (!response.data || response.data.length === 0) {
        return "No containers found.";
      }

      const lines = [`Found ${response.pagination.total} containers:\n`];
      for (const container of response.data) {
        const status = container.state === "running" ? "[RUNNING]" : "[STOPPED]";
        lines.push(`${status} ${container.name}`);
        lines.push(`    ID: ${container.id.substring(0, DOCKER_SHORT_ID_LENGTH)}`);
        lines.push(`    Image: ${container.image}`);
        lines.push(`    Status: ${container.status}`);
        if (container.ports && container.ports.length > 0) {
          const portStr = container.ports
            .filter(p => p.publicPort)
            .map(p => `${p.publicPort}:${p.privatePort}/${p.type}`)
            .join(", ");
          if (portStr) lines.push(`    Ports: ${portStr}`);
        }
        lines.push("");
      }

      return lines.join("\n");
    })
  );

  // arcane_container_get
  server.registerTool(
    "arcane_container_get",
    {
      title: "Get container details",
      description: "Get detailed information about a specific container",
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
      inputSchema: {
      environmentId: z.string().describe("Environment ID"),
      containerId: z.string().describe("Container ID or name"),
    },
    },
    toolHandler(async ({ environmentId, containerId }, client) => {
      const response = await client.get<{ data: Container & { config?: Record<string, unknown> } }>(
        `/environments/${environmentId}/containers/${containerId}`
      );

      const c = response.data;
      const lines = [
        `Container: ${c.name}`,
        `  ID: ${c.id}`,
        `  Image: ${c.image}`,
        `  State: ${c.state}`,
        `  Status: ${c.status}`,
        `  Created: ${c.created}`,
      ];

      if (c.ports && c.ports.length > 0) {
        lines.push("  Ports:");
        for (const port of c.ports) {
          lines.push(`    - ${port.publicPort || "N/A"}:${port.privatePort}/${port.type}`);
        }
      }

      if (c.labels && Object.keys(c.labels).length > 0) {
        lines.push("  Labels:");
        for (const [key, value] of Object.entries(c.labels).slice(0, MAX_DISPLAY_LABELS)) {
          lines.push(`    - ${key}: ${value}`);
        }
        if (Object.keys(c.labels).length > MAX_DISPLAY_LABELS) {
          lines.push(`    ... and ${Object.keys(c.labels).length - MAX_DISPLAY_LABELS} more`);
        }
      }

      return lines.join("\n");
    })
  );

  // arcane_container_create
  server.registerTool(
    "arcane_container_create",
    {
      title: "Create container",
      description: "Create a new Docker container",
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: false,
      },
      inputSchema: {
        environmentId: z.string().describe("Environment ID"),
        name: z.string().describe("Container name"),
        image: z.string().describe("Docker image to use"),
        ports: z.array(z.object({
          containerPort: z.number().describe("Port inside container"),
          hostPort: z.number().optional().describe("Port on host"),
          protocol: z.enum(["tcp", "udp"]).optional().default("tcp"),
        })).optional().describe("Port mappings"),
        env: z.record(z.string()).optional().describe("Environment variables"),
        volumes: z.array(z.object({
          hostPath: z.string().describe("Path on host"),
          containerPath: z.string().describe("Path in container"),
          readOnly: z.boolean().optional().default(false),
        })).optional().describe("Volume mounts"),
        restart: z.enum(["no", "always", "unless-stopped", "on-failure"]).optional().describe("Restart policy"),
        network: z.string().optional().describe("Network to connect to"),
        command: z.array(z.string()).optional().describe("Command to run"),
      },
    },
    toolHandler(async ({ environmentId, name, image, ports, env, volumes, restart, network, command }, client) => {
      const response = await client.post<{ data: { id: string; name: string } }>(
        `/environments/${environmentId}/containers`,
        { name, image, ports, env, volumes, restartPolicy: restart, network, command }
      );

      return `Container created successfully!\n  Name: ${response.data.name}\n  ID: ${response.data.id}`;
    })
  );

  // arcane_container_start
  server.registerTool(
    "arcane_container_start",
    {
      title: "Start container",
      description: "Start a stopped container",
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: false,
      },
      inputSchema: {
      environmentId: z.string().describe("Environment ID"),
      containerId: z.string().describe("Container ID or name to start"),
    },
    },
    toolHandler(async ({ environmentId, containerId }, client) => {
      await client.post(`/environments/${environmentId}/containers/${containerId}/start`);
      return `Container ${containerId} started successfully.`;
    })
  );

  // arcane_container_stop
  server.registerTool(
    "arcane_container_stop",
    {
      title: "Stop container",
      description: "Stop a running container",
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
      inputSchema: {
      environmentId: z.string().describe("Environment ID"),
      containerId: z.string().describe("Container ID or name to stop"),
    },
    },
    toolHandler(async ({ environmentId, containerId }, client) => {
      await client.post(`/environments/${environmentId}/containers/${containerId}/stop`);
      return `Container ${containerId} stopped successfully.`;
    })
  );

  // arcane_container_restart
  server.registerTool(
    "arcane_container_restart",
    {
      title: "Restart container",
      description: "Restart a container",
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: false,
      },
      inputSchema: {
      environmentId: z.string().describe("Environment ID"),
      containerId: z.string().describe("Container ID or name to restart"),
    },
    },
    toolHandler(async ({ environmentId, containerId }, client) => {
      await client.post(`/environments/${environmentId}/containers/${containerId}/restart`);
      return `Container ${containerId} restarted successfully.`;
    })
  );

  // arcane_container_update
  server.registerTool(
    "arcane_container_update",
    {
      title: "Update container",
      description: "Pull the latest image and recreate a container with the same configuration. Automatically pulls latest image before recreating.",
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: false,
      },
      inputSchema: {
      environmentId: z.string().describe("Environment ID"),
      containerId: z.string().describe("Container ID or name to update"),
    },
    },
    toolHandler(async ({ environmentId, containerId }, client) => {
      await client.post(`/environments/${environmentId}/containers/${containerId}/update`);
      return `Container ${containerId} updated successfully.`;
    })
  );

  // arcane_container_delete
  server.registerTool(
    "arcane_container_delete",
    {
      title: "Delete container",
      description: "[HIGH RISK] Delete a Docker container permanently. Use force=true to delete running containers, volumes=true to remove associated volumes.",
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: false,
        openWorldHint: false,
      },
      inputSchema: {
      environmentId: z.string().describe("Environment ID"),
      containerId: z.string().describe("Container ID or name to delete"),
      force: z.boolean().optional().default(false).describe("Force delete even if running"),
      volumes: z.boolean().optional().default(false).describe("Remove associated anonymous volumes"),
    },
    },
    toolHandler(async ({ environmentId, containerId, force, volumes }, client) => {
      await client.delete(`/environments/${environmentId}/containers/${containerId}`, { force, volumes });
      return `Container ${containerId} deleted successfully.`;
    })
  );

  // arcane_container_redeploy
  server.registerTool(
    "arcane_container_redeploy",
    {
      title: "Redeploy container",
      description: "Redeploy a single container (pull latest image and recreate)",
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: false,
      },
      inputSchema: {
      environmentId: z.string().describe("Environment ID"),
      containerId: z.string().describe("Container ID or name to redeploy"),
    },
    },
    toolHandler(async ({ environmentId, containerId }, client) => {
      await client.post(`/environments/${environmentId}/containers/${containerId}/redeploy`);
      return `Container ${containerId} redeployed successfully.`;
    })
  );

  // arcane_container_set_auto_update
  server.registerTool(
    "arcane_container_set_auto_update",
    {
      title: "Set container auto-update",
      description: "Enable or disable automatic updates for a specific container",
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
      inputSchema: {
      environmentId: z.string().describe("Environment ID"),
      containerId: z.string().describe("Container ID or name"),
      enabled: z.boolean().describe("Enable (true) or disable (false) auto-update"),
    },
    },
    toolHandler(async ({ environmentId, containerId, enabled }, client) => {
      await client.put(`/environments/${environmentId}/containers/${containerId}/auto-update`, { enabled });
      return `Auto-update ${enabled ? "enabled" : "disabled"} for container ${containerId}.`;
    })
  );

  // arcane_container_get_counts
  server.registerTool(
    "arcane_container_get_counts",
    {
      title: "Get container counts",
      description: "Get container status counts for an environment (running, stopped, etc.)",
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
      inputSchema: {
      environmentId: z.string().describe("Environment ID"),
      includeInternal: z.boolean().optional().default(false).describe("Include internal containers"),
    },
    },
    toolHandler(async ({ environmentId, includeInternal }, client) => {
      const response = await client.get<{
        running: number;
        stopped: number;
        paused: number;
        total: number;
      }>(`/environments/${environmentId}/containers/counts`, { includeInternal });

      return `Container Counts:\n  Total: ${response.total}\n  Running: ${response.running}\n  Stopped: ${response.stopped}\n  Paused: ${response.paused || 0}`;
    })
  );

  logger.debug("Registered container tools");
}
