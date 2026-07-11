/**
 * GitOps tools for Arcane MCP Server
 * Includes GitOps sync and Git repository management
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { toolHandler } from "../utils/tool-helpers.js";
import { moduleRegistrar, type ToolRegistry } from "./registry.js";
import { validatePath } from "../utils/format.js";
import type { GitOpsSync, GitRepository } from "../types/arcane-types.js";

export function registerGitopsTools(server: McpServer, registry?: ToolRegistry): void {
  const register = moduleRegistrar(server, registry, "gitops");
  // ============= GitOps Sync =============

  // arcane_gitops_list
  register(
    "arcane_gitops_list",
    {
      title: "List GitOps syncs",
      description: "List GitOps sync configurations",
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
      inputSchema: {
      environmentId: z.string().describe("Environment ID"),
      search: z.string().optional().describe("Search query"),
      start: z.number().optional().default(0).describe("Pagination start"),
      limit: z.number().optional().default(20).describe("Items per page"),
    },
    },
    toolHandler(async ({ environmentId, search, start, limit }, client) => {
      const response = await client.get<{
        data: GitOpsSync[];
        pagination: { totalItems: number };
      }>(`/environments/${environmentId}/gitops-syncs`, { search, start, limit });

      if (!response.data || response.data.length === 0) {
        return "No GitOps syncs configured.";
      }

      const lines = [`Found ${response.pagination.totalItems} GitOps syncs:\n`];
      for (const sync of response.data) {
        const status = sync.lastSyncStatus || "never synced";
        lines.push(`${sync.name}`);
        lines.push(`    ID: ${sync.id}`);
        lines.push(`    Branch: ${sync.branch}`);
        lines.push(`    Path: ${sync.composePath}`);
        lines.push(`    Auto-sync: ${sync.autoSync ? "Yes" : "No"}`);
        lines.push(`    Last sync: ${sync.lastSyncAt || "Never"} (${status})`);
        lines.push("");
      }

      return lines.join("\n");
    })
  );

  // arcane_gitops_get
  register(
    "arcane_gitops_get",
    {
      title: "Get GitOps sync details",
      description: "Get details of a GitOps sync configuration",
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
      inputSchema: {
      environmentId: z.string().describe("Environment ID"),
      syncId: z.string().describe("GitOps sync ID"),
    },
    },
    toolHandler(async ({ environmentId, syncId }, client) => {
      const response = await client.get<{ data: GitOpsSync }>(
        `/environments/${environmentId}/gitops-syncs/${syncId}`
      );

      const sync = response.data;
      const lines = [
        `GitOps Sync: ${sync.name}`,
        `  ID: ${sync.id}`,
        `  Repository ID: ${sync.repositoryId}`,
        `  Branch: ${sync.branch}`,
        `  Path: ${sync.composePath}`,
        `  Target Project: ${sync.projectName || sync.projectId || "N/A"}`,
        `  Auto-sync: ${sync.autoSync ? `Yes (every ${sync.syncInterval}s)` : "No"}`,
        `  Last Sync: ${sync.lastSyncAt || "Never"}`,
        `  Last Status: ${sync.lastSyncStatus || "N/A"}`,
      ];

      return lines.join("\n");
    })
  );

  // arcane_gitops_create
  register(
    "arcane_gitops_create",
    {
      title: "Create GitOps sync",
      description: "Create a new GitOps sync configuration",
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: false,
      },
      inputSchema: {
      environmentId: z.string().describe("Environment ID"),
      name: z.string().describe("Name for the sync"),
      repositoryId: z.string().describe("Git repository ID"),
      branch: z.string().describe("Branch to sync from"),
      composePath: z.string().describe("Path to the compose file in the repo"),
      syncDirectory: z.boolean().optional().describe("Sync the entire directory containing the compose file"),
      autoSync: z.boolean().optional().default(false).describe("Enable automatic syncing"),
      syncInterval: z.number().optional().describe("Sync interval in seconds (for auto-sync)"),
    },
    },
    toolHandler(async ({ environmentId, name, repositoryId, branch, composePath, syncDirectory, autoSync, syncInterval }, client) => {
      const response = await client.post<{ data: { id: string; name: string } }>(
        `/environments/${environmentId}/gitops-syncs`,
        { name, repositoryId, branch, composePath, syncDirectory, autoSync, syncInterval }
      );

      return `GitOps sync created: ${response.data.name} (ID: ${response.data.id})`;
    })
  );

  // arcane_gitops_update
  register(
    "arcane_gitops_update",
    {
      title: "Update GitOps sync",
      description: "Update a GitOps sync configuration",
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
      inputSchema: {
      environmentId: z.string().describe("Environment ID"),
      syncId: z.string().describe("GitOps sync ID"),
      name: z.string().optional().describe("New name"),
      branch: z.string().optional().describe("New branch"),
      composePath: z.string().optional().describe("New path to the compose file in the repo"),
      syncDirectory: z.boolean().optional().describe("Sync the entire directory containing the compose file"),
      autoSync: z.boolean().optional().describe("Enable/disable auto-sync"),
      syncInterval: z.number().optional().describe("New sync interval"),
    },
    },
    toolHandler(async ({ environmentId, syncId, name, branch, composePath, syncDirectory, autoSync, syncInterval }, client) => {
      const body: Record<string, unknown> = {};
      if (name) body.name = name;
      if (branch) body.branch = branch;
      if (composePath) body.composePath = composePath;
      if (syncDirectory !== undefined) body.syncDirectory = syncDirectory;
      if (autoSync !== undefined) body.autoSync = autoSync;
      if (syncInterval !== undefined) body.syncInterval = syncInterval;

      await client.put(`/environments/${environmentId}/gitops-syncs/${syncId}`, body);
      return `GitOps sync ${syncId} updated.`;
    })
  );

  // arcane_gitops_delete
  register(
    "arcane_gitops_delete",
    {
      title: "Delete GitOps sync",
      description: "Delete a GitOps sync configuration",
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: false,
        openWorldHint: false,
      },
      inputSchema: {
      environmentId: z.string().describe("Environment ID"),
      syncId: z.string().describe("GitOps sync ID"),
    },
    },
    toolHandler(async ({ environmentId, syncId }, client) => {
      await client.delete(`/environments/${environmentId}/gitops-syncs/${syncId}`);
      return `GitOps sync ${syncId} deleted.`;
    })
  );

  // arcane_gitops_sync
  register(
    "arcane_gitops_sync",
    {
      title: "Trigger GitOps sync",
      description: "Trigger a GitOps sync to pull and deploy latest changes from the repository",
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: false,
      },
      inputSchema: {
      environmentId: z.string().describe("Environment ID"),
      syncId: z.string().describe("GitOps sync ID"),
    },
    },
    toolHandler(async ({ environmentId, syncId }, client) => {
      await client.post(`/environments/${environmentId}/gitops-syncs/${syncId}/sync`);
      return `GitOps sync triggered for ${syncId}.`;
    })
  );

  // arcane_gitops_get_status
  register(
    "arcane_gitops_get_status",
    {
      title: "Get GitOps sync status",
      description: "Get the current sync status for a GitOps configuration",
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
      inputSchema: {
      environmentId: z.string().describe("Environment ID"),
      syncId: z.string().describe("GitOps sync ID"),
    },
    },
    toolHandler(async ({ environmentId, syncId }, client) => {
      const response = await client.get<{
        data: {
          lastSyncStatus?: string;
          lastSyncAt?: string;
          lastSyncCommit?: string;
          lastSyncError?: string;
        };
      }>(`/environments/${environmentId}/gitops-syncs/${syncId}/status`);

      const status = response.data;
      const lines = [
        `Sync Status: ${status.lastSyncStatus || "never synced"}`,
        `  Last Sync: ${status.lastSyncAt || "Never"}`,
        `  Last Commit: ${status.lastSyncCommit || "N/A"}`,
      ];
      if (status.lastSyncError) {
        lines.push(`  Error: ${status.lastSyncError}`);
      }

      return lines.join("\n");
    })
  );

  // ============= Git Repositories =============

  // arcane_git_repo_list
  register(
    "arcane_git_repo_list",
    {
      title: "List Git repositories",
      description: "List configured Git repositories",
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
        data: GitRepository[];
        pagination: { totalItems: number };
      }>("/customize/git-repositories", { search, start, limit });

      if (!response.data || response.data.length === 0) {
        return "No Git repositories configured.";
      }

      const lines = [`Found ${response.pagination.totalItems} repositories:\n`];
      for (const repo of response.data) {
        lines.push(`${repo.name}`);
        lines.push(`    ID: ${repo.id}`);
        lines.push(`    URL: ${repo.url}`);
        lines.push(`    Auth: ${repo.authType}`);
        lines.push("");
      }

      return lines.join("\n");
    })
  );

  // arcane_git_repo_create
  register(
    "arcane_git_repo_create",
    {
      title: "Add Git repository",
      description: "Add a new Git repository configuration",
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: false,
      },
      inputSchema: {
      name: z.string().describe("Repository name"),
      url: z.string().describe("Repository URL"),
      authType: z.enum(["none", "basic", "ssh", "token"]).optional().default("none").describe("Authentication type"),
      username: z.string().optional().describe("Username (for basic auth)"),
      token: z.string().optional().describe("Access token / password for HTTPS auth"),
      sshKey: z.string().optional().describe("SSH private key"),
    },
    },
    toolHandler(async ({ name, url, authType, username, token, sshKey }, client) => {
      const response = await client.post<{ data: { id: string; name: string } }>(
        "/customize/git-repositories",
        { name, url, authType, username, token, sshKey }
      );

      return `Git repository added: ${response.data.name} (ID: ${response.data.id})`;
    })
  );

  // arcane_git_repo_test
  register(
    "arcane_git_repo_test",
    {
      title: "Test Git repository",
      description: "Test connectivity to a Git repository",
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true,
      },
      inputSchema: {
      repositoryId: z.string().describe("Repository ID"),
      branch: z.string().optional().describe("Branch to test (defaults to main)"),
    },
    },
    toolHandler(async ({ repositoryId, branch }, client) => {
      const response = await client.post<{ data: { message?: string } }>(
        `/customize/git-repositories/${repositoryId}/test`,
        undefined,
        { branch }
      );
      return response.data?.message || "Connection successful!";
    })
  );

  // arcane_git_repo_get_branches
  register(
    "arcane_git_repo_get_branches",
    {
      title: "List repo branches",
      description: "List branches in a Git repository",
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
      inputSchema: {
      repositoryId: z.string().describe("Repository ID"),
    },
    },
    toolHandler(async ({ repositoryId }, client) => {
      const response = await client.get<{
        data: { branches: Array<{ name: string; isDefault: boolean }> | null };
      }>(`/customize/git-repositories/${repositoryId}/branches`);

      if (!response.data.branches || response.data.branches.length === 0) {
        return "No branches found.";
      }

      const lines = ["Branches:\n"];
      for (const branch of response.data.branches) {
        lines.push(`  - ${branch.name}${branch.isDefault ? " (default)" : ""}`);
      }

      return lines.join("\n");
    })
  );

  // arcane_git_repo_browse_files
  register(
    "arcane_git_repo_browse_files",
    {
      title: "Browse repo files",
      description: "Browse files in a Git repository",
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
      inputSchema: {
      repositoryId: z.string().describe("Repository ID"),
      branch: z.string().optional().describe("Branch to browse"),
      path: z.string().optional().default("").describe("Path within repository"),
    },
    },
    toolHandler(async ({ repositoryId, branch, path }, client) => {
      if (path) validatePath(path);

      const response = await client.get<{
        data: {
          path: string;
          files: Array<{ name: string; path: string; type: string; size?: number }> | null;
        };
      }>(`/customize/git-repositories/${repositoryId}/files`, { branch, path });

      if (!response.data.files || response.data.files.length === 0) {
        return `No files found at path: ${path || "/"}`;
      }

      const lines = [`Files at ${path || "/"}:\n`];
      for (const file of response.data.files) {
        const type = file.type === "dir" ? "DIR " : "FILE";
        lines.push(`${type}  ${file.name}`);
      }

      return lines.join("\n");
    })
  );

  // arcane_git_repo_delete
  register(
    "arcane_git_repo_delete",
    {
      title: "Delete Git repository",
      description: "Delete a Git repository configuration",
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: false,
        openWorldHint: false,
      },
      inputSchema: {
      repositoryId: z.string().describe("Repository ID"),
    },
    },
    toolHandler(async ({ repositoryId }, client) => {
      await client.delete(`/customize/git-repositories/${repositoryId}`);
      return `Repository ${repositoryId} deleted.`;
    })
  );

}
