import type { Env } from "../env.js";
import { PageResolutionError } from "../errors.js";
import {
  GraphApiError,
  listManagedPages,
  MetaTokenMissingError,
  type GraphClient,
  type GraphInstagramAccount,
  type GraphParams,
  type GraphPage,
} from "../graph/index.js";

// Graph's expired/invalid-token code. Page access tokens are minted from the user token and die
// with it, so a page-scoped 190 means the whole cached directory is stale.
const EXPIRED_TOKEN_CODE = 190;

export type ResolvedPage = {
  id: string;
  name: string;
  category?: string;
  instagram?: GraphInstagramAccount;
  client: GraphClient;
  // Held in the clear only because the reel upload host takes the token in a header it builds
  // itself; never serialize this into a tool result or log line.
  accessToken: string;
};

export type ResolvedInstagramAccount = {
  account: GraphInstagramAccount;
  page: ResolvedPage;
};

export type PageDirectory = {
  list: () => Promise<ResolvedPage[]>;
  resolve: (pageId?: string) => Promise<ResolvedPage>;
  resolveInstagram: (pageId?: string) => Promise<ResolvedInstagramAccount>;
  // What `health` reports as the standing target, without paying for a Graph round trip.
  readSelectedPageId: () => Promise<string | null>;
};

// The persisted choice a signed-in user made with `select_page`. It carries its own Page access
// token because it was validated against that user's own /me/accounts when it was written.
export type StoredPageSelection = {
  id: string;
  name: string;
  accessToken: string;
};

export type UserPageDirectoryDeps = {
  graph: GraphClient;
  readSelection: () => Promise<StoredPageSelection | null>;
};

// stdio: one operator, one env token, target chosen by META_PAGE_ID.
export function createPageDirectory(
  graph: GraphClient,
  env: Env,
): PageDirectory {
  const core = createDirectoryCore(graph, () => env.metaAccessToken);

  const resolve = async (pageId?: string): Promise<ResolvedPage> => {
    const requested = pageId ?? env.metaPageId ?? undefined;

    return core.pick(
      requested,
      "Pass page_id, or set META_PAGE_ID in apps/mcp/.env.local.",
    );
  };

  return {
    list: core.list,
    resolve,
    resolveInstagram: (pageId) => resolveInstagram(resolve, pageId),
    readSelectedPageId: () => Promise.resolve(env.metaPageId),
  };
}

// HTTP: many users, target chosen per user with `select_page` and read back from storage keyed by
// the authenticated user id. The stored Page access token is used directly — it was minted from
// that user's own /me/accounts, so no client-supplied id can steer this at another user's Page.
export function createUserPageDirectory(
  deps: UserPageDirectoryDeps,
): PageDirectory {
  const core = createDirectoryCore(deps.graph, () => null);

  const resolve = async (pageId?: string): Promise<ResolvedPage> => {
    const selection = await deps.readSelection();

    if (!pageId && selection) {
      return core.fromSelection(selection);
    }

    if (pageId && selection && pageId === selection.id) {
      return core.fromSelection(selection);
    }

    return core.pick(
      pageId,
      "Pass page_id, or call select_page to set a standing target.",
    );
  };

  return {
    list: core.list,
    resolve,
    resolveInstagram: (pageId) => resolveInstagram(resolve, pageId),
    readSelectedPageId: async () => (await deps.readSelection())?.id ?? null,
  };
}

async function resolveInstagram(
  resolve: (pageId?: string) => Promise<ResolvedPage>,
  pageId?: string,
): Promise<ResolvedInstagramAccount> {
  const page = await resolve(pageId);

  if (!page.instagram) {
    throw new PageResolutionError(
      `Facebook Page "${page.name}" (${page.id}) has no linked Instagram Business account. Link one in Meta Business settings, then retry.`,
    );
  }

  return { account: page.instagram, page };
}

type DirectoryCore = {
  list: () => Promise<ResolvedPage[]>;
  pick: (pageId: string | undefined, advice: string) => Promise<ResolvedPage>;
  fromSelection: (selection: StoredPageSelection) => Promise<ResolvedPage>;
};

