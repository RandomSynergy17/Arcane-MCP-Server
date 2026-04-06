/**
 * Container Registry management tools for Arcane MCP Server
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { toolHandler } from "../utils/tool-helpers.js";
import { logger } from "../utils/logger.js";

interface ContainerRegistry {
  id: string;
  name: string;
  url: string;
  type: string;
  username?: string;
  createdAt?: string;
  lastTestAt?: string;
  lastTestStatus?: string;
}

export function registerRegistryTools(server: McpServer): void {
  // arcane_registry_list
  server.registerTool(
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
        pagination: { total: number };
      }>("/container-registries", { search, start, limit });

      if (!response.data || response.data.length === 0) {
        return "No container registries configured.";
      }

      const lines = [`Found ${response.pagination.total} registries:\n`];
      for (const reg of response.data) {
        const status = reg.lastTestStatus || "untested";
        lines.push(`${reg.name}`);
        lines.push(`    ID: ${reg.id}`);
        lines.push(`    URL: ${reg.url}`);
        lines.push(`    Type: ${reg.type}`);
        lines.push(`    Status: ${status}`);
        lines.push("");
      }

      return lines.join("\n");
    })
  );

  // arcane_registry_get
  server.registerTool(
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
        `Registry: ${reg.name}`,
        `  ID: ${reg.id}`,
        `  URL: ${reg.url}`,
        `  Type: ${reg.type}`,
        `  Username: ${reg.username || "N/A"}`,
        `  Created: ${reg.createdAt || "N/A"}`,
        `  Last Test: ${reg.lastTestAt || "Never"} (${reg.lastTestStatus || "N/A"})`,
      ];

      return lines.join("\n");
    })
  );

  // arcane_registry_create
  server.registerTool(
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
      name: z.string().describe("Registry name"),
      url: z.string().describe("Registry URL (e.g., docker.io, ghcr.io)"),
      type: z.enum(["dockerhub", "gcr", "ecr", "acr", "ghcr", "custom"]).describe("Registry type"),
      username: z.string().optional().describe("Username for authentication"),
      password: z.string().optional().describe("Password or token"),
      awsRegion: z.string().optional().describe("AWS region (required for ECR registries)"),
      awsAccessKeyId: z.string().optional().describe("AWS access key ID (for ECR registries)"),
      awsSecretAccessKey: z.string().optional().describe("AWS secret access key (for ECR registries)"),
    },
    },
    toolHandler(async ({ name, url, type, username, password, awsRegion, awsAccessKeyId, awsSecretAccessKey }, client) => {
      const response = await client.post<{ data: { id: string; name: string } }>(
        "/container-registries",
        { name, url, type, username, password, awsRegion, awsAccessKeyId, awsSecretAccessKey }
      );

      return `Registry created: ${response.data.name} (ID: ${response.data.id})`;
    })
  );

  // arcane_registry_update
  server.registerTool(
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
      name: z.string().optional().describe("New name"),
      url: z.string().optional().describe("New URL"),
      username: z.string().optional().describe("New username"),
      password: z.string().optional().describe("New password"),
    },
    },
    toolHandler(async ({ registryId, name, url, username, password }, client) => {
      const body: Record<string, unknown> = {};
      if (name) body.name = name;
      if (url) body.url = url;
      if (username) body.username = username;
      if (password) body.password = password;

      await client.put(`/container-registries/${registryId}`, body);
      return `Registry ${registryId} updated.`;
    })
  );

  // arcane_registry_delete
  server.registerTool(
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
  server.registerTool(
    "arcane_registry_test",
    {
      title: "Test registry",
      description: "Test connectivity to a container registry",
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: false,
      },
      inputSchema: {
      registryId: z.string().describe("Registry ID"),
    },
    },
    toolHandler(async ({ registryId }, client) => {
      const response = await client.post<{ message: string }>(
        `/container-registries/${registryId}/test`
      );
      return response.message || "Connection successful!";
    })
  );

  // arcane_registry_sync
  server.registerTool(
    "arcane_registry_sync",
    {
      title: "Sync registries",
      description: "Sync all container registries to refresh image information",
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: false,
      },
    },
    toolHandler(async (_params, client) => {
      await client.post("/container-registries/sync");
      return "Registry sync initiated.";
    })
  );

  logger.debug("Registered registry tools");
}
