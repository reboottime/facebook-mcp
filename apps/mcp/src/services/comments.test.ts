import { describe, expect, it, jest } from "@jest/globals";

import { GraphApiError } from "../graph/errors.js";
import type { GraphClient } from "../graph/index.js";
import { deleteComment } from "./comments.js";
import type { ResolvedPage } from "./pages.js";

// GraphClient methods are generic (`<T>() => Promise<T>`); a bare jest.fn() types its
// resolve/reject value as `never`. Widening the mock's return type to Promise<unknown> lets
// mockResolvedValue/mockRejectedValue accept any fixture value.
type AsyncFn = (...args: unknown[]) => Promise<unknown>;

function pageWith(client: { get?: AsyncFn; post?: AsyncFn; del?: AsyncFn }): ResolvedPage {
  return {
    id: "page-1",
    name: "Page One",
    client: {
      get: jest.fn<AsyncFn>(),
      post: jest.fn<AsyncFn>(),
      del: jest.fn<AsyncFn>(),
      withToken: jest.fn(),
      ...client,
    } as unknown as GraphClient,
    accessToken: "token",
  };
}

describe("deleteComment", () => {
  it("warns with an inconclusive-readback message when the existence check errors ambiguously", async () => {
    const del = jest.fn<AsyncFn>().mockResolvedValue({ success: true });
    // Bare code 100, no subcode — not one of the two "missing" shapes, so it is re-thrown
    // by graphObjectExists rather than read as proof of deletion.
    const get = jest
      .fn<AsyncFn>()
      .mockRejectedValue(new GraphApiError("Invalid parameter", { status: 400, code: 100 }));
    const page = pageWith({ del, get });

    const result = await deleteComment(page, "comment-1", "facebook");

    expect(result).toMatchObject({ id: "comment-1", platform: "facebook", verified: false, action: "delete" });
    expect(result.warnings[0]).toMatch(/readback inconclusive/);
  });
});
