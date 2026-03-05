# Code Cleanup & Optimization Guide

Catalog of cleanup and optimization opportunities across the ArcaneClaude codebase.
**Constraint**: No changes to functionality, features, tool definitions, or API connectivity.

---

## 1. Duplicated Constants

`src/constants.ts` already defines these values, but two files redeclare them locally instead of importing.

### `src/client/arcane-client.ts` (lines 12-15)

```typescript
const MAX_RETRIES = 3;                                    // constants.ts:28
const RETRY_BASE_DELAY_MS = 1000;                         // constants.ts:31
const MAX_RESPONSE_SIZE = 50 * 1024 * 1024;               // constants.ts:25
const RETRYABLE_STATUS_CODES = [429, 502, 503, 504];      // constants.ts:47
```

### `src/tcp-server.ts` (lines 18-23)

```typescript
const MCP_PROTOCOL_VERSION = "2025-11-25";                // constants.ts:52
const SESSION_TIMEOUT_MS = 30 * 60 * 1000;                // constants.ts:14
const SESSION_CLEANUP_INTERVAL_MS = 60 * 1000;            // constants.ts:17
const MAX_SESSIONS = 100;                                  // constants.ts:22
```

**Fix**: Replace local declarations with imports from `src/constants.ts`.

---

## 2. `formatSize()` Duplication

Five separate inline definitions of `formatSize()` across two files, each with slightly different behavior.

| # | File | Line | Handles undefined? | Units | Precision | Suffix style |
|---|------|------|--------------------|-------|-----------|-------------|
| 1 | `src/tools/image-tools.ts` | 47-51 | No | GB/MB/KB | `.toFixed(2)` | `" GB"` |
| 2 | `src/tools/image-tools.ts` | 87 | No | MB only | `.toFixed(2)` | `" MB"` |
| 3 | `src/tools/volume-tools.ts` | 69-74 | Yes (`"unknown"`) | GB/MB/KB | `.toFixed(2)` | `" GB"` |
| 4 | `src/tools/volume-tools.ts` | 277-282 | No | GB/MB/KB/B | `.toFixed(1)` | `"G"` (compact) |
| 5 | `src/tools/volume-tools.ts` | 366 | No | MB only | `.toFixed(2)` | `" MB"` |

Additional inline size conversions (not using a function):
- `src/tools/image-tools.ts:175` &mdash; `(response.spaceReclaimed / 1e6).toFixed(2)`
- `src/tools/image-tools.ts:207` &mdash; `(response.size / 1e9).toFixed(2)`
- `src/tools/volume-tools.ts:121` &mdash; `(vol.usageData.size / 1e6).toFixed(2)`
- `src/tools/volume-tools.ts:403` &mdash; `(response.data.size / 1e6).toFixed(2)`
- `src/tools/system-tools.ts:69` &mdash; `(info.memTotal / 1e9).toFixed(2)`
- `src/tools/system-tools.ts:112` &mdash; `(response.spaceReclaimed / 1e6).toFixed(2)`
- `src/tools/environment-tools.ts:273` &mdash; `(info.memTotal / 1024 / 1024 / 1024).toFixed(2)`

**Fix**: Create a shared utility in `src/utils/format.ts` with two variants:
- `formatSize(bytes, opts?)` &mdash; standard format (`1.23 GB`)
- `formatSizeCompact(bytes)` &mdash; compact format (`1.2G`)

Both should handle optional/undefined input and use constants from `src/constants.ts` (`BYTES_PER_GB`, `BYTES_PER_MB`, `BYTES_PER_KB`).

**Note**: `environment-tools.ts:273` uses binary units (`/1024/1024/1024`) while all others use decimal (`/1e9`). Standardize on one convention.

---

## 3. Try-Catch Boilerplate

Every tool handler across all 16 tool files follows this identical pattern:

```typescript
async (params) => {
  try {
    const client = getArcaneClient();
    // ... tool logic ...
    return { content: [{ type: "text", text: resultText }] };
  } catch (error) {
    return { content: [{ type: "text", text: formatError(error) }] };
  }
}
```

This is repeated **130+ times** across:

