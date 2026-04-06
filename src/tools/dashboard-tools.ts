/**
 * Dashboard tools for Arcane MCP Server
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { toolHandler } from "../utils/tool-helpers.js";
import { logger } from "../utils/logger.js";

interface DashboardSnapshot {
  containers: { total: number; running: number; stopped: number };
  projects: { total: number; running: number; stopped: number };
  images: { total: number; updatesAvailable: number };
  volumes: { total: number; totalSize?: string };
  networks: { total: number };
  systemInfo?: { dockerVersion?: string; osType?: string; cpus?: number; memoryBytes?: number };
}

interface ActionItem {
  type: string;
  severity: string;
  title: string;
  description?: string;
  resourceId?: string;
  resourceName?: string;
}

export function registerDashboardTools(server: McpServer): void {

  // arcane_dashboard_get
  server.tool(
    "arcane_dashboard_get",
    "Get a consolidated dashboard snapshot for an environment (containers, projects, images, volumes, networks, system info)",
    {
      environmentId: z.string().describe("Environment ID"),
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
          const memGB = (d.systemInfo.memoryBytes / 1073741824).toFixed(1);
          lines.push(`  Memory: ${memGB} GB`);
        }
      }

      return lines.join("\n");
    })
  );

  // arcane_dashboard_get_action_items
  server.tool(
    "arcane_dashboard_get_action_items",
    "Get dashboard action items that need attention (unhealthy containers, available updates, etc.)",
    {
      environmentId: z.string().describe("Environment ID"),
    },
    toolHandler(async ({ environmentId }, client) => {
      const response = await client.get<{ data: ActionItem[] }>(
        `/environments/${environmentId}/dashboard/action-items`
      );

      if (!response.data || response.data.length === 0) {
        return "No action items — everything looks good!";
      }

      const lines = [`${response.data.length} action items:\n`];
      for (const item of response.data) {
        lines.push(`[${item.severity.toUpperCase()}] ${item.title}`);
        if (item.description) lines.push(`    ${item.description}`);
        if (item.resourceName) lines.push(`    Resource: ${item.resourceName}`);
        lines.push("");
      }

      return lines.join("\n");
    })
  );

  logger.debug("Registered dashboard tools");
}
