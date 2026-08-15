import { describe, expect, it, jest } from "@jest/globals";

import type { GraphClient, GraphParams } from "./client.js";
import { createFeedPost } from "./posts.js";

// GraphClient methods are generic (`<T>() => Promise<T>`); a bare jest.fn() types its
// resolve value as `never`. Widening the mock's return type to Promise<unknown> lets
// mockResolvedValue accept any fixture value.
type AsyncFn = (...args: unknown[]) => Promise<unknown>;

function fakeClient() {
  const post = jest.fn<AsyncFn>().mockResolvedValue({ id: "post-1" });
  const client = {
    get: jest.fn<AsyncFn>(),
    post,
    del: jest.fn<AsyncFn>(),
    withToken: jest.fn(),
  } as unknown as GraphClient;

  return { client, post };
}

describe("createFeedPost", () => {
  it("encodes each photo id as an indexed attached_media JSON field", async () => {
    const { client, post } = fakeClient();

    await createFeedPost(client, "page-1", {
      message: "look at these",
      photoIds: ["photo-a", "photo-b"],
    });

    const params = post.mock.calls[0]?.[1] as GraphParams;

    expect(params["attached_media[0]"]).toBe(JSON.stringify({ media_fbid: "photo-a" }));
    expect(params["attached_media[1]"]).toBe(JSON.stringify({ media_fbid: "photo-b" }));
  });

  it("marks the post unpublished and sets scheduled_publish_time when scheduling", async () => {
    const { client, post } = fakeClient();

    await createFeedPost(client, "page-1", {
      message: "later",
      scheduledPublishTime: 1_800_000_000,
    });

    const params = post.mock.calls[0]?.[1] as GraphParams;

    expect(params.published).toBe(false);
    expect(params.scheduled_publish_time).toBe(1_800_000_000);
  });
});
