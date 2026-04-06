/**
 * Environment management tools for Arcane MCP Server
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { toolHandler } from "../utils/tool-helpers.js";
import { formatSizeGB } from "../utils/format.js";
import { logger } from "../utils/logger.js";

interface Environment {
  id: string;
  name: string;
  apiUrl?: string;
  status?: string;
  createdAt?: string;
  updatedAt?: string;
}

export function registerEnvironmentTools(server: McpServer): void {
  // arcane_environment_list
  server.registerTool(
    "arcane_environment_list",
    {
      title: "List environments",
      description: "List all Docker environments configured in Arcane",
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
      inputSchema: {
      search: z.string().optional().describe("Search query to filter environments"),
      sort: z.string().optional().describe("Column to sort by"),
      order: z.enum(["asc", "desc"]).optional().default("asc").describe("Sort direction"),
      start: z.number().optional().default(0).describe("Pagination start index"),
      limit: z.number().optional().default(20).describe("Items per page"),
    },
    },
    toolHandler(async ({ search, sort, order, start, limit }, client) => {
      const response = await client.get<{
        data: Environment[];
        pagination: { total: number; start: number; limit: number };
      }>("/environments", { search, sort, order, start, limit });

      if (!response.data || response.data.length === 0) {
        return "No environments found.";
      }

      const lines = [`Found ${response.pagination.total} environments:\n`];
      for (const env of response.data) {
        const status = env.status || "unknown";
        lines.push(`[${status.toUpperCase()}] ${env.name} (ID: ${env.id})`);
        if (env.apiUrl) lines.push(`    URL: ${env.apiUrl}`);
      }

      return lines.join("\n");
    })
  );

  // arcane_environment_get
  server.registerTool(
    "arcane_environment_get",
    {
      title: "Get environment details",
      description: "Get details of a specific Docker environment",
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
      const response = await client.get<{ data: Environment }>(`/environments/${environmentId}`);
      const env = response.data;

      const lines = [
        `Environment: ${env.name}`,
        `  ID: ${env.id}`,
        `  Status: ${env.status || "unknown"}`,
        `  API URL: ${env.apiUrl || "N/A"}`,
        `  Created: ${env.createdAt || "N/A"}`,
        `  Updated: ${env.updatedAt || "N/A"}`,
      ];

      return lines.join("\n");
    })
  );

  // arcane_environment_create
  server.registerTool(
    "arcane_environment_create",
    {
      title: "Create environment",
      description: "Create a new Docker environment in Arcane",
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: false,
      },
      inputSchema: {
      name: z.string().describe("Name for the environment"),
      apiUrl: z.string().optional().describe("API URL for the Docker host"),
      tlsEnabled: z.boolean().optional().default(false).describe("Enable TLS for Docker API"),
    },
    },
    toolHandler(async ({ name, apiUrl, tlsEnabled }, client) => {
      const response = await client.post<{ data: Environment & { apiKey?: string } }>("/environments", {
        name,
        apiUrl,
        tlsEnabled,
      });

      const env = response.data;
      let text = `Environment created successfully!\n  Name: ${env.name}\n  ID: ${env.id}`;
      if (env.apiKey) {
        text += `\n  API Key: ${env.apiKey}\n\n(Save this API key - it won't be shown again)`;
      }

      return text;
    })
  );

  // arcane_environment_update
  server.registerTool(
    "arcane_environment_update",
    {
      title: "Update environment",
      description: "Update an existing Docker environment",
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
      inputSchema: {
      environmentId: z.string().describe("Environment ID to update"),
      name: z.string().optional().describe("New name for the environment"),
      apiUrl: z.string().optional().describe("New API URL"),
    },
    },
    toolHandler(async ({ environmentId, name, apiUrl }, client) => {
      const body: Record<string, unknown> = {};
      if (name) body.name = name;
      if (apiUrl) body.apiUrl = apiUrl;

      const response = await client.put<{ data: Environment }>(`/environments/${environmentId}`, body);
      return `Environment updated: ${response.data.name}`;
    })
  );

  // arcane_environment_delete
  server.registerTool(
    "arcane_environment_delete",
    {
      title: "Delete environment",
      description: "[HIGH RISK] Delete a Docker environment from Arcane. This removes the environment configuration but does not affect the actual Docker host.",
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: false,
        openWorldHint: false,
      },
      inputSchema: {
      environmentId: z.string().describe("Environment ID to delete"),
    },
    },
    toolHandler(async ({ environmentId }, client) => {
      await client.delete(`/environments/${environmentId}`);
      return `Environment ${environmentId} deleted successfully.`;
    })
  );

  // arcane_environment_test
  server.registerTool(
    "arcane_environment_test",
    {
      title: "Test environment",
      description: "Test connectivity to a Docker environment",
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: false,
      },
      inputSchema: {
      environmentId: z.string().describe("Environment ID to test"),
    },
    },
    toolHandler(async ({ environmentId }, client) => {
      const response = await client.post<{ message: string }>(`/environments/${environmentId}/test`);
      return `Connection test: ${response.message || "Success"}`;
    })
  );

  // arcane_environment_pair_agent
  server.registerTool(
    "arcane_environment_pair_agent",
    {
      title: "Pair agent",
      description: "Generate or rotate the local agent pairing token for an environment",
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: false,
      },
      inputSchema: {
      environmentId: z.string().describe("Environment ID (use '0' for local)"),
      rotate: z.boolean().optional().default(false).describe("Rotate existing token"),
    },
    },
    toolHandler(async ({ environmentId, rotate }, client) => {
      const response = await client.post<{ data: { apiKey: string; expiresAt: string } }>(
        `/environments/${environmentId}/agent/pair`,
        { rotate }
      );

      return `Agent pairing token generated:\n  Token: ${response.data.apiKey}\n  Expires: ${response.data.expiresAt}`;
    })
  );

  // arcane_environment_get_version
  server.registerTool(
    "arcane_environment_get_version",
    {
      title: "Get agent version",
      description: "Get the Arcane agent version running on an environment",
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
      const response = await client.get<{ data: { version: string; buildTime?: string } }>(
        `/environments/${environmentId}/version`
      );

      return `Agent Version: ${response.data.version}${response.data.buildTime ? `\nBuild Time: ${response.data.buildTime}` : ""}`;
    })
  );

  // arcane_environment_get_docker_info
  server.registerTool(
    "arcane_environment_get_docker_info",
    {
      title: "Get Docker info",
      description: "Get Docker system information for an environment",
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
          serverVersion: string;
          operatingSystem: string;
          architecture: string;
          containers: number;
          containersRunning: number;
          containersStopped: number;
          images: number;
          memTotal: number;
          ncpu: number;
        };
      }>(`/environments/${environmentId}/system/docker-info`);

      const info = response.data;
      const lines = [
        "Docker System Info:",
        `  Version: ${info.serverVersion}`,
        `  OS: ${info.operatingSystem}`,
        `  Architecture: ${info.architecture}`,
        `  CPUs: ${info.ncpu}`,
        `  Memory: ${formatSizeGB(info.memTotal)}`,
        `  Containers: ${info.containers} (${info.containersRunning} running, ${info.containersStopped} stopped)`,
        `  Images: ${info.images}`,
      ];

      return lines.join("\n");
    })
  );

  // arcane_environment_get_deployment_snippets
  server.registerTool(
    "arcane_environment_get_deployment_snippets",
    {
      title: "Get deployment snippets",
      description: "Get deployment snippets for installing Arcane agent on an environment",
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
      const response = await client.get<{ data: { docker?: string; dockerCompose?: string } }>(
        `/environments/${environmentId}/deployment-snippets`
      );

      const snippets = response.data;
      let text = "Deployment Snippets:\n\n";

      if (snippets.docker) {
        text += "Docker Command:\n```\n" + snippets.docker + "\n```\n\n";
      }
      if (snippets.dockerCompose) {
        text += "Docker Compose:\n```yaml\n" + snippets.dockerCompose + "\n```";
      }

      return text;
    })
  );

  logger.debug("Registered environment tools");
}
