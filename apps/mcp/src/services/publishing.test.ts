import { describe, expect, it, jest, beforeEach, afterEach } from "@jest/globals";

import type { GraphClient } from "../graph/index.js";
import { publishFacebookPost, publishFacebookReel } from "./publishing.js";
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
    accessToken: "page-token",
  };
}

describe("publishFacebookPost", () => {
  it("warns when scheduled but Meta reports the post as already published", async () => {
    const post = jest.fn<AsyncFn>().mockResolvedValue({ id: "post-1" });
    const get = jest
      .fn<AsyncFn>()
      .mockResolvedValue({ id: "post-1", message: "hi", is_published: true });
    const page = pageWith({ post, get });

    const result = await publishFacebookPost(page, {
      message: "hi",
      scheduledPublishTime: Math.floor(Date.now() / 1000) + 3600,
    });

    expect(result.verified).toBe(false);
    expect(result.warnings).toEqual([
      "The post was requested as scheduled but Meta reports it as already published.",
    ]);
  });

  it("does not warn when the scheduled post reads back as not yet published", async () => {
    const post = jest.fn<AsyncFn>().mockResolvedValue({ id: "post-1" });
    const get = jest
      .fn<AsyncFn>()
      .mockResolvedValue({ id: "post-1", message: "hi", is_published: false });
    const page = pageWith({ post, get });

    const result = await publishFacebookPost(page, {
      message: "hi",
      scheduledPublishTime: Math.floor(Date.now() / 1000) + 3600,
    });

    expect(result.verified).toBe(true);
    expect(result.warnings).toEqual([]);
  });
});

describe("publishFacebookReel", () => {
  // uploadReelFromUrl (graph/reels.ts) hits the rupload host directly via global fetch, not
  // through GraphClient — it is the one live-only leg of this flow, so fetch is stubbed at that
  // boundary rather than exercised for real.
  let fetchSpy: jest.SpiedFunction<typeof fetch>;

  beforeEach(() => {
    fetchSpy = jest
      .spyOn(global, "fetch")
      .mockResolvedValue(new Response(null, { status: 200 }));
  });

  afterEach(() => {
    fetchSpy.mockRestore();
  });

  function pageForReel(readReelResult: Record<string, unknown>) {
    const post = jest
      .fn<AsyncFn>()
      .mockResolvedValueOnce({ video_id: "video-1", upload_url: "https://upload.example/x" })
      .mockResolvedValueOnce({ success: true });
    const get = jest.fn<AsyncFn>().mockResolvedValue(readReelResult);

    return pageWith({ post, get });
  }

  it("warns as unconfirmed when Meta has not reported a publishing status yet", async () => {
    const page = pageForReel({ id: "video-1", status: { video_status: "processing" } });

    const result = await publishFacebookReel(page, {
      videoUrl: "https://cdn.example.com/reel.mp4",
      scheduledPublishTime: Math.floor(Date.now() / 1000) + 3600,
    });

    expect(result.verified).toBe(false);
    expect(result.warnings[0]).toMatch(/unconfirmed/);
  });

  it("warns when scheduled but Meta reports a different publishing status", async () => {
    const page = pageForReel({
      id: "video-1",
      status: { publishing_phase: { publish_status: "published" } },
    });

    const result = await publishFacebookReel(page, {
      videoUrl: "https://cdn.example.com/reel.mp4",
      scheduledPublishTime: Math.floor(Date.now() / 1000) + 3600,
    });

    expect(result.verified).toBe(false);
    expect(result.warnings[0]).toMatch(/publishing status as "published"/);
  });

  it("verifies cleanly when Meta confirms the scheduled status", async () => {
    const page = pageForReel({
      id: "video-1",
      status: { publishing_phase: { publish_status: "scheduled" } },
    });

    const result = await publishFacebookReel(page, {
      videoUrl: "https://cdn.example.com/reel.mp4",
      scheduledPublishTime: Math.floor(Date.now() / 1000) + 3600,
    });

    expect(result.verified).toBe(true);
    expect(result.warnings).toEqual([]);
  });
});
