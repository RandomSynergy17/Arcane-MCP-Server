/**
 * Volume management tools for Arcane MCP Server
 * Includes file operations and backup management
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { toolHandler } from "../utils/tool-helpers.js";
import { formatSize, formatSizeCompact, formatSizeMB } from "../utils/format.js";
import { logger } from "../utils/logger.js";

interface Volume {
  name: string;
  driver: string;
  mountpoint: string;
  scope: string;
  createdAt: string;
  labels?: Record<string, string>;
  options?: Record<string, string>;
  usageData?: { size: number; refCount: number };
}

interface FileEntry {
  name: string;
  path: string;
  size: number;
  isDir: boolean;
  modTime: string;
  mode: string;
}

interface Backup {
  id: string;
  volumeName: string;
  filename: string;
  size: number;
  createdAt: string;
}

export function registerVolumeTools(server: McpServer): void {
  // ============= Volume Management =============

  // arcane_volume_list
  server.registerTool(
    "arcane_volume_list",
    {
      title: "List volumes",
      description: "List Docker volumes in an environment",
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
      inputSchema: {
      environmentId: z.string().describe("Environment ID"),
      search: z.string().optional().describe("Search query to filter volumes"),
      sort: z.string().optional().describe("Column to sort by"),
      order: z.enum(["asc", "desc"]).optional().default("asc").describe("Sort direction"),
      start: z.number().optional().default(0).describe("Pagination start index"),
      limit: z.number().optional().default(20).describe("Items per page"),
    },
    },
    toolHandler(async ({ environmentId, search, sort, order, start, limit }, client) => {
      const response = await client.get<{
        data: Volume[];
        pagination: { total: number; start: number; limit: number };
      }>(`/environments/${environmentId}/volumes`, { search, sort, order, start, limit });

      if (!response.data || response.data.length === 0) {
        return "No volumes found.";
      }

      const lines = [`Found ${response.pagination.total} volumes:\n`];
      for (const vol of response.data) {
        lines.push(`${vol.name}`);
        lines.push(`    Driver: ${vol.driver}`);
        lines.push(`    Mountpoint: ${vol.mountpoint}`);
        if (vol.usageData) {
          lines.push(`    Size: ${formatSize(vol.usageData.size, true)}`);
          lines.push(`    Containers: ${vol.usageData.refCount}`);
        }
        lines.push("");
      }

      return lines.join("\n");
    })
  );

  // arcane_volume_get
  server.registerTool(
    "arcane_volume_get",
    {
      title: "Get volume details",
      description: "Get detailed information about a Docker volume",
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
      inputSchema: {
      environmentId: z.string().describe("Environment ID"),
      volumeName: z.string().describe("Volume name"),
    },
    },
    toolHandler(async ({ environmentId, volumeName }, client) => {
      const response = await client.get<{ data: Volume }>(
        `/environments/${environmentId}/volumes/${volumeName}`
      );

      const vol = response.data;
      const lines = [
        `Volume: ${vol.name}`,
        `  Driver: ${vol.driver}`,
        `  Scope: ${vol.scope}`,
        `  Mountpoint: ${vol.mountpoint}`,
        `  Created: ${vol.createdAt}`,
      ];

      if (vol.usageData) {
        lines.push(`  Size: ${formatSizeMB(vol.usageData.size)}`);
        lines.push(`  Container Refs: ${vol.usageData.refCount}`);
      }

      if (vol.labels && Object.keys(vol.labels).length > 0) {
        lines.push("  Labels:");
        for (const [key, value] of Object.entries(vol.labels)) {
          lines.push(`    - ${key}: ${value}`);
        }
      }

      return lines.join("\n");
    })
  );

  // arcane_volume_create
  server.registerTool(
    "arcane_volume_create",
    {
      title: "Create volume",
      description: "Create a new Docker volume",
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: false,
      },
      inputSchema: {
      environmentId: z.string().describe("Environment ID"),
      name: z.string().describe("Volume name"),
      driver: z.string().optional().default("local").describe("Volume driver"),
      driverOpts: z.record(z.string()).optional().describe("Driver-specific options"),
      labels: z.record(z.string()).optional().describe("Labels to add to the volume"),
    },
    },
    toolHandler(async ({ environmentId, name, driver, driverOpts, labels }, client) => {
      const response = await client.post<{ data: { name: string } }>(
        `/environments/${environmentId}/volumes`,
        { name, driver, driverOpts, labels }
      );

      return `Volume created successfully: ${response.data.name}`;
    })
  );

  // arcane_volume_delete
  server.registerTool(
    "arcane_volume_delete",
    {
      title: "Delete volume",
      description: "[CRITICAL RISK] Permanently delete a Docker volume and ALL its data. This cannot be undone!",
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: false,
        openWorldHint: false,
      },
      inputSchema: {
      environmentId: z.string().describe("Environment ID"),
      volumeName: z.string().describe("Volume name to delete"),
      force: z.boolean().optional().default(false).describe("Force removal even if in use"),
    },
    },
    toolHandler(async ({ environmentId, volumeName, force }, client) => {
      await client.delete(`/environments/${environmentId}/volumes/${volumeName}`, { force });
      return `Volume ${volumeName} deleted permanently.`;
    })
  );

  // arcane_volume_prune
  server.registerTool(
    "arcane_volume_prune",
    {
      title: "Prune volumes",
      description: "[CRITICAL RISK] Remove ALL unused Docker volumes and their data. This cannot be undone!",
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: false,
        openWorldHint: false,
      },
      inputSchema: {
      environmentId: z.string().describe("Environment ID"),
    },
    },
    toolHandler(async ({ environmentId }, client) => {
      const response = await client.post<{ volumesDeleted?: string[]; spaceReclaimed?: number }>(
        `/environments/${environmentId}/volumes/prune`
      );

      const deleted = response.volumesDeleted?.length || 0;
      const space = response.spaceReclaimed
        ? formatSize(response.spaceReclaimed)
        : "unknown";

      return `Pruned ${deleted} volumes, reclaimed ${space} of disk space.`;
    })
  );

  // arcane_volume_get_counts
  server.registerTool(
    "arcane_volume_get_counts",
    {
      title: "Get volume counts",
      description: "Get volume counts for an environment",
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
        inUse: number;
        unused: number;
      }>(`/environments/${environmentId}/volumes/counts`);

      return `Volume Counts:\n  Total: ${response.total}\n  In Use: ${response.inUse || 0}\n  Unused: ${response.unused || 0}`;
    })
  );

  // ============= Volume File Operations =============

  // arcane_volume_browse
  server.registerTool(
    "arcane_volume_browse",
    {
      title: "Browse volume files",
      description: "Browse files and directories in a Docker volume",
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
      inputSchema: {
      environmentId: z.string().describe("Environment ID"),
      volumeName: z.string().describe("Volume name"),
      path: z.string().optional().default("/").describe("Path within the volume"),
    },
    },
    toolHandler(async ({ environmentId, volumeName, path }, client) => {
      const response = await client.get<{ data: FileEntry[] }>(
        `/environments/${environmentId}/volumes/${volumeName}/browse`,
        { path }
      );

      if (!response.data || response.data.length === 0) {
        return `Directory ${path} is empty.`;
      }

      const lines = [`Contents of ${path}:\n`];
      for (const entry of response.data) {
        const type = entry.isDir ? "DIR " : "FILE";
        const size = entry.isDir ? "-" : formatSizeCompact(entry.size);
        lines.push(`${type}  ${size.padEnd(8)}  ${entry.name}`);
      }

      return lines.join("\n");
    })
  );

  // arcane_volume_browse_content
  server.registerTool(
    "arcane_volume_browse_content",
    {
      title: "Read volume file",
      description: "Read the content of a file in a Docker volume",
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
      inputSchema: {
      environmentId: z.string().describe("Environment ID"),
      volumeName: z.string().describe("Volume name"),
      path: z.string().describe("Path to the file"),
    },
    },
    toolHandler(async ({ environmentId, volumeName, path }, client) => {
      const response = await client.get<{ data: { content: string } }>(
        `/environments/${environmentId}/volumes/${volumeName}/browse/content`,
        { path }
      );

      return response.data.content;
    })
  );

  // arcane_volume_browse_mkdir
  server.registerTool(
    "arcane_volume_browse_mkdir",
    {
      title: "Create volume directory",
      description: "Create a directory in a Docker volume",
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: false,
      },
      inputSchema: {
      environmentId: z.string().describe("Environment ID"),
      volumeName: z.string().describe("Volume name"),
      path: z.string().describe("Path for the new directory"),
    },
    },
    toolHandler(async ({ environmentId, volumeName, path }, client) => {
      await client.post(`/environments/${environmentId}/volumes/${volumeName}/browse/mkdir`, { path });
      return `Directory created: ${path}`;
    })
  );

  // ============= Volume Backups =============

  // arcane_volume_backup_list
  server.registerTool(
    "arcane_volume_backup_list",
    {
      title: "List volume backups",
      description: "List backups for a Docker volume",
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
      inputSchema: {
      environmentId: z.string().describe("Environment ID"),
      volumeName: z.string().describe("Volume name"),
    },
    },
    toolHandler(async ({ environmentId, volumeName }, client) => {
      const response = await client.get<{ data: Backup[] }>(
        `/environments/${environmentId}/volumes/${volumeName}/backups`
      );

      if (!response.data || response.data.length === 0) {
        return `No backups found for volume ${volumeName}.`;
      }

      const lines = [`Backups for ${volumeName}:\n`];
      for (const backup of response.data) {
        lines.push(`${backup.filename}`);
        lines.push(`    ID: ${backup.id}`);
        lines.push(`    Size: ${formatSizeMB(backup.size)}`);
        lines.push(`    Created: ${backup.createdAt}`);
        lines.push("");
      }

      return lines.join("\n");
    })
  );

  // arcane_volume_backup_create
  server.registerTool(
    "arcane_volume_backup_create",
    {
      title: "Create volume backup",
      description: "Create a backup of a Docker volume",
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: false,
      },
      inputSchema: {
      environmentId: z.string().describe("Environment ID"),
      volumeName: z.string().describe("Volume name to backup"),
    },
    },
    toolHandler(async ({ environmentId, volumeName }, client) => {
      const response = await client.post<{ data: Backup }>(
        `/environments/${environmentId}/volumes/${volumeName}/backups`
      );

      return `Backup created: ${response.data.filename}\n  ID: ${response.data.id}\n  Size: ${formatSizeMB(response.data.size)}`;
    })
  );

  // arcane_volume_backup_delete
  server.registerTool(
    "arcane_volume_backup_delete",
    {
      title: "Delete volume backup",
      description: "[HIGH RISK] Delete a volume backup permanently",
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: false,
        openWorldHint: false,
      },
      inputSchema: {
      environmentId: z.string().describe("Environment ID"),
      volumeName: z.string().describe("Volume name"),
      backupId: z.string().describe("Backup ID to delete"),
    },
    },
    toolHandler(async ({ environmentId, volumeName, backupId }, client) => {
      await client.delete(`/environments/${environmentId}/volumes/${volumeName}/backups/${backupId}`);
      return `Backup ${backupId} deleted.`;
    })
  );

  // arcane_volume_backup_restore
  server.registerTool(
    "arcane_volume_backup_restore",
    {
      title: "Restore volume backup",
      description: "Restore a volume from a backup. This will overwrite existing data in the volume.",
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: false,
        openWorldHint: false,
      },
      inputSchema: {
      environmentId: z.string().describe("Environment ID"),
      volumeName: z.string().describe("Volume name"),
      backupId: z.string().describe("Backup ID to restore"),
    },
    },
    toolHandler(async ({ environmentId, volumeName, backupId }, client) => {
      await client.post(`/environments/${environmentId}/volumes/${volumeName}/backups/${backupId}/restore`);
      return `Volume ${volumeName} restored from backup ${backupId}.`;
    })
  );

  // arcane_volume_backup_list_files
  server.registerTool(
    "arcane_volume_backup_list_files",
    {
      title: "List backup files",
      description: "List files contained in a volume backup",
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
      inputSchema: {
      environmentId: z.string().describe("Environment ID"),
      volumeName: z.string().describe("Volume name"),
      backupId: z.string().describe("Backup ID"),
      path: z.string().optional().default("/").describe("Path within the backup"),
    },
    },
    toolHandler(async ({ environmentId, volumeName, backupId, path }, client) => {
      const response = await client.get<{ data: FileEntry[] }>(
        `/environments/${environmentId}/volumes/${volumeName}/backups/${backupId}/files`,
        { path }
      );

      if (!response.data || response.data.length === 0) {
        return `Path ${path} is empty or not found in backup.`;
      }

      const lines = [`Files in backup at ${path}:\n`];
      for (const entry of response.data) {
        const type = entry.isDir ? "DIR " : "FILE";
        lines.push(`${type}  ${entry.name}`);
      }

      return lines.join("\n");
    })
  );

  logger.debug("Registered volume tools");
}
