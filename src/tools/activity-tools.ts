/**
 * Activity tracking tools for Arcane MCP Server
 *
 * Arcane v2 runs long operations (image update checks, updater runs, prunes,
 * vulnerability scans) as background activities. These tools let clients
 * track that progress without waiting on the original request.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { toolHandler } from "../utils/tool-helpers.js";
import { moduleRegistrar, type ToolRegistry } from "./registry.js";

interface Activity {
  id: string;
  type: string;
  status: string;
  progress?: number;
  step?: string;
  latestMessage?: string;
  resourceType?: string;
  resourceName?: string;
  error?: string;
  startedAt?: string;
  endedAt?: string;
  durationMs?: number;
  createdAt: string;
}

function formatActivity(a: Activity): string[] {
  const progress = a.progress !== undefined ? ` ${a.progress}%` : "";
  const lines = [`[${a.status.toUpperCase()}${progress}] ${a.type} (ID: ${a.id})`];
  if (a.resourceName) lines.push(`    Resource: ${a.resourceType ? `${a.resourceType}/` : ""}${a.resourceName}`);
  if (a.latestMessage) lines.push(`    ${a.latestMessage}`);
  if (a.error) lines.push(`    Error: ${a.error}`);
  lines.push(`    Started: ${a.startedAt || a.createdAt}${a.endedAt ? ` — Ended: ${a.endedAt}` : ""}`);
  lines.push("");
  return lines;
}

export function registerActivityTools(server: McpServer, registry?: ToolRegistry): void {
  const register = moduleRegistrar(server, registry, "activity");

  // arcane_activity_list
  register(
    "arcane_activity_list",
    {
      title: "List activities",
      description: "List background activities (image update checks, updater runs, prunes, scans) for an environment. Use this to track long-running operations.",
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
      inputSchema: {
      environmentId: z.string().describe("Environment ID"),
      status: z.string().optional().describe("Filter by status (e.g., running, completed, failed)"),
      type: z.string().optional().describe("Filter by activity type"),
      start: z.number().optional().default(0).describe("Pagination start"),
      limit: z.number().optional().default(20).describe("Items per page"),
    },
    },
    toolHandler(async ({ environmentId, status, type, start, limit }, client) => {
      const response = await client.get<{
        data: Activity[];
        pagination: { totalItems: number };
      }>(`/environments/${environmentId}/activities`, { status, type, start, limit });

      if (!response.data || response.data.length === 0) {
        return "No activities found.";
      }

      const lines = [`Found ${response.pagination.totalItems} activities:\n`];
      for (const activity of response.data) {
        lines.push(...formatActivity(activity));
      }

      return lines.join("\n");
    })
  );

  // arcane_activity_get
  register(
    "arcane_activity_get",
    {
      title: "Get activity details",
      description: "Get details and progress messages of a background activity",
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
      inputSchema: {
      environmentId: z.string().describe("Environment ID"),
      activityId: z.string().describe("Activity ID"),
      limit: z.number().optional().default(20).describe("Number of progress messages to return"),
    },
    },
    toolHandler(async ({ environmentId, activityId, limit }, client) => {
      const response = await client.get<{
        data: {
          activity: Activity;
          messages?: Array<{ createdAt: string; level: string; message: string }>;
        };
      }>(`/environments/${environmentId}/activities/${activityId}`, { limit });

      const lines = formatActivity(response.data.activity);

      if (response.data.messages && response.data.messages.length > 0) {
        lines.push("Messages:");
        for (const msg of response.data.messages) {
          lines.push(`  [${msg.createdAt}] [${msg.level.toUpperCase()}] ${msg.message}`);
        }
      }

      return lines.join("\n");
    })
  );

}
