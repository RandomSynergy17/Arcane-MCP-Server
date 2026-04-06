/**
 * Docker Compose Project/Stack management tools for Arcane MCP Server
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { toolHandler } from "../utils/tool-helpers.js";
import { MAX_DISPLAY_SERVICES } from "../constants.js";
import { logger } from "../utils/logger.js";
import type { Project } from "../types/arcane-types.js";

export function registerProjectTools(server: McpServer): void {

  // arcane_project_list
  server.registerTool(
    "arcane_project_list",
    {
      title: "List projects",
      description: "List Docker Compose projects/stacks in an environment",
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
      inputSchema: {
      environmentId: z.string().describe("Environment ID"),
      search: z.string().optional().describe("Search query to filter projects"),
      sort: z.string().optional().describe("Column to sort by"),
      order: z.enum(["asc", "desc"]).optional().default("asc").describe("Sort direction"),
      start: z.number().optional().default(0).describe("Pagination start index"),
      limit: z.number().optional().default(20).describe("Items per page"),
    },
    },
    toolHandler(async ({ environmentId, search, sort, order, start, limit }, client) => {
      const response = await client.get<{
        data: Project[];
        pagination: { total: number; start: number; limit: number };
      }>(`/environments/${environmentId}/projects`, { search, sort, order, start, limit });

      if (!response.data || response.data.length === 0) {
        return "No projects found.";
      }

      const lines = [`Found ${response.pagination.total} projects:\n`];
      for (const project of response.data) {
        const status = project.status === "running" ? "[RUNNING]" : "[STOPPED]";
        lines.push(`${status} ${project.name}`);
        lines.push(`    ID: ${project.id}`);
        lines.push(`    Services: ${project.services?.length || 0}`);
        if (project.services && project.services.length > 0) {
          for (const svc of project.services.slice(0, MAX_DISPLAY_SERVICES)) {
            lines.push(`      - ${svc.name}: ${svc.status}`);
          }
          if (project.services.length > MAX_DISPLAY_SERVICES) {
            lines.push(`      ... and ${project.services.length - MAX_DISPLAY_SERVICES} more`);
          }
        }
        lines.push("");
      }

      return lines.join("\n");
    })
  );

  // arcane_project_get
  server.registerTool(
    "arcane_project_get",
    {
      title: "Get project details",
      description: "Get detailed information about a Docker Compose project",
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
      inputSchema: {
      environmentId: z.string().describe("Environment ID"),
      projectId: z.string().describe("Project ID"),
    },
    },
    toolHandler(async ({ environmentId, projectId }, client) => {
      const response = await client.get<{ data: Project & { config?: string } }>(
        `/environments/${environmentId}/projects/${projectId}`
      );

      const proj = response.data;
      const lines = [
        `Project: ${proj.name}`,
        `  ID: ${proj.id}`,
        `  Status: ${proj.status}`,
        `  Path: ${proj.path || "N/A"}`,
        `  Created: ${proj.createdAt || "N/A"}`,
        `  Updated: ${proj.updatedAt || "N/A"}`,
        "",
        "Services:",
      ];

      for (const svc of proj.services || []) {
        lines.push(`  - ${svc.name}: ${svc.status} (${svc.containerCount || 0} containers)`);
      }

      return lines.join("\n");
    })
  );

  // arcane_project_create
  server.registerTool(
    "arcane_project_create",
    {
      title: "Create project",
      description: "Create a new Docker Compose project from a compose file",
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: false,
      },
      inputSchema: {
      environmentId: z.string().describe("Environment ID"),
      name: z.string().describe("Project name"),
      composeContent: z.string().describe("Docker Compose YAML content"),
      envContent: z.string().optional().describe("Environment variables content (.env format)"),
      directory: z.string().optional().describe("Project directory path (supports nested and symlinked directories)"),
    },
    },
    toolHandler(async ({ environmentId, name, composeContent, envContent, directory }, client) => {
      const response = await client.post<{ data: { id: string; name: string } }>(
        `/environments/${environmentId}/projects`,
        { name, composeContent, envContent, directory }
      );

      return `Project created successfully!\n  Name: ${response.data.name}\n  ID: ${response.data.id}`;
    })
  );

  // arcane_project_update
  server.registerTool(
    "arcane_project_update",
    {
      title: "Update project config",
      description: "Update a Docker Compose project configuration",
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
      inputSchema: {
      environmentId: z.string().describe("Environment ID"),
      projectId: z.string().describe("Project ID"),
      composeContent: z.string().optional().describe("New Docker Compose YAML content"),
      envContent: z.string().optional().describe("New environment variables content"),
    },
    },
    toolHandler(async ({ environmentId, projectId, composeContent, envContent }, client) => {
      const body: Record<string, unknown> = {};
      if (composeContent) body.composeContent = composeContent;
      if (envContent) body.envContent = envContent;

      await client.put(`/environments/${environmentId}/projects/${projectId}`, body);
      return `Project ${projectId} updated successfully.`;
    })
  );

  // arcane_project_up
  server.registerTool(
    "arcane_project_up",
    {
      title: "Deploy project",
      description: "Deploy a Docker Compose project (docker-compose up -d). Use arcane_project_pull_images first to pull latest images.",
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: false,
      },
      inputSchema: {
      environmentId: z.string().describe("Environment ID"),
      projectId: z.string().describe("Project ID"),
    },
    },
    toolHandler(async ({ environmentId, projectId }, client) => {
      await client.post(`/environments/${environmentId}/projects/${projectId}/up`);
      return `Project ${projectId} deployed successfully.`;
    })
  );

  // arcane_project_down
  server.registerTool(
    "arcane_project_down",
    {
      title: "Stop project",
      description: "Stop and remove containers for a Docker Compose project (docker-compose down). Use arcane_project_destroy to also remove volumes.",
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
      inputSchema: {
      environmentId: z.string().describe("Environment ID"),
      projectId: z.string().describe("Project ID"),
    },
    },
    toolHandler(async ({ environmentId, projectId }, client) => {
      await client.post(`/environments/${environmentId}/projects/${projectId}/down`);
      return `Project ${projectId} stopped and removed.`;
    })
  );

  // arcane_project_restart
  server.registerTool(
    "arcane_project_restart",
    {
      title: "Restart project",
      description: "Restart all services in a Docker Compose project",
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: false,
      },
      inputSchema: {
      environmentId: z.string().describe("Environment ID"),
      projectId: z.string().describe("Project ID"),
    },
    },
    toolHandler(async ({ environmentId, projectId }, client) => {
      await client.post(`/environments/${environmentId}/projects/${projectId}/restart`);
      return `Project ${projectId} restarted.`;
    })
  );

  // arcane_project_redeploy
  server.registerTool(
    "arcane_project_redeploy",
    {
      title: "Redeploy project",
      description: "Redeploy a project (down + up). Useful for applying configuration changes. Use arcane_project_pull_images first to pull latest images.",
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: false,
      },
      inputSchema: {
      environmentId: z.string().describe("Environment ID"),
      projectId: z.string().describe("Project ID"),
    },
    },
    toolHandler(async ({ environmentId, projectId }, client) => {
      await client.post(`/environments/${environmentId}/projects/${projectId}/redeploy`);
      return `Project ${projectId} redeployed successfully.`;
    })
  );

  // arcane_project_destroy
  server.registerTool(
    "arcane_project_destroy",
    {
      title: "Destroy project",
      description: "[CRITICAL RISK] Destroy a project completely, including containers and optionally volumes. This cannot be undone!",
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: false,
        openWorldHint: false,
      },
      inputSchema: {
      environmentId: z.string().describe("Environment ID"),
      projectId: z.string().describe("Project ID"),
      removeVolumes: z.boolean().optional().default(false).describe("Also remove volumes (DATA LOSS!)"),
    },
    },
    toolHandler(async ({ environmentId, projectId, removeVolumes }, client) => {
      await client.delete(`/environments/${environmentId}/projects/${projectId}`, { removeVolumes });
      return `Project ${projectId} destroyed.${removeVolumes ? " Volumes were also removed." : ""}`;
    })
  );

  // arcane_project_pull_images
  server.registerTool(
    "arcane_project_pull_images",
    {
      title: "Pull project images",
      description: "Pull all images for a Docker Compose project",
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: false,
      },
      inputSchema: {
      environmentId: z.string().describe("Environment ID"),
      projectId: z.string().describe("Project ID"),
    },
    },
    toolHandler(async ({ environmentId, projectId }, client) => {
      await client.post(`/environments/${environmentId}/projects/${projectId}/pull`);
      return `Images pulled for project ${projectId}.`;
    })
  );

  // arcane_project_get_counts
  server.registerTool(
    "arcane_project_get_counts",
    {
      title: "Get project counts",
      description: "Get project status counts for an environment",
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
        total: number;
        running: number;
        stopped: number;
        partial: number;
      }>(`/environments/${environmentId}/projects/counts`);

      return `Project Counts:\n  Total: ${response.total}\n  Running: ${response.running || 0}\n  Stopped: ${response.stopped || 0}\n  Partial: ${response.partial || 0}`;
    })
  );

  // arcane_project_build
  server.registerTool(
    "arcane_project_build",
    {
      title: "Build project images",
      description: "Build images for a Docker Compose project",
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: false,
      },
      inputSchema: {
        environmentId: z.string().describe("Environment ID"),
        projectId: z.string().describe("Project ID"),
      },
    },
    toolHandler(async ({ environmentId, projectId }, client) => {
      await client.post(
        `/environments/${environmentId}/projects/${projectId}/build`
      );
      return `Build started for project ${projectId}.`;
    })
  );

  logger.debug("Registered project tools");
}
