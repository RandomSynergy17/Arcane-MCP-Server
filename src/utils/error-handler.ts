/**
 * Error handling utilities for Arcane MCP Server
 */

import { logger } from "./logger.js";

export class ArcaneApiError extends Error {
  constructor(
    message: string,
    public readonly httpStatus: number,
    public readonly code?: string,
    public readonly details?: unknown,
    public readonly path?: string,
    cause?: Error
  ) {
    super(message, { cause });
    this.name = "ArcaneApiError";
  }
}

export class NetworkError extends Error {
  constructor(message: string, cause?: Error) {
    super(message, { cause });
    this.name = "NetworkError";
  }
}

export class AuthenticationError extends Error {
  constructor(message: string, cause?: Error) {
    super(message, { cause });
    this.name = "AuthenticationError";
  }
}

export class ValidationError extends Error {
  constructor(message: string, public readonly field?: string, cause?: Error) {
    super(message, { cause });
    this.name = "ValidationError";
  }
}

/**
 * Format an error into a user-friendly message
 */
export function formatError(error: unknown): string {
  if (error instanceof ArcaneApiError) {
    return formatApiError(error);
  }

  if (error instanceof NetworkError) {
    return `Network error: Unable to connect to Arcane API. ${error.message}`;
  }

  if (error instanceof AuthenticationError) {
    return `Authentication failed: ${error.message}. Please check your API key or credentials.`;
  }

  if (error instanceof ValidationError) {
    const fieldInfo = error.field ? ` (field: ${error.field})` : "";
    return `Validation error${fieldInfo}: ${error.message}`;
  }

  if (error instanceof Error) {
    return `Error: ${error.message}`;
  }

  return `Unexpected error: ${String(error)}`;
}

function formatApiError(error: ArcaneApiError): string {
  const parts = [`Error: ${error.message}`];

  switch (error.httpStatus) {
    case 400:
      parts.push("The request was invalid. Please check the input parameters.");
      break;
    case 401:
      parts.push("Authentication required. Please check your credentials.");
      break;
    case 403:
      parts.push("You do not have permission to perform this action.");
      break;
    case 404:
      parts.push("The requested resource was not found.");
      break;
    case 409:
      parts.push("The operation conflicts with the current state.");
      break;
    case 429:
      parts.push("Rate limit exceeded. Please try again later.");
      break;
    case 500:
    case 502:
    case 503:
    case 504:
      parts.push("The Arcane server encountered an error. Please check server health.");
      break;
  }

  if (error.code) {
    parts.push(`Code: ${error.code}`);
  }

  if (error.details) {
    parts.push(`Details: ${JSON.stringify(error.details)}`);
  }

  return parts.join(" ");
}

/**
 * Parse error response from Arcane API
 */
export async function parseApiError(response: Response, path: string): Promise<ArcaneApiError> {
  let message = `HTTP ${response.status}`;
  let code: string | undefined;
  let details: unknown;

  try {
    const body = await response.json() as Record<string, unknown>;
    if (body.message && typeof body.message === "string") message = body.message;
    if (body.error && typeof body.error === "string") message = body.error;
    if (body.code && typeof body.code === "string") code = body.code;
    if (body.details) details = body.details;
  } catch (parseError) {
    logger.debug(`Failed to parse error response as JSON: ${parseError instanceof Error ? parseError.message : String(parseError)}`);
    message = response.statusText || message;
  }

  return new ArcaneApiError(message, response.status, code, details, path);
}

/**
 * Wrap an async function with error handling
 */
export function withErrorHandling<T>(fn: () => Promise<T>): Promise<T> {
  return fn().catch((error) => {
    if (error instanceof ArcaneApiError ||
        error instanceof NetworkError ||
        error instanceof AuthenticationError ||
        error instanceof ValidationError) {
      throw error;
    }

    if (error instanceof TypeError && error.message.includes("fetch")) {
      throw new NetworkError("Unable to reach Arcane API", error);
    }

    throw error;
  });
}

