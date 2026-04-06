/**
 * Auto-updater management tools for Arcane MCP Server
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { toolHandler } from "../utils/tool-helpers.js";
import { logger } from "../utils/logger.js";

interface UpdaterResult {
  updated: number;
  failed: number;
  skipped: number;
  results: Array<{
    containerId: string;
    containerName: string;
    status: string;
    message?: string;
  }>;
}

interface UpdaterStatus {
  running: boolean;
  lastRunAt?: string;
  nextRunAt?: string;
  schedule?: string;
}

interface UpdateRecord {
  id: string;
  containerName: string;
  oldImage: string;
  newImage: string;
  status: string;
  updatedAt: string;
}

export function registerUpdaterTools(server: McpServer): void {

  // arcane_updater_run
  server.registerTool(
    "arcane_updater_run",
    {
      title: "Run auto-updater",
      description: "Run the auto-updater to check and update all containers with available image updates",
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: false,
      },
      inputSchema: {
      environmentId: z.string().describe("Environment ID"),
      dryRun: z.boolean().optional().default(false).describe("Simulate without actually updating"),
    },
    },
    toolHandler(async ({ environmentId, dryRun }, client) => {
      const response = await client.post<{ data: UpdaterResult }>(
        `/environments/${environmentId}/updater/run`,
        { dryRun }
      );

      const r = response.data;
      const mode = dryRun ? " (DRY RUN)" : "";
      const lines = [
        `Updater Run${mode}:`,
        `  Updated: ${r.updated}`,
        `  Failed: ${r.failed}`,
        `  Skipped: ${r.skipped}`,
      ];

      if (r.results && r.results.length > 0) {
        lines.push("");
        for (const result of r.results) {
          lines.push(`  [${result.status.toUpperCase()}] ${result.containerName}${result.message ? `: ${result.message}` : ""}`);
        }
      }

      return lines.join("\n");
    })
  );

  // arcane_updater_update_container
  server.registerTool(
    "arcane_updater_update_container",
    {
      title: "Update single container",
      description: "Update a single container to the latest image version",
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: false,
      },
      inputSchema: {
      environmentId: z.string().describe("Environment ID"),
      containerId: z.string().describe("Container ID to update"),
    },
    },
    toolHandler(async ({ environmentId, containerId }, client) => {
      const response = await client.post<{ data: UpdaterResult }>(
        `/environments/${environmentId}/updater/containers/${containerId}`
      );

      const r = response.data;
      if (r.results && r.results.length > 0) {
        const result = r.results[0];
        return `Container ${result.containerName}: ${result.status}${result.message ? ` — ${result.message}` : ""}`;
      }
      return `Update completed for container ${containerId}.`;
    })
  );

  // arcane_updater_get_status
  server.registerTool(
    "arcane_updater_get_status",
    {
      title: "Get updater status",
      description: "Get the current auto-updater status and schedule",
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
      const response = await client.get<{ data: UpdaterStatus }>(
        `/environments/${environmentId}/updater/status`
      );

      const s = response.data;
      const lines = [
        `Updater Status:`,
        `  Running: ${s.running ? "Yes" : "No"}`,
        `  Schedule: ${s.schedule || "Not configured"}`,
        `  Last Run: ${s.lastRunAt || "Never"}`,
        `  Next Run: ${s.nextRunAt || "N/A"}`,
      ];

      return lines.join("\n");
    })
  );

  // arcane_updater_get_history
  server.registerTool(
    "arcane_updater_get_history",
    {
      title: "Get updater history",
      description: "Get the auto-updater history showing past update operations",
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
      inputSchema: {
      environmentId: z.string().describe("Environment ID"),
      limit: z.number().optional().default(50).describe("Number of history entries to return"),
    },
    },
    toolHandler(async ({ environmentId, limit }, client) => {
      const response = await client.get<{ data: UpdateRecord[] }>(
        `/environments/${environmentId}/updater/history`,
        { limit }
      );

      if (!response.data || response.data.length === 0) {
        return "No update history found.";
      }

      const lines = [`Update History (${response.data.length} entries):\n`];
      for (const record of response.data) {
        lines.push(`[${record.status.toUpperCase()}] ${record.containerName}`);
        lines.push(`    Old: ${record.oldImage}`);
        lines.push(`    New: ${record.newImage}`);
        lines.push(`    Date: ${record.updatedAt}`);
        lines.push("");
      }

      return lines.join("\n");
    })
  );

  logger.debug("Registered updater tools");
}
