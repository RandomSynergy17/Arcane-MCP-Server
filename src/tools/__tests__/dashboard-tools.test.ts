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

import { registerDashboardTools } from "../dashboard-tools.js";

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

describe("dashboard-tools", () => {
  let server: ReturnType<typeof createMockServer>;

  beforeEach(() => {
    vi.clearAllMocks();
    server = createMockServer();
    registerDashboardTools(server as unknown as Parameters<typeof registerDashboardTools>[0]);
  });

  it("registers both dashboard tools", () => {
    expect(server.tools.has("arcane_dashboard_get")).toBe(true);
    expect(server.tools.has("arcane_dashboard_get_action_items")).toBe(true);
    expect(server.tools.size).toBe(2);
  });

  describe("arcane_dashboard_get", () => {
    it("returns snapshot with container/project/image counts", async () => {
      mockClient.get.mockResolvedValueOnce({
        data: {
          containers: { total: 10, running: 7, stopped: 3 },
          projects: { total: 4, running: 3, stopped: 1 },
          images: { total: 15, updatesAvailable: 2 },
          volumes: { total: 8, totalSize: "12.5 GB" },
          networks: { total: 5 },
          systemInfo: {
            dockerVersion: "24.0.7",
            osType: "linux",
            cpus: 4,
            memoryBytes: 8e9,
          },
        },
      });

      const handler = server.tools.get("arcane_dashboard_get")!;
      const result = await handler({ environmentId: "env-1" });

      const text = result.content[0].text;
      expect(text).toContain("Containers: 10 total (7 running, 3 stopped)");
      expect(text).toContain("Projects: 4 total (3 running, 1 stopped)");
      expect(text).toContain("Images: 15 total (2 updates available)");
      expect(text).toContain("Volumes: 8 (12.5 GB)");
      expect(text).toContain("Networks: 5");
      expect(text).toContain("Docker: 24.0.7");
      expect(text).toContain("CPUs: 4");
      expect(text).toContain("8.0 GB");
      expect(result.isError).toBeUndefined();
    });

    it("handles missing system info", async () => {
      mockClient.get.mockResolvedValueOnce({
        data: {
          containers: { total: 1, running: 1, stopped: 0 },
          projects: { total: 0, running: 0, stopped: 0 },
          images: { total: 1, updatesAvailable: 0 },
          volumes: { total: 0 },
          networks: { total: 1 },
        },
      });

      const handler = server.tools.get("arcane_dashboard_get")!;
      const result = await handler({ environmentId: "env-1" });

      const text = result.content[0].text;
      expect(text).toContain("Containers: 1 total");
      expect(text).not.toContain("System:");
    });
  });

  describe("arcane_dashboard_get_action_items", () => {
    it("returns action items list", async () => {
      mockClient.get.mockResolvedValueOnce({
        data: [
          {
            type: "container_unhealthy",
            severity: "high",
            title: "Container my-app is unhealthy",
            description: "Health check failing for 10 minutes",
            resourceName: "my-app",
          },
          {
            type: "image_update",
            severity: "low",
            title: "Image update available for nginx",
            resourceName: "nginx",
          },
        ],
      });

      const handler = server.tools.get("arcane_dashboard_get_action_items")!;
      const result = await handler({ environmentId: "env-1" });

      const text = result.content[0].text;
      expect(text).toContain("2 action items");
      expect(text).toContain("[HIGH] Container my-app is unhealthy");
      expect(text).toContain("[LOW] Image update available for nginx");
      expect(text).toContain("Health check failing");
    });

    it("returns 'everything looks good' when no action items", async () => {
      mockClient.get.mockResolvedValueOnce({ data: [] });

      const handler = server.tools.get("arcane_dashboard_get_action_items")!;
      const result = await handler({ environmentId: "env-1" });

      expect(result.content[0].text).toContain("everything looks good");
    });

    it("returns isError when client throws", async () => {
      mockClient.get.mockRejectedValueOnce(new Error("Server error"));

      const handler = server.tools.get("arcane_dashboard_get_action_items")!;
      const result = await handler({ environmentId: "env-1" });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("Server error");
    });
  });
});
