/**
 * System operation tools for Arcane MCP Server
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { toolHandler } from "../utils/tool-helpers.js";
import { moduleRegistrar, type ToolRegistry } from "./registry.js";
import { formatSizeGB, formatSizeMB } from "../utils/format.js";
import { SECONDS_PER_HOUR } from "../constants.js";

export function registerSystemTools(server: McpServer, registry?: ToolRegistry): void {
  const register = moduleRegistrar(server, registry, "system");
  // arcane_system_get_health
  register(
    "arcane_system_get_health",
    {
      title: "Get system health",
      description: "Check the health status of the Arcane server",
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
      inputSchema: {},
    },
    toolHandler(async (_params, client) => {
      const response = await client.get<{
        status: string;
        version?: string;
        uptime?: number;
      }>("/health");

      const uptimeHours = response.uptime ? (response.uptime / SECONDS_PER_HOUR).toFixed(1) : "unknown";

      return `Health Status: ${response.status}\n  Version: ${response.version || "unknown"}\n  Uptime: ${uptimeHours} hours`;
    })
  );

  // arcane_system_get_docker_info
  register(
    "arcane_system_get_docker_info",
    {
      title: "Get Docker system info",
      description: "Get Docker system information for an environment",
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
      const info = await client.get<{
        ServerVersion: string;
        OperatingSystem: string;
        Architecture: string;
        Containers: number;
        ContainersRunning: number;
        ContainersStopped: number;
        Images: number;
        MemTotal: number;
        NCPU: number;
        Driver: string;
      }>(`/environments/${environmentId}/system/docker/info`);

      const lines = [
        "Docker System Information:",
        `  Version: ${info.ServerVersion}`,
        `  OS: ${info.OperatingSystem}`,
        `  Architecture: ${info.Architecture}`,
        `  Storage Driver: ${info.Driver}`,
        `  CPUs: ${info.NCPU}`,
        `  Memory: ${formatSizeGB(info.MemTotal)}`,
        `  Containers: ${info.Containers} (${info.ContainersRunning} running, ${info.ContainersStopped} stopped)`,
        `  Images: ${info.Images}`,
      ];

      return lines.join("\n");
    })
  );

  // arcane_system_prune
  register(
    "arcane_system_prune",
    {
      title: "System prune",
      description: "[CRITICAL RISK] Perform Docker system prune - removes unused containers, networks, images, and optionally volumes. This cannot be undone!",
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: false,
        openWorldHint: false,
      },
      inputSchema: {
      environmentId: z.string().describe("Environment ID"),
      volumes: z.boolean().optional().default(false).describe("Also prune all unused volumes (DATA LOSS!)"),
      all: z.boolean().optional().default(false).describe("Remove all unused images, not just dangling"),
      buildCache: z.boolean().optional().default(false).describe("Also prune unused build cache"),
    },
    },
    toolHandler(async ({ environmentId, volumes, all, buildCache }, client) => {
      const response = await client.post<{
        data: {
          containersPruned?: string[];
          imagesDeleted?: string[];
          networksDeleted?: string[];
          volumesDeleted?: string[];
          spaceReclaimed?: number;
          errors?: string[];
        };
      }>(`/environments/${environmentId}/system/prune`, {
        containers: { mode: "stopped" },
        images: { mode: all ? "all" : "dangling" },
        networks: { mode: "unused" },
        volumes: { mode: volumes ? "all" : "none" },
        buildCache: { mode: buildCache ? "unused" : "none" },
      });

      const r = response.data;
      const lines = [
        "System Prune Complete:",
        `  Containers removed: ${r.containersPruned?.length || 0}`,
        `  Networks removed: ${r.networksDeleted?.length || 0}`,
        `  Images removed: ${r.imagesDeleted?.length || 0}`,
        `  Volumes removed: ${r.volumesDeleted?.length || 0}`,
        `  Space reclaimed: ${r.spaceReclaimed ? formatSizeMB(r.spaceReclaimed) : "unknown"}`,
      ];

      if (r.errors && r.errors.length > 0) {
        lines.push(`  Errors: ${r.errors.join("; ")}`);
      }

      return lines.join("\n");
    })
  );

  // arcane_system_check_upgrade
  register(
    "arcane_system_check_upgrade",
    {
      title: "Check for upgrade",
      description: "Check if an Arcane upgrade is available",
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
          currentVersion: string;
          latestVersion: string;
          updateAvailable: boolean;
          releaseNotes?: string;
        };
      }>(`/environments/${environmentId}/system/upgrade/check`);

      const info = response.data;
      if (info.updateAvailable) {
        return `Update Available!\n  Current: ${info.currentVersion}\n  Latest: ${info.latestVersion}${info.releaseNotes ? `\n\nRelease Notes:\n${info.releaseNotes}` : ""}`;
      } else {
        return `You're running the latest version (${info.currentVersion})`;
      }
    })
  );

  // arcane_system_upgrade
  register(
    "arcane_system_upgrade",
    {
      title: "Upgrade system",
      description: "[HIGH RISK] Perform an Arcane system upgrade",
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: false,
      },
      inputSchema: {
      environmentId: z.string().describe("Environment ID"),
    },
    },
    toolHandler(async ({ environmentId }, client) => {
      await client.post(`/environments/${environmentId}/system/upgrade`);
      return "Upgrade initiated. The agent may restart.";
    })
  );

  // arcane_system_containers_start_all
  register(
    "arcane_system_containers_start_all",
    {
      title: "Start all containers",
      description: "Start all stopped containers in an environment",
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: false,
      },
      inputSchema: {
      environmentId: z.string().describe("Environment ID"),
    },
    },
    toolHandler(async ({ environmentId }, client) => {
      const response = await client.post<{ started: number }>(
        `/environments/${environmentId}/system/containers/start-all`
      );
      return `Started ${response.started || 0} containers.`;
    })
  );

  // arcane_system_containers_stop_all
  register(
    "arcane_system_containers_stop_all",
    {
      title: "Stop all containers",
      description: "[HIGH RISK] Stop ALL running containers in an environment",
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
      inputSchema: {
      environmentId: z.string().describe("Environment ID"),
    },
    },
    toolHandler(async ({ environmentId }, client) => {
      const response = await client.post<{ stopped: number }>(
        `/environments/${environmentId}/system/containers/stop-all`
      );
      return `Stopped ${response.stopped || 0} containers.`;
    })
  );

  // arcane_system_containers_start_stopped
  register(
    "arcane_system_containers_start_stopped",
    {
      title: "Start stopped containers",
      description: "Start all previously stopped containers in an environment",
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: false,
      },
      inputSchema: {
      environmentId: z.string().describe("Environment ID"),
    },
    },
    toolHandler(async ({ environmentId }, client) => {
      const response = await client.post<{ started: number }>(
        `/environments/${environmentId}/system/containers/start-stopped`
      );
      return `Started ${response.started || 0} previously stopped containers.`;
    })
  );

  // arcane_version_get
  register(
    "arcane_version_get",
    {
      title: "Get server version",
      description: "Get the Arcane server version information",
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
      inputSchema: {},
    },
    toolHandler(async (_params, client) => {
      const response = await client.get<{
        version: string;
        buildTime?: string;
        gitCommit?: string;
      }>("/version");

      const lines = [
        `Arcane Version: ${response.version}`,
        `  Build Time: ${response.buildTime || "unknown"}`,
        `  Git Commit: ${response.gitCommit || "unknown"}`,
      ];

      return lines.join("\n");
    })
  );

}
