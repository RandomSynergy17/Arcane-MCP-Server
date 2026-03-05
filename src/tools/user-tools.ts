/**
 * User management tools for Arcane MCP Server
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { toolHandler } from "../utils/tool-helpers.js";
import { logger } from "../utils/logger.js";

interface User {
  id: string;
  username: string;
  role: string;
  createdAt: string;
  lastLoginAt?: string;
  oidcSubject?: string;
}

export function registerUserTools(server: McpServer): void {
  // arcane_user_list
  server.tool(
    "arcane_user_list",
    "List all users in Arcane",
    {
      search: z.string().optional().describe("Search query"),
      start: z.number().optional().default(0).describe("Pagination start"),
      limit: z.number().optional().default(20).describe("Items per page"),
    },
    toolHandler(async ({ search, start, limit }, client) => {
      const response = await client.get<{
        data: User[];
        pagination: { total: number };
      }>("/users", { search, start, limit });

      if (!response.data || response.data.length === 0) {
        return "No users found.";
      }

      const lines = [`Found ${response.pagination.total} users:\n`];
      for (const user of response.data) {
        lines.push(`${user.username}`);
        lines.push(`    ID: ${user.id}`);
        lines.push(`    Role: ${user.role}`);
        lines.push(`    Created: ${user.createdAt}`);
        if (user.lastLoginAt) {
          lines.push(`    Last Login: ${user.lastLoginAt}`);
        }
        if (user.oidcSubject) {
          lines.push(`    OIDC: Yes`);
        }
        lines.push("");
      }

      return lines.join("\n");
    })
  );

  // arcane_user_get
  server.tool(
    "arcane_user_get",
    "Get details of a specific user",
    {
      userId: z.string().describe("User ID"),
    },
    toolHandler(async ({ userId }, client) => {
      const response = await client.get<{ data: User }>(`/users/${userId}`);

      const user = response.data;
      const lines = [
        `User: ${user.username}`,
        `  ID: ${user.id}`,
        `  Role: ${user.role}`,
        `  Created: ${user.createdAt}`,
        `  Last Login: ${user.lastLoginAt || "Never"}`,
        `  OIDC: ${user.oidcSubject ? "Yes" : "No"}`,
      ];

      return lines.join("\n");
    })
  );

  // arcane_user_create
  server.tool(
    "arcane_user_create",
    "Create a new user",
    {
      username: z.string().describe("Username"),
      password: z.string().min(8).describe("Password (minimum 8 characters)"),
      role: z.enum(["admin", "user", "readonly"]).optional().default("user").describe("User role"),
    },
    toolHandler(async ({ username, password, role }, client) => {
      const response = await client.post<{ data: { id: string; username: string } }>("/users", {
        username,
        password,
        role,
      });

      return `User created: ${response.data.username} (ID: ${response.data.id})`;
    })
  );

  // arcane_user_update
  server.tool(
    "arcane_user_update",
    "Update a user's settings",
    {
      userId: z.string().describe("User ID"),
      username: z.string().optional().describe("New username"),
      role: z.enum(["admin", "user", "readonly"]).optional().describe("New role"),
    },
    toolHandler(async ({ userId, username, role }, client) => {
      const body: Record<string, unknown> = {};
      if (username) body.username = username;
      if (role) body.role = role;

      await client.put(`/users/${userId}`, body);
      return `User ${userId} updated.`;
    })
  );

  // arcane_user_delete
  server.tool(
    "arcane_user_delete",
    "[HIGH RISK] Delete a user account permanently",
    {
      userId: z.string().describe("User ID to delete"),
    },
    toolHandler(async ({ userId }, client) => {
      await client.delete(`/users/${userId}`);
      return `User ${userId} deleted.`;
    })
  );

  logger.debug("Registered user tools");
}
