# Arcane MCP Server — Comprehensive Audit Prompt

> **Usage:** Drop this file into a Claude Code session to run a full audit of the Arcane MCP Server codebase. It can also be used as a checklist for manual review.

---

## Audit Scope

Perform a comprehensive audit of the Arcane MCP Server codebase. This is an MCP server with 180+ tools for Docker management via the Arcane platform, including MCP Resources, Prompts, a companion Claude Code skill, and plugin packaging.

**For each issue found, report:**
- File path and line number(s)
- Severity: CRITICAL / HIGH / MEDIUM / LOW
- Category (from the list below)
- Whether it's NEW or was present in prior audits
- Recommended fix

---

## 1. Security

- [ ] SSL/TLS: Does `ARCANE_SKIP_SSL_VERIFY` work in all HTTP paths (client + auth manager)?
- [ ] Credentials: Are passwords, tokens, API keys masked in logs and error messages?
- [ ] Path traversal: Are file path parameters (volume browse, build workspace, git repo browse) validated against `../` attacks?
- [ ] Input validation: Are all tool parameters validated via Zod schemas with `.describe()`?
- [ ] Rate limiting: Is there protection against brute-force auth attempts?
- [ ] Session management: Do HTTP sessions have timeouts, cleanup intervals, and max limits?
- [ ] Origin validation: Is the HTTP transport protected against DNS rebinding?
- [ ] Secrets in tool args: Do tools accepting passwords/tokens warn about MCP framework logging?

## 2. Code Quality

- [ ] DRY: Is `toolHandler()` wrapper used consistently (no raw try-catch in tool handlers)?
- [ ] Constants: Are all magic numbers in `src/constants.ts`? Check for hardcoded timeouts, limits, port numbers.
- [ ] Duplication: Is `formatSize()` centralized in `src/utils/format.ts`? Check for inline size conversions.
- [ ] Dead code: Are there unused default exports, commented-out code, or unreachable branches?
- [ ] Naming: Do all tools follow `arcane_{resource}_{action}` pattern consistently?
- [ ] Singletons: Are config, client, and auth manager singletons implemented consistently?
- [ ] Duplicated constants: Do `arcane-client.ts` and `tcp-server.ts` import from `constants.ts` or redeclare locally?

## 3. Error Handling

- [ ] Error cause chain: Do custom error classes preserve ES2022 `Error.cause`?
- [ ] Retry logic: Does `arcane-client.ts` retry on 429, 502, 503, 504, and network timeouts?
- [ ] Silent failures: Are there empty catch blocks or swallowed errors?
- [ ] Resource cleanup: Is `AbortController` timeout cleared on all error paths (try-finally)?
- [ ] Response size: Are responses checked against size limits before reading?
- [ ] Graceful degradation: Do tools handle optional API features being unavailable?

## 4. TypeScript

- [ ] Strict mode: Is `tsconfig.json` using strict mode with all recommended checks?
- [ ] Type safety: Are there `as T` assertions that bypass runtime validation? Check `arcane-client.ts`.
- [ ] Return types: Do all exported functions have explicit return type annotations?
- [ ] Zod schemas: Do all tool `inputSchema` fields use Zod with `.describe()` on every parameter?
- [ ] Generated types: Are `src/types/generated/arcane-api.ts` types used, or do tool files define inline interfaces?

## 5. MCP Protocol Compliance

- [ ] Tool registration: Are all tools using `server.registerTool()` (not deprecated `server.tool()`)?
- [ ] Annotations: Does every tool have `readOnlyHint`, `destructiveHint`, `idempotentHint`, `openWorldHint`?
- [ ] Annotation correctness: Are read-only tools (list, get, browse, counts) marked `readOnlyHint: true`?
- [ ] Annotation correctness: Are destructive tools (delete, prune, destroy) marked `destructiveHint: true`?
- [ ] Title field: Does every tool have a human-readable `title`?
- [ ] Resources: Are resources registered with proper URIs and metadata?
- [ ] Prompts: Do prompts reference only tool names that actually exist (cross-check)?
- [ ] Capabilities: Does the server declare capabilities explicitly?
- [ ] Protocol version: Is the declared version (2025-11-25) supported by the SDK?
- [ ] Transport: Does the HTTP transport use Streamable HTTP or legacy SSE?

