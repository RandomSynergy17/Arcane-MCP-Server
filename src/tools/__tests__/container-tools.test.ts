import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the client module before any imports that use it
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

import { registerContainerTools } from "../container-tools.js";

// Capture registered tool handlers by spying on server.registerTool
type ToolHandler = (params: Record<string, unknown>) => Promise<{
  content: Array<{ type: string; text: string }>;
  isError?: boolean;
}>;

function createMockServer() {
  const tools = new Map<string, ToolHandler>();
  return {
    registerTool: vi.fn(
      (name: string, _config: unknown, handler: ToolHandler) => {
        tools.set(name, handler);
      }
    ),
    tools,
  };
}

describe("container-tools", () => {
  let server: ReturnType<typeof createMockServer>;

  beforeEach(() => {
    vi.clearAllMocks();
    server = createMockServer();
    registerContainerTools(server as unknown as Parameters<typeof registerContainerTools>[0]);
  });

  it("registers all container tools", () => {
    expect(server.tools.size).toBeGreaterThanOrEqual(10);
    expect(server.tools.has("arcane_container_list")).toBe(true);
    expect(server.tools.has("arcane_container_get")).toBe(true);
    expect(server.tools.has("arcane_container_delete")).toBe(true);
    expect(server.tools.has("arcane_container_create")).toBe(true);
  });

  describe("arcane_container_list", () => {
    it("returns formatted container list", async () => {
      mockClient.get.mockResolvedValueOnce({
        data: [
          {
            id: "abc123def456ghi789",
            name: "my-app",
            image: "nginx:latest",
            status: "Up 2 hours",
            state: "running",
            created: "2024-01-01T00:00:00Z",
            ports: [{ privatePort: 80, publicPort: 8080, type: "tcp" }],
          },
          {
            id: "xyz987wvu654tsr321",
            name: "my-db",
            image: "postgres:16",
            status: "Exited (0) 1 hour ago",
            state: "stopped",
            created: "2024-01-01T00:00:00Z",
            ports: [],
          },
        ],
        pagination: { total: 2, start: 0, limit: 20 },
      });

      const handler = server.tools.get("arcane_container_list")!;
      const result = await handler({
        environmentId: "env-1",
        start: 0,
        limit: 20,
        order: "asc",
        includeInternal: false,
      });

      expect(result.isError).toBeUndefined();
      const text = result.content[0].text;
      expect(text).toContain("Found 2 containers");
      expect(text).toContain("[RUNNING] my-app");
      expect(text).toContain("[STOPPED] my-db");
      expect(text).toContain("nginx:latest");
      expect(text).toContain("8080:80/tcp");
    });

    it("returns 'No containers found' when empty", async () => {
      mockClient.get.mockResolvedValueOnce({
        data: [],
        pagination: { total: 0, start: 0, limit: 20 },
      });

      const handler = server.tools.get("arcane_container_list")!;
      const result = await handler({
        environmentId: "env-1",
        start: 0,
        limit: 20,
        order: "asc",
        includeInternal: false,
      });

      expect(result.content[0].text).toBe("No containers found.");
    });
  });

  describe("arcane_container_get", () => {
    it("returns detailed container info", async () => {
      mockClient.get.mockResolvedValueOnce({
        data: {
          id: "abc123def456ghi789",
          name: "my-app",
          image: "nginx:latest",
          state: "running",
          status: "Up 2 hours",
          created: "2024-01-01T00:00:00Z",
          ports: [{ privatePort: 80, publicPort: 8080, type: "tcp" }],
          labels: { "com.docker.compose.project": "myproject" },
        },
      });

      const handler = server.tools.get("arcane_container_get")!;
      const result = await handler({
        environmentId: "env-1",
        containerId: "abc123",
      });

      const text = result.content[0].text;
      expect(text).toContain("Container: my-app");
      expect(text).toContain("State: running");
      expect(text).toContain("8080:80/tcp");
      expect(text).toContain("com.docker.compose.project: myproject");
    });
  });

  describe("arcane_container_delete", () => {
    it("calls delete endpoint and returns success message", async () => {
      mockClient.delete.mockResolvedValueOnce(undefined);

      const handler = server.tools.get("arcane_container_delete")!;
      const result = await handler({
        environmentId: "env-1",
        containerId: "abc123",
        force: false,
        volumes: false,
      });

      expect(mockClient.delete).toHaveBeenCalledWith(
        "/environments/env-1/containers/abc123",
        { force: false, volumes: false }
      );
      expect(result.content[0].text).toContain("deleted successfully");
    });
  });

  describe("error handling", () => {
    it("returns isError when client throws", async () => {
      mockClient.get.mockRejectedValueOnce(new Error("Connection refused"));

      const handler = server.tools.get("arcane_container_list")!;
      const result = await handler({
        environmentId: "env-1",
        start: 0,
        limit: 20,
        order: "asc",
        includeInternal: false,
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("Connection refused");
    });

    it("returns isError when container get fails", async () => {
      mockClient.get.mockRejectedValueOnce(new Error("Not found"));

      const handler = server.tools.get("arcane_container_get")!;
      const result = await handler({
        environmentId: "env-1",
        containerId: "nonexistent",
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("Not found");
    });
  });
});
