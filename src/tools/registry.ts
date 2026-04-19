/**
 * Tool registry for Arcane MCP Server.
 *
 * Captures `RegisteredTool` handles from `server.registerTool()` so the
 * resolved enabled-set can be applied (disable-on-start) and hot-diffed
 * later when config changes. See `_docs/plans/2026-04-14-tool-filtering-design.md`.
 */

import type { McpServer, RegisteredTool } from "@modelcontextprotocol/sdk/server/mcp.js";
import { logger } from "../utils/logger.js";
import type { ToolsConfig } from "../config.js";
import { resolveEnabled } from "./presets.js";

export interface RegistryEntry {
  module: string;
  name: string;
  handle: RegisteredTool;
}

/**
 * Process-level active registry. Set by `registerAllTools` and read by
 * introspection resources (arcane://tools). Kept here to avoid a
 * server.ts ↔ resources/index.ts import cycle.
 */
let _active: ToolRegistry | null = null;

export function setActiveRegistry(r: ToolRegistry): void {
  _active = r;
}

export function getActiveRegistry(): ToolRegistry | null {
  return _active;
}

export function clearActiveRegistry(): void {
  _active = null;
}

export class ToolRegistry {
  private entries = new Map<string, RegistryEntry>();
  public hotReloadAvailable = false;

  register(module: string, name: string, handle: RegisteredTool): void {
    if (this.entries.has(name)) {
      logger.warn(`Tool ${name} registered twice — overwriting registry entry`);
    }
    this.entries.set(name, { module, name, handle });
  }

  all(): RegistryEntry[] {
    return Array.from(this.entries.values());
  }

  allToolNames(): string[] {
    return Array.from(this.entries.keys());
  }

  allModules(): string[] {
    const mods = new Set<string>();
    for (const e of this.entries.values()) mods.add(e.module);
    return Array.from(mods).sort();
  }

  moduleOf(toolName: string): string | undefined {
    return this.entries.get(toolName)?.module;
  }

  toolsInModule(module: string): string[] {
    const out: string[] = [];
    for (const e of this.entries.values()) {
      if (e.module === module) out.push(e.name);
    }
    return out;
  }

  /**
   * Apply the resolved enabled-set: disable every tool not in the set,
   * leave matching tools untouched. Run once after initial registration.
   */
  applyFilter(config: ToolsConfig | undefined): { enabled: number; disabled: number } {
    const enabledSet = resolveEnabled(config, this);
    let enabled = 0;
    let disabled = 0;
    for (const entry of this.entries.values()) {
      if (enabledSet.has(entry.name)) {
        if (!entry.handle.enabled) entry.handle.enable();
        enabled++;
      } else {
        if (entry.handle.enabled) entry.handle.disable();
        disabled++;
      }
    }
    return { enabled, disabled };
  }

  /**
   * Hot reload: compute new enabled-set and toggle only tools whose state
   * changed. SDK emits `notifications/tools/list_changed` per toggle, so we
   * keep toggles minimal.
   */
  diffAndApply(config: ToolsConfig | undefined): {
    turnedOn: string[];
    turnedOff: string[];
  } {
    const desired = resolveEnabled(config, this);
    const turnedOn: string[] = [];
    const turnedOff: string[] = [];
    for (const entry of this.entries.values()) {
      const wantEnabled = desired.has(entry.name);
      if (wantEnabled && !entry.handle.enabled) {
        entry.handle.enable();
        turnedOn.push(entry.name);
      } else if (!wantEnabled && entry.handle.enabled) {
        entry.handle.disable();
        turnedOff.push(entry.name);
      }
    }
    return { turnedOn, turnedOff };
  }
}

/**
 * Returns a `registerTool` wrapper for a tool module.
 * Calling it both registers the tool with `server` and captures the handle
 * into `registry` under the given `moduleName`.
 *
 * The returned function is typed as `server.registerTool` so call sites keep
 * the SDK's generic inference (Zod `inputSchema` → handler params).
 *
 * When `registry` is undefined (e.g., in unit tests that only need
 * registration to happen), behavior reduces to plain `server.registerTool`.
 */
export function moduleRegistrar(
  server: McpServer,
  registry: ToolRegistry | undefined,
  moduleName: string,
): typeof server.registerTool {
  function wrapped(
    name: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    config: any,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    handler: any,
  ): RegisteredTool {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handle = (server.registerTool as any)(name, config, handler) as RegisteredTool;
    registry?.register(moduleName, name, handle);
    return handle;
  }
  return wrapped as unknown as typeof server.registerTool;
}
