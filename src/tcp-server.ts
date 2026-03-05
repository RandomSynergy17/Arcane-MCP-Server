#!/usr/bin/env node
/**
 * Arcane MCP Server - TCP/HTTP transport entry point
 *
 * This entry point runs an HTTP server for network-based MCP clients.
 * Uses Streamable HTTP transport for bidirectional communication.
 *
 * Conforms to MCP Protocol Revision: 2025-11-25
 */

import express, { type Request, type Response, type NextFunction } from "express";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { createArcaneServer } from "./server.js";
import { getConfig, loadConfig } from "./config.js";
import { logger } from "./utils/logger.js";
import {
  MCP_PROTOCOL_VERSION,
  SUPPORTED_MCP_VERSIONS,
  SESSION_TIMEOUT_MS,
  SESSION_CLEANUP_INTERVAL_MS,
  MAX_SESSIONS,
} from "./constants.js";

// Session info with activity tracking
interface SessionInfo {
  transport: StreamableHTTPServerTransport;
  lastActivity: Date;
  created: Date;
}

// Map to store sessions with activity tracking
const sessions = new Map<string, SessionInfo>();

/**
 * Cleanup expired sessions
 */
function cleanupExpiredSessions(): void {
  const now = Date.now();
  let cleaned = 0;

  for (const [sessionId, info] of sessions.entries()) {
    if (now - info.lastActivity.getTime() > SESSION_TIMEOUT_MS) {
      info.transport.close().catch((err) => {
        logger.error(`Error closing expired session ${sessionId}:`, err);
      });
      sessions.delete(sessionId);
      cleaned++;
      logger.info(`Session ${sessionId} expired and cleaned up`);
    }
  }

  if (cleaned > 0) {
    logger.debug(`Cleaned up ${cleaned} expired sessions`);
  }
}

// Start session cleanup interval
let cleanupInterval: NodeJS.Timeout | null = null;

/**
 * Validate Origin header to prevent DNS rebinding attacks
 * Per MCP 2025-11-25 spec: Servers MUST validate Origin header
 */
function validateOrigin(req: Request, res: Response, next: NextFunction): void {
  const origin = req.headers.origin;
  const host = req.headers.host;

  // Allow requests without Origin header (non-browser clients)
  if (!origin) {
    next();
    return;
  }

  // Parse origin to get hostname
  try {
    const originUrl = new URL(origin);
    const originHost = originUrl.host;

    // For localhost, allow various localhost representations
    const isLocalhost = (h: string) =>
      h.startsWith("localhost") ||
      h.startsWith("127.0.0.1") ||
      h.startsWith("[::1]");

    // Check if origin matches host
    if (host === originHost || (isLocalhost(originHost) && host && isLocalhost(host.split(":")[0]))) {
      next();
      return;
    }

    // Origin mismatch - potential DNS rebinding attack
    logger.warn(`Origin validation failed: origin=${origin}, host=${host}`);
    res.status(403).json({
      jsonrpc: "2.0",
      error: {
        code: -32600,
        message: "Forbidden: Invalid Origin header",
      },
    });
  } catch {
    // Invalid origin URL
    res.status(403).json({
      jsonrpc: "2.0",
      error: {
        code: -32600,
        message: "Forbidden: Malformed Origin header",
      },
    });
  }
}

/**
 * Validate MCP-Protocol-Version header
 * Per MCP 2025-11-25 spec: Server MUST respond with 400 if unsupported version
 */
function validateProtocolVersion(req: Request, res: Response, next: NextFunction): void {
  const protocolVersion = req.headers["mcp-protocol-version"] as string | undefined;

  // Allow requests without version header (for backwards compatibility with 2025-03-26)
  // Per spec: if no header, assume 2025-03-26
  if (!protocolVersion) {
    next();
    return;
  }

  // Check if we support this version
  if ((SUPPORTED_MCP_VERSIONS as readonly string[]).includes(protocolVersion)) {
    next();
    return;
  }

  logger.warn(`Unsupported MCP protocol version: ${protocolVersion}`);
  res.status(400).json({
    jsonrpc: "2.0",
    error: {
      code: -32600,
      message: `Unsupported MCP protocol version: ${protocolVersion}. Supported: ${SUPPORTED_MCP_VERSIONS.join(", ")}`,
    },
  });
}

