import { describe, it, expect, vi, beforeEach } from "vitest";

const mockClient = {
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  patch: vi.fn(),
  delete: vi.fn(),
  getBaseUrl: vi.fn(() => "https://arcane.test"),
  getDefaultEnvironmentId: vi.fn(() => "env-1"),
};

vi.mock("../../client/arcane-client.js", () => ({
  getArcaneClient: vi.fn(() => mockClient),
}));

vi.mock("../../utils/error-handler.js", () => ({
  formatError: vi.fn((err: unknown) =>
    err instanceof Error ? err.message : String(err)
  ),
}));

vi.mock("../../utils/logger.js", () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

import { registerResources } from "../index.js";

type ResourceHandler = (uri: URL) => Promise<{
  contents: Array<{ uri: string; mimeType: string; text: string }>;
}>;

function createMockServer() {
  const resources = new Map<string, ResourceHandler>();
  return {
    resource: vi.fn(
      (
        name: string,
        _uri: string,
        _meta: unknown,
        handler: ResourceHandler
      ) => {
        resources.set(name, handler);
      }
    ),
    resources,
  };
}

describe("resources", () => {
  let server: ReturnType<typeof createMockServer>;

  beforeEach(() => {
    vi.clearAllMocks();
    server = createMockServer();
    registerResources(server as unknown as Parameters<typeof registerResources>[0]);
  });

  it("registers both resources", () => {
    expect(server.resources.has("arcane-environments")).toBe(true);
    expect(server.resources.has("arcane-version")).toBe(true);
    expect(server.resources.size).toBe(2);
  });

  describe("arcane-environments", () => {
    it("returns formatted environment list", async () => {
      mockClient.get.mockResolvedValueOnce({
        data: [
          { id: "env-1", name: "Production", apiUrl: "https://prod.arcane.test", status: "active" },
          { id: "env-2", name: "Staging", status: "active" },
        ],
        pagination: { total: 2, start: 0, limit: 100 },
      });

      const handler = server.resources.get("arcane-environments")!;
      const result = await handler(new URL("arcane://environments"));

      expect(result.contents).toHaveLength(1);
      const text = result.contents[0].text;
      expect(text).toContain("Arcane Environments (2 total)");
      expect(text).toContain("Production (ID: env-1) [ACTIVE]");
      expect(text).toContain("URL: https://prod.arcane.test");
      expect(text).toContain("Staging (ID: env-2) [ACTIVE]");
      expect(result.contents[0].uri).toBe("arcane://environments");
      expect(result.contents[0].mimeType).toBe("text/plain");
    });

    it("returns 'No environments found' when empty", async () => {
      mockClient.get.mockResolvedValueOnce({
        data: [],
        pagination: { total: 0, start: 0, limit: 100 },
      });

      const handler = server.resources.get("arcane-environments")!;
      const result = await handler(new URL("arcane://environments"));

      expect(result.contents[0].text).toBe("No environments found.");
    });

    it("returns error message when client fails", async () => {
      mockClient.get.mockRejectedValueOnce(new Error("Auth failed"));

      const handler = server.resources.get("arcane-environments")!;
      const result = await handler(new URL("arcane://environments"));

      expect(result.contents[0].text).toContain("Error reading environments");
      expect(result.contents[0].text).toContain("Auth failed");
    });
  });

  describe("arcane-version", () => {
    it("returns version info", async () => {
      const handler = server.resources.get("arcane-version")!;
      const result = await handler(new URL("arcane://version"));

      const text = result.contents[0].text;
      expect(text).toContain("Arcane MCP Server");
      expect(text).toContain("API Base URL: https://arcane.test");
      expect(text).toContain("Default Environment: env-1");
      expect(text).toContain("Protocol: MCP");
      expect(result.contents[0].uri).toBe("arcane://version");
    });

    it("shows 'not set' when no default environment", async () => {
      mockClient.getDefaultEnvironmentId.mockReturnValueOnce(undefined as unknown as string);

      const handler = server.resources.get("arcane-version")!;
      const result = await handler(new URL("arcane://version"));

      expect(result.contents[0].text).toContain("Default Environment: not set");
    });

    it("returns error when client setup fails", async () => {
      // getBaseUrl throws when client can't initialize
      mockClient.getBaseUrl.mockImplementationOnce(() => {
        throw new Error("Config missing");
      });

      const handler = server.resources.get("arcane-version")!;
      const result = await handler(new URL("arcane://version"));

      expect(result.contents[0].text).toContain("Error reading version");
      expect(result.contents[0].text).toContain("Config missing");
    });
  });
});
