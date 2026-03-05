/**
 * GitOps tools for Arcane MCP Server
 * Includes GitOps sync and Git repository management
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { toolHandler } from "../utils/tool-helpers.js";
import { logger } from "../utils/logger.js";

interface GitOpsSync {
  id: string;
  name: string;
  repositoryId: string;
  branch: string;
  path: string;
  targetProjectId?: string;
  lastSyncAt?: string;
  lastSyncStatus?: string;
  autoSync: boolean;
  syncInterval?: number;
}

interface GitRepository {
  id: string;
  name: string;
  url: string;
  branch: string;
  authType: string;
  lastTestAt?: string;
  lastTestStatus?: string;
}

export function registerGitopsTools(server: McpServer): void {
  // ============= GitOps Sync =============

  // arcane_gitops_list
  server.tool(
    "arcane_gitops_list",
    "List GitOps sync configurations",
    {
      environmentId: z.string().describe("Environment ID"),
      search: z.string().optional().describe("Search query"),
      start: z.number().optional().default(0).describe("Pagination start"),
      limit: z.number().optional().default(20).describe("Items per page"),
    },
    toolHandler(async ({ environmentId, search, start, limit }, client) => {
      const response = await client.get<{
        data: GitOpsSync[];
        pagination: { total: number };
      }>(`/environments/${environmentId}/gitops-syncs`, { search, start, limit });

      if (!response.data || response.data.length === 0) {
        return "No GitOps syncs configured.";
      }

      const lines = [`Found ${response.pagination.total} GitOps syncs:\n`];
      for (const sync of response.data) {
        const status = sync.lastSyncStatus || "never synced";
        lines.push(`${sync.name}`);
        lines.push(`    ID: ${sync.id}`);
        lines.push(`    Branch: ${sync.branch}`);
        lines.push(`    Path: ${sync.path}`);
        lines.push(`    Auto-sync: ${sync.autoSync ? "Yes" : "No"}`);
        lines.push(`    Last sync: ${sync.lastSyncAt || "Never"} (${status})`);
        lines.push("");
      }

      return lines.join("\n");
    })
  );

  // arcane_gitops_get
  server.tool(
    "arcane_gitops_get",
    "Get details of a GitOps sync configuration",
    {
      environmentId: z.string().describe("Environment ID"),
      syncId: z.string().describe("GitOps sync ID"),
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
        `  Path: ${sync.path}`,
        `  Target Project: ${sync.targetProjectId || "N/A"}`,
        `  Auto-sync: ${sync.autoSync ? `Yes (every ${sync.syncInterval}s)` : "No"}`,
        `  Last Sync: ${sync.lastSyncAt || "Never"}`,
        `  Last Status: ${sync.lastSyncStatus || "N/A"}`,
      ];

      return lines.join("\n");
    })
  );

  // arcane_gitops_create
  server.tool(
    "arcane_gitops_create",
    "Create a new GitOps sync configuration",
    {
      environmentId: z.string().describe("Environment ID"),
      name: z.string().describe("Name for the sync"),
      repositoryId: z.string().describe("Git repository ID"),
      branch: z.string().describe("Branch to sync from"),
      path: z.string().describe("Path to compose files in repo"),
      autoSync: z.boolean().optional().default(false).describe("Enable automatic syncing"),
      syncInterval: z.number().optional().describe("Sync interval in seconds (for auto-sync)"),
    },
    toolHandler(async ({ environmentId, name, repositoryId, branch, path, autoSync, syncInterval }, client) => {
      const response = await client.post<{ data: { id: string; name: string } }>(
        `/environments/${environmentId}/gitops-syncs`,
        { name, repositoryId, branch, path, autoSync, syncInterval }
      );

      return `GitOps sync created: ${response.data.name} (ID: ${response.data.id})`;
    })
  );

  // arcane_gitops_update
  server.tool(
    "arcane_gitops_update",
    "Update a GitOps sync configuration",
    {
      environmentId: z.string().describe("Environment ID"),
      syncId: z.string().describe("GitOps sync ID"),
      name: z.string().optional().describe("New name"),
      branch: z.string().optional().describe("New branch"),
      path: z.string().optional().describe("New path"),
      autoSync: z.boolean().optional().describe("Enable/disable auto-sync"),
      syncInterval: z.number().optional().describe("New sync interval"),
    },
    toolHandler(async ({ environmentId, syncId, name, branch, path, autoSync, syncInterval }, client) => {
      const body: Record<string, unknown> = {};
      if (name) body.name = name;
      if (branch) body.branch = branch;
      if (path) body.path = path;
      if (autoSync !== undefined) body.autoSync = autoSync;
      if (syncInterval !== undefined) body.syncInterval = syncInterval;

      await client.put(`/environments/${environmentId}/gitops-syncs/${syncId}`, body);
      return `GitOps sync ${syncId} updated.`;
    })
  );

  // arcane_gitops_delete
  server.tool(
    "arcane_gitops_delete",
    "Delete a GitOps sync configuration",
    {
      environmentId: z.string().describe("Environment ID"),
      syncId: z.string().describe("GitOps sync ID"),
    },
    toolHandler(async ({ environmentId, syncId }, client) => {
      await client.delete(`/environments/${environmentId}/gitops-syncs/${syncId}`);
      return `GitOps sync ${syncId} deleted.`;
    })
  );

  // arcane_gitops_sync
  server.tool(
    "arcane_gitops_sync",
    "Trigger a GitOps sync to pull and deploy latest changes from the repository",
    {
      environmentId: z.string().describe("Environment ID"),
      syncId: z.string().describe("GitOps sync ID"),
    },
    toolHandler(async ({ environmentId, syncId }, client) => {
      await client.post(`/environments/${environmentId}/gitops-syncs/${syncId}/sync`);
      return `GitOps sync triggered for ${syncId}.`;
    })
  );

  // arcane_gitops_get_status
  server.tool(
    "arcane_gitops_get_status",
    "Get the current sync status for a GitOps configuration",
    {
      environmentId: z.string().describe("Environment ID"),
      syncId: z.string().describe("GitOps sync ID"),
    },
    toolHandler(async ({ environmentId, syncId }, client) => {
      const response = await client.get<{
        data: {
          status: string;
          lastSyncAt?: string;
          lastCommit?: string;
          error?: string;
        };
      }>(`/environments/${environmentId}/gitops-syncs/${syncId}/status`);

      const status = response.data;
      const lines = [
        `Sync Status: ${status.status}`,
        `  Last Sync: ${status.lastSyncAt || "Never"}`,
        `  Last Commit: ${status.lastCommit || "N/A"}`,
      ];
      if (status.error) {
        lines.push(`  Error: ${status.error}`);
      }

      return lines.join("\n");
    })
  );

  // ============= Git Repositories =============

  // arcane_git_repo_list
  server.tool(
    "arcane_git_repo_list",
    "List configured Git repositories",
    {
      search: z.string().optional().describe("Search query"),
      start: z.number().optional().default(0).describe("Pagination start"),
      limit: z.number().optional().default(20).describe("Items per page"),
    },
    toolHandler(async ({ search, start, limit }, client) => {
      const response = await client.get<{
        data: GitRepository[];
        pagination: { total: number };
      }>("/customize/git-repositories", { search, start, limit });

      if (!response.data || response.data.length === 0) {
        return "No Git repositories configured.";
      }

      const lines = [`Found ${response.pagination.total} repositories:\n`];
      for (const repo of response.data) {
        lines.push(`${repo.name}`);
        lines.push(`    ID: ${repo.id}`);
        lines.push(`    URL: ${repo.url}`);
        lines.push(`    Branch: ${repo.branch}`);
        lines.push(`    Auth: ${repo.authType}`);
        lines.push("");
      }

      return lines.join("\n");
    })
  );

  // arcane_git_repo_create
  server.tool(
    "arcane_git_repo_create",
    "Add a new Git repository configuration",
    {
      name: z.string().describe("Repository name"),
      url: z.string().describe("Repository URL"),
      branch: z.string().optional().default("main").describe("Default branch"),
      authType: z.enum(["none", "basic", "ssh", "token"]).optional().default("none").describe("Authentication type"),
      username: z.string().optional().describe("Username (for basic auth)"),
      password: z.string().optional().describe("Password or token"),
      sshKey: z.string().optional().describe("SSH private key"),
    },
    toolHandler(async ({ name, url, branch, authType, username, password, sshKey }, client) => {
      const response = await client.post<{ data: { id: string; name: string } }>(
        "/customize/git-repositories",
        { name, url, branch, authType, username, password, sshKey }
      );

      return `Git repository added: ${response.data.name} (ID: ${response.data.id})`;
    })
  );

  // arcane_git_repo_test
  server.tool(
    "arcane_git_repo_test",
    "Test connectivity to a Git repository",
    {
      repositoryId: z.string().describe("Repository ID"),
      branch: z.string().optional().describe("Branch to test (defaults to main)"),
    },
    toolHandler(async ({ repositoryId, branch }, client) => {
      const response = await client.post<{ message: string }>(
        `/customize/git-repositories/${repositoryId}/test`,
        undefined,
        { branch }
      );
      return response.message || "Connection successful!";
    })
  );

  // arcane_git_repo_get_branches
  server.tool(
    "arcane_git_repo_get_branches",
    "List branches in a Git repository",
    {
      repositoryId: z.string().describe("Repository ID"),
    },
    toolHandler(async ({ repositoryId }, client) => {
      const response = await client.get<{
        data: { branches: string[]; defaultBranch?: string };
      }>(`/customize/git-repositories/${repositoryId}/branches`);

      const lines = [`Branches (default: ${response.data.defaultBranch || "unknown"}):\n`];
      for (const branch of response.data.branches) {
        const isDefault = branch === response.data.defaultBranch ? " (default)" : "";
        lines.push(`  - ${branch}${isDefault}`);
      }

      return lines.join("\n");
    })
  );

  // arcane_git_repo_browse_files
  server.tool(
    "arcane_git_repo_browse_files",
    "Browse files in a Git repository",
    {
      repositoryId: z.string().describe("Repository ID"),
      branch: z.string().optional().describe("Branch to browse"),
      path: z.string().optional().default("").describe("Path within repository"),
    },
    toolHandler(async ({ repositoryId, branch, path }, client) => {
      const response = await client.get<{
        data: Array<{ name: string; type: string; path: string }>;
      }>(`/customize/git-repositories/${repositoryId}/files`, { branch, path });

      if (!response.data || response.data.length === 0) {
        return `No files found at path: ${path || "/"}`;
      }

      const lines = [`Files at ${path || "/"}:\n`];
      for (const file of response.data) {
        const type = file.type === "dir" ? "DIR " : "FILE";
        lines.push(`${type}  ${file.name}`);
      }

      return lines.join("\n");
    })
  );

  // arcane_git_repo_delete
  server.tool(
    "arcane_git_repo_delete",
    "Delete a Git repository configuration",
    {
      repositoryId: z.string().describe("Repository ID"),
    },
    toolHandler(async ({ repositoryId }, client) => {
      await client.delete(`/customize/git-repositories/${repositoryId}`);
      return `Repository ${repositoryId} deleted.`;
    })
  );

  logger.debug("Registered gitops tools");
}
