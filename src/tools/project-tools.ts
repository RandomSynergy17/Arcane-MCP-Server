/**
 * Docker Compose Project/Stack management tools for Arcane MCP Server
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { toolHandler } from "../utils/tool-helpers.js";
import { moduleRegistrar, type ToolRegistry } from "./registry.js";
import { MAX_DISPLAY_SERVICES } from "../constants.js";
import type { Project } from "../types/arcane-types.js";

export function registerProjectTools(server: McpServer, registry?: ToolRegistry): void {
  const register = moduleRegistrar(server, registry, "project");

  // arcane_project_list
  register(
    "arcane_project_list",
    {
      title: "List projects",
      description: "List Docker Compose projects/stacks in an environment. Use the `updates` filter (e.g. 'has_update') to list projects with pending image updates, including which images are outdated.",
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
      inputSchema: {
      environmentId: z.string().describe("Environment ID"),
      search: z.string().optional().describe("Search query to filter projects"),
      status: z.string().optional().describe("Filter by status (comma-separated: running,stopped,partially running)"),
      updates: z.enum(["has_update", "up_to_date", "error", "unknown"]).optional().describe("Filter by image update status — 'has_update' lists only projects with pending updates"),
      sort: z.string().optional().describe("Column to sort by"),
      order: z.enum(["asc", "desc"]).optional().default("asc").describe("Sort direction"),
      start: z.number().optional().default(0).describe("Pagination start index"),
      limit: z.number().optional().default(20).describe("Items per page (-1 for all)"),
    },
    },
    toolHandler(async ({ environmentId, search, status, updates, sort, order, start, limit }, client) => {
      const response = await client.get<{
        data: Project[];
        pagination: { totalItems: number };
      }>(`/environments/${environmentId}/projects`, { search, status, updates, sort, order, start, limit });

      if (!response.data || response.data.length === 0) {
        return updates ? `No projects with update status "${updates}" found.` : "No projects found.";
      }

      const lines = [`Found ${response.pagination.totalItems} projects:\n`];
      for (const project of response.data) {
        const projectStatus = project.status === "running" ? "[RUNNING]" : "[STOPPED]";
        const updateFlag = project.updateInfo?.hasUpdate ? " [UPDATES AVAILABLE]" : "";
        lines.push(`${projectStatus}${updateFlag} ${project.name}`);
        lines.push(`    ID: ${project.id}`);
        lines.push(`    Services: ${project.serviceCount ?? project.runtimeServices?.length ?? 0}`);
        if (project.runtimeServices && project.runtimeServices.length > 0) {
          for (const svc of project.runtimeServices.slice(0, MAX_DISPLAY_SERVICES)) {
            lines.push(`      - ${svc.name}: ${svc.status}${svc.health ? ` (${svc.health})` : ""}`);
          }
          if (project.runtimeServices.length > MAX_DISPLAY_SERVICES) {
            lines.push(`      ... and ${project.runtimeServices.length - MAX_DISPLAY_SERVICES} more`);
          }
        }
        const u = project.updateInfo;
        if (u?.hasUpdate) {
          const refs = u.updatedImageRefs?.length ? u.updatedImageRefs.join(", ") : `${u.imagesWithUpdates ?? "?"} of ${u.imageCount ?? "?"} images`;
          lines.push(`    Updates: ${refs}`);
          if (u.lastCheckedAt) lines.push(`    Last checked: ${u.lastCheckedAt}`);
        } else if (u?.status === "error" && u.errorMessage) {
          lines.push(`    Update check error: ${u.errorMessage}`);
        }
        lines.push("");
      }

      return lines.join("\n");
    })
  );

  // arcane_project_get
  register(
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
      ];

      const u = proj.updateInfo;
      if (u?.hasUpdate) {
        const refs = u.updatedImageRefs?.length ? u.updatedImageRefs.join(", ") : `${u.imagesWithUpdates ?? "?"} of ${u.imageCount ?? "?"} images`;
        lines.push(`  Image updates available: ${refs}`);
      } else if (u) {
        lines.push(`  Image updates: ${u.status}${u.errorMessage ? ` (${u.errorMessage})` : ""}`);
      }

      lines.push("", "Services:");
      for (const svc of proj.runtimeServices || []) {
        lines.push(`  - ${svc.name}: ${svc.status}${svc.health ? ` (${svc.health})` : ""}${svc.containerName ? ` [${svc.containerName}]` : ""}`);
      }

      return lines.join("\n");
    })
  );

  // arcane_project_create
  register(
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
    },
    },
    toolHandler(async ({ environmentId, name, composeContent, envContent }, client) => {
      const response = await client.post<{ data: { id: string; name: string } }>(
        `/environments/${environmentId}/projects`,
        { name, composeContent, envContent }
      );

      return `Project created successfully!\n  Name: ${response.data.name}\n  ID: ${response.data.id}`;
    })
  );

  // arcane_project_update
  register(
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
  register(
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
  register(
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
  register(
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
  register(
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

  // arcane_project_update_services
  register(
    "arcane_project_update_services",
    {
      title: "Update project services",
      description: "Pull the latest images and recreate services of a Compose project (all services when none are given). This is the dedicated update action (permission projects:update) — prefer it over manual pull + redeploy. Runs in the background; track progress with arcane_activity_list.",
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true,
      },
      inputSchema: {
      environmentId: z.string().describe("Environment ID"),
      projectId: z.string().describe("Project ID"),
      services: z.array(z.string()).optional().describe("Service names to update; omit to update all services"),
    },
    },
    toolHandler(async ({ environmentId, projectId, services }, client) => {
      client.postInBackground(
        `/environments/${environmentId}/projects/${projectId}/update-services`,
        services && services.length > 0 ? { services } : {}
      );

      const scope = services && services.length > 0 ? `services ${services.join(", ")}` : "all services";
      return [
        `Update of ${scope} in project ${projectId} started in the background (pulls latest images and recreates the services).`,
        "Track progress with arcane_activity_list / arcane_activity_get; verify afterwards with arcane_project_get.",
      ].join("\n");
    })
  );

  // arcane_project_destroy
  register(
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
      removeFiles: z.boolean().optional().default(false).describe("Also remove the project files from disk"),
    },
    },
    toolHandler(async ({ environmentId, projectId, removeVolumes, removeFiles }, client) => {
      await client.delete(
        `/environments/${environmentId}/projects/${projectId}/destroy`,
        undefined,
        { removeVolumes, removeFiles }
      );
      return `Project ${projectId} destroyed.${removeVolumes ? " Volumes were also removed." : ""}`;
    })
  );

  // arcane_project_pull_images
  register(
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
  register(
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
        data: {
          totalProjects: number;
          runningProjects: number;
          stoppedProjects: number;
          archivedProjects?: number;
        };
      }>(`/environments/${environmentId}/projects/counts`);

      const c = response.data;
      return `Project Counts:\n  Total: ${c.totalProjects}\n  Running: ${c.runningProjects || 0}\n  Stopped: ${c.stoppedProjects || 0}\n  Archived: ${c.archivedProjects || 0}`;
    })
  );

  // arcane_project_build
  register(
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

}
