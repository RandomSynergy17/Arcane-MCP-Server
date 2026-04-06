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
        : "Ask the user for the compose file content if not already provided.";

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
                "Follow this workflow using these actual Arcane tools:",
                "1. Use arcane_environment_get to verify the environment exists and is accessible.",
                "2. Use arcane_project_list to check for existing projects that might conflict.",
                "3. Validate the compose YAML content for any obvious issues.",
                "4. Use arcane_project_create to create the project with the compose content.",
                "5. Use arcane_project_pull_images to pull all required images.",
                "6. Use arcane_project_up to deploy the project.",
                "7. Use arcane_project_get to confirm all services are running.",
                "8. Use arcane_container_list to verify individual containers are healthy.",
                "9. Report the final status of all services in the project.",
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
                "Follow this systematic diagnostic workflow using Arcane tools:",
                "1. Use arcane_container_get to check the container's current state, config, and labels.",
                "2. Use arcane_dashboard_get_action_items to see if there are known issues flagged.",
                "3. Check if the container is part of a project with arcane_project_list, then arcane_project_get for service-level status.",
                "4. Use arcane_image_update_check_by_id to see if the image is outdated.",
                "5. Use arcane_port_list to check for port conflicts across the environment.",
                "6. Use arcane_vulnerability_scan_image if security issues are suspected.",
                "7. Summarize findings with:",
                "   - Root cause (if identified)",
                "   - Current status",
                "   - Recommended actions (restart, redeploy, update image, etc.)",
                "   - Any concerning patterns",
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
                "Follow this vulnerability scanning workflow using Arcane tools:",
                "1. Use arcane_environment_get to review the environment configuration.",
                "2. Use arcane_vulnerability_get_scanner_status to confirm the scanner is available.",
                "3. Use arcane_vulnerability_get_environment_summary to get the overall vulnerability posture.",
                "4. Use arcane_image_update_check_all to find images with available updates.",
                "5. Use arcane_vulnerability_list_all to review specific vulnerabilities across all images.",
                "6. For critical/high severity findings, use arcane_vulnerability_list with severity filter.",
                "7. Use arcane_container_list to identify containers running vulnerable images.",
                "8. Use arcane_port_list to check for unnecessarily exposed ports.",
                "9. Use arcane_network_list to review network isolation between services.",
                "10. Generate a security report with:",
                "    - Critical findings (immediate action required)",
                "    - High findings (should be addressed soon)",
                "    - Image update recommendations",
                "    - Network isolation assessment",
                "    - Overall risk assessment",
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
                "Follow this safe cleanup workflow using Arcane tools:",
                "1. Use arcane_dashboard_get for a quick overview of resource usage.",
                "2. Survey current resources:",
                "   - arcane_container_list: Identify stopped/exited containers",
                "   - arcane_image_list: Find unused images and check arcane_image_get_counts",
                "   - arcane_volume_list: Locate orphaned volumes and check arcane_volume_get_counts",
                "   - arcane_network_list: Find unused custom networks",
                "3. Present a cleanup plan to the user showing:",
                "   - Stopped containers that can be removed",
                "   - Unused images and potential space savings",
                "   - Orphaned volumes (WARNING: may contain data — suggest arcane_volume_backup_create first)",
                "   - Unused networks",
                "4. Wait for user confirmation before proceeding with each category.",
                "5. Execute cleanup in this safe order:",
                "   a. arcane_image_prune — Remove unused images",
                "   b. arcane_network_prune — Remove unused networks",
                "   c. arcane_volume_prune — Remove orphaned volumes (ONLY with explicit user confirmation)",
                "6. Report total resources removed.",
              ].join("\n"),
            },
          },
        ],
      };
    }
  );

  logger.info("Registered 4 MCP prompts");
}
