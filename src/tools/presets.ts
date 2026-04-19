/**
 * Presets + resolution for the tool filtering feature.
 * See `_docs/plans/2026-04-14-tool-filtering-design.md`.
 */

import { logger } from "../utils/logger.js";
import type { ToolsConfig, PresetName } from "../config.js";
import type { ToolRegistry } from "./registry.js";

/**
 * Module names as exposed to users in config.
 * Kept short (drop the "-tools" suffix used in filenames).
 */
export const MODULE_NAMES = [
  "auth",
  "build",
  "container",
  "dashboard",
  "environment",
  "event",
  "gitops",
  "image",
  "image-update",
  "job",
  "network",
  "network-topology",
  "notification",
  "port",
  "project",
  "registry",
  "settings",
  "swarm",
  "system",
  "template",
  "updater",
  "user",
  "volume",
  "vulnerability",
  "webhook",
] as const;

export type ModuleName = (typeof MODULE_NAMES)[number];

const MODULE_SET = new Set<string>(MODULE_NAMES);

export function isKnownModule(name: string): name is ModuleName {
  return MODULE_SET.has(name);
}

/**
 * Module-based preset definitions.
 * `read-only` is pattern-based (any tool whose name ends in list/get/inspect/
 * stats/counts/check/search), so it resolves dynamically against the registry.
 */
const MODULE_PRESETS: Record<Exclude<PresetName, "read-only" | "full" | "custom">, ModuleName[]> = {
  "commonly-used": [
    "container",
    "image",
    "project",
    "volume",
    "network",
  ],
  minimal: ["dashboard", "container"],
  deploy: [
    "project",
    "gitops",
    "template",
    "registry",
    "environment",
    "build",
  ],
};

/**
 * Tools kept for the `minimal` preset after filtering the module allowlist.
 * Anything in the "container" module not listed here is dropped.
 * Names must match real registrations — silently mismatched names never toggle.
 */
const MINIMAL_CONTAINER_ALLOWLIST = new Set<string>([
  "arcane_container_list",
  "arcane_container_get",
  "arcane_container_get_counts",
]);

const READ_ONLY_SUFFIXES = [
  "_list",
  "_get",
  "_inspect",
  "_stats",
  "_counts",
  "_check",
  "_search",
  "_status",
  "_summary",
];

function isReadOnlyName(name: string): boolean {
  return READ_ONLY_SUFFIXES.some((suffix) => name.endsWith(suffix)) ||
    name.includes("_list_") ||
    name.includes("_get_");
}

/**
 * Expand a preset into the starting enabled-set for resolution.
 * Does not apply `modules`/`enabled`/`disabled` overrides — those are
 * layered on top by `resolveEnabled`.
 */
export function expandPreset(preset: PresetName, registry: ToolRegistry): Set<string> {
  const all = registry.all();

  if (preset === "full") {
    return new Set(all.map((e) => e.name));
  }

  if (preset === "read-only") {
    return new Set(all.filter((e) => isReadOnlyName(e.name)).map((e) => e.name));
  }

  if (preset === "custom") {
    // Custom is implicit: the user has only overrides. Start from "full" and
    // let modules/enabled/disabled shape the result. Callers that explicitly
    // set preset: "custom" with no other overrides essentially get "full".
    return new Set(all.map((e) => e.name));
  }

  if (preset === "minimal") {
    const selected = new Set<string>();
    for (const e of all) {
      if (e.module === "dashboard") {
        selected.add(e.name);
      } else if (e.module === "container" && MINIMAL_CONTAINER_ALLOWLIST.has(e.name)) {
        selected.add(e.name);
      }
    }
    return selected;
  }

  const modules = MODULE_PRESETS[preset];
  const moduleSet = new Set<string>(modules);
  return new Set(all.filter((e) => moduleSet.has(e.module)).map((e) => e.name));
}

/**
 * Resolve the final enabled-set from config.
 *
 * Order:
 * 1. Start from preset expansion (fallback: "full" when no preset is set).
 * 2. Intersect with `modules` allowlist if provided.
 * 3. Add `enabled` overrides.
 * 4. Subtract `disabled` overrides.
 */
export function resolveEnabled(
  config: ToolsConfig | undefined,
  registry: ToolRegistry,
): Set<string> {
  const all = registry.all();
  const allNames = new Set(all.map((e) => e.name));

  // Step 1: preset
  const preset: PresetName = config?.preset ?? "full";
  let set = expandPreset(preset, registry);

  // Step 2: modules intersection
  if (config?.modules && config.modules.length > 0) {
    const modSet = new Set(config.modules.filter((m) => {
      if (!isKnownModule(m)) {
        logger.warn(`Unknown module in tools.modules: "${m}" — ignoring`);
        return false;
      }
      return true;
    }));
    set = new Set(
      Array.from(set).filter((name) => {
        const mod = registry.moduleOf(name);
        return mod !== undefined && modSet.has(mod);
      }),
    );
  }

  // Step 3: enabled additions
  if (config?.enabled && config.enabled.length > 0) {
    for (const n of config.enabled) {
      if (!allNames.has(n)) {
        logger.warn(`Unknown tool in tools.enabled: "${n}" — ignoring`);
        continue;
      }
      set.add(n);
    }
  }

  // Step 4: disabled subtractions
  if (config?.disabled && config.disabled.length > 0) {
    for (const n of config.disabled) {
      if (!allNames.has(n)) {
        logger.warn(`Unknown tool in tools.disabled: "${n}" — ignoring`);
        continue;
      }
      set.delete(n);
    }
  }

  return set;
}

/**
 * Map of preset → short description. For UIs (slash command, installer).
 */
export const PRESET_DESCRIPTIONS: Record<PresetName, string> = {
  "commonly-used": "Common Docker management — containers, images, projects, volumes, networks (~52 tools).",
  "read-only": "Status & observability only — list/get/inspect across all modules (~60 tools).",
  "minimal": "Smallest viable footprint — dashboard + container list/get/counts (5 tools).",
  "deploy": "CI / deploy assistants — projects, gitops, templates, registries, build (~40 tools).",
  "full": "All 180 tools enabled (default for upgrades).",
  "custom": "Manual module + tool overrides only.",
};

export const PRESET_NAMES: PresetName[] = [
  "commonly-used",
  "read-only",
  "minimal",
  "deploy",
  "full",
  "custom",
];
