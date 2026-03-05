/**
 * Logger utility for Arcane MCP Server
 *
 * CRITICAL: For stdio transport, all logging MUST go to stderr.
 * Writing to stdout corrupts the JSON-RPC protocol communication.
 */

export type LogLevel = "debug" | "info" | "warn" | "error";

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

let currentLevel: LogLevel = (process.env.LOG_LEVEL as LogLevel) || "info";

export function setLogLevel(level: LogLevel): void {
  currentLevel = level;
}

export function getLogLevel(): LogLevel {
  return currentLevel;
}

function shouldLog(level: LogLevel): boolean {
  return LOG_LEVELS[level] >= LOG_LEVELS[currentLevel];
}

function formatMessage(level: LogLevel, message: string, ...args: unknown[]): string {
  const timestamp = new Date().toISOString();
  const prefix = `[${timestamp}] [${level.toUpperCase()}]`;

  if (args.length > 0) {
    const argsStr = args.map(arg =>
      typeof arg === "object" ? JSON.stringify(arg, null, 2) : String(arg)
    ).join(" ");
    return `${prefix} ${message} ${argsStr}`;
  }

  return `${prefix} ${message}`;
}

/**
 * Log debug message (only in debug mode)
 */
export function debug(message: string, ...args: unknown[]): void {
  if (shouldLog("debug")) {
    console.error(formatMessage("debug", message, ...args));
  }
}

/**
 * Log info message
 */
export function info(message: string, ...args: unknown[]): void {
  if (shouldLog("info")) {
    console.error(formatMessage("info", message, ...args));
  }
}

/**
 * Log warning message
 */
export function warn(message: string, ...args: unknown[]): void {
  if (shouldLog("warn")) {
    console.error(formatMessage("warn", message, ...args));
  }
}

/**
 * Log error message
 */
export function error(message: string, ...args: unknown[]): void {
  if (shouldLog("error")) {
    console.error(formatMessage("error", message, ...args));
  }
}

/**
 * Create a logger with a specific prefix (e.g., module name)
 */
export function createLogger(prefix: string) {
  return {
    debug: (message: string, ...args: unknown[]) => debug(`[${prefix}] ${message}`, ...args),
    info: (message: string, ...args: unknown[]) => info(`[${prefix}] ${message}`, ...args),
    warn: (message: string, ...args: unknown[]) => warn(`[${prefix}] ${message}`, ...args),
    error: (message: string, ...args: unknown[]) => error(`[${prefix}] ${message}`, ...args),
  };
}

export const logger = {
  debug,
  info,
  warn,
  error,
  setLogLevel,
  getLogLevel,
  createLogger,
};
