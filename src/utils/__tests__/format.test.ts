import { describe, it, expect } from "vitest";
import { formatSize, formatSizeCompact, formatSizeMB, formatSizeGB, validatePath } from "../format.js";

describe("formatSize", () => {
  it("returns 'unknown' for undefined", () => {
    expect(formatSize(undefined)).toBe("unknown");
  });

  it("returns 'unknown' for null", () => {
    expect(formatSize(null)).toBe("unknown");
  });

  it("formats zero bytes as '0 B' (allowUnknown=false)", () => {
    expect(formatSize(0)).toBe("0 B");
  });

  it("returns 'unknown' for zero when allowUnknown is true", () => {
    expect(formatSize(0, true)).toBe("unknown");
  });

  it("formats bytes < 1KB", () => {
    expect(formatSize(512)).toBe("512 B");
  });

  it("formats kilobytes", () => {
    expect(formatSize(1024)).toBe("1.02 KB");
  });

  it("formats megabytes", () => {
    expect(formatSize(1e6)).toBe("1.00 MB");
    expect(formatSize(5.5e6)).toBe("5.50 MB");
  });

  it("formats gigabytes", () => {
    expect(formatSize(1e9)).toBe("1.00 GB");
    expect(formatSize(2.5e9)).toBe("2.50 GB");
  });
});

describe("formatSizeCompact", () => {
  it("formats bytes", () => {
    expect(formatSizeCompact(500)).toBe("500B");
  });

  it("formats kilobytes", () => {
    expect(formatSizeCompact(1500)).toBe("1.5K");
  });

  it("formats megabytes", () => {
    expect(formatSizeCompact(1.5e6)).toBe("1.5M");
  });

  it("formats gigabytes", () => {
    expect(formatSizeCompact(2.5e9)).toBe("2.5G");
  });
});

describe("formatSizeMB", () => {
  it("formats bytes as MB", () => {
    expect(formatSizeMB(12340000)).toBe("12.34 MB");
  });
});

describe("formatSizeGB", () => {
  it("formats bytes as GB", () => {
    expect(formatSizeGB(1230000000)).toBe("1.23 GB");
  });
});

describe("validatePath", () => {
  it("allows normal paths", () => {
    expect(validatePath("foo/bar")).toBe("foo/bar");
    expect(validatePath("./valid")).toBe("./valid");
    expect(validatePath("data")).toBe("data");
    expect(validatePath("/absolute/path")).toBe("/absolute/path");
  });

  it("rejects paths with ..", () => {
    expect(() => validatePath("..")).toThrow("Path traversal not allowed");
    expect(() => validatePath("../etc/passwd")).toThrow("Path traversal not allowed");
    expect(() => validatePath("foo/../bar")).toThrow("Path traversal not allowed");
    expect(() => validatePath("foo/../../etc")).toThrow("Path traversal not allowed");
  });

  it("allows paths with dots that are not traversal", () => {
    expect(validatePath(".hidden")).toBe(".hidden");
    expect(validatePath("file.txt")).toBe("file.txt");
    expect(validatePath("path/to/.env")).toBe("path/to/.env");
  });
});
