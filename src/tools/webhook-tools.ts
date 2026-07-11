/**
 * Webhook management tools for Arcane MCP Server
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { toolHandler } from "../utils/tool-helpers.js";
import { moduleRegistrar, type ToolRegistry } from "./registry.js";
import type { Webhook } from "../types/arcane-types.js";

export function registerWebhookTools(server: McpServer, registry?: ToolRegistry): void {
  const register = moduleRegistrar(server, registry, "webhook");

  // arcane_webhook_list
  register(
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
        lines.push(`    Action: ${wh.actionType || "unknown"}`);
        const target = wh.targetName || wh.targetId;
        lines.push(`    Target: ${wh.targetType || "unknown"}${target ? ` (${target})` : ""}`);
        lines.push(`    Last Triggered: ${wh.lastTriggeredAt || "Never"}`);
        lines.push("");
      }

      return lines.join("\n");
    })
  );

  // arcane_webhook_create
  register(
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
      actionType: z
        .enum(["update", "start", "stop", "restart", "redeploy", "up", "down", "run", "sync"])
        .describe(
          "Action to run when triggered. Supported values depend on targetType (e.g. start/stop/restart for containers, up/down/redeploy for projects, run for updater, sync for gitops)"
        ),
      targetType: z
        .enum(["container", "project", "updater", "gitops"])
        .describe("Resource type this webhook targets: 'container', 'project', 'updater', or 'gitops'"),
      targetId: z
        .string()
        .describe("Container ID, project ID, or GitOps sync ID to target. Use an empty string for 'updater' webhooks"),
    },
    },
    toolHandler(async ({ environmentId, name, actionType, targetType, targetId }, client) => {
      const response = await client.post<{
        data: {
          id: string;
          name: string;
          actionType: string;
          targetType: string;
          targetId: string;
          token: string;
          createdAt: string;
        };
      }>(`/environments/${environmentId}/webhooks`, { name, actionType, targetType, targetId });

      const wh = response.data;
      const lines = [
        `Webhook created: ${wh.name}`,
        `  ID: ${wh.id}`,
        `  Action: ${wh.actionType}`,
        `  Target: ${wh.targetType}${wh.targetId ? ` (${wh.targetId})` : ""}`,
        `  Token: ${wh.token}`,
        "",
        "⚠️ Save this token now - it won't be shown again!",
      ];

      return lines.join("\n");
    })
  );

  // arcane_webhook_update
  register(
    "arcane_webhook_update",
    {
      title: "Update webhook",
      description: "Enable or disable a webhook",
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
      inputSchema: {
      environmentId: z.string().describe("Environment ID"),
      webhookId: z.string().describe("Webhook ID"),
      enabled: z.boolean().describe("Enable (true) or disable (false) the webhook"),
    },
    },
    toolHandler(async ({ environmentId, webhookId, enabled }, client) => {
      await client.patch(`/environments/${environmentId}/webhooks/${webhookId}`, { enabled });
      return `Webhook ${webhookId} ${enabled ? "enabled" : "disabled"}.`;
    })
  );

  // arcane_webhook_delete
  register(
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

}
