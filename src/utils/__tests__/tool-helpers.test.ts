import { describe, it, expect, vi, beforeEach } from "vitest";

const mockClient = { fake: true };

vi.mock("../../client/arcane-client.js", () => ({
  getArcaneClient: vi.fn(() => mockClient),
}));

vi.mock("../error-handler.js", () => ({
  formatError: vi.fn((err: unknown) =>
    err instanceof Error ? err.message : String(err)
  ),
}));

import { toolHandler } from "../tool-helpers.js";
import { getArcaneClient } from "../../client/arcane-client.js";
import { formatError } from "../error-handler.js";

describe("toolHandler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns content with text on success", async () => {
    const handler = toolHandler(async (_params, _client) => "hello world");
    const result = await handler({});

    expect(result).toEqual({
      content: [{ type: "text", text: "hello world" }],
    });
  });

  it("calls getArcaneClient and passes client to handler", async () => {
    const fn = vi.fn(async (_params: unknown, client: unknown) => {
      expect(client).toBe(mockClient);
      return "ok";
    });
    const handler = toolHandler(fn);
    await handler({ foo: 1 });

    expect(getArcaneClient).toHaveBeenCalledOnce();
    expect(fn).toHaveBeenCalledWith({ foo: 1 }, mockClient);
  });

  it("returns isError content when handler throws", async () => {
    const handler = toolHandler(async () => {
      throw new Error("boom");
    });
    const result = await handler({});

    expect(result).toEqual({
      content: [{ type: "text", text: "boom" }],
      isError: true,
    });
    expect(formatError).toHaveBeenCalledWith(expect.any(Error));
  });

  it("passes params to the handler function", async () => {
    const fn = vi.fn(async (params: { id: number }) => `got ${params.id}`);
    const handler = toolHandler(fn);
    const result = await handler({ id: 42 });

    expect((result.content[0] as { type: "text"; text: string }).text).toBe("got 42");
    expect(fn).toHaveBeenCalledWith({ id: 42 }, mockClient);
  });
});
