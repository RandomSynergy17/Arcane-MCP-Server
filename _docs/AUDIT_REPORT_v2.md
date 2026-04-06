# Arcane MCP Server — Audit Report v2.0.0

**Version Audited:** 2.0.0
**Audit Date:** April 6, 2026
**Prior Audit:** v1.0.0 (February 4, 2026 — 100+ issues, 19 critical)
**Auditor:** Claude Opus 4.6 (automated 13-category review per AUDIT_PROMPT.md)
**Tool Count:** 180 (verified) | **Resources:** 2 | **Prompts:** 4

---

## Executive Summary

**Overall Assessment: PASS WITH ISSUES**

v2.0.0 is a major improvement over v1.0.0. Critical issues dropped from 19 to 2. The codebase has clean architecture: centralized error handling (`toolHandler`), centralized constants, centralized formatting, MCP annotations on every tool, resources, prompts, a high-quality companion skill, and plugin packaging.

| Category | Critical | High | Medium | Low |
|---|---|---|---|---|
| Security | 1 | 2 | 2 | 1 |
| Code Quality | 0 | 0 | 2 | 2 |
| Error Handling | 0 | 1 | 1 | 1 |
| TypeScript | 0 | 0 | 1 | 1 |
| MCP Protocol | 0 | 0 | 1 | 2 |
| API Design | 0 | 0 | 0 | 2 |
| Testing | 1 | 1 | 0 | 0 |
| Performance | 0 | 0 | 2 | 0 |
| Dependencies | 0 | 1 | 1 | 2 |
| Skill Quality | 0 | 0 | 0 | 0 |
| Plugin Format | 0 | 0 | 0 | 2 |
| Publishing | 0 | 0 | 0 | 1 |
| Cross-Platform | 0 | 0 | 0 | 0 |
| **TOTALS** | **2** | **5** | **10** | **14** |

---

## Must-Fix (Critical + High)

### [CRITICAL] SEC-01: MCP SDK cross-client data leak CVE (GHSA-345p-7cg4-v4c7)
- **File:** package.json (`@modelcontextprotocol/sdk ^1.12.0`, installed 1.25.3)
- **Status:** NEW
- **Description:** SDK 1.10.0–1.25.3 has a HIGH severity cross-client data leak. TCP server partially mitigates by creating new McpServer per session.
- **Fix:** `npm audit fix` or pin SDK >= 1.26.0.

### [CRITICAL] TEST-01: Zero test files exist
- **File:** (none)
- **Status:** STILL_OPEN from v1.0.0
- **Description:** Despite vitest configured with 60% thresholds, no test files exist. CI only builds and counts tools.
- **Fix:** Create tests for auth-manager, arcane-client, config, toolHandler, and 2-3 tool modules.

### [HIGH] SEC-02: SSL bypass does not work with Node.js native fetch
- **File:** `src/client/arcane-client.ts:99-108`, `src/auth/auth-manager.ts:54-58`
- **Status:** STILL_OPEN from v1.0.0
- **Description:** Code sets `fetchOptions.agent = new https.Agent(...)` but Node.js native `fetch()` (undici) ignores the `agent` property. `ARCANE_SKIP_SSL_VERIFY=true` silently does nothing.
- **Fix:** Use undici's `dispatcher` option or switch to `node-fetch`.

### [HIGH] SEC-03: Volume/build browse paths lack traversal validation
- **File:** `src/tools/volume-tools.ts:265,302,335`, `src/tools/build-tools.ts:183,221`
- **Status:** NEW
- **Description:** `path` parameters passed directly to API without `../` rejection. Defense-in-depth.
- **Fix:** Add validation helper that rejects paths containing `..`.

### [HIGH] EH-01: toolHandler does not set isError on failures
- **File:** `src/utils/tool-helpers.ts:29`
- **Status:** NEW
- **Description:** Error responses lack `isError: true`. MCP clients can't distinguish failures from success.
- **Fix:** 1-line fix: add `isError: true` to catch block return.

### [HIGH] DEP-01: SDK has HIGH severity CVE
- **File:** package.json
- **Status:** NEW
- **Description:** Same as SEC-01. Fix via `npm audit fix`.

### [HIGH] TEST-02: CI only verifies build and tool count
- **File:** `.github/workflows/ci.yml:33-37`
- **Status:** PARTIALLY_FIXED
- **Description:** No lint, no tests, no npm audit in CI.
- **Fix:** Add steps when tests exist.

---

## Medium Issues

### [MEDIUM] SEC-04: Config file credentials in plaintext
- **File:** `src/config.ts:49-87`
- **Status:** STILL_OPEN from v1.0.0

### [MEDIUM] SEC-05: Health endpoint leaks session count
- **File:** `src/tcp-server.ts:162-170`
- **Status:** NEW

### [MEDIUM] CQ-01: Magic number 1073741824 in dashboard-tools.ts
- **File:** `src/tools/dashboard-tools.ts:69`
- **Status:** PARTIALLY_FIXED — uses binary GiB while rest of codebase uses SI GB

### [MEDIUM] CQ-02: Magic number 1e6 in volume-tools.ts prune
- **File:** `src/tools/volume-tools.ts:214`
- **Status:** PARTIALLY_FIXED — should use `formatSizeMB()` utility

