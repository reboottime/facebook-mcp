import { describe, expect, it, jest } from "@jest/globals";

import { GraphApiError } from "../graph/errors.js";
import type { GraphClient, GraphPost } from "../graph/index.js";
import type { ResolvedPage } from "./pages.js";
import { deletePost, readPostQueue } from "./queue.js";

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

describe("readPostQueue", () => {
  it("dedupes by id, letting the scheduled edge's data win over the feed edge's", async () => {
    const feedPost: GraphPost = {
      id: "shared",
      is_published: true,
      message: "from feed",
    };
    const scheduledPost: GraphPost = {
      id: "shared",
      is_published: false,
      scheduled_publish_time: Math.floor(Date.now() / 1000) + 3600,
      message: "from scheduled",
    };
    const get = jest
      .fn<AsyncFn>()
      .mockResolvedValueOnce({ data: [feedPost] })
      .mockResolvedValueOnce({ data: [scheduledPost] });
    const page = pageWith({ get });

    const entries = await readPostQueue(page, 25);

    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({ status: "scheduled", message: "from scheduled" });
  });

  it("sorts scheduled entries first (soonest first), then published entries (newest first)", async () => {
    const now = Math.floor(Date.now() / 1000);
    const feed: GraphPost[] = [
      { id: "old", is_published: true, created_time: "2026-01-01T00:00:00Z" },
      { id: "new", is_published: true, created_time: "2026-02-01T00:00:00Z" },
    ];
    const scheduled: GraphPost[] = [
      { id: "far", is_published: false, scheduled_publish_time: now + 7200 },
      { id: "soon", is_published: false, scheduled_publish_time: now + 3600 },
    ];
    const get = jest
      .fn<AsyncFn>()
      .mockResolvedValueOnce({ data: feed })
      .mockResolvedValueOnce({ data: scheduled });
    const page = pageWith({ get });

    const entries = await readPostQueue(page, 25);

    expect(entries.map((entry) => entry.id)).toEqual(["soon", "far", "new", "old"]);
  });
});

describe("deletePost", () => {
  it("reports verified when Graph no longer resolves the id after delete", async () => {
    const del = jest.fn<AsyncFn>().mockResolvedValue({ success: true });
    const get = jest
      .fn<AsyncFn>()
      .mockRejectedValue(new GraphApiError("gone", { status: 400, code: 803 }));
    const page = pageWith({ del, get });

    const result = await deletePost(page, "post-1");

    expect(result).toMatchObject({ deleted: true, verified: true, warnings: [] });
  });

  it("warns when Graph still resolves the id after delete", async () => {
    const del = jest.fn<AsyncFn>().mockResolvedValue({ success: true });
    const get = jest.fn<AsyncFn>().mockResolvedValue({ id: "post-1" });
    const page = pageWith({ del, get });

    const result = await deletePost(page, "post-1");

    expect(result.verified).toBe(false);
    expect(result.warnings[0]).toMatch(/still resolves the post id/);
  });

  it("warns with an inconclusive-readback message when the existence check itself errors", async () => {
    const del = jest.fn<AsyncFn>().mockResolvedValue({ success: true });
    const get = jest.fn<AsyncFn>().mockRejectedValue(new Error("network blip"));
    const page = pageWith({ del, get });

    const result = await deletePost(page, "post-1");

    expect(result.verified).toBe(false);
    expect(result.warnings[0]).toMatch(/readback inconclusive/);
  });
});
