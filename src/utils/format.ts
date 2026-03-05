/**
 * Shared formatting utilities for Arcane MCP Server
 */

import { BYTES_PER_GB, BYTES_PER_MB, BYTES_PER_KB } from "../constants.js";

/**
 * Format bytes into a human-readable size string.
 * Returns "unknown" for undefined/null/zero values when allowUnknown is true.
 *
 * Examples: "1.23 GB", "456.78 MB", "12.34 KB"
 */
export function formatSize(bytes: number | undefined | null, allowUnknown = false): string {
  if (bytes === undefined || bytes === null || (allowUnknown && !bytes)) {
    return "unknown";
  }
  if (bytes >= BYTES_PER_GB) return `${(bytes / BYTES_PER_GB).toFixed(2)} GB`;
  if (bytes >= BYTES_PER_MB) return `${(bytes / BYTES_PER_MB).toFixed(2)} MB`;
  if (bytes >= BYTES_PER_KB) return `${(bytes / BYTES_PER_KB).toFixed(2)} KB`;
  return `${bytes} B`;
}

/**
 * Format bytes into a compact size string (for directory listings, etc.).
 *
 * Examples: "1.2G", "456.8M", "12.3K", "789B"
 */
export function formatSizeCompact(bytes: number): string {
  if (bytes >= BYTES_PER_GB) return `${(bytes / BYTES_PER_GB).toFixed(1)}G`;
  if (bytes >= BYTES_PER_MB) return `${(bytes / BYTES_PER_MB).toFixed(1)}M`;
  if (bytes >= BYTES_PER_KB) return `${(bytes / BYTES_PER_KB).toFixed(1)}K`;
  return `${bytes}B`;
}

/**
 * Format bytes as MB only (for simple size displays).
 *
 * Example: "12.34 MB"
 */
export function formatSizeMB(bytes: number): string {
  return `${(bytes / BYTES_PER_MB).toFixed(2)} MB`;
}

/**
 * Format bytes as GB only (for large size displays).
 *
 * Example: "1.23 GB"
 */
export function formatSizeGB(bytes: number): string {
  return `${(bytes / BYTES_PER_GB).toFixed(2)} GB`;
}
