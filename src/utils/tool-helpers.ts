/**
 * Shared tool handler utilities for Arcane MCP Server
 *
 * Eliminates try-catch boilerplate and standardizes MCP tool response formatting.
 */

import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { getArcaneClient, type ArcaneClient } from "../client/arcane-client.js";
import { formatError } from "./error-handler.js";

/**
 * Wraps a tool handler function with standardized error handling and response formatting.
 *
 * The wrapped function receives the parsed params and an ArcaneClient instance,
 * and returns a plain string. The wrapper handles:
 * - Client initialization via getArcaneClient()
 * - Wrapping the string result into MCP CallToolResult format
 * - Catching errors and formatting them via formatError()
 */
export function toolHandler<P>(
  fn: (params: P, client: ArcaneClient) => Promise<string>
): (params: P) => Promise<CallToolResult> {
  return async (params: P) => {
    try {
      const client = getArcaneClient();
      const text = await fn(params, client);
      return { content: [{ type: "text" as const, text }] };
    } catch (error) {
      return { content: [{ type: "text" as const, text: formatError(error) }] };
    }
  };
}
