/**
 * Image update checking tools for Arcane MCP Server
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { toolHandler } from "../utils/tool-helpers.js";
import type { ImageUpdateResponse, BatchImageUpdateResponse, ImageUpdateSummary } from "../types/arcane-types.js";

export function registerImageUpdateTools(server: McpServer): void {

  // arcane_image_update_check
  server.registerTool(
    "arcane_image_update_check",
    {
      title: "Check image update",
      description: "Check if an image update is available by image reference",
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
      inputSchema: {
      environmentId: z.string().describe("Environment ID"),
      imageRef: z.string().describe("Image reference (e.g., nginx:latest, ghcr.io/org/app:v1)"),
    },
    },
    toolHandler(async ({ environmentId, imageRef }, client) => {
      const response = await client.get<{ data: ImageUpdateResponse }>(
        `/environments/${environmentId}/image-updates/check`,
        { imageRef }
      );

      const u = response.data;
      if (u.updateAvailable) {
        return `Update available for ${u.imageRef}!\n  Current: ${u.currentDigest?.substring(0, 12) || u.currentTag || "unknown"}\n  Latest: ${u.latestDigest?.substring(0, 12) || u.latestTag || "unknown"}`;
      }
      return `${u.imageRef} is up to date.`;
    })
  );

  // arcane_image_update_check_by_id
  server.registerTool(
    "arcane_image_update_check_by_id",
    {
      title: "Check image update by ID",
      description: "Check if an image update is available by image ID",
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
      inputSchema: {
      environmentId: z.string().describe("Environment ID"),
      imageId: z.string().describe("Image ID"),
    },
    },
    toolHandler(async ({ environmentId, imageId }, client) => {
      const response = await client.get<{ data: ImageUpdateResponse }>(
        `/environments/${environmentId}/image-updates/check/${imageId}`
      );

      const u = response.data;
      if (u.updateAvailable) {
        return `Update available for ${u.imageRef}!\n  Current: ${u.currentDigest?.substring(0, 12) || u.currentTag || "unknown"}\n  Latest: ${u.latestDigest?.substring(0, 12) || u.latestTag || "unknown"}`;
      }
      return `${u.imageRef} is up to date.`;
    })
  );

  // arcane_image_update_check_multiple
  server.registerTool(
    "arcane_image_update_check_multiple",
    {
      title: "Check multiple image updates",
      description: "Check for updates on multiple images at once",
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
      inputSchema: {
      environmentId: z.string().describe("Environment ID"),
      imageIds: z.array(z.string()).describe("List of image IDs to check"),
    },
    },
    toolHandler(async ({ environmentId, imageIds }, client) => {
      const response = await client.post<{ data: BatchImageUpdateResponse }>(
        `/environments/${environmentId}/image-updates/check-multiple`,
        { imageIds }
      );

      const batch = response.data;
      const lines = [
        `Checked ${batch.total} images: ${batch.updatesAvailable} updates available\n`,
      ];

      for (const result of batch.results) {
        const status = result.updateAvailable ? "[UPDATE]" : "[OK]";
        lines.push(`${status} ${result.imageRef} (${result.imageId})`);
      }

      return lines.join("\n");
    })
  );

  // arcane_image_update_check_all
  server.registerTool(
    "arcane_image_update_check_all",
    {
      title: "Check all image updates",
      description: "Check all images in an environment for available updates",
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
      const response = await client.post<{ data: BatchImageUpdateResponse }>(
        `/environments/${environmentId}/image-updates/check-all`
      );

      const batch = response.data;
      const lines = [
        `Checked ${batch.total} images: ${batch.updatesAvailable} updates available\n`,
      ];

      for (const result of batch.results) {
        if (result.updateAvailable) {
          lines.push(`[UPDATE] ${result.imageRef}`);
        }
      }

      if (batch.updatesAvailable === 0) {
        lines.push("All images are up to date.");
      }

      return lines.join("\n");
    })
  );

  // arcane_image_update_get_summary
  server.registerTool(
    "arcane_image_update_get_summary",
    {
      title: "Get update summary",
      description: "Get a summary of image update status for an environment",
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
      const response = await client.get<{ data: ImageUpdateSummary }>(
        `/environments/${environmentId}/image-updates/summary`
      );

      const s = response.data;
      const lines = [
        `Image Update Summary:`,
        `  Total Images: ${s.totalImages}`,
        `  Checked: ${s.checkedImages}`,
        `  Updates Available: ${s.updatesAvailable}`,
        `  Last Checked: ${s.lastCheckedAt || "Never"}`,
      ];

      return lines.join("\n");
    })
  );

}
