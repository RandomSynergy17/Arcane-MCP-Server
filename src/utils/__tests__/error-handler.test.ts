import { describe, it, expect } from "vitest";
import {
  ArcaneApiError,
  NetworkError,
  AuthenticationError,
  ValidationError,
  formatError,
} from "../error-handler.js";

describe("ArcaneApiError", () => {
  it("preserves status code and message", () => {
    const err = new ArcaneApiError("not found", 404);
    expect(err.httpStatus).toBe(404);
    expect(err.message).toBe("not found");
    expect(err.name).toBe("ArcaneApiError");
  });

  it("preserves optional code, details, and path", () => {
    const err = new ArcaneApiError("bad", 400, "INVALID", { field: "x" }, "/api/test");
    expect(err.code).toBe("INVALID");
    expect(err.details).toEqual({ field: "x" });
    expect(err.path).toBe("/api/test");
  });

  it("preserves cause", () => {
    const cause = new Error("root");
    const err = new ArcaneApiError("wrapped", 500, undefined, undefined, undefined, cause);
    expect(err.cause).toBe(cause);
  });
});

describe("NetworkError", () => {
  it("has correct name and message", () => {
    const err = new NetworkError("connection refused");
    expect(err.name).toBe("NetworkError");
    expect(err.message).toBe("connection refused");
  });

  it("preserves cause", () => {
    const cause = new Error("ECONNREFUSED");
    const err = new NetworkError("fail", cause);
    expect(err.cause).toBe(cause);
  });
});

describe("AuthenticationError", () => {
  it("has correct name and message", () => {
    const err = new AuthenticationError("invalid token");
    expect(err.name).toBe("AuthenticationError");
    expect(err.message).toBe("invalid token");
  });
});

describe("ValidationError", () => {
  it("has correct name, message, and field", () => {
    const err = new ValidationError("required", "email");
    expect(err.name).toBe("ValidationError");
    expect(err.message).toBe("required");
    expect(err.field).toBe("email");
  });
});

describe("formatError", () => {
  it("formats ArcaneApiError with status-specific message", () => {
    const err = new ArcaneApiError("unauthorized", 401);
    const result = formatError(err);
    expect(result).toContain("Error: unauthorized");
    expect(result).toContain("Authentication required");
  });

  it("formats ArcaneApiError with code and details", () => {
    const err = new ArcaneApiError("bad request", 400, "INVALID_INPUT", { reason: "missing" });
    const result = formatError(err);
    expect(result).toContain("Error: bad request");
    expect(result).toContain("Code: INVALID_INPUT");
    expect(result).toContain("missing");
  });

  it("formats ArcaneApiError 404", () => {
    const result = formatError(new ArcaneApiError("gone", 404));
    expect(result).toContain("not found");
  });

  it("formats ArcaneApiError 429", () => {
    const result = formatError(new ArcaneApiError("slow down", 429));
    expect(result).toContain("Rate limit");
  });

  it("formats ArcaneApiError 500", () => {
    const result = formatError(new ArcaneApiError("server error", 500));
    expect(result).toContain("server encountered an error");
  });

  it("formats NetworkError", () => {
    const result = formatError(new NetworkError("timeout"));
    expect(result).toContain("Network error");
    expect(result).toContain("timeout");
  });

  it("formats AuthenticationError", () => {
    const result = formatError(new AuthenticationError("expired"));
    expect(result).toContain("Authentication failed");
    expect(result).toContain("expired");
  });

  it("formats ValidationError with field", () => {
    const result = formatError(new ValidationError("too long", "name"));
    expect(result).toContain("Validation error");
    expect(result).toContain("field: name");
    expect(result).toContain("too long");
  });

  it("formats ValidationError without field", () => {
    const result = formatError(new ValidationError("invalid"));
    expect(result).toContain("Validation error");
    expect(result).toContain("invalid");
    expect(result).not.toContain("field:");
  });

  it("formats generic Error", () => {
    const result = formatError(new Error("something broke"));
    expect(result).toBe("Error: something broke");
  });

  it("formats string error", () => {
    const result = formatError("raw string error");
    expect(result).toBe("Unexpected error: raw string error");
  });

  it("formats unknown types", () => {
    const result = formatError(42);
    expect(result).toBe("Unexpected error: 42");
  });
});
