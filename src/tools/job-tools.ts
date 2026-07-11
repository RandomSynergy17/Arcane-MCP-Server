/**
 * Job and scheduling tools for Arcane MCP Server
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { toolHandler } from "../utils/tool-helpers.js";
import { moduleRegistrar, type ToolRegistry } from "./registry.js";
import type { Job } from "../types/arcane-types.js";

export function registerJobTools(server: McpServer, registry?: ToolRegistry): void {
  const register = moduleRegistrar(server, registry, "job");
  // arcane_job_list
  register(
    "arcane_job_list",
    {
      title: "List jobs",
      description: "List scheduled jobs in an environment",
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
      const response = await client.get<{ isAgent: boolean; jobs: Job[] | null }>(
        `/environments/${environmentId}/jobs`
      );

      if (!response.jobs || response.jobs.length === 0) {
        return "No jobs found.";
      }

      const lines = [`Jobs:\n`];
      for (const job of response.jobs) {
        const status = job.enabled ? "[ENABLED]" : "[DISABLED]";
        lines.push(`${status} ${job.name}`);
        lines.push(`    ID: ${job.id}`);
        lines.push(`    Category: ${job.category}`);
        if (job.description) lines.push(`    Description: ${job.description}`);
        lines.push(`    Schedule: ${job.isContinuous ? "continuous" : job.schedule || "manual"}`);
        lines.push(`    Next Run: ${job.nextRun || "N/A"}`);
        lines.push(`    Can Run Manually: ${job.canRunManually ? "yes" : "no"}`);
        lines.push("");
      }

      return lines.join("\n");
    })
  );

  // arcane_job_run
  register(
    "arcane_job_run",
    {
      title: "Run job",
      description: "Run a job immediately",
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: false,
      },
      inputSchema: {
      environmentId: z.string().describe("Environment ID"),
      jobId: z.string().describe("Job ID to run"),
    },
    },
    toolHandler(async ({ environmentId, jobId }, client) => {
      await client.post(`/environments/${environmentId}/jobs/${jobId}/run`);
      return `Job ${jobId} started.`;
    })
  );

  // arcane_job_schedule_get
  register(
    "arcane_job_schedule_get",
    {
      title: "Get job schedules",
      description: "Get the configured job schedule intervals for an environment",
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
      const config = await client.get<Record<string, string>>(
        `/environments/${environmentId}/job-schedules`
      );

      const entries = Object.entries(config).filter(
        ([key, value]) => key !== "$schema" && typeof value === "string"
      );

      if (entries.length === 0) {
        return "No job schedule configuration found.";
      }

      const lines = ["Job Schedule Intervals:\n"];
      for (const [key, value] of entries) {
        lines.push(`  ${key}: ${value}`);
      }

      return lines.join("\n");
    })
  );

  // arcane_job_schedule_update
  register(
    "arcane_job_schedule_update",
    {
      title: "Update job schedules",
      description: "Update job schedule intervals for an environment. Only the provided intervals are changed.",
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
      inputSchema: {
        environmentId: z.string().describe("Environment ID"),
        autoHealInterval: z.string().optional().describe("Interval for the auto-heal job"),
        autoUpdateInterval: z.string().optional().describe("Interval for the auto-update job"),
        dockerClientRefreshInterval: z.string().optional().describe("Interval for refreshing the Docker client"),
        environmentHealthInterval: z.string().optional().describe("Interval for environment health checks"),
        eventCleanupInterval: z.string().optional().describe("Interval for event cleanup"),
        expiredSessionsCleanupInterval: z.string().optional().describe("Interval for expired session cleanup"),
        pollingInterval: z.string().optional().describe("Interval for polling"),
        scheduledPruneInterval: z.string().optional().describe("Interval for scheduled prune"),
        vulnerabilityScanInterval: z.string().optional().describe("Interval for vulnerability scans"),
      },
    },
    toolHandler(async ({ environmentId, ...intervals }, client) => {
      const body: Record<string, string> = {};
      for (const [key, value] of Object.entries(intervals)) {
        if (value !== undefined) body[key] = value;
      }

      if (Object.keys(body).length === 0) {
        return "No intervals provided - nothing to update.";
      }

      await client.put(`/environments/${environmentId}/job-schedules`, body);
      return "Job schedules updated.";
    })
  );

}
