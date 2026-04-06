/**
 * Configuration management for Arcane MCP Server
 */

import { existsSync, readFileSync, statSync } from "fs";
import { homedir } from "os";
import { join } from "path";
import { logger } from "./utils/logger.js";
import { DEFAULT_REQUEST_TIMEOUT_MS } from "./constants.js";

export interface ArcaneConfig {
  /** Base URL for the Arcane API */
  baseUrl: string;
  /** API key for authentication (preferred) */
  apiKey?: string;
  /** Username for JWT authentication */
  username?: string;
  /** Password for JWT authentication */
  password?: string;
  /** Request timeout in milliseconds */
  timeout: number;
  /** Skip SSL certificate verification */
  skipSslVerify: boolean;
  /** Default environment ID */
  defaultEnvironmentId?: string;
  /** HTTP server port (for TCP mode) */
  httpPort: number;
  /** HTTP server host (for TCP mode) */
  httpHost: string;
}

interface ConfigFile {
  baseUrl?: string;
  defaultEnvironmentId?: string;
  timeout?: number;
  skipSslVerify?: boolean;
  auth?: {
    type: "apikey" | "jwt";
    apiKey?: string;
    username?: string;
    password?: string;
  };
  http?: {
    port?: number;
    host?: string;
  };
}

const CONFIG_FILE_PATH = join(homedir(), ".arcane", "config.json");

/**
 * Load configuration from file (~/.arcane/config.json)
 */
function loadConfigFile(): Partial<ArcaneConfig> {
  if (!existsSync(CONFIG_FILE_PATH)) {
    return {};
  }

  try {
    const content = readFileSync(CONFIG_FILE_PATH, "utf-8");
    const config: ConfigFile = JSON.parse(content);

    const result: Partial<ArcaneConfig> = {};

    if (config.baseUrl) result.baseUrl = config.baseUrl;
    if (config.defaultEnvironmentId) result.defaultEnvironmentId = config.defaultEnvironmentId;
    if (config.timeout) result.timeout = config.timeout;
    if (config.skipSslVerify !== undefined) result.skipSslVerify = config.skipSslVerify;

    if (config.auth) {
      if (config.auth.apiKey) result.apiKey = config.auth.apiKey;
      if (config.auth.username) result.username = config.auth.username;
      if (config.auth.password) result.password = config.auth.password;
    }

    if (config.http) {
      if (config.http.port) result.httpPort = config.http.port;
      if (config.http.host) result.httpHost = config.http.host;
    }

    logger.debug(`Loaded config from ${CONFIG_FILE_PATH}`);

    // SEC-04: Warn if config file has broad permissions (readable by group/others)
    try {
      const stat = statSync(CONFIG_FILE_PATH);
      const mode = stat.mode & 0o777;
      if (mode & 0o077) {
        logger.warn(`Config file ${CONFIG_FILE_PATH} has broad permissions (${mode.toString(8)}). Consider: chmod 600 ${CONFIG_FILE_PATH}`);
      }
    } catch { /* ignore stat errors */ }

    return result;
  } catch (error) {
    logger.warn(`Failed to load config file: ${error}`);
    return {};
  }
}

/**
 * Load configuration from environment variables
 */
function loadEnvConfig(): Partial<ArcaneConfig> {
  const config: Partial<ArcaneConfig> = {};

  if (process.env.ARCANE_BASE_URL) {
    config.baseUrl = process.env.ARCANE_BASE_URL;
  }

  if (process.env.ARCANE_API_KEY) {
    config.apiKey = process.env.ARCANE_API_KEY;
  }

  if (process.env.ARCANE_USERNAME) {
    config.username = process.env.ARCANE_USERNAME;
  }

  if (process.env.ARCANE_PASSWORD) {
    config.password = process.env.ARCANE_PASSWORD;
  }

  if (process.env.ARCANE_TIMEOUT_MS) {
    const timeout = parseInt(process.env.ARCANE_TIMEOUT_MS, 10);
    if (!isNaN(timeout)) {
      config.timeout = timeout;
    }
  }

  if (process.env.ARCANE_SKIP_SSL_VERIFY) {
    config.skipSslVerify = process.env.ARCANE_SKIP_SSL_VERIFY === "true";
  }

  if (process.env.ARCANE_DEFAULT_ENVIRONMENT_ID) {
    config.defaultEnvironmentId = process.env.ARCANE_DEFAULT_ENVIRONMENT_ID;
  }

  if (process.env.ARCANE_HTTP_PORT) {
    const port = parseInt(process.env.ARCANE_HTTP_PORT, 10);
    if (!isNaN(port)) {
      config.httpPort = port;
    }
  }

  if (process.env.ARCANE_HTTP_HOST) {
    config.httpHost = process.env.ARCANE_HTTP_HOST;
  }

  return config;
}

/**
 * Default configuration values
 */
const defaults: ArcaneConfig = {
  baseUrl: "https://localhost:3552",
  timeout: DEFAULT_REQUEST_TIMEOUT_MS,
  skipSslVerify: false,
  httpPort: 3000,
  httpHost: "localhost",
};

let cachedConfig: ArcaneConfig | null = null;

/**
 * Load and merge configuration from all sources
 * Priority: Environment variables > Config file > Defaults
 */
export function loadConfig(): ArcaneConfig {
  if (cachedConfig) {
    return cachedConfig;
  }

  const fileConfig = loadConfigFile();
  const envConfig = loadEnvConfig();

  cachedConfig = {
    ...defaults,
    ...fileConfig,
    ...envConfig,
  };

  // Validate required configuration
  if (!cachedConfig.baseUrl) {
    throw new Error("ARCANE_BASE_URL is required");
  }

  if (!cachedConfig.apiKey && (!cachedConfig.username || !cachedConfig.password)) {
    logger.warn("No authentication configured. Set ARCANE_API_KEY or ARCANE_USERNAME/ARCANE_PASSWORD");
  }

  logger.debug("Configuration loaded:", {
    baseUrl: cachedConfig.baseUrl,
    hasApiKey: !!cachedConfig.apiKey,
    hasJwtAuth: !!(cachedConfig.username && cachedConfig.password),
    timeout: cachedConfig.timeout,
    defaultEnvironmentId: cachedConfig.defaultEnvironmentId,
  });

  return cachedConfig;
}

/**
 * Get the current configuration (load if not already loaded)
 */
export function getConfig(): ArcaneConfig {
  return cachedConfig || loadConfig();
}

/**
 * Reset cached configuration (useful for testing)
 */
export function resetConfig(): void {
  cachedConfig = null;
}

