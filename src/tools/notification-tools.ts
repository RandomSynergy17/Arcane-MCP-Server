/**
 * Notification tools for Arcane MCP Server
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { toolHandler } from "../utils/tool-helpers.js";

export function registerNotificationTools(server: McpServer): void {
  // arcane_notification_get_settings
  server.registerTool(
    "arcane_notification_get_settings",
    {
      title: "Get notification settings",
      description: "Get notification settings for an environment",
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
      const response = await client.get<{
        data: {
          enabled: boolean;
          onContainerStart: boolean;
          onContainerStop: boolean;
          onContainerHealth: boolean;
          onImageUpdate: boolean;
          onBackupComplete: boolean;
        };
      }>(`/environments/${environmentId}/notifications/settings`);

      const settings = response.data;
      const lines = [
        `Notification Settings:`,
        `  Enabled: ${settings.enabled ? "Yes" : "No"}`,
        `  Container Start: ${settings.onContainerStart ? "Yes" : "No"}`,
        `  Container Stop: ${settings.onContainerStop ? "Yes" : "No"}`,
        `  Container Health: ${settings.onContainerHealth ? "Yes" : "No"}`,
        `  Image Update: ${settings.onImageUpdate ? "Yes" : "No"}`,
        `  Backup Complete: ${settings.onBackupComplete ? "Yes" : "No"}`,
      ];

      return lines.join("\n");
    })
  );

  // arcane_notification_update_settings
  server.registerTool(
    "arcane_notification_update_settings",
    {
      title: "Update notification settings",
      description: "Update notification settings for an environment",
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
      inputSchema: {
      environmentId: z.string().describe("Environment ID"),
      enabled: z.boolean().optional().describe("Enable/disable notifications"),
      onContainerStart: z.boolean().optional().describe("Notify on container start"),
      onContainerStop: z.boolean().optional().describe("Notify on container stop"),
      onContainerHealth: z.boolean().optional().describe("Notify on health check changes"),
      onImageUpdate: z.boolean().optional().describe("Notify when image updates available"),
      onBackupComplete: z.boolean().optional().describe("Notify on backup completion"),
    },
    },
    toolHandler(async ({ environmentId, enabled, onContainerStart, onContainerStop, onContainerHealth, onImageUpdate, onBackupComplete }, client) => {
      const body: Record<string, unknown> = {};
      if (enabled !== undefined) body.enabled = enabled;
      if (onContainerStart !== undefined) body.onContainerStart = onContainerStart;
      if (onContainerStop !== undefined) body.onContainerStop = onContainerStop;
      if (onContainerHealth !== undefined) body.onContainerHealth = onContainerHealth;
      if (onImageUpdate !== undefined) body.onImageUpdate = onImageUpdate;
      if (onBackupComplete !== undefined) body.onBackupComplete = onBackupComplete;

      await client.put(`/environments/${environmentId}/notifications/settings`, body);
      return "Notification settings updated.";
    })
  );

  // arcane_notification_test
  server.registerTool(
    "arcane_notification_test",
    {
      title: "Test notification",
      description: "Send a test notification to verify configuration",
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: false,
      },
      inputSchema: {
      environmentId: z.string().describe("Environment ID"),
      provider: z.string().optional().describe("Specific provider to test"),
    },
    },
    toolHandler(async ({ environmentId, provider }, client) => {
      await client.post(`/environments/${environmentId}/notifications/test/${provider || "all"}`);
      return "Test notification sent.";
    })
  );

  // arcane_notification_apprise_get
  server.registerTool(
    "arcane_notification_apprise_get",
    {
      title: "Get Apprise config",
      description: "Get Apprise notification configuration",
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
      const response = await client.get<{
        data: {
          enabled: boolean;
          urls: string[];
        };
      }>(`/environments/${environmentId}/notifications/apprise`);

      const config = response.data;
      const lines = [
        `Apprise Configuration:`,
        `  Enabled: ${config.enabled ? "Yes" : "No"}`,
        `  URLs: ${config.urls?.length || 0}`,
      ];

      if (config.urls && config.urls.length > 0) {
        for (const url of config.urls) {
          // Mask sensitive parts of URLs
          const maskedUrl = url.replace(/:\/\/[^@]+@/, "://*****@");
          lines.push(`    - ${maskedUrl}`);
        }
      }

      return lines.join("\n");
    })
  );

  // arcane_notification_apprise_update
  server.registerTool(
    "arcane_notification_apprise_update",
    {
      title: "Update Apprise config",
      description: "Update Apprise notification configuration",
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
      inputSchema: {
      environmentId: z.string().describe("Environment ID"),
      enabled: z.boolean().optional().describe("Enable/disable Apprise"),
      urls: z.array(z.string()).optional().describe("Apprise notification URLs"),
    },
    },
    toolHandler(async ({ environmentId, enabled, urls }, client) => {
      const body: Record<string, unknown> = {};
      if (enabled !== undefined) body.enabled = enabled;
      if (urls !== undefined) body.urls = urls;

      await client.put(`/environments/${environmentId}/notifications/apprise`, body);
      return "Apprise configuration updated.";
    })
  );

  // arcane_notification_apprise_test
  server.registerTool(
    "arcane_notification_apprise_test",
    {
      title: "Test Apprise notification",
      description: "Send a test notification through Apprise",
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: false,
      },
      inputSchema: {
      environmentId: z.string().describe("Environment ID"),
    },
    },
    toolHandler(async ({ environmentId }, client) => {
      await client.post(`/environments/${environmentId}/notifications/apprise/test`);
      return "Apprise test notification sent.";
    })
  );

}
