/**
 * Event tracking tools for Arcane MCP Server
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { toolHandler } from "../utils/tool-helpers.js";
import { MAX_DISPLAY_EVENTS } from "../constants.js";
import { logger } from "../utils/logger.js";
import type { Event } from "../types/arcane-types.js";

export function registerEventTools(server: McpServer): void {

  // arcane_event_list
  server.registerTool(
    "arcane_event_list",
    {
      title: "List events",
      description: "List events across all environments",
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
      inputSchema: {
      type: z.string().optional().describe("Filter by event type"),
      resourceType: z.string().optional().describe("Filter by resource type (container, image, etc.)"),
      start: z.number().optional().default(0).describe("Pagination start"),
      limit: z.number().optional().default(50).describe("Items per page"),
    },
    },
    toolHandler(async ({ type, resourceType, start, limit }, client) => {
      const response = await client.get<{
        data: Event[];
        pagination: { total: number };
      }>("/events", { type, resourceType, start, limit });

      if (!response.data || response.data.length === 0) {
        return "No events found.";
      }

      const lines = [`Found ${response.pagination.total} events:\n`];
      for (const event of response.data.slice(0, MAX_DISPLAY_EVENTS)) {
        const time = new Date(event.createdAt).toLocaleString();
        lines.push(`[${time}] ${event.type}`);
        lines.push(`    ${event.message}`);
        if (event.resourceName) {
          lines.push(`    Resource: ${event.resourceType}/${event.resourceName}`);
        }
        if (event.username) {
          lines.push(`    User: ${event.username}`);
        }
        lines.push("");
      }

      if (response.data.length > MAX_DISPLAY_EVENTS) {
        lines.push(`... and ${response.data.length - MAX_DISPLAY_EVENTS} more events`);
      }

      return lines.join("\n");
    })
  );

  // arcane_event_list_by_environment
  server.registerTool(
    "arcane_event_list_by_environment",
    {
      title: "List environment events",
      description: "List events for a specific environment",
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
      inputSchema: {
      environmentId: z.string().describe("Environment ID"),
      type: z.string().optional().describe("Filter by event type"),
      start: z.number().optional().default(0).describe("Pagination start"),
      limit: z.number().optional().default(50).describe("Items per page"),
    },
    },
    toolHandler(async ({ environmentId, type, start, limit }, client) => {
      const response = await client.get<{
        data: Event[];
        pagination: { total: number };
      }>(`/events/environment/${environmentId}`, { type, start, limit });

      if (!response.data || response.data.length === 0) {
        return "No events found for this environment.";
      }

      const lines = [`Found ${response.pagination.total} events:\n`];
      for (const event of response.data.slice(0, MAX_DISPLAY_EVENTS)) {
        const time = new Date(event.createdAt).toLocaleString();
        lines.push(`[${time}] ${event.type}`);
        lines.push(`    ${event.message}`);
        if (event.resourceName) {
          lines.push(`    Resource: ${event.resourceType}/${event.resourceName}`);
        }
        lines.push("");
      }

      return lines.join("\n");
    })
  );

  // arcane_event_create
  server.registerTool(
    "arcane_event_create",
    {
      title: "Create event",
      description: "Create a custom event for tracking",
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: false,
      },
      inputSchema: {
      type: z.string().describe("Event type"),
      message: z.string().describe("Event message"),
      resourceType: z.string().optional().describe("Resource type"),
      resourceId: z.string().optional().describe("Resource ID"),
      resourceName: z.string().optional().describe("Resource name"),
      metadata: z.record(z.unknown()).optional().describe("Additional metadata"),
    },
    },
    toolHandler(async ({ type, message, resourceType, resourceId, resourceName, metadata }, client) => {
      const response = await client.post<{ data: { id: string } }>("/events", {
        type,
        message,
        resourceType,
        resourceId,
        resourceName,
        metadata,
      });

      return `Event created: ${response.data.id}`;
    })
  );

  // arcane_event_delete
  server.registerTool(
    "arcane_event_delete",
    {
      title: "Delete event",
      description: "Delete an event from the history",
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: false,
        openWorldHint: false,
      },
      inputSchema: {
      eventId: z.string().describe("Event ID to delete"),
    },
    },
    toolHandler(async ({ eventId }, client) => {
      await client.delete(`/events/${eventId}`);
      return `Event ${eventId} deleted.`;
    })
  );

  logger.debug("Registered event tools");
}
