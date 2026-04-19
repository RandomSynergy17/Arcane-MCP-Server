/**
 * MCP Server factory for Arcane
 *
 * Provides two factory functions:
 * - createArcaneServer(): Full server for single-connection transports (stdio)
 * - createSessionServer(): Lightweight server for HTTP sessions that shares
 *   tool/resource/prompt registrations from a singleton template to avoid
 *   re-registering 180+ tools per session (PERF-01)
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { createRequire } from "module";
import { loadConfig } from "./config.js";
import { logger } from "./utils/logger.js";
import { registerAllTools } from "./tools/index.js";
import { setActiveRegistry, type ToolRegistry } from "./tools/registry.js";
import { registerResources } from "./resources/index.js";
import { registerPrompts } from "./prompts/index.js";

const require = createRequire(import.meta.url);
const { version: VERSION } = require("../package.json") as { version: string };

/**
 * Registry captured during stdio startup, exposed so the hot-reload watcher
 * in the entry point can call `diffAndApply()` on config changes.
 */
let _stdioRegistry: ToolRegistry | null = null;

export function getStdioRegistry(): ToolRegistry | null {
  return _stdioRegistry;
}

/**
 * Create and configure the Arcane MCP Server (full registration).
 * Used by stdio transport where there is only one connection.
 */
export function createArcaneServer(): McpServer {
  // Load configuration
  const config = loadConfig();

  logger.info(`Creating Arcane MCP Server v${VERSION}`);

  const server = new McpServer({
    name: "arcane",
    version: VERSION,
  });

  // Register all tools (filter applied inside registerAllTools)
  _stdioRegistry = registerAllTools(server, config.tools);
  setActiveRegistry(_stdioRegistry);

  // Register MCP resources (read-only context data)
  registerResources(server);

  // Register MCP prompts (pre-built workflow templates)
  registerPrompts(server);

  logger.info("Arcane MCP Server initialized");

  return server;
}

// ---------------------------------------------------------------------------
// Shared-template optimisation for HTTP sessions (PERF-01)
// ---------------------------------------------------------------------------

/**
 * Singleton template McpServer.  Created once on first call to
 * createSessionServer(). All tools, resources, and prompts are registered
 * on this instance; per-session servers share the registrations by
 * copying internal references rather than re-registering 180+ tools.
 */
let _template: McpServer | null = null;
let _templateRegistry: ToolRegistry | null = null;

export function getTemplateRegistry(): ToolRegistry | null {
  return _templateRegistry;
}

/**
 * Force the HTTP template (and its registry) to initialise at startup so
 * the config watcher can attach even before the first client connects.
 */
export function preloadHttpTemplate(): ToolRegistry {
  getTemplate();
  return _templateRegistry!;
}

/**
 * Initialise (or return) the singleton template.
 */
function getTemplate(): McpServer {
  if (_template) return _template;

  const config = loadConfig();
  logger.info(`Creating shared McpServer template v${VERSION}`);

  _template = new McpServer({ name: "arcane", version: VERSION });

  _templateRegistry = registerAllTools(_template, config.tools);
  setActiveRegistry(_templateRegistry);
  registerResources(_template);
  registerPrompts(_template);

  logger.info("Shared McpServer template ready");
  return _template;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyRecord = Record<string, any>;

/**
 * Create a lightweight McpServer for an HTTP session.
 *
 * Instead of calling registerAllTools / registerResources / registerPrompts
 * (which would create 180+ tool registrations per session), this copies
 * the internal registration dictionaries and request-handler map from a
 * shared template so that every session shares the same tool definitions
 * and handler closures.
 *
 * The MCP SDK stores registrations in plain objects
 * (_registeredTools, _registeredResources, etc.) and request handlers in
 * a Map on the underlying Protocol/Server. By assigning these from the
 * template before connecting, the new McpServer is fully configured
 * without the overhead of individual registerTool() calls.
 */
export function createSessionServer(): McpServer {
  const template = getTemplate();
  const tpl = template as unknown as AnyRecord;

  // Create a bare McpServer (no tool registrations)
  const session = new McpServer({ name: "arcane", version: VERSION });
  const ses = session as unknown as AnyRecord;

  // --- Share registration dictionaries (read-only references) ---
  ses._registeredTools = tpl._registeredTools;
  ses._registeredResources = tpl._registeredResources;
  ses._registeredResourceTemplates = tpl._registeredResourceTemplates;
  ses._registeredPrompts = tpl._registeredPrompts;

  // --- Copy initialisation flags so McpServer skips re-setup guards ---
  ses._toolHandlersInitialized = true;
  ses._resourceHandlersInitialized = true;
  ses._promptHandlersInitialized = true;
  ses._completionHandlerInitialized = tpl._completionHandlerInitialized;

  // --- Copy request handlers & capabilities from the template's Server ---
  const tplServer = tpl.server as AnyRecord;
  const sesServer = ses.server as AnyRecord;

  // _requestHandlers is a Map<string, handler>.  We copy all entries so
  // that tools/list, tools/call, resources/list, etc. are already wired.
  const tplHandlers: Map<string, unknown> = tplServer._requestHandlers;
  const sesHandlers: Map<string, unknown> = sesServer._requestHandlers;
  for (const [method, handler] of tplHandlers) {
    sesHandlers.set(method, handler);
  }

  // Capabilities must be set before connect() (SDK throws otherwise)
  sesServer._capabilities = { ...tplServer._capabilities };

  return session;
}

export default { createArcaneServer, createSessionServer };
