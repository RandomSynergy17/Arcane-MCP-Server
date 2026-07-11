/**
 * Auto-updater management tools for Arcane MCP Server
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { toolHandler } from "../utils/tool-helpers.js";
import { moduleRegistrar, type ToolRegistry } from "./registry.js";
import type { UpdaterResult, UpdaterStatus, UpdateRecord } from "../types/arcane-types.js";

export function registerUpdaterTools(server: McpServer, registry?: ToolRegistry): void {
  const register = moduleRegistrar(server, registry, "updater");

  // arcane_updater_run
  register(
    "arcane_updater_run",
    {
      title: "Run auto-updater",
      description: "Run the auto-updater to check and update containers/projects with available image updates",
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: false,
      },
      inputSchema: {
      environmentId: z.string().describe("Environment ID"),
      dryRun: z.boolean().optional().default(false).describe("Simulate without actually updating"),
      forceUpdate: z.boolean().optional().default(false).describe("Update even if no new image was detected"),
      resourceIds: z.array(z.string()).optional().describe("Limit the run to specific container/project IDs"),
    },
    },
    toolHandler(async ({ environmentId, dryRun, forceUpdate, resourceIds }, client) => {
      const body: Record<string, unknown> = { dryRun, forceUpdate };
      if (resourceIds && resourceIds.length > 0) body.resourceIds = resourceIds;

      const response = await client.post<{ data: UpdaterResult }>(
        `/environments/${environmentId}/updater/run`,
        body
      );

      const r = response.data;
      const mode = dryRun ? " (DRY RUN)" : "";
      const lines = [
        `Updater Run${mode}:`,
        `  Checked: ${r.checked}`,
        `  Updated: ${r.updated}`,
        `  Failed: ${r.failed}`,
        `  Skipped: ${r.skipped}`,
      ];

      if (r.items && r.items.length > 0) {
        lines.push("");
        for (const item of r.items) {
          lines.push(`  [${item.status.toUpperCase()}] ${item.resourceName || item.resourceId}${item.error ? `: ${item.error}` : ""}`);
        }
      }

      return lines.join("\n");
    })
  );

  // arcane_updater_get_status
  register(
    "arcane_updater_get_status",
    {
      title: "Get updater status",
      description: "Get the currently running auto-update operations (containers and projects being updated)",
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
      const busy = (s.updatingContainers || 0) + (s.updatingProjects || 0);
      if (busy === 0) {
        return "Updater Status: idle — no updates currently in progress.";
      }

      const lines = [
        `Updater Status: ${busy} update(s) in progress`,
        `  Containers updating: ${s.updatingContainers || 0}${s.containerIds?.length ? ` (${s.containerIds.join(", ")})` : ""}`,
        `  Projects updating: ${s.updatingProjects || 0}${s.projectIds?.length ? ` (${s.projectIds.join(", ")})` : ""}`,
      ];

      return lines.join("\n");
    })
  );

  // arcane_updater_get_history
  register(
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

      const formatImages = (versions?: Record<string, unknown>) =>
        versions && Object.keys(versions).length > 0
          ? Object.entries(versions).map(([k, v]) => `${k}: ${String(v)}`).join(", ")
          : undefined;

      const lines = [`Update History (${response.data.length} entries):\n`];
      for (const record of response.data) {
        lines.push(`[${record.status.toUpperCase()}] ${record.resourceName || record.resourceId} (${record.resourceType || "container"})`);
        const oldImages = formatImages(record.oldImageVersions);
        const newImages = formatImages(record.newImageVersions);
        if (oldImages) lines.push(`    Old: ${oldImages}`);
        if (newImages) lines.push(`    New: ${newImages}`);
        if (record.error) lines.push(`    Error: ${record.error}`);
        lines.push(`    Date: ${record.createdAt}`);
        lines.push("");
      }

      return lines.join("\n");
    })
  );

}
