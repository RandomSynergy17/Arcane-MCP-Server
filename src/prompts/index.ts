/**
 * MCP Prompts for Arcane MCP Server
 * Pre-built workflow templates that guide Claude through common Docker management tasks.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { logger } from "../utils/logger.js";

export function registerPrompts(server: McpServer): void {
  // Prompt: Deploy a Docker Compose stack
  server.prompt(
    "deploy-stack",
    "Deploy a Docker Compose stack to an environment",
    {
      environmentId: z.string().describe("Target environment ID"),
      composePath: z.string().optional().describe("Path to docker-compose.yml file"),
    },
    ({ environmentId, composePath }) => {
      const composeInfo = composePath
        ? `The compose file is located at: ${composePath}`
        : "Ask the user for the compose file path or content if not already provided.";

      return {
        messages: [
          {
            role: "user" as const,
            content: {
              type: "text" as const,
              text: [
                `Deploy a Docker Compose stack to environment ${environmentId}.`,
                "",
                composeInfo,
                "",
                "Follow this workflow:",
                "1. First, use arcane_environment_get to verify the environment exists and is accessible.",
                "2. Use arcane_stack_list to check for existing stacks that might conflict.",
                "3. Validate the compose file content for any obvious issues.",
                "4. Use arcane_stack_create to deploy the stack.",
                "5. Monitor the deployment with arcane_stack_get to confirm all services are running.",
                "6. If any containers failed to start, use arcane_container_logs to diagnose issues.",
                "7. Report the final status of all services in the stack.",
              ].join("\n"),
            },
          },
        ],
      };
    }
  );

  // Prompt: Troubleshoot a container
  server.prompt(
    "troubleshoot-container",
    "Diagnose issues with a Docker container",
    {
      environmentId: z.string().describe("Environment ID where the container runs"),
      containerId: z.string().describe("Container ID or name to troubleshoot"),
    },
    ({ environmentId, containerId }) => {
      return {
        messages: [
          {
            role: "user" as const,
            content: {
              type: "text" as const,
              text: [
                `Troubleshoot container ${containerId} in environment ${environmentId}.`,
                "",
                "Follow this systematic diagnostic workflow:",
                "1. Use arcane_container_get to check the container's current state and configuration.",
                "2. Use arcane_container_logs to retrieve recent logs (last 100 lines).",
                "3. Use arcane_container_stats to check resource usage (CPU, memory, network).",
                "4. Use arcane_container_processes to list running processes inside the container.",
                "5. Check if the container has been restarting by examining the restart count and state.",
                "6. If the container is part of a stack, check other containers in the same stack.",
                "7. Summarize findings with:",
                "   - Root cause (if identified)",
                "   - Current status",
                "   - Recommended actions",
                "   - Any concerning patterns (memory leaks, crash loops, etc.)",
              ].join("\n"),
            },
          },
        ],
      };
    }
  );

  // Prompt: Security audit
  server.prompt(
    "security-audit",
    "Run a security audit on an environment",
    {
      environmentId: z.string().describe("Environment ID to audit"),
    },
    ({ environmentId }) => {
      return {
        messages: [
          {
            role: "user" as const,
            content: {
              type: "text" as const,
              text: [
                `Run a security audit on environment ${environmentId}.`,
                "",
                "Follow this vulnerability scanning workflow:",
                "1. Use arcane_environment_get to review the environment configuration.",
                "2. Use arcane_container_list to enumerate all running containers.",
                "3. For each container, use arcane_container_get to check:",
                "   - Privileged mode status",
                "   - Port mappings and exposed ports",
                "   - Volume mounts (especially sensitive paths like /var/run/docker.sock)",
                "   - Environment variables (look for secrets in plain text)",
                "   - User configuration (running as root?)",
                "4. Use arcane_image_list to check for outdated or vulnerable base images.",
                "5. Use arcane_network_list to review network isolation.",
                "6. Check for containers with host network mode.",
                "7. Generate a security report with:",
                "   - Critical findings (immediate action required)",
                "   - Warnings (should be addressed)",
                "   - Recommendations (best practices)",
                "   - Overall risk assessment",
              ].join("\n"),
            },
          },
        ],
      };
    }
  );

  // Prompt: Cleanup environment
  server.prompt(
    "cleanup-environment",
    "Clean up unused Docker resources in an environment",
    {
      environmentId: z.string().describe("Environment ID to clean up"),
    },
    ({ environmentId }) => {
      return {
        messages: [
          {
            role: "user" as const,
            content: {
              type: "text" as const,
              text: [
                `Clean up unused Docker resources in environment ${environmentId}.`,
                "",
                "Follow this safe cleanup workflow:",
                "1. Use arcane_environment_get to confirm the environment is accessible.",
                "2. Survey current resource usage:",
                "   - arcane_container_list: Identify stopped/exited containers",
                "   - arcane_image_list: Find dangling and unused images",
                "   - arcane_volume_list: Locate orphaned volumes",
                "   - arcane_network_list: Find unused custom networks",
                "3. Present a cleanup plan to the user showing:",
                "   - Stopped containers that can be removed",
                "   - Dangling images and potential space savings",
                "   - Orphaned volumes (WARNING: may contain data)",
                "   - Unused networks",
                "4. Wait for user confirmation before proceeding with each category.",
                "5. Execute cleanup in this safe order:",
                "   a. Remove stopped containers first",
                "   b. Remove dangling images",
                "   c. Remove orphaned volumes (only with explicit confirmation)",
                "   d. Remove unused networks",
                "6. Report total space reclaimed and resources removed.",
              ].join("\n"),
            },
          },
        ],
      };
    }
  );

  logger.info("Registered 4 MCP prompts");
}
