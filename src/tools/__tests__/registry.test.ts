import { describe, it, expect, beforeEach, vi } from "vitest";
import type { RegisteredTool } from "@modelcontextprotocol/sdk/server/mcp.js";

vi.mock("../../utils/logger.js", () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

import { ToolRegistry, moduleRegistrar } from "../registry.js";

function fakeHandle(initial = true): RegisteredTool {
  const obj: {
    enabled: boolean;
    enable(): void;
    disable(): void;
    update(): void;
    remove(): void;
    handler: unknown;
  } = {
    enabled: initial,
    enable() { obj.enabled = true; },
    disable() { obj.enabled = false; },
    update: () => {},
    remove: () => {},
    handler: () => ({ content: [] }),
  };
  return obj as unknown as RegisteredTool;
}

describe("ToolRegistry", () => {
  let registry: ToolRegistry;

  beforeEach(() => {
    registry = new ToolRegistry();
    registry.register("container", "arcane_container_list", fakeHandle());
    registry.register("container", "arcane_container_get", fakeHandle());
    registry.register("container", "arcane_container_delete", fakeHandle());
    registry.register("image", "arcane_image_list", fakeHandle());
    registry.register("image", "arcane_image_prune", fakeHandle());
    registry.register("dashboard", "arcane_dashboard_get", fakeHandle());
  });

  it("tracks module membership", () => {
    expect(registry.moduleOf("arcane_container_list")).toBe("container");
    expect(registry.moduleOf("arcane_dashboard_get")).toBe("dashboard");
    expect(registry.moduleOf("does_not_exist")).toBeUndefined();
  });

  it("returns sorted unique modules", () => {
    expect(registry.allModules()).toEqual(["container", "dashboard", "image"]);
  });

  it("returns tools in a given module", () => {
    expect(registry.toolsInModule("container").sort()).toEqual([
      "arcane_container_delete",
      "arcane_container_get",
      "arcane_container_list",
    ]);
  });

  it("applyFilter with no config enables everything (preset falls back to full)", () => {
    const { enabled, disabled } = registry.applyFilter(undefined);
    expect(enabled).toBe(6);
    expect(disabled).toBe(0);
    for (const entry of registry.all()) {
      expect(entry.handle.enabled).toBe(true);
    }
  });

  it("applyFilter with disabled list subtracts from full", () => {
    registry.applyFilter({ disabled: ["arcane_image_prune"] });
    expect(registry.all().find((e) => e.name === "arcane_image_prune")!.handle.enabled).toBe(false);
    expect(registry.all().find((e) => e.name === "arcane_image_list")!.handle.enabled).toBe(true);
  });

  it("applyFilter with modules allowlist keeps only matching tools", () => {
    registry.applyFilter({ modules: ["dashboard"] });
    expect(registry.all().find((e) => e.name === "arcane_dashboard_get")!.handle.enabled).toBe(true);
    expect(registry.all().find((e) => e.name === "arcane_container_list")!.handle.enabled).toBe(false);
  });

  it("applyFilter with enabled list adds tools back after modules intersection", () => {
    registry.applyFilter({
      modules: ["dashboard"],
      enabled: ["arcane_container_get"],
    });
    expect(registry.all().find((e) => e.name === "arcane_dashboard_get")!.handle.enabled).toBe(true);
    expect(registry.all().find((e) => e.name === "arcane_container_get")!.handle.enabled).toBe(true);
    expect(registry.all().find((e) => e.name === "arcane_container_list")!.handle.enabled).toBe(false);
  });

  it("diffAndApply only toggles tools whose state changes", () => {
    registry.applyFilter({ modules: ["dashboard"] });
    // Everything disabled except dashboard. Now allow container too.
    const diff = registry.diffAndApply({ modules: ["dashboard", "container"] });
    expect(diff.turnedOn.sort()).toEqual([
      "arcane_container_delete",
      "arcane_container_get",
      "arcane_container_list",
    ]);
    expect(diff.turnedOff).toEqual([]);
  });

  it("diffAndApply reports turnedOff for tools newly excluded", () => {
    registry.applyFilter(undefined); // all enabled
    const diff = registry.diffAndApply({ modules: ["dashboard"] });
    expect(diff.turnedOn).toEqual([]);
    expect(diff.turnedOff.sort()).toEqual([
      "arcane_container_delete",
      "arcane_container_get",
      "arcane_container_list",
      "arcane_image_list",
      "arcane_image_prune",
    ]);
  });
});

describe("moduleRegistrar", () => {
  it("registers with server and captures handle in registry when provided", () => {
    const registry = new ToolRegistry();
    const handle = fakeHandle();
    const server = {
      registerTool: vi.fn().mockReturnValue(handle),
    };
    const register = moduleRegistrar(
      server as unknown as Parameters<typeof moduleRegistrar>[0],
      registry,
      "container",
    );
    register("arcane_container_list", { title: "list" }, () => ({ content: [] }));
    expect(server.registerTool).toHaveBeenCalledTimes(1);
    expect(registry.moduleOf("arcane_container_list")).toBe("container");
  });

  it("still calls server.registerTool when registry is undefined (test-compat)", () => {
    const handle = fakeHandle();
    const server = {
      registerTool: vi.fn().mockReturnValue(handle),
    };
    const register = moduleRegistrar(
      server as unknown as Parameters<typeof moduleRegistrar>[0],
      undefined,
      "container",
    );
    register("arcane_container_list", { title: "list" }, () => ({ content: [] }));
    expect(server.registerTool).toHaveBeenCalledTimes(1);
  });
});