### [MEDIUM] EH-02: Empty response cast to `undefined as unknown as T`
- **File:** `src/client/arcane-client.ts:145,162`
- **Status:** NEW

### [MEDIUM] TS-01: Interface definitions duplicated across tool files
- **File:** All 25 tool files define local interfaces instead of importing generated types
- **Status:** NEW

### [MEDIUM] MCP-01: Two tools have no inputSchema
- **File:** `src/tools/system-tools.ts` (arcane_system_get_health, arcane_version_get)
- **Status:** NEW

### [MEDIUM] PERF-01: New McpServer created per HTTP session
- **File:** `src/tcp-server.ts:264`
- **Status:** NEW — 180 tool registrations per session, up to 100 concurrent

### [MEDIUM] PERF-02: MAX_RESPONSE_SIZE is 50MB
- **File:** `src/constants.ts:25`
- **Status:** NEW — should be 5-10MB for MCP text responses

### [MEDIUM] DEP-02: 14 total vulnerabilities in dependency tree
- **File:** package-lock.json
- **Status:** NEW — 1 low, 7 moderate, 6 high (most in devDeps)

---

## Low Issues

| ID | Issue | Status |
|---|---|---|
| SEC-06 | No rate limiting on HTTP transport | STILL_OPEN v1 |
| CQ-03 | Logger import boilerplate in all 25 tool files | NEW |
| CQ-04 | Version string duplicated in 5 places | NEW |
| EH-03 | parseApiError swallows JSON parse failures | NEW |
| TS-02 | `JSON.parse(text) as T` without runtime validation | NEW |
| MCP-02 | openWorldHint false on pull/registry/build tools | NEW |
| MCP-03 | Hardcoded protocol version in resources | NEW |
| API-01 | `tag: "latest"` default on image pull | NEW |
| API-02 | Pagination defaults hardcoded, not using constants | NEW |
| DEP-03 | Several packages outdated (major versions available) | NEW |
| DEP-04 | Express production dependency but unused in stdio mode | NEW |
| PLUG-01 | Version not auto-synced across 5 files | NEW |
| PLUG-02 | marketplace.json source is relative "." | NEW |
| PUB-01 | Badge/repo visibility operational check | NEW |

---

## What Passes (Positive Findings)

### Skill Quality: 12/12 PASS
- Frontmatter complete (name, description, compatibility)
- Description trigger-keyword-rich and under 250 chars
- 194 lines (well under 500 limit)
- 10 concrete gotchas
- 12 intent mappings to specific tools
- 7 safety guardrails for destructive ops
- 7 workflow chains documented
- All 44 tool names verified against registrations
- No time-sensitive info
- Defaults over menus
- Validation loops present
- Lifecycle diagrams included

### Plugin Format: 5/7 PASS
- plugin.json, marketplace.json, .mcp.json all valid
- Plugin name compliant (kebab-case, no reserved words)
- userConfig correct with sensitive marking
- Skill at correct path
- No extra files in .claude-plugin/

### Cross-Platform: 5/5 PASS
- CI tests Node 18, 20, 22
- No path separator issues
- Shell-compatible install scripts
- Claude Desktop config correct
- Portable plugin paths

### Code Quality Highlights
- `toolHandler()` used consistently on all 180 tools
- `formatSize()` centralized in utils
- All constants in constants.ts (2 exceptions noted)
- `arcane_{resource}_{action}` naming 100% consistent
- Zero deprecated `server.tool()` calls
- Zero dead code found
- Build: zero errors, zero warnings

---

## What Was Fixed from v1.0.0 (10 of 14)

| v1.0.0 Issue | v2.0.0 Status |
|---|---|
| Credential logging in debug mode | FIXED |
| Express CVE-2024-47764 | FIXED |
| Session management without timeout | FIXED |
| formatSize() duplication (5 instances) | FIXED |
| Try-catch boilerplate (130+ instances) | FIXED |
| Magic numbers not in constants | MOSTLY FIXED |
| Duplicated constants in client/tcp | FIXED |
| Missing server capabilities | FIXED |
| MCP error response format | FIXED |
| LICENSE file missing | FIXED |
| CONTRIBUTING.md missing | FIXED |
| CI/CD workflow missing | FIXED |
| SSL verification not implemented | **STILL BROKEN** |
| Zero test coverage | **STILL OPEN** |

---

## Recommended Next Steps (Priority Order)

1. **EH-01:** Add `isError: true` to toolHandler — 1-line fix
2. **SEC-01/DEP-01:** `npm audit fix` to update SDK past CVE
3. **SEC-02:** Fix SSL bypass with undici dispatcher
4. **SEC-03:** Add path traversal validation for browse tools
5. **TEST-01:** Write initial test suite
6. **TEST-02:** Add lint, test, audit to CI

---

## Audit Metadata

- **Auditor:** Claude Opus 4.6 (1M context)
- **Method:** Full 13-category review per AUDIT_PROMPT.md
- **Build:** Clean (zero errors, zero warnings)
- **npm Audit:** 14 vulnerabilities (1 low, 7 moderate, 6 high)
- **npm Pack:** 141 KB compressed, 1.6 MB unpacked, 164 files
- **Tool Cross-Check:** 27 prompt refs + 44 skill refs all verified against 180 registrations
- **Confidence:** High
