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

import { ToolRegistry } from "../registry.js";
import { expandPreset, resolveEnabled, isKnownModule, MODULE_NAMES } from "../presets.js";

function fakeHandle(): RegisteredTool {
  const obj = { enabled: true, enable() { obj.enabled = true; }, disable() { obj.enabled = false; } };
  return obj as unknown as RegisteredTool;
}

function buildSampleRegistry(): ToolRegistry {
  const r = new ToolRegistry();
  // container
  for (const n of ["arcane_container_list", "arcane_container_get", "arcane_container_logs", "arcane_container_stats", "arcane_container_delete", "arcane_container_create", "arcane_container_start"]) {
    r.register("container", n, fakeHandle());
  }
  // image
  for (const n of ["arcane_image_list", "arcane_image_get", "arcane_image_prune", "arcane_image_pull"]) {
    r.register("image", n, fakeHandle());
  }
  // dashboard
  for (const n of ["arcane_dashboard_get", "arcane_dashboard_get_action_items"]) {
    r.register("dashboard", n, fakeHandle());
  }
  // project
  for (const n of ["arcane_project_list", "arcane_project_up", "arcane_project_down", "arcane_project_create"]) {
    r.register("project", n, fakeHandle());
  }
  // volume
  r.register("volume", "arcane_volume_list", fakeHandle());
  r.register("volume", "arcane_volume_prune", fakeHandle());
  // network
  r.register("network", "arcane_network_list", fakeHandle());
  // environment
  r.register("environment", "arcane_environment_list", fakeHandle());
  // system
  r.register("system", "arcane_system_get_health", fakeHandle());
  r.register("system", "arcane_system_prune", fakeHandle());
  // gitops
  r.register("gitops", "arcane_gitops_sync", fakeHandle());
  // template
  r.register("template", "arcane_template_list", fakeHandle());
  // registry
  r.register("registry", "arcane_registry_list", fakeHandle());
  // build
  r.register("build", "arcane_build_create", fakeHandle());
  // unrelated module
  r.register("webhook", "arcane_webhook_list", fakeHandle());
  return r;
}

describe("presets", () => {
  let registry: ToolRegistry;

  beforeEach(() => {
    registry = buildSampleRegistry();
  });

  it("full preset includes every registered tool", () => {
    const set = expandPreset("full", registry);
    expect(set.size).toBe(registry.allToolNames().length);
  });

  it("read-only preset includes *_list, *_get, *_inspect, *_stats, *_health, *_check", () => {
    const set = expandPreset("read-only", registry);
    expect(set.has("arcane_container_list")).toBe(true);
    expect(set.has("arcane_container_get")).toBe(true);
    expect(set.has("arcane_container_stats")).toBe(true);
    expect(set.has("arcane_image_list")).toBe(true);
    expect(set.has("arcane_dashboard_get")).toBe(true);
    expect(set.has("arcane_system_get_health")).toBe(true);
    // Destructive / non-read operations excluded
    expect(set.has("arcane_container_delete")).toBe(false);
    expect(set.has("arcane_container_create")).toBe(false);
    expect(set.has("arcane_container_start")).toBe(false);
    expect(set.has("arcane_image_prune")).toBe(false);
    expect(set.has("arcane_image_pull")).toBe(false);
    expect(set.has("arcane_volume_prune")).toBe(false);
    expect(set.has("arcane_project_up")).toBe(false);
  });

  it("commonly-used preset covers dashboard/container/image/project/volume/network/environment/system", () => {
    const set = expandPreset("commonly-used", registry);
    expect(set.has("arcane_container_list")).toBe(true);
    expect(set.has("arcane_dashboard_get")).toBe(true);
    expect(set.has("arcane_image_prune")).toBe(true);
    expect(set.has("arcane_project_up")).toBe(true);
    expect(set.has("arcane_volume_prune")).toBe(true);
    expect(set.has("arcane_network_list")).toBe(true);
    expect(set.has("arcane_environment_list")).toBe(true);
    expect(set.has("arcane_system_get_health")).toBe(true);
    // Not in the commonly-used module list
    expect(set.has("arcane_webhook_list")).toBe(false);
    expect(set.has("arcane_gitops_sync")).toBe(false);
  });

  it("minimal preset is just dashboard + the 4 allowed container tools", () => {
    const set = expandPreset("minimal", registry);
    expect(set.has("arcane_dashboard_get")).toBe(true);
    expect(set.has("arcane_container_list")).toBe(true);
    expect(set.has("arcane_container_logs")).toBe(true);
    expect(set.has("arcane_container_stats")).toBe(true);
    expect(set.has("arcane_container_get")).toBe(true);
    expect(set.has("arcane_container_delete")).toBe(false);
    expect(set.has("arcane_container_create")).toBe(false);
    expect(set.has("arcane_image_list")).toBe(false);
    expect(set.has("arcane_project_up")).toBe(false);
  });

  it("deploy preset covers project/gitops/template/registry/environment/build", () => {
    const set = expandPreset("deploy", registry);
    expect(set.has("arcane_project_up")).toBe(true);
    expect(set.has("arcane_gitops_sync")).toBe(true);
    expect(set.has("arcane_template_list")).toBe(true);
    expect(set.has("arcane_registry_list")).toBe(true);
    expect(set.has("arcane_build_create")).toBe(true);
    expect(set.has("arcane_environment_list")).toBe(true);
    // Not deploy-related
    expect(set.has("arcane_container_logs")).toBe(false);
    expect(set.has("arcane_dashboard_get")).toBe(false);
  });
});

