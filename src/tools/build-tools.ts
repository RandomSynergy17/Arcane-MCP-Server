/**
 * Image build management tools for Arcane MCP Server
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { toolHandler } from "../utils/tool-helpers.js";
import { moduleRegistrar, type ToolRegistry } from "./registry.js";
import { validatePath } from "../utils/format.js";
import type { Build, BuildDetails, WorkspaceFile } from "../types/arcane-types.js";

export function registerBuildTools(server: McpServer, registry?: ToolRegistry): void {
  const register = moduleRegistrar(server, registry, "build");

  // arcane_build_image
  register(
    "arcane_build_image",
    {
      title: "Build image",
      description: "Build a Docker image from a build workspace directory with support for build args and multi-platform builds. Use the build workspace tools to browse/upload the build context first.",
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true,
      },
      inputSchema: {
        environmentId: z.string().describe("Environment ID"),
        contextDir: z.string().describe("Build context directory (path within the build workspace)"),
        dockerfile: z.string().optional().describe("Path to the Dockerfile within the context (default: Dockerfile)"),
        dockerfileInline: z.string().optional().describe("Inline Dockerfile content (used instead of a Dockerfile in the context)"),
        tag: z.string().describe("Image tag (e.g., myapp:latest)"),
        buildArgs: z.record(z.string()).optional().describe("Build arguments as key-value pairs"),
        platform: z.string().optional().describe("Target platform (e.g., linux/amd64, linux/arm64)"),
        noCache: z.boolean().optional().default(false).describe("Build without using the cache"),
      },
    },
    toolHandler(async ({ environmentId, contextDir, dockerfile, dockerfileInline, tag, buildArgs, platform, noCache }, client) => {
      const body: Record<string, unknown> = { contextDir, tags: [tag], noCache };
      if (dockerfile) body.dockerfile = dockerfile;
      if (dockerfileInline) body.dockerfileInline = dockerfileInline;
      if (buildArgs) body.buildArgs = buildArgs;
      if (platform) body.platforms = [platform];

      // The build endpoint streams progress and finishes when the build is done.
      await client.post(`/environments/${environmentId}/images/build`, body);

      return `Build for ${tag} finished. Use arcane_build_list to inspect the result.`;
    })
  );

  // arcane_build_list
  register(
    "arcane_build_list",
    {
      title: "List builds",
      description: "List image builds for an environment with optional filtering by status or search query",
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
      inputSchema: {
        environmentId: z.string().describe("Environment ID"),
        status: z.string().optional().describe("Filter by build status (e.g., running, completed, failed)"),
        search: z.string().optional().describe("Search query"),
        start: z.number().optional().default(0).describe("Pagination start index"),
        limit: z.number().optional().default(20).describe("Items per page"),
      },
    },
    toolHandler(async ({ environmentId, status, search, start, limit }, client) => {
      const response = await client.get<{
        data: Build[];
        pagination: { total: number; start: number; limit: number };
      }>(`/environments/${environmentId}/images/builds`, {
        status, search, start, limit,
      });

      if (!response.data || response.data.length === 0) {
        return "No builds found.";
      }

      const lines = [`Found ${response.pagination.total} builds:\n`];
      for (const build of response.data) {
        lines.push(`[${build.status.toUpperCase()}] ${build.tag || build.id}`);
        lines.push(`    Build ID: ${build.id}`);
        if (build.provider) lines.push(`    Provider: ${build.provider}`);
        if (build.startedAt) lines.push(`    Started: ${build.startedAt}`);
        if (build.completedAt) lines.push(`    Completed: ${build.completedAt}`);
        if (build.error) lines.push(`    Error: ${build.error}`);
        lines.push("");
      }

      return lines.join("\n");
    })
  );

  // arcane_build_get
  register(
    "arcane_build_get",
    {
      title: "Get build details",
      description: "Get detailed information about a specific image build including logs",
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
      inputSchema: {
        environmentId: z.string().describe("Environment ID"),
        buildId: z.string().describe("Build ID"),
      },
    },
    toolHandler(async ({ environmentId, buildId }, client) => {
      const response = await client.get<{ data: BuildDetails }>(
        `/environments/${environmentId}/images/builds/${buildId}`
      );

      const build = response.data;
      const lines = [
        `Build Details:`,
        `  Build ID: ${build.id}`,
        `  Status: ${build.status}`,
        `  Tag: ${build.tag || "N/A"}`,
        `  Platform: ${build.platform || "default"}`,
      ];
      if (build.gitUrl) lines.push(`  Git URL: ${build.gitUrl}`);
      if (build.startedAt) lines.push(`  Started: ${build.startedAt}`);
      if (build.completedAt) lines.push(`  Completed: ${build.completedAt}`);
      if (build.error) lines.push(`  Error: ${build.error}`);
      if (build.buildArgs && Object.keys(build.buildArgs).length > 0) {
        lines.push(`  Build Args:`);
        for (const [key, value] of Object.entries(build.buildArgs)) {
          lines.push(`    ${key}=${value}`);
        }
      }
      if (build.logs) {
        lines.push("");
        lines.push("Build Logs:");
        lines.push(build.logs);
      }

      return lines.join("\n");
    })
  );

  // arcane_build_workspace_browse
  register(
    "arcane_build_workspace_browse",
    {
      title: "Browse build workspace",
      description: "Browse files in the build workspace directory",
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
      inputSchema: {
        environmentId: z.string().describe("Environment ID"),
        path: z.string().optional().describe("Directory path to browse (default: root)"),
      },
    },
    toolHandler(async ({ environmentId, path }, client) => {
      if (path) validatePath(path);

      const response = await client.get<{ data: WorkspaceFile[] }>(
        `/environments/${environmentId}/builds/browse`,
        { path }
      );

      if (!response.data || response.data.length === 0) {
        return "No files found in workspace.";
      }

      const lines = [`Workspace files${path ? ` in ${path}` : ""}:\n`];
      for (const file of response.data) {
        const type = file.isDirectory ? "[DIR]" : "[FILE]";
        const size = file.size !== undefined ? ` (${file.size} bytes)` : "";
        lines.push(`${type} ${file.name}${size}`);
      }

      return lines.join("\n");
    })
  );

  // arcane_build_workspace_get_content
  register(
    "arcane_build_workspace_get_content",
    {
      title: "Get workspace file content",
      description: "Get the content of a file from the build workspace",
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
      inputSchema: {
        environmentId: z.string().describe("Environment ID"),
        path: z.string().describe("File path in the workspace"),
      },
    },
    toolHandler(async ({ environmentId, path }, client) => {
      validatePath(path);

      const response = await client.get<{ data: { content: string; path: string } }>(
        `/environments/${environmentId}/builds/browse/content`,
        { path }
      );

      return `File: ${response.data.path}\n\n${response.data.content}`;
    })
  );

  // arcane_build_workspace_upload
  register(
    "arcane_build_workspace_upload",
    {
      title: "Upload workspace file",
      description: "Upload a file to the build workspace",
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: false,
      },
      inputSchema: {
        environmentId: z.string().describe("Environment ID"),
        path: z.string().describe("Destination path in the workspace"),
        content: z.string().describe("File content to upload"),
      },
    },
    toolHandler(async ({ environmentId, path, content }, client) => {
      validatePath(path);

      await client.post(
        `/environments/${environmentId}/builds/browse/upload`,
        { path, content }
      );

      return `File uploaded to workspace: ${path}`;
    })
  );

}
