/**
 * Image update checking tools for Arcane MCP Server
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { toolHandler } from "../utils/tool-helpers.js";
import { moduleRegistrar, type ToolRegistry } from "./registry.js";
import type { ImageUpdateResponse, BatchImageUpdateResponse, ImageUpdateSummary } from "../types/arcane-types.js";

function formatUpdateCheck(imageRef: string, u: ImageUpdateResponse): string {
  if (u.error) {
    return `Check failed for ${imageRef}: ${u.error}`;
  }
  if (u.hasUpdate) {
    const current = u.currentVersion || u.currentDigest?.substring(0, 12) || "unknown";
    const latest = u.latestVersion || u.latestDigest?.substring(0, 12) || "unknown";
    return `Update available for ${imageRef}! (${u.updateType || "update"})\n  Current: ${current}\n  Latest: ${latest}`;
  }
  return `${imageRef} is up to date.`;
}

function formatBatchResults(batch: BatchImageUpdateResponse): string {
  const entries = Object.entries(batch);
  const updates = entries.filter(([, r]) => r.hasUpdate);
  const errors = entries.filter(([, r]) => r.error);

  const lines = [
    `Checked ${entries.length} images: ${updates.length} updates available\n`,
  ];

  for (const [ref, result] of entries) {
    const status = result.error ? "[ERROR]" : result.hasUpdate ? "[UPDATE]" : "[OK]";
    lines.push(`${status} ${ref}${result.error ? `: ${result.error}` : ""}`);
  }

  if (updates.length === 0 && errors.length === 0) {
    lines.push("\nAll images are up to date.");
  }

  return lines.join("\n");
}

export function registerImageUpdateTools(server: McpServer, registry?: ToolRegistry): void {
  const register = moduleRegistrar(server, registry, "image-update");

  // arcane_image_update_check
  register(
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

      return formatUpdateCheck(imageRef, response.data);
    })
  );

  // arcane_image_update_check_by_id
  register(
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

      return formatUpdateCheck(imageId, response.data);
    })
  );

  // arcane_image_update_check_multiple
  register(
    "arcane_image_update_check_multiple",
    {
      title: "Check multiple image updates",
      description: "Check for updates on multiple images at once by image reference",
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
      inputSchema: {
      environmentId: z.string().describe("Environment ID"),
      imageRefs: z.array(z.string()).describe("List of image references to check (e.g., ['nginx:latest'])"),
    },
    },
    toolHandler(async ({ environmentId, imageRefs }, client) => {
      const response = await client.post<{ data: BatchImageUpdateResponse }>(
        `/environments/${environmentId}/image-updates/check-batch`,
        { imageRefs }
      );

      return formatBatchResults(response.data || {});
    })
  );

  // arcane_image_update_check_all
  register(
    "arcane_image_update_check_all",
    {
      title: "Check all image updates",
      description: "Start an update check for all images in an environment. The check runs in the background (can take several minutes) — track progress with arcane_activity_list and read the results with arcane_image_update_get_summary.",
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
      client.postInBackground(`/environments/${environmentId}/image-updates/check-all`, {});

      return [
        "Update check for all images started in the background (this can take several minutes).",
        "Track progress with arcane_activity_list (it also appears in Arcane's Activity Center).",
        "Once finished, read the results with arcane_image_update_get_summary or arcane_image_update_check_multiple for specific images.",
      ].join("\n");
    })
  );

  // arcane_image_update_get_summary
  register(
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
        `  Updates Available: ${s.imagesWithUpdates}`,
        `  Digest Updates: ${s.digestUpdates}`,
        `  Check Errors: ${s.errorsCount}`,
      ];

      return lines.join("\n");
    })
  );

}
