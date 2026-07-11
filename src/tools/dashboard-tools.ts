/**
 * Dashboard tools for Arcane MCP Server
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { toolHandler } from "../utils/tool-helpers.js";
import { moduleRegistrar, type ToolRegistry } from "./registry.js";
import { formatSizeGB } from "../utils/format.js";
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
      const lines = [`Dashboard Snapshot:`, ``];

      const counts = d.containers?.counts;
      if (counts) {
        lines.push(`Containers: ${counts.totalContainers} total (${counts.runningContainers} running, ${counts.stoppedContainers} stopped)`);
      }

      const img = d.imageUsageCounts;
      if (img) {
        lines.push(`Images: ${img.totalImages} total (${img.imagesInuse} in use, ${img.imagesUnused} unused, ${formatSizeGB(img.totalImageSize)})`);
      }

      const items = d.actionItems?.items;
      if (items && items.length > 0) {
        lines.push("", "Action Items:");
        for (const item of items) {
          lines.push(`  [${(item.severity || "info").toUpperCase()}] ${item.kind}: ${item.count}`);
        }
      } else {
        lines.push("", "Action Items: none — everything looks good.");
      }

      const v = d.versionInfo;
      if (v?.currentVersion) {
        const update = v.newestVersion && v.newestVersion !== v.currentVersion ? ` (update available: ${v.newestVersion})` : "";
        lines.push("", `Arcane: ${v.currentVersion}${update}`);
      }

      return lines.join("\n");
    })
  );

}
