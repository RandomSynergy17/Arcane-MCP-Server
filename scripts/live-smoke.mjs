#!/usr/bin/env node
/**
 * Live smoke test: runs every read-only tool against a real Arcane instance
 * and flags rendering bugs (undefined, [object Object], NaN, Invalid Date)
 * plus tool errors.
 *
 * Usage:
 *   npm run build
 *   ARCANE_BASE_URL=… ARCANE_API_KEY=… node scripts/live-smoke.mjs [environmentId]
 *
 * Only tools with readOnlyHint (minus explicit exclusions that trigger
 * server-side work) are invoked. Tools whose required params cannot be
 * resolved from live data are reported as SKIPPED.
 */

const { registerAllTools } = await import("../dist/tools/index.js");
const { getArcaneClient } = await import("../dist/client/arcane-client.js");

// Read-only by annotation, but they kick off server-side background work
const EXCLUDE = new Set([
  "arcane_image_update_check_all",
  "arcane_image_check_updates_all",
]);

// Patterns that indicate a rendering bug in the tool output
const BAD_PATTERNS = [/\bundefined\b/, /\[object Object\]/, /\bNaN\b/, /Invalid Date/, /Invalid time/];

const tools = new Map();
const fakeServer = {
  registerTool(name, config, handler) {
    tools.set(name, { config, handler });
    return { enabled: true, enable() {}, disable() {}, remove() {}, update() {} };
  },
  sendToolListChanged() {},
};

registerAllTools(fakeServer, { preset: "full" });

const client = getArcaneClient();
const envId = process.argv[2] || "0";

// ---- Discover real IDs to fill tool params with ----
async function tryGet(path, params) {
  try {
    return await client.get(path, params);
  } catch {
    return undefined;
  }
}

const containers = (await tryGet(`/environments/${envId}/containers`, { limit: 5 }))?.data || [];
const images = (await tryGet(`/environments/${envId}/images`, { limit: 5 }))?.data || [];
const projects = (await tryGet(`/environments/${envId}/projects`, { limit: 5 }))?.data || [];
const volumes = (await tryGet(`/environments/${envId}/volumes`, { limit: 5 }))?.data || [];
const networks = (await tryGet(`/environments/${envId}/networks`, { limit: 5 }))?.data || [];
const activities = (await tryGet(`/environments/${envId}/activities`, { limit: 5 }))?.data || [];
const events = (await tryGet(`/events`, { limit: 5 }))?.data || [];
const users = (await tryGet(`/users`, { limit: 5 }))?.data || [];
const templates = (await tryGet(`/templates`, { limit: 5 }))?.data || [];
const registries = (await tryGet(`/container-registries`, { limit: 5 }))?.data || [];
const gitRepos = (await tryGet(`/customize/git-repositories`, { limit: 5 }))?.data || [];
const gitopsSyncs = (await tryGet(`/environments/${envId}/gitops-syncs`, { limit: 5 }))?.data || [];
const webhooks = (await tryGet(`/environments/${envId}/webhooks`, { limit: 5 }))?.data || [];
const jobs = (await tryGet(`/environments/${envId}/jobs`, { limit: 5 }))?.data || [];
const swarmServices = (await tryGet(`/environments/${envId}/swarm/services`, { limit: 5 }))?.data || [];
const backups = volumes[0]
  ? (await tryGet(`/environments/${envId}/volumes/${volumes[0].name}/backups`))?.data || []
  : [];

const PARAM_VALUES = {
  environmentId: envId,
  containerId: containers[0]?.id,
  imageId: images[0]?.id,
  imageRef: images.find((i) => i.repoTags?.length)?.repoTags?.[0],
  imageRefs: images.filter((i) => i.repoTags?.length).slice(0, 2).map((i) => i.repoTags[0]),
  imageIds: images.slice(0, 2).map((i) => i.id),
  image: images.find((i) => i.repoTags?.length)?.repoTags?.[0],
  projectId: projects[0]?.id,
  volumeName: volumes[0]?.name,
  networkId: networks[0]?.id,
  activityId: activities[0]?.id,
  eventId: events[0]?.id,
  userId: users[0]?.id,
  templateId: templates[0]?.id,
  registryId: registries[0]?.id,
  repositoryId: gitRepos[0]?.id,
  syncId: gitopsSyncs[0]?.id,
  webhookId: webhooks[0]?.id,
  jobId: jobs[0]?.id,
  serviceId: swarmServices[0]?.id,
  backupId: backups[0]?.id,
  vulnerabilityId: undefined,
  ignoreId: undefined,
  buildId: undefined,
  keyId: undefined,
  path: "/",
  query: "docker",
};

function fillParams(zodShape) {
  const params = {};
  for (const [key, schema] of Object.entries(zodShape || {})) {
    const optional = schema.isOptional?.() ?? false;
    if (key in PARAM_VALUES) {
      if (PARAM_VALUES[key] === undefined && !optional) return { missing: key };
      if (PARAM_VALUES[key] !== undefined) params[key] = PARAM_VALUES[key];
    } else if (!optional) {
      return { missing: key };
    }
  }
  return { params };
}

// ---- Run ----
let pass = 0, fail = 0, skip = 0;
const failures = [];

for (const [name, { config, handler }] of tools) {
  if (!config.annotations?.readOnlyHint || EXCLUDE.has(name)) continue;

  const filled = fillParams(config.inputSchema);
  if (filled.missing) {
    skip++;
    console.log(`SKIP  ${name} (no value for required param "${filled.missing}")`);
    continue;
  }

  try {
    const result = await handler(filled.params);
    const text = (result.content || []).map((c) => c.text).join("\n");
    if (result.isError) {
      // 403 = the API key lacks the permission — not a rendering bug
      if (/HTTP 403/.test(text)) {
        skip++;
        console.log(`SKIP  ${name} (API key lacks permission)`);
        continue;
      }
      fail++;
      failures.push([name, `tool error: ${text.substring(0, 200)}`]);
      console.log(`FAIL  ${name} — ${text.substring(0, 120).replace(/\n/g, " | ")}`);
      continue;
    }
    const bad = BAD_PATTERNS.filter((p) => p.test(text));
    if (bad.length > 0) {
      fail++;
      const badLines = text.split("\n").filter((l) => bad.some((p) => p.test(l))).slice(0, 3);
      failures.push([name, badLines.join(" | ")]);
      console.log(`FAIL  ${name} — ${bad.map(String).join(",")}\n      ${badLines.join("\n      ")}`);
    } else {
      pass++;
      console.log(`ok    ${name}`);
    }
  } catch (error) {
    fail++;
    const msg = error instanceof Error ? error.message : String(error);
    failures.push([name, `threw: ${msg}`]);
    console.log(`FAIL  ${name} — threw: ${msg.substring(0, 150)}`);
  }
}

console.log(`\n${pass} ok, ${fail} failed, ${skip} skipped`);
if (failures.length) {
  console.log("\nFailures:");
  for (const [n, why] of failures) console.log(`  - ${n}: ${why}`);
  process.exit(1);
}
