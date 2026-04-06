# Arcane MCP Server — Comprehensive Audit Prompt

> **Usage:** Drop this file into a Claude Code session to run a full audit of the Arcane MCP Server codebase. It can also be used as a checklist for manual review.

---

## Audit Scope

Perform a comprehensive audit of the Arcane MCP Server codebase. This is an MCP server with 180+ tools for Docker management via the Arcane platform, including MCP Resources, Prompts, a companion Claude Code skill, and plugin packaging.

**Reference Standards:**
- [MCP Specification 2025-11-25](https://modelcontextprotocol.io/specification/2025-11-25)
- [The Complete Guide to Building Skills for Claude](https://resources.anthropic.com/hubfs/The-Complete-Guide-to-Building-Skill-for-Claude.pdf)
- [Agent Skills Open Standard](https://agentskills.io)
- [Claude Code Plugin Docs](https://code.claude.com/docs/en/plugins)
- [Claude Code Plugin Reference](https://code.claude.com/docs/en/plugins-reference)
- [Claude Code Marketplace Docs](https://code.claude.com/docs/en/plugin-marketplaces)

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
- [ ] npm audit: Run `npm audit` and report all findings with severity.

## 2. Code Quality

- [ ] DRY: Is `toolHandler()` wrapper used consistently (no raw try-catch in tool handlers)?
- [ ] Constants: Are all magic numbers in `src/constants.ts`? Check for hardcoded timeouts, limits, port numbers.
- [ ] Duplication: Is `formatSize()` centralized in `src/utils/format.ts`? Check for inline size conversions.
- [ ] Dead code: Are there unused default exports, commented-out code, or unreachable branches?
- [ ] Naming: Do all tools follow `arcane_{resource}_{action}` pattern consistently?
- [ ] Singletons: Are config, client, and auth manager singletons implemented consistently?
- [ ] Duplicated constants: Do `arcane-client.ts` and `tcp-server.ts` import from `constants.ts` or redeclare locally?
- [ ] Version consistency: Is the version string in a single source of truth or duplicated?

## 3. Error Handling

- [ ] Error cause chain: Do custom error classes preserve ES2022 `Error.cause`?
- [ ] Retry logic: Does `arcane-client.ts` retry on 429, 502, 503, 504, and network timeouts?
- [ ] Silent failures: Are there empty catch blocks or swallowed errors?
- [ ] Resource cleanup: Is `AbortController` timeout cleared on all error paths (try-finally)?
- [ ] Response size: Are responses checked against size limits before reading?
- [ ] Graceful degradation: Do tools handle optional API features being unavailable?
- [ ] isError flag: Does `toolHandler` set `isError: true` on failures per MCP spec?

## 4. TypeScript

- [ ] Strict mode: Is `tsconfig.json` using strict mode with all recommended checks?
- [ ] Type safety: Are there `as T` assertions that bypass runtime validation? Check `arcane-client.ts`.
- [ ] Return types: Do all exported functions have explicit return type annotations?
- [ ] Zod schemas: Do all tool `inputSchema` fields use Zod with `.describe()` on every parameter?
- [ ] Generated types: Are `src/types/generated/arcane-api.ts` types used, or do tool files define inline interfaces?

## 5. MCP Protocol Compliance

Reference: [MCP Specification 2025-11-25](https://modelcontextprotocol.io/specification/2025-11-25)

- [ ] Tool registration: Are all tools using `server.registerTool()` (not deprecated `server.tool()`)?
- [ ] Annotations: Does every tool have `readOnlyHint`, `destructiveHint`, `idempotentHint`, `openWorldHint`?
- [ ] Annotation correctness: Are read-only tools (list, get, browse, counts) marked `readOnlyHint: true`?
- [ ] Annotation correctness: Are destructive tools (delete, prune, destroy) marked `destructiveHint: true`?
- [ ] openWorldHint: Are tools that reach external registries (pull, push) marked `openWorldHint: true`?
- [ ] Title field: Does every tool have a human-readable `title`?
- [ ] Resources: Are resources registered with proper URIs and metadata?
- [ ] Prompts: Do prompts reference only tool names that actually exist (cross-check all names)?
- [ ] Capabilities: Does the server declare capabilities explicitly?
- [ ] Protocol version: Is the declared version (2025-11-25) supported by the installed SDK?
- [ ] Transport: Does the HTTP transport use Streamable HTTP or legacy SSE?
- [ ] isError: Do tool failure responses include `isError: true`?
- [ ] Session IDs: Are HTTP session IDs cryptographically secure?
- [ ] outputSchema: Are structured output schemas considered for list/get tools?

## 6. API Design

- [ ] Tool naming: Is `arcane_{resource}_{action}` pattern followed everywhere?
- [ ] Parameter naming: Is `environmentId` consistent (not `envId`, `environment_id`, etc.)?
- [ ] Pagination: Do all list tools support `search`, `sort`, `order`, `start`, `limit`?
- [ ] Response format: Do all tools return formatted text via `toolHandler()` wrapper?
- [ ] CRUD completeness: Are there resources with partial CRUD (e.g., create but no delete)?
- [ ] Dangerous defaults: Are there anti-patterns like `tag: "latest"` defaults?
- [ ] Description quality: Do tool descriptions explain what's returned, not just what the tool does?

## 7. Testing

- [ ] Test files: Do any test files exist (`*.test.ts`)?
- [ ] Test coverage: What percentage of code is covered?
- [ ] CI/CD: Does the GitHub Actions workflow pass? What does it check (build, lint, test, audit)?
- [ ] Vitest config: Is `vitest.config.ts` properly configured with thresholds?
- [ ] Integration tests: Are there tests that verify tools against a mock/real Arcane instance?
- [ ] Prompt validation: Are prompts tested to verify referenced tool names exist?
- [ ] Plugin validation: Has `claude plugin validate .` been run?

## 8. Performance

- [ ] Memory leaks: Is the HTTP session map bounded with cleanup?
- [ ] Connection pooling: Does the HTTP client reuse connections?
- [ ] Response limits: Is the max response size reasonable (not 50MB for text)?
- [ ] Token refresh: Is there a race condition in concurrent token refresh?
- [ ] Log overhead: Is formatting done before or after the `shouldLog()` check?
- [ ] Per-session overhead: How much memory does each HTTP session consume (180 tool registrations)?

## 9. Dependencies

- [ ] Known CVEs: Run `npm audit` and report all findings.
- [ ] Outdated packages: Check `@modelcontextprotocol/sdk`, `express`, `zod`, `typescript`, `vitest` versions against latest.
- [ ] License compliance: Are all dependencies MIT/Apache-2.0 compatible?
- [ ] SDK version: Does the installed SDK support 2025-11-25 spec features (registerTool, annotations, title)?
- [ ] Production vs dev: Are dev-only packages correctly in devDependencies?
- [ ] Bundle size: How large is the npm package tarball?

## 10. Skill Quality

Reference: [The Complete Guide to Building Skills for Claude](https://resources.anthropic.com/hubfs/The-Complete-Guide-to-Building-Skill-for-Claude.pdf)

- [ ] Frontmatter: Does SKILL.md have `name`, `description`, and `compatibility` fields?
- [ ] Description: Is the description under 250 chars, trigger-keyword-rich, and imperative ("Use when...")?
- [ ] Progressive disclosure: Is SKILL.md under 500 lines? Are details in reference files?
- [ ] Gotchas section: Does the skill include concrete, project-specific gotchas?
- [ ] Intent mapping: Does the skill map natural language to specific tool sequences?
- [ ] Safety guardrails: Does the skill mandate confirmation before destructive operations?
- [ ] Workflow chains: Are multi-step workflows (deploy, troubleshoot, cleanup) documented?
- [ ] Tool name accuracy: Do ALL tool names in the skill match actual registered tools?
- [ ] No time-sensitive info: Does the skill avoid dates, versions, or ephemeral facts?
- [ ] Defaults over menus: Does the skill recommend one approach, not present equal options?
- [ ] Validation loops: Does the skill include verify-after-execute patterns?

## 11. Plugin Format

Reference: [Claude Code Plugin Docs](https://code.claude.com/docs/en/plugins)

- [ ] `.claude-plugin/plugin.json`: Valid JSON? Required fields (name, description, version)?
- [ ] Plugin name: kebab-case, max 64 chars, no "anthropic" or "claude"?
- [ ] userConfig: Correct fields with `sensitive: true` for secrets?
- [ ] `.claude-plugin/marketplace.json`: Valid structure? Owner info present?
- [ ] `.mcp.json`: References `${CLAUDE_PLUGIN_ROOT}` and `${user_config.*}` correctly?
- [ ] Skill location: At `skills/{name}/SKILL.md` (not `commands/` or `.claude-plugin/`)?
- [ ] No extra files inside `.claude-plugin/` except plugin.json and marketplace.json?
- [ ] Version alignment: Are versions consistent across plugin.json, package.json, marketplace.json?

## 12. Publishing & Distribution

- [ ] npm: Is the package published to npm? Is the version current?
- [ ] npm metadata: Are `name`, `description`, `keywords`, `repository`, `homepage` set correctly?
- [ ] npm files: Does the `files` field in package.json include only dist/ and docs?
- [ ] GitHub release: Does a release exist for the current version with release notes?
- [ ] GitHub release badge: Does the shields.io badge resolve correctly?
- [ ] Repo visibility: Is the repo public (required for badges, marketplace, and npm links)?
- [ ] Marketplace submission: Has the plugin been submitted to the official Anthropic directory?
- [ ] Self-hosted marketplace: Can users add via `/plugin marketplace add owner/repo`?
- [ ] Installer: Does `install_arcane_skill-mcp.md` work when fetched via raw GitHub URL?
- [ ] README install section: Are all install methods documented (npm, plugin, manual, Claude Desktop)?
- [ ] Disclaimer: Is the "not affiliated" notice present in README and installer?
- [ ] License: Does the LICENSE file exist and match the declared license?

## 13. Cross-Platform Compatibility

- [ ] Node.js versions: Does CI test on Node 18, 20, and 22?
- [ ] OS compatibility: Are there Windows/Linux path separator issues?
- [ ] Shell compatibility: Do install scripts work in bash and zsh?
- [ ] Claude Code compatibility: Does `--plugin-dir .` work for local testing?
- [ ] Claude Desktop compatibility: Does the JSON config example work?

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

## Lessons Learned (from v1.0.0 → v2.0.1 audit cycle)

These patterns were discovered during three rounds of auditing this project. Include them in every audit pass.

### Common MCP Server Pitfalls
- **`server.tool()` is deprecated** — always verify tools use `server.registerTool()` with the config object pattern
- **Missing `isError: true`** — tool failure responses MUST include `isError: true` per MCP spec, otherwise clients can't distinguish failures from success
- **Annotations default to worst-case** — without `readOnlyHint`, every tool is treated as potentially destructive. Read-only tools (list, get, browse) need explicit `readOnlyHint: true`
- **`openWorldHint`** — tools that reach Docker registries, Git servers, or external URLs should be `openWorldHint: true`
- **Prompts referencing nonexistent tools** — always cross-check every tool name in prompts/skill against actual `registerTool()` calls
- **SSL bypass with native fetch** — Node.js native `fetch()` ignores `https.Agent`. Use `NODE_TLS_REJECT_UNAUTHORIZED` or undici's `dispatcher` option

### Common Code Quality Patterns
- **Inline interfaces drift** — tool files that define their own response interfaces will drift from the actual API. Use shared types
- **Magic numbers** — size conversions (1e6, 1e9, 1073741824) should use utility functions, not inline math. Watch for SI vs binary unit inconsistency
- **`toolHandler()` wrapper** — eliminates try-catch boilerplate and centralizes error formatting. Any raw try-catch in a tool handler is a red flag
- **Version string duplication** — read version from package.json at runtime instead of hardcoding in multiple files
- **Per-session overhead** — MCP servers with 100+ tools should share tool registrations across HTTP sessions, not re-register per connection

### Testing Gaps to Check
- **Tests exist but never run** — vitest config with thresholds means nothing if no test files exist and CI doesn't run tests
- **Tool handler tests need isError assertion** — if toolHandler was updated, the error test must verify `isError: true`
- **Integration tests need mocked client** — mock `getArcaneClient()` to return a fake with `get`/`post`/`delete` stubs
- **Prompt tests should verify tool names** — grep for `arcane_` in prompt content and cross-check against registered tools

### Security Items Easy to Miss
- **`.env` committed to git** — always check `git ls-files` for secrets, not just `.gitignore`
- **Config file permissions** — `~/.arcane/config.json` with API keys should be 600, not world-readable
- **Health endpoint metadata** — session counts, server internals should not be exposed without auth
- **Path traversal on browse endpoints** — any tool accepting a `path` parameter for file operations needs `..` validation
- **Rate limiting** — HTTP transport without rate limiting enables denial-of-service

### Audit Process Improvements
- **Run the audit in phases** — fix critical/high first, re-audit, then medium, then low. Don't try to fix everything in one pass
- **Use parallel agents in worktrees** — independent fixes (different files) can run simultaneously without merge conflicts
- **Cross-check tool counts** — `grep -c "registerTool(" src/tools/*.ts` should match documented counts
- **Verify CI actually runs** — a green CI that only builds and doesn't test gives false confidence
- **Check npm publish** — the published package may be stale if `npm publish` wasn't run after fixes

---

## Metadata

- **Target:** Arcane MCP Server v2.0.1+
- **Repo:** github.com/RandomSynergy17/Arcane-MCP-Server
- **npm:** @randomsynergy/arcane-mcp-server
- **Prior audits:** v1.0.0 (100+ issues, 19 critical), v2.0.0 (31 issues, 2 critical), v2.0.1 (8 low remaining)
- **Stack:** TypeScript, Node.js 18+, @modelcontextprotocol/sdk, Express, Zod
- **References:**
  - [MCP Specification 2025-11-25](https://modelcontextprotocol.io/specification/2025-11-25)
  - [Building Skills for Claude (PDF)](https://resources.anthropic.com/hubfs/The-Complete-Guide-to-Building-Skill-for-Claude.pdf)
  - [Agent Skills Standard](https://agentskills.io)
  - [Claude Code Plugins](https://code.claude.com/docs/en/plugins)
  - [Plugin Reference](https://code.claude.com/docs/en/plugins-reference)
  - [Plugin Marketplaces](https://code.claude.com/docs/en/plugin-marketplaces)