| File | Tool count |
|------|-----------|
| `src/tools/container-tools.ts` | 9 |
| `src/tools/image-tools.ts` | 9 |
| `src/tools/volume-tools.ts` | 14 |
| `src/tools/project-tools.ts` | 11 |
| `src/tools/gitops-tools.ts` | 13 |
| `src/tools/environment-tools.ts` | 10 |
| `src/tools/network-tools.ts` | 6 |
| `src/tools/registry-tools.ts` | 7 |
| `src/tools/template-tools.ts` | 8 |
| `src/tools/system-tools.ts` | 9 |
| `src/tools/auth-tools.ts` | 8 |
| `src/tools/settings-tools.ts` | 8 |
| `src/tools/job-tools.ts` | 4 |
| `src/tools/notification-tools.ts` | 6 |
| `src/tools/event-tools.ts` | 4 |
| `src/tools/user-tools.ts` | 5 |

**Fix**: Create a `toolHandler` wrapper in `src/utils/tool-helpers.ts`:

```typescript
function toolHandler(fn: (client: ArcaneClient) => Promise<string>) {
  return async () => {
    try {
      const client = getArcaneClient();
      const text = await fn(client);
      return { content: [{ type: "text" as const, text }] };
    } catch (error) {
      return { content: [{ type: "text" as const, text: formatError(error) }] };
    }
  };
}
```

This eliminates the try-catch from every handler and standardizes the response shape.

---

## 4. Magic Numbers

### Time conversions

| File | Line | Value | Meaning |
|------|------|-------|---------|
| `src/tools/system-tools.ts` | 28 | `3600` | Seconds per hour |
| `src/auth/auth-manager.ts` | 68 | `60 * 1000` | Token refresh buffer (1 min) |

`auth-manager.ts:68` should use `TOKEN_REFRESH_BUFFER_MS` from `constants.ts:8`.

**Add to `constants.ts`**: `SECONDS_PER_HOUR = 3600`

### String truncation lengths

| File | Line | Value | Purpose |
|------|------|-------|---------|
| `src/tools/container-tools.ts` | 54 | `12` | Docker short ID |
| `src/tools/image-tools.ts` | 57 | `7, 19` | Strip `sha256:` prefix + short ID |
| `src/tools/image-tools.ts` | 244 | `19` | Digest short form |

**Add to `constants.ts`**: `DOCKER_SHORT_ID_LENGTH = 12`, `DOCKER_DIGEST_PREFIX_LENGTH = 7`

### Display limits

| File | Line | Value | Purpose |
|------|------|-------|---------|
| `src/tools/container-tools.ts` | 109 | `10` | Max labels shown |
| `src/tools/event-tools.ts` | various | `20` | Max events shown |
| `src/tools/project-tools.ts` | various | `5` | Max services shown |

**Add to `constants.ts`**: `MAX_DISPLAY_LABELS`, `MAX_DISPLAY_EVENTS`, `MAX_DISPLAY_SERVICES`

---

## 5. Logger Inconsistency

### `console.error()` in error-handler.ts

`src/utils/error-handler.ts:125`:
```typescript
console.error(`[DEBUG] Failed to parse error response as JSON: ${...}`);
```

This bypasses the logger system entirely. Should use `logger.debug()` for consistency.

### `console.log()` in tcp-server.ts

`src/tcp-server.ts:313-314` uses `console.log()` for startup messages. This is acceptable in HTTP mode (not stdio), but the pattern differs from all other modules. Consider using `logger.info()` with a conditional stdout override for HTTP mode, or leave as-is with a comment explaining why.

---

## 6. Unsafe Type Assertions

### `return {} as T` in arcane-client.ts

Two locations silently return empty objects that bypass TypeScript type checking:

- **Line 145**: When response has no JSON content-type
- **Line 162**: When response body is empty string

```typescript
return {} as T;  // Caller expects T but gets {}
```

**Fix**: Define a proper empty response type or have callers handle `undefined`:
```typescript
async request<T>(path: string, options?: RequestOptions): Promise<T | undefined>
```

Alternatively, narrow the return types for methods that may return empty responses.

---

## 7. Tool Count Boilerplate

Every tool registration function manually tracks count with `count++` after each `server.tool()` call:

```typescript
export function registerContainerTools(server: McpServer): number {
  let count = 0;
  server.tool(...);
  count++;      // repeated 9 times
  server.tool(...);
  count++;
  // ...
  return count;
}
```

Then `src/tools/index.ts` sums these up:

```typescript
totalTools += registerContainerTools(server);
totalTools += registerImageTools(server);
// ... 14 more
```

