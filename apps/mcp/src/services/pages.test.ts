import { describe, expect, it, jest } from "@jest/globals";

import type { Env } from "../env.js";
import { PageResolutionError } from "../errors.js";
import { MetaTokenMissingError } from "../graph/index.js";
import type { GraphClient, GraphPage } from "../graph/index.js";
import { createPageDirectory, createUserPageDirectory } from "./pages.js";
import type { StoredPageSelection } from "./pages.js";

function fakeGraph(pages: GraphPage[] | (() => Promise<GraphPage[]>)): GraphClient {
  const get = jest.fn(async () => {
    const resolved = typeof pages === "function" ? await pages() : pages;

    return { data: resolved };
  });

  return {
    get,
    post: jest.fn(),
    del: jest.fn(),
    withToken: jest.fn(() => "withToken-result" as unknown as GraphClient),
  } as unknown as GraphClient;
}

function env(metaPageId: string | null = null): Env {
  return { metaAccessToken: "token", metaPageId };
}

const pageA: GraphPage = { id: "A", name: "Page A", access_token: "token-a" };
const pageB: GraphPage = { id: "B", name: "Page B", access_token: "token-b" };

describe("createPageDirectory / resolve", () => {
  it("resolves by explicit page id, overriding META_PAGE_ID", async () => {
    const directory = createPageDirectory(fakeGraph([pageA, pageB]), env("A"));

    const resolved = await directory.resolve("B");

    expect(resolved.id).toBe("B");
  });

  it("falls back to META_PAGE_ID when no explicit id is given", async () => {
    const directory = createPageDirectory(fakeGraph([pageA, pageB]), env("B"));

    const resolved = await directory.resolve();

    expect(resolved.id).toBe("B");
  });

  it("resolves the sole page when there is no explicit id or META_PAGE_ID", async () => {
    const directory = createPageDirectory(fakeGraph([pageA]), env());

    const resolved = await directory.resolve();

    expect(resolved.id).toBe("A");
  });

  it("throws, listing the pages, when multiple pages exist and none is selected", async () => {
    const directory = createPageDirectory(fakeGraph([pageA, pageB]), env());

    await expect(directory.resolve()).rejects.toThrow(PageResolutionError);
    await expect(directory.resolve()).rejects.toThrow(/Page A \(A\), Page B \(B\)/);
  });

  it("throws, listing the pages, when the explicit id matches no page", async () => {
    const directory = createPageDirectory(fakeGraph([pageA]), env());

    await expect(directory.resolve("missing")).rejects.toThrow(PageResolutionError);
    await expect(directory.resolve("missing")).rejects.toThrow(/Page A \(A\)/);
  });

  it("throws when the token administers zero Facebook Pages", async () => {
    const directory = createPageDirectory(fakeGraph([]), env());

    await expect(directory.resolve()).rejects.toThrow(
      /does not administer any Facebook Page/,
    );
  });

  it("drops the cache after a failed list, so the next call retries", async () => {
    // GraphClient methods are generic (`<T>() => Promise<T>`); a bare jest.fn() types its
    // resolve/reject value as `never`. Widening to Promise<unknown> lets the mixed
    // reject-then-resolve chain accept both fixture values.
    type AsyncFn = (...args: unknown[]) => Promise<unknown>;
    const get = jest
      .fn<AsyncFn>()
      .mockRejectedValueOnce(new Error("Graph outage"))
      .mockResolvedValueOnce({ data: [pageA] });
    const graph = {
      get,
      post: jest.fn<AsyncFn>(),
      del: jest.fn<AsyncFn>(),
      withToken: jest.fn(),
    } as unknown as GraphClient;
    const directory = createPageDirectory(graph, env());

    await expect(directory.resolve()).rejects.toThrow("Graph outage");
    await expect(directory.resolve()).resolves.toMatchObject({ id: "A" });
    expect(get).toHaveBeenCalledTimes(2);
  });
});

const selectionA: StoredPageSelection = {
  id: "A",
  name: "Page A",
  accessToken: "selection-token-a",
};

describe("createUserPageDirectory / resolve", () => {
  it("resolves the stored selection when no page id is given", async () => {
    const directory = createUserPageDirectory({
      graph: fakeGraph([pageA]),
      readSelection: () => Promise.resolve(selectionA),
    });

    const resolved = await directory.resolve();

    expect(resolved).toMatchObject({
      id: "A",
      name: "Page A",
      accessToken: "selection-token-a",
    });
  });

  it("resolves the stored selection when the given page id matches it", async () => {
    const directory = createUserPageDirectory({
      graph: fakeGraph([pageA, pageB]),
      readSelection: () => Promise.resolve(selectionA),
    });

    const resolved = await directory.resolve("A");

    expect(resolved.accessToken).toBe("selection-token-a");
  });

  it("falls through to the live directory when the given page id does not match the stored selection", async () => {
    const directory = createUserPageDirectory({
      graph: fakeGraph([pageA, pageB]),
      readSelection: () => Promise.resolve(selectionA),
    });

    const resolved = await directory.resolve("B");

    expect(resolved).toMatchObject({ id: "B", accessToken: "token-b" });
  });

  it("throws MetaTokenMissingError instead of falling back to any shared token when a Page has none", async () => {
    const pageWithoutToken: GraphPage = { id: "C", name: "Page C" };
    const directory = createUserPageDirectory({
      graph: fakeGraph([pageWithoutToken]),
      readSelection: () => Promise.resolve(null),
    });

    await expect(directory.resolve()).rejects.toThrow(MetaTokenMissingError);
  });

  it("readSelectedPageId reflects the stored selection, or null when none is set", async () => {
    const withSelection = createUserPageDirectory({
      graph: fakeGraph([pageA]),
      readSelection: () => Promise.resolve(selectionA),
    });
    const withoutSelection = createUserPageDirectory({
      graph: fakeGraph([pageA]),
      readSelection: () => Promise.resolve(null),
    });

    expect(await withSelection.readSelectedPageId()).toBe("A");
    expect(await withoutSelection.readSelectedPageId()).toBeNull();
  });
});
