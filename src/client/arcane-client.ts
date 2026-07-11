/**
 * HTTP client for Arcane API
 */

import { getConfig, type ArcaneConfig } from "../config.js";
import { getAuthManager } from "../auth/auth-manager.js";
import { ArcaneApiError, NetworkError, parseApiError } from "../utils/error-handler.js";
import { logger } from "../utils/logger.js";
import {
  MAX_RETRIES,
  RETRY_BASE_DELAY_MS,
  MAX_RESPONSE_SIZE,
  RETRYABLE_STATUS_CODES,
  BACKGROUND_REQUEST_TIMEOUT_MS,
  LOG_STREAM_IDLE_TIMEOUT_MS,
  LOG_STREAM_MAX_DURATION_MS,
} from "../constants.js";

export interface RequestOptions {
  /** HTTP method */
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  /** Query parameters */
  params?: Record<string, string | number | boolean | undefined>;
  /** Request body */
  body?: unknown;
  /** Additional headers */
  headers?: Record<string, string>;
  /** Request timeout in ms (overrides config) */
  timeout?: number;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    totalItems: number;
    totalPages: number;
    currentPage: number;
    itemsPerPage: number;
  };
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
}

export interface MessageResponse {
  success: boolean;
  message: string;
}

export class ArcaneClient {
  private config: ArcaneConfig;
  private authManager = getAuthManager();

  constructor() {
    this.config = getConfig();

    // Node.js native fetch (undici) ignores the https.Agent property.
    // Set the env var to disable TLS verification when explicitly configured.
    if (this.config.skipSslVerify) {
      process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
      logger.warn("SSL verification disabled via ARCANE_SKIP_SSL_VERIFY — not for production use");
    }
  }

  /**
   * Build the full URL with query parameters
   */
  private buildUrl(path: string, params?: Record<string, string | number | boolean | undefined>): string {
    const url = new URL(path, this.config.baseUrl);

    if (params) {
      for (const [key, value] of Object.entries(params)) {
        if (value !== undefined) {
          url.searchParams.set(key, String(value));
        }
      }
    }

    return url.toString();
  }

  /**
   * Sleep for a given duration (for retry backoff)
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Make an HTTP request to the Arcane API with retry support
   */
  async request<T>(path: string, options: RequestOptions = {}): Promise<T> {
    const { method = "GET", params, body, headers = {}, timeout } = options;

    const url = this.buildUrl(`/api${path}`, params);
    const authHeaders = await this.authManager.getAuthHeaders();

    const requestHeaders: Record<string, string> = {
      "Content-Type": "application/json",
      Accept: "application/json",
      ...authHeaders,
      ...headers,
    };

    const fetchOptions: RequestInit = {
      method,
      headers: requestHeaders,
      body: body ? JSON.stringify(body) : undefined,
    };

    let lastError: unknown;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      const controller = new AbortController();
      const timeoutId = setTimeout(
        () => controller.abort(),
        timeout || this.config.timeout
      );

      try {
        logger.debug(`${method} ${url}${attempt > 0 ? ` (retry ${attempt}/${MAX_RETRIES})` : ""}`);

        const response = await fetch(url, {
          ...fetchOptions,
          signal: controller.signal,
        });

        if (!response.ok) {
          const apiError = await parseApiError(response, path);

          // Check if we should retry
          if (RETRYABLE_STATUS_CODES.includes(response.status) && attempt < MAX_RETRIES) {
            lastError = apiError;
            const delay = RETRY_BASE_DELAY_MS * Math.pow(2, attempt);
            logger.debug(`Retryable error (${response.status}), waiting ${delay}ms before retry`);
            await this.sleep(delay);
            continue;
          }

          throw apiError;
        }

        // Handle empty responses (return undefined-safe empty object)
        const contentType = response.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {
          // No JSON body — callers should handle undefined
          return undefined as T;
        }

        // Check response size before reading
        const contentLength = response.headers.get("content-length");
        if (contentLength && parseInt(contentLength, 10) > MAX_RESPONSE_SIZE) {
          throw new ArcaneApiError(
            `Response too large: ${contentLength} bytes exceeds limit of ${MAX_RESPONSE_SIZE} bytes`,
            413,
            "RESPONSE_TOO_LARGE",
            undefined,
            path
          );
        }

        const text = await response.text();
        if (!text) {
          // No JSON body — callers should handle undefined
          return undefined as T;
        }

        // Additional size check for responses without Content-Length
        if (text.length > MAX_RESPONSE_SIZE) {
          throw new ArcaneApiError(
            `Response too large: ${text.length} bytes exceeds limit of ${MAX_RESPONSE_SIZE} bytes`,
            413,
            "RESPONSE_TOO_LARGE",
            undefined,
            path
          );
        }

        return JSON.parse(text) as T;
      } catch (error) {
        // Store for potential retry
        lastError = error;

        if (error instanceof ArcaneApiError) {
          // Already handled retryable status codes above
          throw error;
        }

        if (error instanceof Error) {
          if (error.name === "AbortError") {
            const networkError = new NetworkError(`Request timeout after ${timeout || this.config.timeout}ms`);

            // Retry on timeout if attempts remaining
            if (attempt < MAX_RETRIES) {
              const delay = RETRY_BASE_DELAY_MS * Math.pow(2, attempt);
              logger.debug(`Timeout, waiting ${delay}ms before retry`);
              await this.sleep(delay);
              continue;
            }

            throw networkError;
          }
          if (error.message.includes("fetch")) {
            const networkError = new NetworkError(`Unable to connect to ${this.config.baseUrl}: ${error.message}`);

            // Retry on network error if attempts remaining
            if (attempt < MAX_RETRIES) {
              const delay = RETRY_BASE_DELAY_MS * Math.pow(2, attempt);
              logger.debug(`Network error, waiting ${delay}ms before retry`);
              await this.sleep(delay);
              continue;
            }

            throw networkError;
          }
        }

        throw error;
      } finally {
        clearTimeout(timeoutId);
      }
    }

