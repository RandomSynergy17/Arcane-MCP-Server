/**
 * End-to-end tests covering the three scenarios in the design doc's
 * verification / test plan (§_docs/plans/2026-04-14-tool-filtering-design.md:151-162):
 *
 *   1. boot-per-preset — every preset produces the expected enabled-set
 *   2. hot reload — editing the watched file toggles tools via diffAndApply
 *   3. upgrade notice — the notice resource body flips based on toolsUnconfigured
 *
 * Unlike the per-module unit tests these run the real McpServer + real
 * registerAllTools against the real 25 tool modules, so they also guard
 * against mechanical drift (a tool renamed in a module silently falling
 * outside of the preset that named it).
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { mkdtempSync, rmSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

vi.mock("../../utils/logger.js", () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

import { registerAllTools } from "../../tools/index.js";
import { ToolRegistry } from "../../tools/registry.js";
import { startConfigWatcher } from "../../utils/config-watcher.js";
import type { ArcaneConfig } from "../../config.js";

function newServer(): McpServer {
  return new McpServer({ name: "arcane-test", version: "0.0.0-test" });
}

function countEnabled(registry: ToolRegistry): { enabled: number; disabled: number; enabledNames: string[] } {
  let enabled = 0;
  let disabled = 0;
  const enabledNames: string[] = [];
  for (const entry of registry.all()) {
    if (entry.handle.enabled) {
      enabled++;
      enabledNames.push(entry.name);
    } else {
      disabled++;
    }
  }
  return { enabled, disabled, enabledNames };
}

describe("integration: boot-per-preset", () => {
  it("full preset leaves every tool enabled", () => {
    const server = newServer();
    const registry = registerAllTools(server, { preset: "full" });
    const { enabled, disabled } = countEnabled(registry);
    expect(enabled).toBe(registry.allToolNames().length);
    expect(disabled).toBe(0);
    // And the registry captured the full module inventory
    expect(registry.allModules().length).toBe(25);
  });

  it("undefined config falls back to full (backwards-compatible)", () => {
    const server = newServer();
    const registry = registerAllTools(server);
    const { enabled, disabled } = countEnabled(registry);
    expect(enabled).toBe(registry.allToolNames().length);
    expect(disabled).toBe(0);
  });

  it("minimal preset enables only dashboard + container read tools", () => {
    const server = newServer();
    const registry = registerAllTools(server, { preset: "minimal" });
    const { enabledNames } = countEnabled(registry);
    expect(enabledNames.sort()).toEqual([
      "arcane_container_get",
      "arcane_container_get_counts",
      "arcane_container_list",
      "arcane_dashboard_get",
      "arcane_dashboard_get_action_items",
    ]);
  });

  it("commonly-used preset covers exactly container/image/project/volume/network modules", () => {
    const server = newServer();
    const registry = registerAllTools(server, { preset: "commonly-used" });
    const { enabledNames } = countEnabled(registry);
    const enabledModules = new Set(enabledNames.map((n) => registry.moduleOf(n)));
    expect(Array.from(enabledModules).sort()).toEqual([
      "container",
      "image",
      "network",
      "project",
      "volume",
    ]);
    // Tools outside those five modules must be disabled
    for (const entry of registry.all()) {
      const inScope = ["container", "image", "network", "project", "volume"].includes(entry.module);
      expect(entry.handle.enabled).toBe(inScope);
    }
  });

  it("deploy preset covers exactly project/gitops/template/registry/environment/build", () => {
    const server = newServer();
    const registry = registerAllTools(server, { preset: "deploy" });
    const { enabledNames } = countEnabled(registry);
    const enabledModules = new Set(enabledNames.map((n) => registry.moduleOf(n)));
    expect(Array.from(enabledModules).sort()).toEqual([
      "build",
      "environment",
      "gitops",
      "project",
      "registry",
      "template",
    ]);
  });

  it("read-only preset keeps list/get/inspect/stats and rejects destructive tools", () => {
    const server = newServer();
    const registry = registerAllTools(server, { preset: "read-only" });
    const { enabledNames } = countEnabled(registry);
    const names = new Set(enabledNames);

    // Representative read tools present
    expect(names.has("arcane_container_list")).toBe(true);
    expect(names.has("arcane_container_get")).toBe(true);
    expect(names.has("arcane_container_get_counts")).toBe(true);
    expect(names.has("arcane_image_list")).toBe(true);
    expect(names.has("arcane_dashboard_get")).toBe(true);

    // Destructive / mutating tools blocked
    expect(names.has("arcane_container_delete")).toBe(false);
    expect(names.has("arcane_image_prune")).toBe(false);
    expect(names.has("arcane_volume_prune")).toBe(false);
    expect(names.has("arcane_project_up")).toBe(false);
    expect(names.has("arcane_project_down")).toBe(false);
  });

  it("modules + disabled overrides layer on top of a preset", () => {
    const server = newServer();
    const registry = registerAllTools(server, {
      preset: "commonly-used",
      disabled: ["arcane_container_delete", "arcane_image_prune"],
    });
    const { enabledNames } = countEnabled(registry);
    const names = new Set(enabledNames);
    expect(names.has("arcane_container_list")).toBe(true);
    expect(names.has("arcane_container_delete")).toBe(false);
    expect(names.has("arcane_image_prune")).toBe(false);
  });
});

describe("integration: hot reload cycle", () => {
  let tmpRoot: string;
  let tmpFile: string;

  beforeEach(() => {
    tmpRoot = mkdtempSync(join(tmpdir(), "arcane-test-"));
    tmpFile = join(tmpRoot, "config.json");
  });

  afterEach(() => {
    rmSync(tmpRoot, { recursive: true, force: true });
  });

  async function waitFor(predicate: () => boolean, timeoutMs = 1500): Promise<void> {
    const started = Date.now();
    while (Date.now() - started < timeoutMs) {
      if (predicate()) return;
      await new Promise((r) => setTimeout(r, 20));
    }
    throw new Error(`waitFor timed out after ${timeoutMs}ms`);
  }

  it("file change triggers diffAndApply and toggles tools within the debounce window", async () => {
    // Start with full. Applied filter = everything enabled.
    writeFileSync(tmpFile, JSON.stringify({ tools: { preset: "full" } }));

    const server = newServer();
    const registry = registerAllTools(server, { preset: "full" });
    expect(countEnabled(registry).disabled).toBe(0);

    // Inject a reload() that re-reads the temp file so we don't touch the
    // user's real ~/.arcane/config.json during tests.
    const { readFileSync } = await import("fs");
    const watcher = startConfigWatcher(registry, {
      path: tmpFile,
      reload: () => JSON.parse(readFileSync(tmpFile, "utf-8")) as Partial<ArcaneConfig>,
      debounceMs: 50,
    });

    try {
      expect(registry.hotReloadAvailable).toBe(true);

      // Give fs.watch a beat to fully attach (macOS can miss the first change
      // if we write too soon after calling watch()).
      await new Promise((r) => setTimeout(r, 50));

      // Swap to minimal on disk
      writeFileSync(tmpFile, JSON.stringify({ tools: { preset: "minimal" } }));

      // Wait for the watcher to debounce + apply
      await waitFor(() => countEnabled(registry).enabled === 5);

      const { enabledNames } = countEnabled(registry);
      expect(enabledNames.sort()).toEqual([
        "arcane_container_get",
        "arcane_container_get_counts",
        "arcane_container_list",
        "arcane_dashboard_get",
        "arcane_dashboard_get_action_items",
      ]);
    } finally {
      watcher.stop();
    }
  });

  it("parse error during reload keeps the current filter live (does not disable everything)", async () => {
    writeFileSync(tmpFile, JSON.stringify({ tools: { preset: "commonly-used" } }));
    const server = newServer();
    const registry = registerAllTools(server, { preset: "commonly-used" });
    const baselineEnabled = countEnabled(registry).enabled;

    const watcher = startConfigWatcher(registry, {
      path: tmpFile,
      reload: () => {
        throw new Error("simulated parse error");
      },
      debounceMs: 30,
    });

    try {
      writeFileSync(tmpFile, "this is not JSON");
      // Give the watcher enough time to fire + swallow the error
      await new Promise((r) => setTimeout(r, 120));
      // Nothing should have been toggled
      expect(countEnabled(registry).enabled).toBe(baselineEnabled);
    } finally {
      watcher.stop();
    }
  });

  it("missing file disables hot reload and flips the registry flag", () => {
    const registry = new ToolRegistry();
    const handle = registry; // dummy
    void handle;
    const watcher = startConfigWatcher(registry, { path: join(tmpRoot, "does-not-exist.json") });
    try {
      expect(registry.hotReloadAvailable).toBe(false);
    } finally {
      watcher.stop();
    }
  });
});

describe("integration: upgrade notice lifecycle", () => {
  it("flags the 'unconfigured' state in the notice resource body", async () => {
    // Re-import the resource module with a mocked config + registry so we can
    // assert body content without booting the MCP server's resource plumbing.
    vi.resetModules();

    const mockGetConfig = vi.fn(() => ({ toolsUnconfigured: true }) as unknown as ArcaneConfig);
    vi.doMock("../../config.js", () => ({ getConfig: mockGetConfig }));
    vi.doMock("../../tools/registry.js", async () => {
      const actual = await vi.importActual<typeof import("../../tools/registry.js")>(
        "../../tools/registry.js",
      );
      return { ...actual, getActiveRegistry: () => null };
    });
    vi.doMock("../../utils/logger.js", () => ({
      logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
    }));
    vi.doMock("../../client/arcane-client.js", () => ({
      getArcaneClient: vi.fn(),
    }));
    vi.doMock("../../utils/error-handler.js", () => ({
      formatError: (e: unknown) => (e instanceof Error ? e.message : String(e)),
    }));

    const { registerResources } = await import("../../resources/index.js");

    const handlers = new Map<string, (u: URL) => Promise<{ contents: Array<{ text: string }> }>>();
    const server = {
      resource: (
        name: string,
        _uri: string,
        _meta: unknown,
        handler: (u: URL) => Promise<{ contents: Array<{ text: string }> }>,
      ) => {
        handlers.set(name, handler);
      },
    };

    registerResources(server as unknown as Parameters<typeof registerResources>[0]);

    // Unconfigured state → explicit call to /arcane:configure
    const handler = handlers.get("arcane-tools-config-notice")!;
    const result = await handler(new URL("arcane://tools-config-notice"));
    expect(result.contents[0].text).toContain("180 tools");
    expect(result.contents[0].text).toContain("/arcane:configure");

    // Flip to configured — body should swap
    mockGetConfig.mockReturnValueOnce({ toolsUnconfigured: false } as unknown as ArcaneConfig);
    const configured = await handler(new URL("arcane://tools-config-notice"));
    expect(configured.contents[0].text).toContain("Tool filtering is configured");
  });
});
