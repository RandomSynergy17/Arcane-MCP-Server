/**
 * Authentication and OIDC tools for Arcane MCP Server
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { toolHandler } from "../utils/tool-helpers.js";
import { logger } from "../utils/logger.js";

export function registerAuthTools(server: McpServer): void {
  // arcane_auth_login
  server.tool(
    "arcane_auth_login",
    "Authenticate with Arcane using username and password. Returns JWT tokens.",
    {
      username: z.string().describe("Username for authentication"),
      password: z.string().describe("Password for authentication"),
    },
    toolHandler(async ({ username, password }, client) => {
      const response = await client.post<{
        token: string;
        refreshToken: string;
        expiresAt: string;
        user: { id: string; username: string; role: string };
      }>("/auth/login", { username, password });

      return `Login successful!\nUser: ${response.user.username}\nRole: ${response.user.role}\nToken expires: ${response.expiresAt}`;
    })
  );

  // arcane_auth_logout
  server.tool(
    "arcane_auth_logout",
    "Log out of the current session and invalidate tokens",
    {},
    toolHandler(async (_params, client) => {
      await client.post("/auth/logout");
      return "Logged out successfully.";
    })
  );

  // arcane_auth_me
  server.tool(
    "arcane_auth_me",
    "Get information about the currently authenticated user",
    {},
    toolHandler(async (_params, client) => {
      const response = await client.get<{
        data: { id: string; username: string; role: string; createdAt: string };
      }>("/auth/me");

      const user = response.data;
      return `Current User:\n  ID: ${user.id}\n  Username: ${user.username}\n  Role: ${user.role}\n  Created: ${user.createdAt}`;
    })
  );

  // arcane_auth_refresh
  server.tool(
    "arcane_auth_refresh",
    "Refresh the authentication token using the refresh token",
    {
      refreshToken: z.string().describe("Refresh token to use"),
    },
    toolHandler(async ({ refreshToken }, client) => {
      const response = await client.post<{
        token: string;
        refreshToken: string;
        expiresAt: string;
      }>("/auth/refresh", { refreshToken });

      return `Token refreshed successfully!\nNew token expires: ${response.expiresAt}`;
    })
  );

  // arcane_auth_change_password
  server.tool(
    "arcane_auth_change_password",
    "Change the password for the current user",
    {
      currentPassword: z.string().optional().describe("Current password (required for non-OIDC users)"),
      newPassword: z.string().min(8).describe("New password (minimum 8 characters)"),
    },
    toolHandler(async ({ currentPassword, newPassword }, client) => {
      await client.post("/auth/password", { currentPassword, newPassword });
      return "Password changed successfully.";
    })
  );

  // OIDC Tools
  // arcane_oidc_get_status
  server.tool(
    "arcane_oidc_get_status",
    "Get OIDC configuration status (enabled, provider name, etc.)",
    {},
    toolHandler(async (_params, client) => {
      const response = await client.get<{
        envForced: boolean;
        envConfigured: boolean;
        mergeAccounts: boolean;
        providerName?: string;
        providerLogoUrl?: string;
      }>("/oidc/status");

      const lines = [
        "OIDC Status:",
        `  Configured: ${response.envConfigured}`,
        `  Enforced: ${response.envForced}`,
        `  Merge Accounts: ${response.mergeAccounts}`,
      ];
      if (response.providerName) lines.push(`  Provider: ${response.providerName}`);

      return lines.join("\n");
    })
  );

  // arcane_oidc_get_config
  server.tool(
    "arcane_oidc_get_config",
    "Get OIDC client configuration details",
    {},
    toolHandler(async (_params, client) => {
      const response = await client.get<{
        clientId: string;
        redirectUri: string;
        issuerUrl: string;
        scopes: string;
      }>("/oidc/config");

      return `OIDC Configuration:\n  Client ID: ${response.clientId}\n  Issuer: ${response.issuerUrl}\n  Redirect URI: ${response.redirectUri}\n  Scopes: ${response.scopes}`;
    })
  );

  // arcane_oidc_device_code
  server.tool(
    "arcane_oidc_device_code",
    "Initiate OIDC device authorization flow. Returns a user code to enter at the verification URL.",
    {},
    toolHandler(async (_params, client) => {
      const response = await client.post<{
        deviceCode: string;
        userCode: string;
        verificationUri: string;
        verificationUriComplete?: string;
        expiresIn: number;
      }>("/oidc/device/code");

      return `Device Authorization:\n  User Code: ${response.userCode}\n  Verification URL: ${response.verificationUri}\n  Complete URL: ${response.verificationUriComplete || "N/A"}\n  Expires in: ${response.expiresIn} seconds\n\nVisit the URL and enter the user code to authenticate.`;
    })
  );

  logger.debug("Registered auth tools");
}
