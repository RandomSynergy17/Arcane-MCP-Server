/**
 * Dashboard tools for Arcane MCP Server
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { toolHandler } from "../utils/tool-helpers.js";
import { moduleRegistrar, type ToolRegistry } from "./registry.js";
import type { DashboardSnapshot } from "../types/arcane-types.js";

export function registerDashboardTools(server: McpServer, registry?: ToolRegistry): void {
  const register = moduleRegistrar(server, registry, "dashboard");

  // arcane_dashboard_get
  register(
    "arcane_dashboard_get",
    {
      title: "Get dashboard snapshot",
      description: "Get a consolidated dashboard snapshot for an environment (containers, projects, images, volumes, networks, system info)",
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
      const response = await client.get<{ data: DashboardSnapshot }>(
        `/environments/${environmentId}/dashboard`
      );

      const d = response.data;
      const lines = [
        `Dashboard Snapshot:`,
        ``,
        `Containers: ${d.containers.total} total (${d.containers.running} running, ${d.containers.stopped} stopped)`,
        `Projects: ${d.projects.total} total (${d.projects.running} running, ${d.projects.stopped} stopped)`,
        `Images: ${d.images.total} total (${d.images.updatesAvailable} updates available)`,
        `Volumes: ${d.volumes.total}${d.volumes.totalSize ? ` (${d.volumes.totalSize})` : ""}`,
        `Networks: ${d.networks.total}`,
      ];

      if (d.systemInfo) {
        lines.push("");
        lines.push("System:");
        if (d.systemInfo.dockerVersion) lines.push(`  Docker: ${d.systemInfo.dockerVersion}`);
        if (d.systemInfo.osType) lines.push(`  OS: ${d.systemInfo.osType}`);
        if (d.systemInfo.cpus) lines.push(`  CPUs: ${d.systemInfo.cpus}`);
        if (d.systemInfo.memoryBytes) {
          const memGB = (d.systemInfo.memoryBytes / 1e9).toFixed(1);
          lines.push(`  Memory: ${memGB} GB`);
        }
      }

      return lines.join("\n");
    })
  );

}
