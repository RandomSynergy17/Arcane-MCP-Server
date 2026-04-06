/**
 * Shared constants for Arcane MCP Server
 */

// ============= Timing Constants =============

/** Token refresh buffer - refresh 1 minute before expiry */
export const TOKEN_REFRESH_BUFFER_MS = 60 * 1000;

/** Default HTTP request timeout */
export const DEFAULT_REQUEST_TIMEOUT_MS = 30000;

/** Session timeout - 30 minutes of inactivity */
export const SESSION_TIMEOUT_MS = 30 * 60 * 1000;

/** Session cleanup interval - check every minute */
export const SESSION_CLEANUP_INTERVAL_MS = 60 * 1000;

// ============= Limits =============

/** Maximum concurrent sessions */
export const MAX_SESSIONS = 100;

/** Maximum response body size (50MB) */
export const MAX_RESPONSE_SIZE = 50 * 1024 * 1024;

/** Maximum retries for transient failures */
export const MAX_RETRIES = 3;

/** Base delay for exponential backoff retry (1 second) */
export const RETRY_BASE_DELAY_MS = 1000;

// ============= Time Conversions =============

/** Seconds per hour */
export const SECONDS_PER_HOUR = 3600;

// ============= Size Formatting =============

/** Bytes per gigabyte */
export const BYTES_PER_GB = 1e9;

/** Bytes per megabyte */
export const BYTES_PER_MB = 1e6;

/** Bytes per kilobyte */
export const BYTES_PER_KB = 1e3;

// ============= Docker Display =============

/** Docker short ID length (standard 12-char truncation) */
export const DOCKER_SHORT_ID_LENGTH = 12;

/** Length of "sha256:" prefix in Docker image IDs */
export const DOCKER_DIGEST_PREFIX_LENGTH = 7;

// ============= Display Limits =============

/** Maximum labels to show in detail views */
export const MAX_DISPLAY_LABELS = 10;

/** Maximum events to show in list views */
export const MAX_DISPLAY_EVENTS = 20;

/** Maximum services to show in project previews */
export const MAX_DISPLAY_SERVICES = 5;

// ============= HTTP Status Codes =============

/** HTTP status codes that should trigger automatic retry */
export const RETRYABLE_STATUS_CODES = [429, 502, 503, 504];

// ============= MCP Protocol =============

/** Current MCP protocol version */
export const MCP_PROTOCOL_VERSION = "2025-11-25";

/** Supported MCP protocol versions */
export const SUPPORTED_MCP_VERSIONS = ["2025-11-25", "2025-03-26"] as const;

// ============= Defaults =============

/** Default pagination limit */
export const DEFAULT_PAGINATION_LIMIT = 20;

/** Default pagination start */
export const DEFAULT_PAGINATION_START = 0;

/** Default sort order */
export const DEFAULT_SORT_ORDER = "asc" as const;

