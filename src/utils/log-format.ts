/**
 * Shared formatting for the WebSocket-based log tools.
 */

/** Zod-independent shape shared by all log tools */
export interface LogFetchResult {
  lines: string[];
  truncated: boolean;
}

export function formatLogResult(label: string, result: LogFetchResult, timestamps: boolean): string {
  if (result.lines.length === 0) {
    return `No log output for ${label}. (Try a larger "tail" or an earlier "since".)`;
  }

  const out = [
    `Logs for ${label} (${result.lines.length} lines${result.truncated ? ", truncated at the line limit" : ""}):`,
    "",
    ...result.lines,
    "",
  ];

  if (timestamps) {
    out.push('To follow the logs, call again with "since" set to the timestamp of the newest line — only newer lines are returned.');
  } else {
    out.push('Tip: set timestamps=true to enable incremental follow-up calls via "since".');
  }

  return out.join("\n");
}
