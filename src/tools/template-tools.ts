/**
 * Template management tools for Arcane MCP Server
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { toolHandler } from "../utils/tool-helpers.js";
import { logger } from "../utils/logger.js";

interface Template {
  id: string;
  name: string;
  description?: string;
  category?: string;
  logo?: string;
  source?: string;
  createdAt?: string;
}

export function registerTemplateTools(server: McpServer): void {
  // arcane_template_list
  server.registerTool(
    "arcane_template_list",
    {
      title: "List templates",
      description: "List available Docker Compose templates",
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
      inputSchema: {
      search: z.string().optional().describe("Search query"),
      category: z.string().optional().describe("Filter by category"),
      start: z.number().optional().default(0).describe("Pagination start"),
      limit: z.number().optional().default(20).describe("Items per page"),
    },
    },
    toolHandler(async ({ search, category, start, limit }, client) => {
      const response = await client.get<{
        data: Template[];
        pagination: { total: number };
      }>("/templates", { search, category, start, limit });

      if (!response.data || response.data.length === 0) {
        return "No templates found.";
      }

      const lines = [`Found ${response.pagination.total} templates:\n`];
      for (const tmpl of response.data) {
        lines.push(`${tmpl.name}`);
        lines.push(`    ID: ${tmpl.id}`);
        if (tmpl.category) lines.push(`    Category: ${tmpl.category}`);
        if (tmpl.description) lines.push(`    Description: ${tmpl.description.substring(0, 80)}...`);
        lines.push("");
      }

      return lines.join("\n");
    })
  );

  // arcane_template_get
  server.registerTool(
    "arcane_template_get",
    {
      title: "Get template details",
      description: "Get details of a Docker Compose template",
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
      inputSchema: {
      templateId: z.string().describe("Template ID"),
    },
    },
    toolHandler(async ({ templateId }, client) => {
      const response = await client.get<{ data: Template }>(`/templates/${templateId}`);

      const tmpl = response.data;
      const lines = [
        `Template: ${tmpl.name}`,
        `  ID: ${tmpl.id}`,
        `  Category: ${tmpl.category || "N/A"}`,
        `  Source: ${tmpl.source || "N/A"}`,
        `  Description: ${tmpl.description || "N/A"}`,
      ];

      return lines.join("\n");
    })
  );

  // arcane_template_get_content
  server.registerTool(
    "arcane_template_get_content",
    {
      title: "Get template content",
      description: "Get the Docker Compose YAML content of a template",
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
      inputSchema: {
      templateId: z.string().describe("Template ID"),
    },
    },
    toolHandler(async ({ templateId }, client) => {
      const response = await client.get<{ data: { content: string } }>(
        `/templates/${templateId}/content`
      );

      return response.data.content;
    })
  );

  // arcane_template_create
  server.registerTool(
    "arcane_template_create",
    {
      title: "Create template",
      description: "Create a new Docker Compose template",
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: false,
      },
      inputSchema: {
      name: z.string().describe("Template name"),
      description: z.string().optional().describe("Template description"),
      category: z.string().optional().describe("Category"),
      content: z.string().describe("Docker Compose YAML content"),
    },
    },
    toolHandler(async ({ name, description, category, content }, client) => {
      const response = await client.post<{ data: { id: string; name: string } }>(
        "/templates",
        { name, description, category, content }
      );

      return `Template created: ${response.data.name} (ID: ${response.data.id})`;
    })
  );

  // arcane_template_update
  server.registerTool(
    "arcane_template_update",
    {
      title: "Update template",
      description: "Update a Docker Compose template",
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
      inputSchema: {
      templateId: z.string().describe("Template ID"),
      name: z.string().optional().describe("New name"),
      description: z.string().optional().describe("New description"),
      category: z.string().optional().describe("New category"),
      content: z.string().optional().describe("New YAML content"),
    },
    },
    toolHandler(async ({ templateId, name, description, category, content }, client) => {
      const body: Record<string, unknown> = {};
      if (name) body.name = name;
      if (description) body.description = description;
      if (category) body.category = category;
      if (content) body.content = content;

      await client.put(`/templates/${templateId}`, body);
      return `Template ${templateId} updated.`;
    })
  );

  // arcane_template_delete
  server.registerTool(
    "arcane_template_delete",
    {
      title: "Delete template",
      description: "Delete a Docker Compose template",
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: false,
        openWorldHint: false,
      },
      inputSchema: {
      templateId: z.string().describe("Template ID"),
    },
    },
    toolHandler(async ({ templateId }, client) => {
      await client.delete(`/templates/${templateId}`);
      return `Template ${templateId} deleted.`;
    })
  );

  // arcane_template_get_variables
  server.registerTool(
    "arcane_template_get_variables",
    {
      title: "Get template variables",
      description: "Get global template variables",
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    toolHandler(async (_params, client) => {
      const response = await client.get<{ data: Record<string, string> }>("/templates/variables");

      if (!response.data || Object.keys(response.data).length === 0) {
        return "No global variables configured.";
      }

      const lines = ["Global Template Variables:\n"];
      for (const [key, value] of Object.entries(response.data)) {
        lines.push(`  ${key}: ${value}`);
      }

      return lines.join("\n");
    })
  );

  // arcane_template_update_variables
  server.registerTool(
    "arcane_template_update_variables",
    {
      title: "Update template variables",
      description: "Update global template variables",
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
      inputSchema: {
      variables: z.record(z.string()).describe("Variables to set (key-value pairs)"),
    },
    },
    toolHandler(async ({ variables }, client) => {
      await client.put("/templates/variables", { variables });
      return "Global variables updated.";
    })
  );

  logger.debug("Registered template tools");
}
