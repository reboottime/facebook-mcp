import { describe, expect, it, jest, beforeEach, afterEach } from "@jest/globals";

import { InvalidToolInputError } from "../errors.js";
import type { GraphClient } from "../graph/index.js";
import { crossPostInstagramToFacebook } from "./cross-post.js";
import type { ResolvedPage } from "./pages.js";

// GraphClient methods are generic (`<T>() => Promise<T>`); a bare jest.fn() types its
// resolve value as `never`. Widening the mock's return type to Promise<unknown> lets
// mockResolvedValue(Once) accept any fixture value.
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
    accessToken: "page-token",
  };
}

const NOW = new Date("2026-01-01T00:00:00.000Z");
const DAY = 24 * 60 * 60 * 1000;
// 29.5 days out: within the 30-day post window, but past the reel's 29-day window — the one
// value that tells apart "used the post rule" from "used the reel rule."
const BETWEEN_29_AND_30_DAYS = new Date(NOW.getTime() + 29.5 * DAY).toISOString();

describe("crossPostInstagramToFacebook — window selection by media_type", () => {
  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(NOW);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("applies the reel's 29-day window to VIDEO-typed media, rejecting a 29.5-day-out schedule", async () => {
    const get = jest.fn<AsyncFn>().mockResolvedValue({
      media_type: "VIDEO",
      media_url: "https://cdn.example.com/vid.mp4",
      caption: "cap",
    });
    const page = pageWith({ get });

    await expect(
      crossPostInstagramToFacebook(page, {
        mediaId: "media-1",
        scheduledPublishTime: BETWEEN_29_AND_30_DAYS,
      }),
    ).rejects.toThrow(InvalidToolInputError);
  });

  it("applies the post's 30-day window to photo-typed media, accepting a 29.5-day-out schedule", async () => {
    const get = jest
      .fn<AsyncFn>()
      .mockResolvedValueOnce({
        media_type: "IMAGE",
        media_url: "https://cdn.example.com/img.jpg",
        caption: "cap",
      })
      .mockResolvedValueOnce({ id: "fb-post-1" });
    const post = jest
      .fn<AsyncFn>()
      .mockResolvedValueOnce({ id: "photo-1" })
      .mockResolvedValueOnce({ id: "fb-post-1" });
    const page = pageWith({ get, post });

    const result = await crossPostInstagramToFacebook(page, {
      mediaId: "media-1",
      scheduledPublishTime: BETWEEN_29_AND_30_DAYS,
    });

    expect(result.target.kind).toBe("post");
  });
});