**Fix options**:
- **Option A**: Wrap `server.tool()` in a counting proxy and return the delta
- **Option B**: Remove the counting entirely; use `server` introspection to get the total after registration if available
- **Option C**: Define tools as arrays of descriptors, register in a loop, and `return toolDefs.length`

---

## 8. Redundant Default Exports

Multiple files export both named exports and a default export object that just re-exports the same things:

```typescript
// Named exports (used everywhere)
export function getArcaneClient() { ... }
export function resetArcaneClient() { ... }

// Default export (never imported anywhere)
export default { ArcaneClient, getArcaneClient, resetArcaneClient };
```

Found in:
- `src/client/arcane-client.ts:289`
- `src/auth/auth-manager.ts:218`
- `src/config.ts:204`
- `src/utils/error-handler.ts:152-160`
- `src/utils/logger.ts:103`
- `src/tools/index.ts:86`
- `src/tools/container-tools.ts:306`
- `src/tools/image-tools.ts:324`
- `src/tools/volume-tools.ts:495`
- `src/tools/environment-tools.ts:322`
- `src/tools/system-tools.ts:303`
- All other tool files follow the same pattern

**Fix**: Remove the `export default { ... }` blocks if they are not used by any consumers. Verify with a codebase search for default imports first.

---

## 9. Auth Manager SSL Gap

`src/auth/auth-manager.ts` makes direct `fetch()` calls for login (line 103) and token refresh (line 156) **without** applying `skipSslVerify` from config. The `ArcaneClient` at `src/client/arcane-client.ts:106-108` does handle this correctly via an `https.Agent`.

The auth manager bypasses the client entirely because it needs to authenticate before the client is usable.

**Fix**: Extract the SSL-aware fetch logic into a shared utility, or pass the `https.Agent` into auth manager's fetch calls when `skipSslVerify` is true.

---

## 10. Minor Optimizations

### Config defaults could reference constants

`src/config.ts:142-148` hardcodes defaults:
```typescript
const defaults: ArcaneConfig = {
  baseUrl: "https://localhost:3552",
  timeout: 30000,           // Same as DEFAULT_REQUEST_TIMEOUT_MS
  httpPort: 3000,
  httpHost: "localhost",
};
```

`timeout: 30000` should reference `DEFAULT_REQUEST_TIMEOUT_MS` from `constants.ts:11`.

### Pagination defaults hardcoded in Zod schemas

Every tool file that uses pagination hardcodes `.default(0)` and `.default(20)`:
```typescript
start: z.number().optional().default(0).describe("Pagination start index"),
limit: z.number().optional().default(20).describe("Items per page"),
```

`constants.ts` already defines `DEFAULT_PAGINATION_LIMIT = 20` and `DEFAULT_PAGINATION_START = 0` (lines 60-63) but they are never imported.

Files affected: `container-tools.ts`, `image-tools.ts`, `volume-tools.ts`, `environment-tools.ts`, `project-tools.ts`, `gitops-tools.ts`

### Supported MCP versions hardcoded in tcp-server.ts

`src/tcp-server.ts:128`:
```typescript
const supportedVersions = ["2025-11-25", "2025-03-26"];
```

`constants.ts:55` already exports `SUPPORTED_MCP_VERSIONS` with the same values.

---

## Summary by Priority

| Priority | Issue | Effort | Impact |
|----------|-------|--------|--------|
| HIGH | Duplicated constants (arcane-client, tcp-server) | Low | Prevents drift between files |
| HIGH | `formatSize()` duplication (5 instances + 7 inline) | Low | Single source of truth for formatting |
| HIGH | Auth manager missing SSL bypass | Medium | Functional correctness for self-signed certs |
| MEDIUM | Try-catch boilerplate (130+ instances) | Medium | ~200 fewer lines, consistent error handling |
| MEDIUM | Magic numbers (time, truncation, display limits) | Low | Readability, single place to change values |
| MEDIUM | Logger inconsistency (`console.error` in error-handler) | Trivial | Consistent log routing |
| LOW | Unsafe `{} as T` type assertions | Medium | Type safety |
| LOW | Tool count boilerplate | Low | Cleaner registration code |
| LOW | Redundant default exports | Trivial | Less dead code |
| LOW | Pagination/config defaults not using constants | Trivial | Consistency |
