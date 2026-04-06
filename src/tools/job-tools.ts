/**
 * Job and scheduling tools for Arcane MCP Server
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { toolHandler } from "../utils/tool-helpers.js";
import { logger } from "../utils/logger.js";
import type { Job } from "../types/arcane-types.js";

export function registerJobTools(server: McpServer): void {
  // arcane_job_list
  server.registerTool(
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
      const response = await client.get<{ data: Job[] }>(
        `/environments/${environmentId}/jobs`
      );

      if (!response.data || response.data.length === 0) {
        return "No jobs found.";
      }

      const lines = [`Jobs:\n`];
      for (const job of response.data) {
        const status = job.enabled ? "[ENABLED]" : "[DISABLED]";
        lines.push(`${status} ${job.name}`);
        lines.push(`    ID: ${job.id}`);
        lines.push(`    Type: ${job.type}`);
        lines.push(`    Schedule: ${job.schedule || "manual"}`);
        lines.push(`    Last Run: ${job.lastRunAt || "never"}`);
        lines.push(`    Next Run: ${job.nextRunAt || "N/A"}`);
        lines.push("");
      }

      return lines.join("\n");
    })
  );

  // arcane_job_run
  server.registerTool(
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
  server.registerTool(
    "arcane_job_schedule_get",
    {
      title: "Get job schedules",
      description: "Get job schedules for an environment",
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
        data: Array<{
          jobId: string;
          jobName: string;
          schedule: string;
          enabled: boolean;
        }>;
      }>(`/environments/${environmentId}/job-schedules`);

      if (!response.data || response.data.length === 0) {
        return "No job schedules configured.";
      }

      const lines = ["Job Schedules:\n"];
      for (const schedule of response.data) {
        const status = schedule.enabled ? "[ON]" : "[OFF]";
        lines.push(`${status} ${schedule.jobName}: ${schedule.schedule}`);
      }

      return lines.join("\n");
    })
  );

  // arcane_job_schedule_update
  server.registerTool(
    "arcane_job_schedule_update",
    {
      title: "Update job schedules",
      description: "Update job schedules for an environment",
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
      inputSchema: {
        environmentId: z.string().describe("Environment ID"),
        schedules: z.array(z.object({
          jobId: z.string().describe("Job ID"),
          schedule: z.string().optional().describe("Cron schedule expression"),
          enabled: z.boolean().optional().describe("Enable or disable"),
        })).describe("Schedule updates"),
      },
    },
    toolHandler(async ({ environmentId, schedules }, client) => {
      await client.put(`/environments/${environmentId}/job-schedules`, { schedules });
      return "Job schedules updated.";
    })
  );

  logger.debug("Registered job tools");
}