## 6. API Design

- [ ] Tool naming: Is `arcane_{resource}_{action}` pattern followed everywhere?
- [ ] Parameter naming: Is `environmentId` consistent (not `envId`, `environment_id`, etc.)?
- [ ] Pagination: Do all list tools support `search`, `sort`, `order`, `start`, `limit`?
- [ ] Response format: Do all tools return formatted text via `toolHandler()` wrapper?
- [ ] CRUD completeness: Are there resources with partial CRUD (e.g., create but no delete)?
- [ ] Dangerous defaults: Are there anti-patterns like `tag: "latest"` defaults?

## 7. Testing

- [ ] Test files: Do any test files exist (`*.test.ts`)?
- [ ] Test coverage: What percentage of code is covered?
- [ ] CI/CD: Does the GitHub Actions workflow pass? What does it check?
- [ ] Vitest config: Is `vitest.config.ts` properly configured?

## 8. Performance

- [ ] Memory leaks: Is the HTTP session map bounded with cleanup?
- [ ] Connection pooling: Does the HTTP client reuse connections?
- [ ] Response limits: Is there a max response size (should be ~50MB)?
- [ ] Token refresh: Is there a race condition in concurrent token refresh?
- [ ] Log overhead: Is formatting done before or after the `shouldLog()` check?

## 9. Dependencies

- [ ] Known CVEs: Run `npm audit` and report findings.
- [ ] Outdated packages: Check `@modelcontextprotocol/sdk`, `express`, `zod`, `typescript`, `vitest` versions.
- [ ] License compliance: Are all dependencies MIT/Apache-2.0 compatible?
- [ ] SDK version: Does the installed SDK version support the 2025-11-25 spec features being used?

## 10. Documentation

- [ ] README: Does it accurately reflect 180 tools, resources, prompts, plugin format?
- [ ] CHANGELOG: Does it cover all v2.0.0 changes across all phases?
- [ ] CONTRIBUTING: Is it current and accurate?
- [ ] Installer: Does `install_arcane_skill-mcp.md` reference correct repo name, paths, commands?
- [ ] Skill: Does the skill reference only real tool names? Is the gotchas section current?
- [ ] Disclaimer: Is the "not affiliated with Arcane" notice present?

## 11. Plugin Format

- [ ] `.claude-plugin/plugin.json`: Valid JSON? Correct name, version, userConfig?
- [ ] `.claude-plugin/marketplace.json`: Valid structure? Source points to `.`?
- [ ] `.mcp.json`: References `${CLAUDE_PLUGIN_ROOT}` and `${user_config.*}` correctly?
- [ ] Skill location: Is it at `skills/arcane-mcp-server/SKILL.md` (not `skill/`)?
- [ ] No files inside `.claude-plugin/` except `plugin.json` and `marketplace.json`?

---

## Output Format

```
## [Category Name]

### [SEVERITY] ID: Issue Title
- **File:** path/to/file.ts:123
- **Status:** NEW | FIXED | STILL_OPEN | PARTIALLY_FIXED
- **Description:** What's wrong and why it matters.
- **Fix:** Recommended solution.
```

End with:

```
## Summary

| Category | Critical | High | Medium | Low | Fixed Since v1 |
|----------|----------|------|--------|-----|----------------|
| Security | ... | ... | ... | ... | ... |
| ... | | | | | |

**Overall Assessment:** [PASS / PASS WITH ISSUES / FAIL]
**Recommendation:** [Ship / Fix critical issues first / Major rework needed]
```

---

## Metadata

- **Target:** Arcane MCP Server v2.0.0
- **Repo:** github.com/RandomSynergy17/Arcane-MCP-Server
- **npm:** @randomsynergy/arcane-mcp-server
- **Prior audit:** v1.0.0 (100+ issues, 19 critical)
- **Stack:** TypeScript, Node.js 18+, @modelcontextprotocol/sdk, Express, Zod