function createDirectoryCore(
  graph: GraphClient,
  fallbackToken: () => string | null,
): DirectoryCore {
  // Page access tokens are fetched once per directory; a failed lookup drops the cache so the
  // next call retries instead of pinning a transient Graph outage. The directory itself is
  // per-operator (stdio) or per-authenticated-request (HTTP), so this never spans users.
  let cached: Promise<ResolvedPage[]> | null = null;

  const invalidate = (): void => {
    cached = null;
  };

  const list = (): Promise<ResolvedPage[]> => {
    cached ??= listManagedPages(graph)
      .then((pages) =>
        pages.map((page) =>
          toResolvedPage(page, graph, fallbackToken(), invalidate),
        ),
      )
      .catch((error: unknown) => {
        cached = null;
        throw error;
      });

    return cached;
  };

  const pick = async (
    pageId: string | undefined,
    advice: string,
  ): Promise<ResolvedPage> => {
    const pages = await list();

    if (pages.length === 0) {
      throw new PageResolutionError(
        "The configured Meta token does not administer any Facebook Page. Grant the operator's Page to this token (pages_show_list) and retry.",
      );
    }

    if (pageId) {
      const match = pages.find((page) => page.id === pageId);

      if (!match) {
        throw new PageResolutionError(
          `No Facebook Page with id ${pageId} is available to this token. Available pages: ${describe(pages)}.`,
        );
      }

      return match;
    }

    if (pages.length === 1) {
      return pages[0] as ResolvedPage;
    }

    throw new PageResolutionError(
      `This token administers ${String(pages.length)} Facebook Pages, so the target is ambiguous. ${advice} Available pages: ${describe(pages)}.`,
    );
  };

  const fromSelection = async (
    selection: StoredPageSelection,
  ): Promise<ResolvedPage> => {
    // The linked Instagram account is not part of the stored selection, so it is filled in from
    // the live directory when a tool actually needs it — see resolveInstagram.
    const instagram = await readInstagramAccount(list, selection.id);

    return {
      id: selection.id,
      name: selection.name,
      instagram,
      client: withTokenInvalidation(
        graph.withToken(selection.accessToken),
        invalidate,
      ),
      accessToken: selection.accessToken,
    };
  };

  return { list, pick, fromSelection };
}

async function readInstagramAccount(
  list: () => Promise<ResolvedPage[]>,
  pageId: string,
): Promise<GraphInstagramAccount | undefined> {
  try {
    const pages = await list();

    return pages.find((page) => page.id === pageId)?.instagram;
  } catch {
    // A Graph outage must not stop a Facebook-only publish from using the stored selection.
    return undefined;
  }
}

function toResolvedPage(
  page: GraphPage,
  graph: GraphClient,
  fallbackToken: string | null,
  invalidate: () => void,
): ResolvedPage {
  // A Page omits access_token when the token holder's role does not expose one; the user
  // token still satisfies read edges and fails write edges with a permission error rather
  // than acting as the wrong identity.
  const accessToken = page.access_token ?? fallbackToken;

  if (!accessToken) {
    throw new MetaTokenMissingError();
  }

  const base = page.access_token ? graph.withToken(page.access_token) : graph;

  return {
    id: page.id,
    name: page.name,
    category: page.category,
    instagram: page.instagram_business_account,
    client: withTokenInvalidation(base, invalidate),
    accessToken,
  };
}

// The cached directory pins a page access token for its lifetime. Without this, once that token
// expires every later call keeps replaying the dead token and the operator has to restart the
// server; dropping the cache on a 190 makes the next call re-resolve fresh page tokens.
function withTokenInvalidation(
  client: GraphClient,
  invalidate: () => void,
): GraphClient {
  const guard = async <T>(run: () => Promise<T>): Promise<T> => {
    try {
      return await run();
    } catch (error) {
      if (error instanceof GraphApiError && error.code === EXPIRED_TOKEN_CODE) {
        invalidate();
      }

      throw error;
    }
  };

  return {
    get: <T>(path: string, params?: GraphParams) =>
      guard(() => client.get<T>(path, params)),
    post: <T>(path: string, params?: GraphParams) =>
      guard(() => client.post<T>(path, params)),
    del: <T>(path: string, params?: GraphParams) =>
      guard(() => client.del<T>(path, params)),
    withToken: (token: string) =>
      withTokenInvalidation(client.withToken(token), invalidate),
  };
}

function describe(pages: ResolvedPage[]): string {
  return pages.map((page) => `${page.name} (${page.id})`).join(", ");
}