export async function startTcpServer(): Promise<void> {
  loadConfig();
  const config = getConfig();

  const port = config.httpPort;
  const host = config.httpHost;

  logger.info(`Starting Arcane MCP Server (HTTP transport) on ${host}:${port}`);
  logger.info(`MCP Protocol Version: ${MCP_PROTOCOL_VERSION}`);

  // Start session cleanup interval
  cleanupInterval = setInterval(cleanupExpiredSessions, SESSION_CLEANUP_INTERVAL_MS);
  logger.debug(`Session cleanup interval started (every ${SESSION_CLEANUP_INTERVAL_MS / 1000}s)`);

  const app = express();

  // Parse JSON bodies
  app.use(express.json());

  // Health check endpoint (no MCP validation needed)
  app.get("/health", (_req: Request, res: Response) => {
    res.json({
      status: "ok",
      server: "arcane-mcp-server",
      mcpProtocolVersion: MCP_PROTOCOL_VERSION,
      activeSessions: sessions.size,
      maxSessions: MAX_SESSIONS,
    });
  });

  // Apply MCP security middleware to /mcp endpoint
  app.use("/mcp", validateOrigin);
  app.use("/mcp", validateProtocolVersion);

  // MCP endpoint
  app.all("/mcp", async (req: Request, res: Response) => {
    try {
      // Get or create session ID
      const sessionId = req.headers["mcp-session-id"] as string | undefined;

      if (req.method === "GET") {
        // Check Accept header per MCP spec
        const accept = req.headers.accept || "";
        if (!accept.includes("text/event-stream")) {
          res.status(406).json({
            jsonrpc: "2.0",
            error: {
              code: -32600,
              message: "GET requests must accept text/event-stream",
            },
          });
          return;
        }

        // SSE connection for server-to-client messages
        // Per MCP spec: Server MAY return 405 if it doesn't offer SSE without session
        if (sessionId && sessions.has(sessionId)) {
          const sessionInfo = sessions.get(sessionId)!;
          sessionInfo.lastActivity = new Date(); // Update activity
          await sessionInfo.transport.handleRequest(req, res);
        } else {
          // No session - return 405 as we require a session first
          res.status(405).json({
            jsonrpc: "2.0",
            error: {
              code: -32600,
              message: "Method Not Allowed: GET requires an existing session. Send a POST InitializeRequest first.",
            },
          });
        }
        return;
      }

      if (req.method === "POST") {
        // Per MCP spec: Client MUST include Accept header with application/json and text/event-stream
        const accept = req.headers.accept || "";
        if (!accept.includes("application/json") && !accept.includes("text/event-stream") && !accept.includes("*/*")) {
          res.status(406).json({
            jsonrpc: "2.0",
            error: {
              code: -32600,
              message: "POST requests must accept application/json and/or text/event-stream",
            },
          });
          return;
        }

        let transport: StreamableHTTPServerTransport;

        if (sessionId && sessions.has(sessionId)) {
          // Reuse existing transport and update activity
          const sessionInfo = sessions.get(sessionId)!;
          sessionInfo.lastActivity = new Date();
          transport = sessionInfo.transport;
        } else {
          // Check max sessions limit
          if (sessions.size >= MAX_SESSIONS) {
            res.status(503).json({
              jsonrpc: "2.0",
              error: {
                code: -32600,
                message: "Service Unavailable: Maximum concurrent sessions reached. Please try again later.",
              },
            });
            return;
          }

          // Create new transport and server with atomic session storage
          transport = new StreamableHTTPServerTransport({
            sessionIdGenerator: () => crypto.randomUUID(),
            onsessioninitialized: (newSessionId) => {
              // Store session atomically when initialized (before response)
              const now = new Date();
              sessions.set(newSessionId, {
                transport,
                lastActivity: now,
                created: now,
              });
              logger.info(`New session created: ${newSessionId} (total: ${sessions.size})`);
            },
          });

          const server = createArcaneServer();
          await server.connect(transport);

          // Set up cleanup handler
          transport.onclose = () => {
            // Find and remove this session from the map
            for (const [sid, info] of sessions.entries()) {
              if (info.transport === transport) {
                sessions.delete(sid);
                logger.info(`Session closed: ${sid}`);
                break;
              }
            }
          };
        }

        await transport.handleRequest(req, res);
        return;
      }

      if (req.method === "DELETE") {
        // Close session
        if (sessionId && sessions.has(sessionId)) {
          const sessionInfo = sessions.get(sessionId)!;
          await sessionInfo.transport.close();
          sessions.delete(sessionId);
          res.status(204).send();
          logger.info(`Session deleted: ${sessionId}`);
        } else {
          res.status(404).json({ error: "Session not found" });
        }
        return;
      }

      res.status(405).json({ error: "Method not allowed" });
    } catch (error) {
      logger.error("Error handling MCP request:", error);
      res.status(500).json({
        error: "Internal server error",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  });

  // Start the server
  const server = app.listen(port, host, () => {
    // Use console.log here since this is HTTP mode, not stdio
    console.log(`Arcane MCP Server running at http://${host}:${port}/mcp`);
    console.log(`Health check available at http://${host}:${port}/health`);
    logger.info(`Server listening on ${host}:${port}`);
  });

  // Handle graceful shutdown
  const gracefulShutdown = async () => {
    console.log("\nShutting down...");

    // Stop session cleanup interval
    if (cleanupInterval) {
      clearInterval(cleanupInterval);
      cleanupInterval = null;
    }

    // Close all active sessions
    const closePromises: Promise<void>[] = [];
    for (const [sessionId, sessionInfo] of sessions.entries()) {
      logger.info(`Closing session: ${sessionId}`);
      closePromises.push(
        sessionInfo.transport.close().catch((err) => {
          logger.error(`Error closing session ${sessionId}:`, err);
        })
      );
    }
    await Promise.all(closePromises);
    sessions.clear();
    logger.info(`Closed ${closePromises.length} active sessions`);

    // Close HTTP server
    server.close(() => {
      console.log("Server closed");
      process.exit(0);
    });
  };

  process.on("SIGINT", () => void gracefulShutdown());
  process.on("SIGTERM", () => void gracefulShutdown());
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  startTcpServer().catch((error) => {
    logger.error("Fatal error:", error);
    process.exit(1);
  });
}
