import { describe, it, expect, vi, beforeEach } from "vitest";
import { loadConfig, resetConfig } from "../config.js";

// Mock logger to suppress output during tests
vi.mock("../utils/logger.js", () => ({
  logger: {
    debug: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock fs to prevent reading real config file
vi.mock("fs", () => ({
  existsSync: vi.fn(() => false),
  readFileSync: vi.fn(),
}));

describe("loadConfig", () => {
  beforeEach(() => {
    resetConfig();
    vi.unstubAllEnvs();
  });

  it("applies default values when no env vars are set", () => {
    const config = loadConfig();
    expect(config.baseUrl).toBe("https://localhost:3552");
    expect(config.timeout).toBe(30000);
    expect(config.skipSslVerify).toBe(false);
    expect(config.httpPort).toBe(3000);
    expect(config.httpHost).toBe("localhost");
  });

  it("overrides baseUrl from environment variable", () => {
    vi.stubEnv("ARCANE_BASE_URL", "https://custom.example.com");
    const config = loadConfig();
    expect(config.baseUrl).toBe("https://custom.example.com");
  });

  it("overrides timeout from environment variable", () => {
    vi.stubEnv("ARCANE_TIMEOUT_MS", "60000");
    const config = loadConfig();
    expect(config.timeout).toBe(60000);
  });

  it("overrides skipSslVerify from environment variable", () => {
    vi.stubEnv("ARCANE_SKIP_SSL_VERIFY", "true");
    const config = loadConfig();
    expect(config.skipSslVerify).toBe(true);
  });

  it("loads API key from environment variable", () => {
    vi.stubEnv("ARCANE_API_KEY", "test-key-123");
    const config = loadConfig();
    expect(config.apiKey).toBe("test-key-123");
  });

  it("loads username and password from environment variables", () => {
    vi.stubEnv("ARCANE_USERNAME", "admin");
    vi.stubEnv("ARCANE_PASSWORD", "secret");
    const config = loadConfig();
    expect(config.username).toBe("admin");
    expect(config.password).toBe("secret");
  });

  it("loads HTTP port and host from environment variables", () => {
    vi.stubEnv("ARCANE_HTTP_PORT", "8080");
    vi.stubEnv("ARCANE_HTTP_HOST", "0.0.0.0");
    const config = loadConfig();
    expect(config.httpPort).toBe(8080);
    expect(config.httpHost).toBe("0.0.0.0");
  });

  it("loads default environment ID from environment variable", () => {
    vi.stubEnv("ARCANE_DEFAULT_ENVIRONMENT_ID", "env-abc");
    const config = loadConfig();
    expect(config.defaultEnvironmentId).toBe("env-abc");
  });

  it("returns cached config on subsequent calls", () => {
    const first = loadConfig();
    const second = loadConfig();
    expect(first).toBe(second);
  });

  it("ignores invalid timeout value", () => {
    vi.stubEnv("ARCANE_TIMEOUT_MS", "not-a-number");
    const config = loadConfig();
    expect(config.timeout).toBe(30000);
  });
});
