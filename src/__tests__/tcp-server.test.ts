/**
 * Regression tests for the Streamable HTTP transport (src/tcp-server.ts).
 *
 * `express.json()` consumes the request stream before the MCP handler runs,
 * so the parsed body must be handed to `transport.handleRequest()`. Without
 * that, every POST /mcp — including a valid `initialize` — failed with
 * HTTP 400 / JSON-RPC -32700 "Parse error: Invalid JSON".
 */

import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import type { Server } from "http";
import type { AddressInfo } from "net";

vi.mock("../utils/logger.js", () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

// Never read the developer's real ~/.arcane/config.json.
vi.mock("fs", async (importOriginal) => {
  const actual = await importOriginal<typeof import("fs")>();
  return { ...actual, existsSync: vi.fn(() => false) };
});

import { createHttpApp } from "../tcp-server.js";
import { MCP_PROTOCOL_VERSION } from "../constants.js";

const ACCEPT = "application/json, text/event-stream";

/** Extract the JSON-RPC message from a JSON or single-event SSE response body. */
function parseMcpBody(contentType: string, text: string): any {
  if (contentType.includes("text/event-stream")) {
    const data = text
      .split("\n")
      .filter((line) => line.startsWith("data:"))
      .map((line) => line.slice(5).trim())
      .join("");
    return JSON.parse(data);
  }
  return JSON.parse(text);
}

describe("HTTP transport POST /mcp", () => {
  let server: Server;
  let baseUrl: string;

  beforeAll(async () => {
    const app = createHttpApp();
    await new Promise<void>((resolve) => {
      server = app.listen(0, "127.0.0.1", () => resolve());
    });
    const { port } = server.address() as AddressInfo;
    baseUrl = `http://127.0.0.1:${port}`;
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  it("accepts a valid initialize request and returns a session id", async () => {
    const res = await fetch(`${baseUrl}/mcp`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: ACCEPT,
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "initialize",
        params: {
          protocolVersion: MCP_PROTOCOL_VERSION,
          capabilities: {},
          clientInfo: { name: "regression-test", version: "0.0.0" },
        },
      }),
    });

    const text = await res.text();
    expect(res.status, text).toBe(200);

    const sessionId = res.headers.get("mcp-session-id");
    expect(sessionId).toBeTruthy();

    const message = parseMcpBody(res.headers.get("content-type") ?? "", text);
    expect(message.error).toBeUndefined();
    expect(message.jsonrpc).toBe("2.0");
    expect(message.id).toBe(1);
    expect(message.result.protocolVersion).toBe(MCP_PROTOCOL_VERSION);
    expect(message.result.serverInfo.name).toBe("arcane");
    expect(message.result.capabilities.tools).toBeDefined();

    // The session must be usable for follow-up requests and then closable.
    const initialized = await fetch(`${baseUrl}/mcp`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: ACCEPT,
        "Mcp-Session-Id": sessionId!,
        "MCP-Protocol-Version": MCP_PROTOCOL_VERSION,
      },
      body: JSON.stringify({ jsonrpc: "2.0", method: "notifications/initialized" }),
    });
    expect(initialized.status).toBe(202);

    const del = await fetch(`${baseUrl}/mcp`, {
      method: "DELETE",
      headers: { "Mcp-Session-Id": sessionId! },
    });
    expect(del.status).toBe(204);
  });
});
