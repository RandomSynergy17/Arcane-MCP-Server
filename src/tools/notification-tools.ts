/**
 * Notification tools for Arcane MCP Server
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { toolHandler } from "../utils/tool-helpers.js";
import { moduleRegistrar, type ToolRegistry } from "./registry.js";

const NOTIFICATION_PROVIDERS = [
  "discord",
  "email",
  "telegram",
  "signal",
  "slack",
  "ntfy",
  "pushover",
  "matrix",
  "generic",
] as const;

interface NotificationSettings {
  id: string;
  provider: string;
  enabled: boolean;
  config: Record<string, unknown>;
}

/** Mask likely-sensitive config values (tokens, webhook URLs with credentials) */
function formatConfig(config: Record<string, unknown>): string[] {
  return Object.entries(config).map(([key, value]) => {
    const sensitive = /token|secret|password|key|webhook/i.test(key);
    const display = sensitive ? "*****" : String(value);
    return `      ${key}: ${display}`;
  });
}

export function registerNotificationTools(server: McpServer, registry?: ToolRegistry): void {
  const register = moduleRegistrar(server, registry, "notification");

  // arcane_notification_get_settings
  register(
    "arcane_notification_get_settings",
    {
      title: "Get notification settings",
      description: "List configured notification providers for an environment (Discord, email, Telegram, Slack, ntfy, etc.)",
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
      inputSchema: {
      environmentId: z.string().describe("Environment ID"),
      provider: z.enum(NOTIFICATION_PROVIDERS).optional().describe("Only show a specific provider"),
    },
    },
    toolHandler(async ({ environmentId, provider }, client) => {
      if (provider) {
        const settings = await client.get<NotificationSettings>(
          `/environments/${environmentId}/notifications/settings/${provider}`
        );
        const lines = [
          `Notification Settings (${settings.provider}):`,
          `  Enabled: ${settings.enabled ? "Yes" : "No"}`,
          ...formatConfig(settings.config || {}),
        ];
        return lines.join("\n");
      }

      const settings = await client.get<NotificationSettings[]>(
        `/environments/${environmentId}/notifications/settings`
      );

      if (!settings || settings.length === 0) {
        return "No notification providers configured.";
      }

      const lines = ["Notification Settings:"];
      for (const s of settings) {
        lines.push(`  ${s.provider}: ${s.enabled ? "enabled" : "disabled"}`);
      }

      return lines.join("\n");
    })
  );

  // arcane_notification_update_settings
  register(
    "arcane_notification_update_settings",
    {
      title: "Update notification settings",
      description: "Create or update notification settings for a provider (Discord, email, Telegram, Slack, ntfy, etc.)",
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
      inputSchema: {
      environmentId: z.string().describe("Environment ID"),
      provider: z.enum(NOTIFICATION_PROVIDERS).describe("Notification provider"),
      enabled: z.boolean().describe("Enable/disable this provider"),
      config: z.record(z.unknown()).optional().describe("Provider-specific configuration (e.g., webhookUrl for Discord, smtp settings for email)"),
    },
    },
    toolHandler(async ({ environmentId, provider, enabled, config }, client) => {
      await client.post(`/environments/${environmentId}/notifications/settings`, {
        provider,
        enabled,
        config: config || {},
      });
      return `Notification settings for ${provider} updated.`;
    })
  );

  // arcane_notification_delete_settings
  register(
    "arcane_notification_delete_settings",
    {
      title: "Delete notification settings",
      description: "Delete the notification settings of a provider",
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: true,
        openWorldHint: false,
      },
      inputSchema: {
      environmentId: z.string().describe("Environment ID"),
      provider: z.enum(NOTIFICATION_PROVIDERS).describe("Notification provider to delete"),
    },
    },
    toolHandler(async ({ environmentId, provider }, client) => {
      await client.delete(`/environments/${environmentId}/notifications/settings/${provider}`);
      return `Notification settings for ${provider} deleted.`;
    })
  );

  // arcane_notification_test
  register(
    "arcane_notification_test",
    {
      title: "Test notification",
      description: "Send a test notification to verify a provider's configuration",
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: false,
      },
      inputSchema: {
      environmentId: z.string().describe("Environment ID"),
      provider: z.enum(NOTIFICATION_PROVIDERS).describe("Provider to test"),
    },
    },
    toolHandler(async ({ environmentId, provider }, client) => {
      const response = await client.post<{ data?: { message?: string; warning?: string } }>(
        `/environments/${environmentId}/notifications/test/${provider}`
      );

      let text = response.data?.message || "Test notification sent.";
      if (response.data?.warning) text += `\nWarning: ${response.data.warning}`;
      return text;
    })
  );

}