    // Should not reach here, but throw last error if we do
    throw lastError;
  }

  /**
   * GET request
   */
  async get<T>(path: string, params?: Record<string, string | number | boolean | undefined>): Promise<T> {
    return this.request<T>(path, { method: "GET", params });
  }

  /**
   * POST request
   */
  async post<T>(path: string, body?: unknown, params?: Record<string, string | number | boolean | undefined>): Promise<T> {
    return this.request<T>(path, { method: "POST", body, params });
  }

  /**
   * PUT request
   */
  async put<T>(path: string, body?: unknown, params?: Record<string, string | number | boolean | undefined>): Promise<T> {
    return this.request<T>(path, { method: "PUT", body, params });
  }

  /**
   * PATCH request
   */
  async patch<T>(path: string, body?: unknown, params?: Record<string, string | number | boolean | undefined>): Promise<T> {
    return this.request<T>(path, { method: "PATCH", body, params });
  }

  /**
   * DELETE request
   */
  async delete<T>(path: string, params?: Record<string, string | number | boolean | undefined>, body?: unknown): Promise<T> {
    return this.request<T>(path, { method: "DELETE", params, body });
  }

  /**
   * POST a single file as multipart/form-data (e.g. build workspace uploads).
   */
  async postMultipart<T>(
    path: string,
    params: Record<string, string | number | boolean | undefined> | undefined,
    fileName: string,
    content: string
  ): Promise<T> {
    const url = this.buildUrl(`/api${path}`, params);
    const authHeaders = await this.authManager.getAuthHeaders();

    const form = new FormData();
    form.append("file", new Blob([content]), fileName);

    // Content-Type (with boundary) is set by fetch from the FormData body
    const response = await fetch(url, {
      method: "POST",
      headers: { Accept: "application/json", ...authHeaders },
      body: form,
    });

    if (!response.ok) {
      throw await parseApiError(response, path);
    }

    const text = await response.text();
    return (text ? JSON.parse(text) : undefined) as T;
  }

  /**
   * Fetch log lines from one of Arcane's WebSocket log endpoints.
   *
   * Connects with follow=false so the server sends the requested backlog;
   * collection ends when the server closes, no line arrives for
   * LOG_STREAM_IDLE_TIMEOUT_MS, the hard duration cap hits, or maxLines
   * is reached (whichever comes first).
   */
  async fetchLogs(
    path: string,
    params: Record<string, string | number | boolean | undefined>,
    maxLines: number
  ): Promise<{ lines: string[]; truncated: boolean }> {
    const { default: WebSocket } = await import("ws");

    const url = this.buildUrl(`/api${path}`, params).replace(/^http/, "ws");
    const authHeaders = await this.authManager.getAuthHeaders();

    return new Promise((resolve, reject) => {
      const lines: string[] = [];
      let truncated = false;
      let settled = false;
      let idleTimer: NodeJS.Timeout | undefined;

      const ws = new WebSocket(url, {
        headers: authHeaders,
        rejectUnauthorized: !this.config.skipSslVerify,
      });

      const finish = () => {
        if (settled) return;
        settled = true;
        clearTimeout(idleTimer);
        clearTimeout(maxTimer);
        try {
          ws.terminate();
        } catch {
          // already closed
        }
        resolve({ lines, truncated });
      };

      const resetIdle = () => {
        clearTimeout(idleTimer);
        idleTimer = setTimeout(finish, LOG_STREAM_IDLE_TIMEOUT_MS);
      };

      const maxTimer = setTimeout(finish, LOG_STREAM_MAX_DURATION_MS);

      ws.on("open", resetIdle);
      ws.on("message", (data: Buffer | string) => {
        for (const raw of data.toString().split("\n")) {
          // Strip trailing CR and ANSI color codes (compose/agent logs are colored)
          const line = raw.replace(/\r$/, "").replace(/\x1b\[[0-9;]*m/g, "");
          if (!line) continue;
          if (lines.length >= maxLines) {
            truncated = true;
            finish();
            return;
          }
          lines.push(line);
        }
        resetIdle();
      });
      ws.on("close", finish);
      ws.on("error", (error: Error) => {
        if (settled) return;
        if (lines.length > 0) {
          finish();
          return;
        }
        settled = true;
        clearTimeout(idleTimer);
        clearTimeout(maxTimer);
        reject(new NetworkError(`Log stream failed: ${error.message}`));
      });
    });
  }

  /**
   * Fire a long-running POST without awaiting its completion.
   * Uses a generous timeout so the built-in timeout retry never re-triggers
   * the operation on the server (e.g. duplicate image-update checks).
   * Errors are logged instead of thrown — callers respond immediately.
   */
  postInBackground(path: string, body?: unknown): void {
    this.request(path, { method: "POST", body, timeout: BACKGROUND_REQUEST_TIMEOUT_MS }).catch((error) => {
      const message = error instanceof Error ? error.message : String(error);
      logger.warn(`Background request POST ${path} failed: ${message}`);
    });
  }

  /**
   * Get the base URL
   */
  getBaseUrl(): string {
    return this.config.baseUrl;
  }

  /**
   * Get the default environment ID
   */
  getDefaultEnvironmentId(): string | undefined {
    return this.config.defaultEnvironmentId;
  }
}

// Singleton instance
let clientInstance: ArcaneClient | null = null;

export function getArcaneClient(): ArcaneClient {
  if (!clientInstance) {
    clientInstance = new ArcaneClient();
  }
  return clientInstance;
}

export function resetArcaneClient(): void {
  clientInstance = null;
}
