/**
 * Image management tools for Arcane MCP Server
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { toolHandler } from "../utils/tool-helpers.js";
import { moduleRegistrar, type ToolRegistry } from "./registry.js";
import { formatSize, formatSizeMB, formatSizeGB } from "../utils/format.js";
import { DOCKER_DIGEST_PREFIX_LENGTH, DOCKER_SHORT_ID_LENGTH } from "../constants.js";
import type { Image } from "../types/arcane-types.js";

export function registerImageTools(server: McpServer, registry?: ToolRegistry): void {
  const register = moduleRegistrar(server, registry, "image");
  // arcane_image_list
  register(
    "arcane_image_list",
    {
      title: "List images",
      description: "List Docker images in an environment",
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
      inputSchema: {
      environmentId: z.string().describe("Environment ID"),
      search: z.string().optional().describe("Search query to filter images"),
      sort: z.string().optional().describe("Column to sort by"),
      order: z.enum(["asc", "desc"]).optional().default("asc").describe("Sort direction"),
      start: z.number().optional().default(0).describe("Pagination start index"),
      limit: z.number().optional().default(20).describe("Items per page"),
    },
    },
    toolHandler(async ({ environmentId, search, sort, order, start, limit }, client) => {
      const response = await client.get<{
        data: Image[];
        pagination: { total: number; start: number; limit: number };
      }>(`/environments/${environmentId}/images`, { search, sort, order, start, limit });

      if (!response.data || response.data.length === 0) {
        return "No images found.";
      }

      const lines = [`Found ${response.pagination.total} images:\n`];
      for (const img of response.data) {
        const tags = img.repoTags?.join(", ") || "<none>";
        lines.push(`${tags}`);
        lines.push(`    ID: ${img.id.substring(DOCKER_DIGEST_PREFIX_LENGTH, DOCKER_DIGEST_PREFIX_LENGTH + DOCKER_SHORT_ID_LENGTH)}`);
        lines.push(`    Size: ${formatSize(img.size)}`);
        lines.push(`    Created: ${img.created}`);
        lines.push("");
      }

      return lines.join("\n");
    })
  );

  // arcane_image_get
  register(
    "arcane_image_get",
    {
      title: "Get image details",
      description: "Get detailed information about a Docker image",
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
      inputSchema: {
      environmentId: z.string().describe("Environment ID"),
      imageId: z.string().describe("Image ID or tag"),
    },
    },
    toolHandler(async ({ environmentId, imageId }, client) => {
      const response = await client.get<{ data: Image & { config?: Record<string, unknown> } }>(
        `/environments/${environmentId}/images/${imageId}`
      );

      const img = response.data;

      const lines = [
        `Image: ${img.repoTags?.[0] || "untagged"}`,
        `  ID: ${img.id}`,
        `  Tags: ${img.repoTags?.join(", ") || "none"}`,
        `  Size: ${formatSizeMB(img.size)}`,
        `  Created: ${img.created}`,
      ];

      if (img.repoDigests && img.repoDigests.length > 0) {
        lines.push(`  Digests: ${img.repoDigests[0]}`);
      }

      return lines.join("\n");
    })
  );

  // arcane_image_pull
  register(
    "arcane_image_pull",
    {
      title: "Pull image",
      description: "Pull a Docker image from a registry",
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true,
      },
      inputSchema: {
      environmentId: z.string().describe("Environment ID"),
      imageName: z.string().describe("Image name (e.g., nginx, library/ubuntu, ghcr.io/owner/repo)"),
      tag: z.string().describe("Image tag (e.g., latest, v1.0, alpine) — required"),
      registryId: z.string().optional().describe("Container registry ID for private images (credentials will be fetched automatically)"),
    },
    },
    toolHandler(async ({ environmentId, imageName, tag, registryId }, client) => {
      const body: Record<string, unknown> = { imageName, tag };
      if (registryId) body.registryId = registryId;

      const displayName = tag ? `${imageName}:${tag}` : imageName;
      await client.post(`/environments/${environmentId}/images/pull`, body);
      return `Image ${displayName} pulled successfully.`;
    })
  );

  // arcane_image_delete
  register(
    "arcane_image_delete",
    {
      title: "Delete image",
      description: "[HIGH RISK] Remove a Docker image from the host",
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: false,
        openWorldHint: false,
      },
      inputSchema: {
      environmentId: z.string().describe("Environment ID"),
      imageId: z.string().describe("Image ID or tag to delete"),
      force: z.boolean().optional().default(false).describe("Force removal even if in use"),
      pruneChildren: z.boolean().optional().default(false).describe("Also remove child images"),
    },
    },
    toolHandler(async ({ environmentId, imageId, force, pruneChildren }, client) => {
      await client.delete(`/environments/${environmentId}/images/${imageId}`, { force, pruneChildren });
      return `Image ${imageId} removed successfully.`;
    })
  );

  // arcane_image_prune
  register(
    "arcane_image_prune",
    {
      title: "Prune images",
      description: "[HIGH RISK] Remove all unused Docker images. This frees disk space but cannot be undone.",
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: false,
        openWorldHint: false,
      },
      inputSchema: {
      environmentId: z.string().describe("Environment ID"),
      all: z.boolean().optional().default(false).describe("Remove all unused images, not just dangling ones"),
    },
    },
    toolHandler(async ({ environmentId, all }, client) => {
      const response = await client.post<{ imagesDeleted?: string[]; spaceReclaimed?: number }>(
        `/environments/${environmentId}/images/prune`,
        { all }
      );

      const deleted = response.imagesDeleted?.length || 0;
      const space = response.spaceReclaimed
        ? formatSizeMB(response.spaceReclaimed)
        : "unknown";

      return `Pruned ${deleted} images, reclaimed ${space} of disk space.`;
    })
  );

  // arcane_image_get_counts
  register(
    "arcane_image_get_counts",
    {
      title: "Get image counts",
      description: "Get image counts and size statistics for an environment",
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
        size: number;
        danglingCount?: number;
      }>(`/environments/${environmentId}/images/counts`);

      return `Image Statistics:\n  Total: ${response.total}\n  Total Size: ${formatSizeGB(response.size)}\n  Dangling: ${response.danglingCount || 0}`;
    })
  );

  // arcane_image_check_update
  register(
    "arcane_image_check_update",
    {
      title: "Check image update",
      description: "Check if a newer version of an image is available",
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
      inputSchema: {
      environmentId: z.string().describe("Environment ID"),
      image: z.string().describe("Image name with tag to check"),
    },
    },
    toolHandler(async ({ environmentId, image }, client) => {
      const response = await client.post<{
        data: {
          hasUpdate: boolean;
          currentDigest?: string;
          latestDigest?: string;
        };
      }>(`/environments/${environmentId}/image-updates/check`, { image });

      if (response.data.hasUpdate) {
        return `Update available for ${image}!\n  Current: ${response.data.currentDigest?.substring(0, DOCKER_DIGEST_PREFIX_LENGTH + DOCKER_SHORT_ID_LENGTH) || "unknown"}\n  Latest: ${response.data.latestDigest?.substring(0, DOCKER_DIGEST_PREFIX_LENGTH + DOCKER_SHORT_ID_LENGTH) || "unknown"}`;
      } else {
        return `${image} is up to date.`;
      }
    })
  );

  // arcane_image_check_updates_all
  register(
    "arcane_image_check_updates_all",
    {
      title: "Check all image updates",
      description: "Check for updates on all images in an environment",
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
      const response = await client.post<{
        data: Array<{ image: string; hasUpdate: boolean }>;
      }>(`/environments/${environmentId}/image-updates/check-all`);

      const updates = response.data.filter(i => i.hasUpdate);
      if (updates.length === 0) {
        return "All images are up to date.";
      }

      const lines = [`Found ${updates.length} images with updates:\n`];
      for (const img of updates) {
        lines.push(`  - ${img.image}`);
      }

      return lines.join("\n");
    })
  );

  // arcane_image_get_update_summary
  register(
    "arcane_image_get_update_summary",
    {
      title: "Get image update summary",
      description: "Get a summary of available image updates across all containers",
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
          totalImages: number;
          updatesAvailable: number;
          lastChecked?: string;
        };
      }>(`/environments/${environmentId}/image-updates/summary`);

      return `Update Summary:\n  Total Images: ${response.data.totalImages}\n  Updates Available: ${response.data.updatesAvailable}\n  Last Checked: ${response.data.lastChecked || "Never"}`;
    })
  );

}
