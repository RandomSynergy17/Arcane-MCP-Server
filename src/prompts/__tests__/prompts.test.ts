import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../utils/logger.js", () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

import { registerPrompts } from "../index.js";

type PromptHandler = (params: Record<string, string | undefined>) => {
  messages: Array<{
    role: string;
    content: { type: string; text: string };
  }>;
};

function createMockServer() {
  const prompts = new Map<string, PromptHandler>();
  return {
    prompt: vi.fn(
      (
        name: string,
        _description: string,
        _schema: unknown,
        handler: PromptHandler
      ) => {
        prompts.set(name, handler);
      }
    ),
    prompts,
  };
}

describe("prompts", () => {
  let server: ReturnType<typeof createMockServer>;

  beforeEach(() => {
    vi.clearAllMocks();
    server = createMockServer();
    registerPrompts(server as unknown as Parameters<typeof registerPrompts>[0]);
  });

  it("registers all 4 prompts", () => {
    expect(server.prompts.size).toBe(4);
    expect(server.prompts.has("deploy-stack")).toBe(true);
    expect(server.prompts.has("troubleshoot-container")).toBe(true);
    expect(server.prompts.has("security-audit")).toBe(true);
    expect(server.prompts.has("cleanup-environment")).toBe(true);
  });

  describe("deploy-stack", () => {
    it("returns messages with correct tool names", () => {
      const handler = server.prompts.get("deploy-stack")!;
      const result = handler({ environmentId: "env-1" });

      expect(result.messages).toHaveLength(1);
      expect(result.messages[0].role).toBe("user");
      expect(result.messages[0].content.type).toBe("text");

      const text = result.messages[0].content.text;
      expect(text).toContain("environment env-1");
      expect(text).toContain("arcane_environment_get");
      expect(text).toContain("arcane_project_create");
      expect(text).toContain("arcane_project_up");
      expect(text).toContain("arcane_container_list");
    });

    it("includes compose path when provided", () => {
      const handler = server.prompts.get("deploy-stack")!;
      const result = handler({
        environmentId: "env-1",
        composePath: "/opt/docker-compose.yml",
      });

      const text = result.messages[0].content.text;
      expect(text).toContain("/opt/docker-compose.yml");
    });

    it("asks for compose content when no path given", () => {
      const handler = server.prompts.get("deploy-stack")!;
      const result = handler({ environmentId: "env-1" });

      const text = result.messages[0].content.text;
      expect(text).toContain("Ask the user for the compose file content");
    });
  });

  describe("security-audit", () => {
    it("references vulnerability tools", () => {
      const handler = server.prompts.get("security-audit")!;
      const result = handler({ environmentId: "env-1" });

      const text = result.messages[0].content.text;
      expect(text).toContain("arcane_vulnerability_get_scanner_status");
      expect(text).toContain("arcane_vulnerability_get_environment_summary");
      expect(text).toContain("arcane_vulnerability_list_all");
      expect(text).toContain("arcane_vulnerability_list");
      expect(text).toContain("arcane_image_update_check_all");
      expect(text).toContain("arcane_port_list");
      expect(text).toContain("arcane_network_list");
    });

    it("returns proper message structure", () => {
      const handler = server.prompts.get("security-audit")!;
      const result = handler({ environmentId: "env-1" });

      expect(result.messages).toHaveLength(1);
      expect(result.messages[0]).toHaveProperty("role", "user");
      expect(result.messages[0].content).toHaveProperty("type", "text");
      expect(typeof result.messages[0].content.text).toBe("string");
    });
  });

  describe("troubleshoot-container", () => {
    it("returns diagnostic workflow with correct tools", () => {
      const handler = server.prompts.get("troubleshoot-container")!;
      const result = handler({
        environmentId: "env-1",
        containerId: "my-app",
      });

      const text = result.messages[0].content.text;
      expect(text).toContain("my-app");
      expect(text).toContain("arcane_container_get");
      expect(text).toContain("arcane_dashboard_get_action_items");
      expect(text).toContain("arcane_image_update_check_by_id");
    });
  });

  describe("cleanup-environment", () => {
    it("returns cleanup workflow with correct tools", () => {
      const handler = server.prompts.get("cleanup-environment")!;
      const result = handler({ environmentId: "env-1" });

      const text = result.messages[0].content.text;
      expect(text).toContain("arcane_dashboard_get");
      expect(text).toContain("arcane_container_list");
      expect(text).toContain("arcane_image_prune");
      expect(text).toContain("arcane_volume_prune");
      expect(text).toContain("arcane_network_prune");
    });

    it("returns proper message structure", () => {
      const handler = server.prompts.get("cleanup-environment")!;
      const result = handler({ environmentId: "env-1" });

      expect(result.messages).toHaveLength(1);
      expect(result.messages[0].role).toBe("user");
      expect(result.messages[0].content.type).toBe("text");
    });
  });
});
