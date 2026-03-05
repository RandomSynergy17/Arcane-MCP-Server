/**
 * Authentication manager for Arcane API
 * Supports API Key and JWT (with auto-refresh) authentication
 */

import https from "https";
import { getConfig } from "../config.js";
import { logger } from "../utils/logger.js";
import { TOKEN_REFRESH_BUFFER_MS } from "../constants.js";

interface JwtTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
}

interface LoginResponse {
  token: string;
  refreshToken: string;
  expiresAt: string;
  user: {
    id: string;
    username: string;
  };
}

interface RefreshResponse {
  token: string;
  refreshToken: string;
  expiresAt: string;
}

export class AuthManager {
  private apiKey?: string;
  private jwtTokens?: JwtTokens;
  private username?: string;
  private password?: string;
  private baseUrl: string;
  private skipSslVerify: boolean;
  private refreshPromise: Promise<void> | null = null;

  constructor() {
    const config = getConfig();
    this.apiKey = config.apiKey;
    this.username = config.username;
    this.password = config.password;
    this.baseUrl = config.baseUrl;
    this.skipSslVerify = config.skipSslVerify;
  }

  /**
   * Build fetch options with SSL bypass when configured
   */
  private getFetchOptions(): RequestInit & { agent?: https.Agent } {
    const options: RequestInit & { agent?: https.Agent } = {};
    if (this.skipSslVerify && this.baseUrl.startsWith("https://")) {
      options.agent = new https.Agent({ rejectUnauthorized: false });
    }
    return options;
  }

  /**
   * Check if authentication is configured
   */
  isConfigured(): boolean {
    return !!(this.apiKey || (this.username && this.password));
  }

  /**
   * Get authentication headers for API requests
   */
  async getAuthHeaders(): Promise<Record<string, string>> {
    // Prefer API key authentication
    if (this.apiKey) {
      return { "X-API-Key": this.apiKey };
    }

    // Fall back to JWT authentication
    if (this.username && this.password) {
      // Check if we have valid tokens
      if (this.jwtTokens) {
        // Check if token is about to expire (refresh before expiry)
        if (this.jwtTokens.expiresAt.getTime() - TOKEN_REFRESH_BUFFER_MS >= Date.now()) {
          return { Authorization: `Bearer ${this.jwtTokens.accessToken}` };
        }

        // Token expired or about to expire, try refresh
        try {
          await this.refreshAccessToken();
          return { Authorization: `Bearer ${this.jwtTokens!.accessToken}` };
        } catch (error) {
          // Sanitize error to avoid logging sensitive data
          const errorMessage = error instanceof Error ? error.message : "Unknown error";
          logger.warn(`Token refresh failed, attempting re-login: ${errorMessage}`);
          // Fall through to login
        }
      }

      // No tokens or refresh failed, do initial login
      await this.login();
      return { Authorization: `Bearer ${this.jwtTokens!.accessToken}` };
    }

    throw new Error("No authentication credentials configured. Set ARCANE_API_KEY or ARCANE_USERNAME/ARCANE_PASSWORD");
  }

  /**
   * Perform initial login with username/password
   */
  private async login(): Promise<void> {
    if (!this.username || !this.password) {
      throw new Error("Username and password required for JWT authentication");
    }

    logger.debug("Performing login...");

    const response = await fetch(`${this.baseUrl}/api/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        username: this.username,
        password: this.password,
      }),
      ...this.getFetchOptions(),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Login failed: ${response.status} ${error}`);
    }

    const data = await response.json() as LoginResponse;

    this.jwtTokens = {
      accessToken: data.token,
      refreshToken: data.refreshToken,
      expiresAt: new Date(data.expiresAt),
    };

    logger.debug(`Login successful, token expires at ${this.jwtTokens.expiresAt.toISOString()}`);
  }

  /**
   * Refresh the access token using refresh token
   * Uses a promise to prevent concurrent refresh attempts
   */
  private async refreshAccessToken(): Promise<void> {
    // If already refreshing, wait for that to complete
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    this.refreshPromise = this.doRefresh();

    try {
      await this.refreshPromise;
    } finally {
      this.refreshPromise = null;
    }
  }

  private async doRefresh(): Promise<void> {
    if (!this.jwtTokens?.refreshToken) {
      throw new Error("No refresh token available");
    }

    logger.debug("Refreshing access token...");

    const response = await fetch(`${this.baseUrl}/api/auth/refresh`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        refreshToken: this.jwtTokens.refreshToken,
      }),
      ...this.getFetchOptions(),
    });

    if (!response.ok) {
      this.jwtTokens = undefined;
      const error = await response.text();
      throw new Error(`Token refresh failed: ${response.status} ${error}`);
    }

    const data = await response.json() as RefreshResponse;

    this.jwtTokens = {
      accessToken: data.token,
      refreshToken: data.refreshToken,
      expiresAt: new Date(data.expiresAt),
    };

    logger.debug(`Token refreshed, new expiry: ${this.jwtTokens.expiresAt.toISOString()}`);
  }

  /**
   * Clear all stored tokens (logout)
   */
  clearTokens(): void {
    this.jwtTokens = undefined;
    logger.debug("Authentication tokens cleared");
  }

  /**
   * Check if we have valid authentication
   */
  hasValidAuth(): boolean {
    if (this.apiKey) return true;
    if (this.jwtTokens && this.jwtTokens.expiresAt > new Date()) return true;
    return false;
  }
}

// Singleton instance
let authManagerInstance: AuthManager | null = null;

export function getAuthManager(): AuthManager {
  if (!authManagerInstance) {
    authManagerInstance = new AuthManager();
  }
  return authManagerInstance;
}

export function resetAuthManager(): void {
  if (authManagerInstance) {
    authManagerInstance.clearTokens();
  }
  authManagerInstance = null;
}
