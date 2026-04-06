/**
 * Webhook management tools for Arcane MCP Server
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { toolHandler } from "../utils/tool-helpers.js";
import { logger } from "../utils/logger.js";
import type { Webhook } from "../types/arcane-types.js";

export function registerWebhookTools(server: McpServer): void {

  // arcane_webhook_list
  server.registerTool(
    "arcane_webhook_list",
    {
      title: "List webhooks",
      description: "List configured webhooks for an environment",
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
      const response = await client.get<{ data: Webhook[] }>(
        `/environments/${environmentId}/webhooks`
      );

      if (!response.data || response.data.length === 0) {
        return "No webhooks configured.";
      }

      const lines = [`Found ${response.data.length} webhooks:\n`];
      for (const wh of response.data) {
        const status = wh.enabled ? "[ENABLED]" : "[DISABLED]";
        lines.push(`${status} ${wh.name}`);
        lines.push(`    ID: ${wh.id}`);
        if (wh.events && wh.events.length > 0) {
          lines.push(`    Events: ${wh.events.join(", ")}`);
        }
        lines.push(`    Last Triggered: ${wh.lastTriggeredAt || "Never"}`);
        lines.push("");
      }

      return lines.join("\n");
    })
  );

  // arcane_webhook_create
  server.registerTool(
    "arcane_webhook_create",
    {
      title: "Create webhook",
      description: "Create a new inbound webhook for an environment",
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: false,
      },
      inputSchema: {
      environmentId: z.string().describe("Environment ID"),
      name: z.string().describe("Webhook name"),
      events: z.array(z.string()).optional().describe("Event types to trigger on"),
      enabled: z.boolean().optional().default(true).describe("Enable the webhook"),
    },
    },
    toolHandler(async ({ environmentId, name, events, enabled }, client) => {
      const response = await client.post<{ data: Webhook }>(
        `/environments/${environmentId}/webhooks`,
        { name, events, enabled }
      );

      const wh = response.data;
      const lines = [
        `Webhook created: ${wh.name}`,
        `  ID: ${wh.id}`,
      ];
      if (wh.token) {
        lines.push(`  Token: ${wh.token}`);
      }
      if (wh.url) {
        lines.push(`  URL: ${wh.url}`);
      }

      return lines.join("\n");
    })
  );

  // arcane_webhook_update
  server.registerTool(
    "arcane_webhook_update",
    {
      title: "Update webhook",
      description: "Update a webhook configuration",
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
      inputSchema: {
      environmentId: z.string().describe("Environment ID"),
      webhookId: z.string().describe("Webhook ID"),
      name: z.string().optional().describe("New name"),
      events: z.array(z.string()).optional().describe("Updated event types"),
      enabled: z.boolean().optional().describe("Enable/disable the webhook"),
    },
    },
    toolHandler(async ({ environmentId, webhookId, name, events, enabled }, client) => {
      const body: Record<string, unknown> = {};
      if (name) body.name = name;
      if (events) body.events = events;
      if (enabled !== undefined) body.enabled = enabled;

      await client.patch(`/environments/${environmentId}/webhooks/${webhookId}`, body);
      return `Webhook ${webhookId} updated.`;
    })
  );

  // arcane_webhook_delete
  server.registerTool(
    "arcane_webhook_delete",
    {
      title: "Delete webhook",
      description: "Delete a webhook configuration",
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: false,
        openWorldHint: false,
      },
      inputSchema: {
      environmentId: z.string().describe("Environment ID"),
      webhookId: z.string().describe("Webhook ID"),
    },
    },
    toolHandler(async ({ environmentId, webhookId }, client) => {
      await client.delete(`/environments/${environmentId}/webhooks/${webhookId}`);
      return `Webhook ${webhookId} deleted.`;
    })
  );

  logger.debug("Registered webhook tools");
}