describe("resolveEnabled", () => {
  let registry: ToolRegistry;

  beforeEach(() => {
    registry = buildSampleRegistry();
  });

  it("undefined config → full", () => {
    const set = resolveEnabled(undefined, registry);
    expect(set.size).toBe(registry.allToolNames().length);
  });

  it("preset + modules intersects correctly", () => {
    const set = resolveEnabled(
      { preset: "full", modules: ["dashboard"] },
      registry,
    );
    expect(Array.from(set).sort()).toEqual([
      "arcane_dashboard_get",
      "arcane_dashboard_get_action_items",
    ]);
  });

  it("enabled list adds tools after modules step", () => {
    const set = resolveEnabled(
      {
        preset: "full",
        modules: ["dashboard"],
        enabled: ["arcane_container_logs"],
      },
      registry,
    );
    expect(set.has("arcane_container_logs")).toBe(true);
    expect(set.has("arcane_dashboard_get")).toBe(true);
    expect(set.has("arcane_image_prune")).toBe(false);
  });

  it("disabled list subtracts last", () => {
    const set = resolveEnabled(
      { preset: "minimal", disabled: ["arcane_container_logs"] },
      registry,
    );
    expect(set.has("arcane_container_logs")).toBe(false);
    expect(set.has("arcane_container_list")).toBe(true);
  });

  it("unknown module is ignored with warning (does not crash)", () => {
    const set = resolveEnabled(
      { preset: "commonly-used", modules: ["dashboard", "not-a-real-module"] },
      registry,
    );
    expect(set.has("arcane_dashboard_get")).toBe(true);
    expect(set.has("arcane_container_list")).toBe(false);
  });

  it("unknown tool in enabled/disabled is ignored (does not crash)", () => {
    const set = resolveEnabled(
      {
        preset: "minimal",
        enabled: ["ghost_tool"],
        disabled: ["phantom_tool"],
      },
      registry,
    );
    expect(set.has("arcane_container_list")).toBe(true);
    expect(set.has("ghost_tool")).toBe(false);
  });
});

describe("isKnownModule", () => {
  it("recognises all 25 module names", () => {
    for (const m of MODULE_NAMES) {
      expect(isKnownModule(m)).toBe(true);
    }
  });

  it("rejects unknown names", () => {
    expect(isKnownModule("nope")).toBe(false);
    expect(isKnownModule("container-tools")).toBe(false);
  });
});
