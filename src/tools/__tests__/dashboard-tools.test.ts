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

  it("registers the dashboard tool", () => {
    expect(server.tools.has("arcane_dashboard_get")).toBe(true);
    expect(server.tools.size).toBe(1);
  });

  describe("arcane_dashboard_get", () => {
    it("returns snapshot with container/image counts and action items", async () => {
      mockClient.get.mockResolvedValueOnce({
        data: {
          containers: {
            counts: { totalContainers: 10, runningContainers: 7, stoppedContainers: 3 },
          },
          imageUsageCounts: { totalImages: 15, totalImageSize: 5e9, imagesInuse: 12, imagesUnused: 3 },
          actionItems: { items: [{ kind: "image_updates", severity: "info", count: 2 }] },
          versionInfo: { currentVersion: "v2.3.2", newestVersion: "v2.4.0" },
        },
      });

      const handler = server.tools.get("arcane_dashboard_get")!;
      const result = await handler({ environmentId: "env-1" });

      const text = result.content[0].text;
      expect(text).toContain("Containers: 10 total (7 running, 3 stopped)");
      expect(text).toContain("Images: 15 total (12 in use, 3 unused");
      expect(text).toContain("[INFO] image_updates: 2");
      expect(text).toContain("Arcane: v2.3.2 (update available: v2.4.0)");
      expect(result.isError).toBeUndefined();
    });

    it("handles missing action items", async () => {
      mockClient.get.mockResolvedValueOnce({
        data: {
          containers: {
            counts: { totalContainers: 1, runningContainers: 1, stoppedContainers: 0 },
          },
          actionItems: { items: [] },
        },
      });

      const handler = server.tools.get("arcane_dashboard_get")!;
      const result = await handler({ environmentId: "env-1" });

      const text = result.content[0].text;
      expect(text).toContain("Containers: 1 total");
      expect(text).toContain("Action Items: none");
    });

    it("returns isError when client throws", async () => {
      mockClient.get.mockRejectedValueOnce(new Error("Server error"));

      const handler = server.tools.get("arcane_dashboard_get")!;
      const result = await handler({ environmentId: "env-1" });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("Server error");
    });
  });
});
