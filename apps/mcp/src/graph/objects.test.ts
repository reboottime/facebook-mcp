import { describe, expect, it, jest } from "@jest/globals";

import type { GraphClient } from "./client.js";
import { GraphApiError } from "./errors.js";
import { graphObjectExists } from "./objects.js";

// GraphClient methods are generic (`<T>() => Promise<T>`); a bare jest.fn() types its
// resolve/reject value as `never`. Widening the mock's return type to Promise<unknown> lets
// mockResolvedValue/mockRejectedValue accept any fixture value.
type AsyncFn = (...args: unknown[]) => Promise<unknown>;

function fakeClient(get: AsyncFn): GraphClient {
  return {
    get,
    post: jest.fn<AsyncFn>(),
    del: jest.fn<AsyncFn>(),
    withToken: jest.fn(),
  } as unknown as GraphClient;
}

function graphError(code?: number, subcode?: number): GraphApiError {
  return new GraphApiError("Graph rejected the call", { status: 400, code, subcode });
}

describe("graphObjectExists", () => {
  it("returns true when the object resolves", async () => {
    const client = fakeClient(jest.fn<AsyncFn>().mockResolvedValue({ id: "123" }));

    await expect(graphObjectExists(client, "123")).resolves.toBe(true);
  });

  it("returns false when Graph reports alias-missing (code 803)", async () => {
    const client = fakeClient(jest.fn<AsyncFn>().mockRejectedValue(graphError(803)));

    await expect(graphObjectExists(client, "123")).resolves.toBe(false);
  });

  it("returns false when Graph reports method-missing (code 100, subcode 33)", async () => {
    const client = fakeClient(jest.fn<AsyncFn>().mockRejectedValue(graphError(100, 33)));

    await expect(graphObjectExists(client, "123")).resolves.toBe(false);
  });

  it("rethrows on bare code 100 with no subcode — inconclusive, not proof of deletion", async () => {
    const client = fakeClient(jest.fn<AsyncFn>().mockRejectedValue(graphError(100)));

    await expect(graphObjectExists(client, "123")).rejects.toThrow(GraphApiError);
  });

  it("rethrows on an unrelated error code", async () => {
    const client = fakeClient(jest.fn<AsyncFn>().mockRejectedValue(graphError(190)));

    await expect(graphObjectExists(client, "123")).rejects.toThrow(GraphApiError);
  });
});
