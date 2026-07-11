/**
 * User management tools for Arcane MCP Server
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { toolHandler } from "../utils/tool-helpers.js";
import { moduleRegistrar, type ToolRegistry } from "./registry.js";
import type { User } from "../types/arcane-types.js";

export function registerUserTools(server: McpServer, registry?: ToolRegistry): void {
  const register = moduleRegistrar(server, registry, "user");
  // arcane_user_list
  register(
    "arcane_user_list",
    {
      title: "List users",
      description: "List all users in Arcane",
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
      inputSchema: {
      search: z.string().optional().describe("Search query"),
      start: z.number().optional().default(0).describe("Pagination start"),
      limit: z.number().optional().default(20).describe("Items per page"),
    },
    },
    toolHandler(async ({ search, start, limit }, client) => {
      const response = await client.get<{
        data: User[];
        pagination: { totalItems: number };
      }>("/users", { search, start, limit });

      if (!response.data || response.data.length === 0) {
        return "No users found.";
      }

      const lines = [`Found ${response.pagination.totalItems} users:\n`];
      for (const user of response.data) {
        lines.push(`${user.username}${user.displayName ? ` (${user.displayName})` : ""}`);
        lines.push(`    ID: ${user.id}`);
        lines.push(`    Global Admin: ${user.isGlobalAdmin ? "Yes" : "No"}`);
        lines.push(`    Created: ${user.createdAt}`);
        if (user.oidcSubjectId) {
          lines.push(`    OIDC: Yes`);
        }
        lines.push("");
      }

      return lines.join("\n");
    })
  );

  // arcane_user_get
  register(
    "arcane_user_get",
    {
      title: "Get user details",
      description: "Get details of a specific user",
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
      inputSchema: {
      userId: z.string().describe("User ID"),
    },
    },
    toolHandler(async ({ userId }, client) => {
      const response = await client.get<{ data: User }>(`/users/${userId}`);

      const user = response.data;
      const lines = [
        `User: ${user.username}`,
        `  ID: ${user.id}`,
        `  Display Name: ${user.displayName || "N/A"}`,
        `  Email: ${user.email || "N/A"}`,
        `  Global Admin: ${user.isGlobalAdmin ? "Yes" : "No"}`,
        `  Created: ${user.createdAt}`,
        `  OIDC: ${user.oidcSubjectId ? "Yes" : "No"}`,
      ];

      return lines.join("\n");
    })
  );

  // arcane_user_create
  register(
    "arcane_user_create",
    {
      title: "Create user",
      description: "Create a new user",
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: false,
      },
      inputSchema: {
      username: z.string().describe("Username"),
      password: z.string().min(8).describe("Password (minimum 8 characters)"),
      displayName: z.string().optional().describe("Display name"),
      email: z.string().optional().describe("Email address"),
    },
    },
    toolHandler(async ({ username, password, displayName, email }, client) => {
      const response = await client.post<{ data: { id: string; username: string } }>("/users", {
        username,
        password,
        displayName,
        email,
      });

      return `User created: ${response.data.username} (ID: ${response.data.id})\nNote: roles are managed via Arcane's role assignments (not supported by this tool).`;
    })
  );

  // arcane_user_update
  register(
    "arcane_user_update",
    {
      title: "Update user",
      description: "Update a user's settings",
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
      inputSchema: {
      userId: z.string().describe("User ID"),
      username: z.string().optional().describe("New username"),
      displayName: z.string().optional().describe("New display name"),
      email: z.string().optional().describe("New email address"),
      password: z.string().min(8).optional().describe("New password (minimum 8 characters)"),
    },
    },
    toolHandler(async ({ userId, username, displayName, email, password }, client) => {
      const body: Record<string, unknown> = {};
      if (username) body.username = username;
      if (displayName) body.displayName = displayName;
      if (email) body.email = email;
      if (password) body.password = password;

      await client.put(`/users/${userId}`, body);
      return `User ${userId} updated.`;
    })
  );

  // arcane_user_delete
  register(
    "arcane_user_delete",
    {
      title: "Delete user",
      description: "[HIGH RISK] Delete a user account permanently",
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: false,
        openWorldHint: false,
      },
      inputSchema: {
      userId: z.string().describe("User ID to delete"),
    },
    },
    toolHandler(async ({ userId }, client) => {
      await client.delete(`/users/${userId}`);
      return `User ${userId} deleted.`;
    })
  );

}
