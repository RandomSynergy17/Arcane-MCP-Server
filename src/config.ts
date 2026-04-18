/**
 * Configuration management for Arcane MCP Server
 */

import { existsSync, readFileSync, statSync } from "fs";
import { homedir } from "os";
import { join } from "path";
import { logger } from "./utils/logger.js";
import { DEFAULT_REQUEST_TIMEOUT_MS } from "./constants.js";

export type PresetName =
  | "commonly-used"
  | "read-only"
  | "minimal"
  | "deploy"
  | "full"
  | "custom";

export const VALID_PRESETS: PresetName[] = [
  "commonly-used",
  "read-only",
  "minimal",
  "deploy",
  "full",
  "custom",
];

export interface ToolsConfig {
  /** Named preset. Falls back to "full" when absent. */
  preset?: PresetName;
  /** Module allowlist. Intersects with preset expansion. */
  modules?: string[];
  /** Per-tool additions applied after the preset + modules step. */
  enabled?: string[];
  /** Per-tool subtractions applied last. */
  disabled?: string[];
}

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
  /** Tool filtering config (preset + module + per-tool overrides) */
  tools?: ToolsConfig;
  /**
   * True when the loaded config has no `tools` key at all. Used to gate
   * the upgrade notice resource for pre-filtering installs.
   */
  toolsUnconfigured?: boolean;
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
  tools?: ToolsConfig;
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

    if (config.tools) {
      result.tools = sanitizeToolsConfig(config.tools);
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

  const envTools = loadEnvToolsConfig();
  if (envTools) {
    config.tools = envTools;
  }

  return config;
}

/**
 * Validate and return a `ToolsConfig`, dropping unknown preset values.
 * Unknown tool/module names are preserved (resolver logs + ignores at apply time).
 */
function sanitizeToolsConfig(input: ToolsConfig): ToolsConfig {
  const out: ToolsConfig = {};

  if (input.preset !== undefined) {
    if (VALID_PRESETS.includes(input.preset)) {
      out.preset = input.preset;
    } else {
      logger.warn(`Unknown tools.preset: "${input.preset}" — falling back to "full"`);
      out.preset = "full";
    }
  }

  if (Array.isArray(input.modules)) out.modules = input.modules.slice();
  if (Array.isArray(input.enabled)) out.enabled = input.enabled.slice();
  if (Array.isArray(input.disabled)) out.disabled = input.disabled.slice();

  return out;
}

function splitCSV(value: string): string[] {
  return value
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

function loadEnvToolsConfig(): ToolsConfig | undefined {
  const hasAny =
    !!process.env.ARCANE_TOOL_PRESET ||
    !!process.env.ARCANE_ENABLED_MODULES ||
    !!process.env.ARCANE_ENABLED_TOOLS ||
    !!process.env.ARCANE_DISABLED_TOOLS;
  if (!hasAny) return undefined;

  const tools: ToolsConfig = {};

  if (process.env.ARCANE_TOOL_PRESET) {
    const v = process.env.ARCANE_TOOL_PRESET.trim() as PresetName;
    if (VALID_PRESETS.includes(v)) {
      tools.preset = v;
    } else {
      logger.warn(`Unknown ARCANE_TOOL_PRESET: "${v}" — ignoring`);
    }
  }
  if (process.env.ARCANE_ENABLED_MODULES) {
    tools.modules = splitCSV(process.env.ARCANE_ENABLED_MODULES);
  }
  if (process.env.ARCANE_ENABLED_TOOLS) {
    tools.enabled = splitCSV(process.env.ARCANE_ENABLED_TOOLS);
  }
  if (process.env.ARCANE_DISABLED_TOOLS) {
    tools.disabled = splitCSV(process.env.ARCANE_DISABLED_TOOLS);
  }

  return tools;
}

/**
 * Merge two ToolsConfig with second taking precedence for fields that are set.
 * Used so env vars can override specific fields from the config file without
 * wiping the rest (e.g., set a preset via env, keep file's `enabled` list).
 */
function mergeToolsConfig(base?: ToolsConfig, overlay?: ToolsConfig): ToolsConfig | undefined {
  if (!base && !overlay) return undefined;
  return {
    preset: overlay?.preset ?? base?.preset,
    modules: overlay?.modules ?? base?.modules,
    enabled: overlay?.enabled ?? base?.enabled,
    disabled: overlay?.disabled ?? base?.disabled,
  };
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

  const mergedTools = mergeToolsConfig(fileConfig.tools, envConfig.tools);
  const toolsUnconfigured = !fileConfig.tools && !envConfig.tools;

  cachedConfig = {
    ...defaults,
    ...fileConfig,
    ...envConfig,
    tools: mergedTools,
    toolsUnconfigured,
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

