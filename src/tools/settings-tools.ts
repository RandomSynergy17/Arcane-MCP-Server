/**
 * Settings management tools for Arcane MCP Server
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { toolHandler } from "../utils/tool-helpers.js";

export function registerSettingsTools(server: McpServer): void {
  // arcane_settings_get
  server.registerTool(
    "arcane_settings_get",
    {
      title: "Get settings",
      description: "Get environment settings",
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
        data: Record<string, unknown>;
      }>(`/environments/${environmentId}/settings`);

      const lines = ["Environment Settings:\n"];
      for (const [key, value] of Object.entries(response.data)) {
        const displayValue = typeof value === "object" ? JSON.stringify(value) : String(value);
        lines.push(`  ${key}: ${displayValue}`);
      }

      return lines.join("\n");
    })
  );

  // arcane_settings_update
  server.registerTool(
    "arcane_settings_update",
    {
      title: "Update settings",
      description: "Update environment settings",
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
      inputSchema: {
      environmentId: z.string().describe("Environment ID"),
      settings: z.record(z.unknown()).describe("Settings to update (key-value pairs)"),
    },
    },
    toolHandler(async ({ environmentId, settings }, client) => {
      await client.put(`/environments/${environmentId}/settings`, settings);
      return "Settings updated successfully.";
    })
  );

  // arcane_settings_get_public
  server.registerTool(
    "arcane_settings_get_public",
    {
      title: "Get public settings",
      description: "Get public settings (no authentication required)",
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    toolHandler(async (_params, client) => {
      const response = await client.get<{
        data: Record<string, unknown>;
      }>("/settings/public");

      const lines = ["Public Settings:\n"];
      for (const [key, value] of Object.entries(response.data)) {
        const displayValue = typeof value === "object" ? JSON.stringify(value) : String(value);
        lines.push(`  ${key}: ${displayValue}`);
      }

      return lines.join("\n");
    })
  );

  // arcane_settings_get_categories
  server.registerTool(
    "arcane_settings_get_categories",
    {
      title: "Get settings categories",
      description: "Get available settings categories",
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    toolHandler(async (_params, client) => {
      const response = await client.get<{
        data: Array<{ id: string; name: string; description?: string }>;
      }>("/customize/categories");

      if (!response.data || response.data.length === 0) {
        return "No settings categories found.";
      }

      const lines = ["Settings Categories:\n"];
      for (const cat of response.data) {
        lines.push(`${cat.name} (${cat.id})`);
        if (cat.description) {
          lines.push(`    ${cat.description}`);
        }
      }

      return lines.join("\n");
    })
  );

  // arcane_settings_search
  server.registerTool(
    "arcane_settings_search",
    {
      title: "Search settings",
      description: "Search settings and customization options",
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
      inputSchema: {
      query: z.string().describe("Search query"),
    },
    },
    toolHandler(async ({ query }, client) => {
      const response = await client.post<{
        data: Array<{
          category: string;
          key: string;
          value: unknown;
          description?: string;
        }>;
      }>("/customize/search", { query });

      if (!response.data || response.data.length === 0) {
        return `No settings matching "${query}" found.`;
      }

      const lines = [`Search results for "${query}":\n`];
      for (const result of response.data) {
        lines.push(`${result.category}/${result.key}`);
        lines.push(`    Value: ${JSON.stringify(result.value)}`);
        if (result.description) {
          lines.push(`    Description: ${result.description}`);
        }
        lines.push("");
      }

      return lines.join("\n");
    })
  );

  // arcane_api_key_list
  server.registerTool(
    "arcane_apikey_list",
    {
      title: "List API keys",
      description: "List API keys for the current user",
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
      inputSchema: {
      start: z.number().optional().default(0).describe("Pagination start"),
      limit: z.number().optional().default(20).describe("Items per page"),
    },
    },
    toolHandler(async ({ start, limit }, client) => {
      const response = await client.get<{
        data: Array<{
          id: string;
          name: string;
          keyPrefix: string;
          createdAt: string;
          lastUsedAt?: string;
          expiresAt?: string;
        }>;
        pagination: { total: number };
      }>("/api-keys", { start, limit });

      if (!response.data || response.data.length === 0) {
        return "No API keys found.";
      }

      const lines = [`Found ${response.pagination.total} API keys:\n`];
      for (const key of response.data) {
        lines.push(`${key.name}`);
        lines.push(`    ID: ${key.id}`);
        lines.push(`    Prefix: ${key.keyPrefix}...`);
        lines.push(`    Created: ${key.createdAt}`);
        if (key.lastUsedAt) lines.push(`    Last Used: ${key.lastUsedAt}`);
        if (key.expiresAt) lines.push(`    Expires: ${key.expiresAt}`);
        lines.push("");
      }

      return lines.join("\n");
    })
  );

  // arcane_api_key_create
  server.registerTool(
    "arcane_apikey_create",
    {
      title: "Create API key",
      description: "Create a new API key",
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: false,
      },
      inputSchema: {
      name: z.string().describe("Name for the API key"),
      description: z.string().optional().describe("Description"),
      expiresAt: z.string().optional().describe("Expiration date (ISO 8601 format)"),
    },
    },
    toolHandler(async ({ name, description, expiresAt }, client) => {
      const response = await client.post<{
        data: { id: string; name: string; key: string };
      }>("/api-keys", { name, description, expiresAt });

      return `API Key Created!\n  Name: ${response.data.name}\n  ID: ${response.data.id}\n  Key: ${response.data.key}\n\n⚠️ Save this key now - it won't be shown again!`;
    })
  );

  // arcane_api_key_delete
  server.registerTool(
    "arcane_apikey_delete",
    {
      title: "Delete API key",
      description: "Delete an API key (revoke access immediately)",
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: false,
        openWorldHint: false,
      },
      inputSchema: {
      keyId: z.string().describe("API key ID to delete"),
    },
    },
    toolHandler(async ({ keyId }, client) => {
      await client.delete(`/api-keys/${keyId}`);
      return `API key ${keyId} deleted.`;
    })
  );

}
