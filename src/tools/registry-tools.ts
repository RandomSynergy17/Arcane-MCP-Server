/**
 * Container Registry management tools for Arcane MCP Server
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { toolHandler } from "../utils/tool-helpers.js";
import { moduleRegistrar, type ToolRegistry } from "./registry.js";
import type { ContainerRegistry } from "../types/arcane-types.js";

export function registerRegistryTools(server: McpServer, registry?: ToolRegistry): void {
  const register = moduleRegistrar(server, registry, "registry");
  // arcane_registry_list
  register(
    "arcane_registry_list",
    {
      title: "List registries",
      description: "List configured container registries",
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
      inputSchema: {
      search: z.string().optional().describe("Search query"),
      start: z.number().optional().default(0).describe("Pagination start"),
      limit: z.number().optional().default(20).describe("Items per page"),
    },
    },
    toolHandler(async ({ search, start, limit }, client) => {
      const response = await client.get<{
        data: ContainerRegistry[];
        pagination: { totalItems: number };
      }>("/container-registries", { search, start, limit });

      if (!response.data || response.data.length === 0) {
        return "No container registries configured.";
      }

      const lines = [`Found ${response.pagination.totalItems} registries:\n`];
      for (const reg of response.data) {
        lines.push(`${reg.description || reg.url}`);
        lines.push(`    ID: ${reg.id}`);
        lines.push(`    URL: ${reg.url}`);
        lines.push(`    Type: ${reg.registryType}`);
        lines.push(`    Enabled: ${reg.enabled ? "Yes" : "No"}`);
        lines.push("");
      }

      return lines.join("\n");
    })
  );

  // arcane_registry_get
  register(
    "arcane_registry_get",
    {
      title: "Get registry details",
      description: "Get details of a container registry",
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
      inputSchema: {
      registryId: z.string().describe("Registry ID"),
    },
    },
    toolHandler(async ({ registryId }, client) => {
      const response = await client.get<{ data: ContainerRegistry }>(
        `/container-registries/${registryId}`
      );

      const reg = response.data;
      const lines = [
        `Registry: ${reg.description || reg.url}`,
        `  ID: ${reg.id}`,
        `  URL: ${reg.url}`,
        `  Type: ${reg.registryType}`,
        `  Username: ${reg.username || "N/A"}`,
        `  Enabled: ${reg.enabled ? "Yes" : "No"}`,
        `  Insecure: ${reg.insecure ? "Yes" : "No"}`,
        `  Created: ${reg.createdAt || "N/A"}`,
      ];

      return lines.join("\n");
    })
  );

  // arcane_registry_create
  register(
    "arcane_registry_create",
    {
      title: "Create registry",
      description: "Add a new container registry configuration",
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: false,
      },
      inputSchema: {
      description: z.string().describe("Registry description (display label)"),
      url: z.string().describe("Registry URL (e.g., docker.io, ghcr.io)"),
      registryType: z.enum(["dockerhub", "gcr", "ecr", "acr", "ghcr", "custom"]).describe("Registry type"),
      username: z.string().optional().describe("Username for authentication"),
      token: z.string().optional().describe("Access token / password for authentication"),
      insecure: z.boolean().optional().default(false).describe("Allow insecure (non-TLS) connections"),
      enabled: z.boolean().optional().default(true).describe("Whether the registry is enabled"),
      awsRegion: z.string().optional().describe("AWS region (required for ECR registries)"),
      awsAccessKeyId: z.string().optional().describe("AWS access key ID (for ECR registries)"),
      awsSecretAccessKey: z.string().optional().describe("AWS secret access key (for ECR registries)"),
    },
    },
    toolHandler(async ({ description, url, registryType, username, token, insecure, enabled, awsRegion, awsAccessKeyId, awsSecretAccessKey }, client) => {
      const response = await client.post<{ data: { id: string } }>(
        "/container-registries",
        {
          description,
          url,
          registryType,
          username: username ?? "",
          token: token ?? "",
          insecure,
          enabled,
          awsRegion: awsRegion ?? "",
          awsAccessKeyId: awsAccessKeyId ?? "",
          awsSecretAccessKey: awsSecretAccessKey ?? "",
        }
      );

      return `Registry created: ${description} (ID: ${response.data.id})`;
    })
  );

  // arcane_registry_update
  register(
    "arcane_registry_update",
    {
      title: "Update registry",
      description: "Update a container registry configuration",
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
      inputSchema: {
      registryId: z.string().describe("Registry ID"),
      description: z.string().optional().describe("New description (display label)"),
      url: z.string().optional().describe("New URL"),
      username: z.string().optional().describe("New username"),
      token: z.string().optional().describe("New access token / password"),
    },
    },
    toolHandler(async ({ registryId, description, url, username, token }, client) => {
      const body: Record<string, unknown> = {};
      if (description) body.description = description;
      if (url) body.url = url;
      if (username) body.username = username;
      if (token) body.token = token;

      await client.put(`/container-registries/${registryId}`, body);
      return `Registry ${registryId} updated.`;
    })
  );

  // arcane_registry_delete
  register(
    "arcane_registry_delete",
    {
      title: "Delete registry",
      description: "Delete a container registry configuration",
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: false,
        openWorldHint: false,
      },
      inputSchema: {
      registryId: z.string().describe("Registry ID"),
    },
    },
    toolHandler(async ({ registryId }, client) => {
      await client.delete(`/container-registries/${registryId}`);
      return `Registry ${registryId} deleted.`;
    })
  );

  // arcane_registry_test
  register(
    "arcane_registry_test",
    {
      title: "Test registry",
      description: "Test connectivity to a container registry",
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true,
      },
      inputSchema: {
      registryId: z.string().describe("Registry ID"),
    },
    },
    toolHandler(async ({ registryId }, client) => {
      const response = await client.post<{ data: { message?: string } }>(
        `/container-registries/${registryId}/test`
      );
      return response.data?.message || "Connection successful!";
    })
  );

  // arcane_registry_sync
  register(
    "arcane_registry_sync",
    {
      title: "Sync registries",
      description: "Sync all container registries to refresh image information",
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true,
      },
    },
    toolHandler(async (_params, client) => {
      await client.post("/container-registries/sync", { registries: [] });
      return "Registry sync initiated.";
    })
  );

}
