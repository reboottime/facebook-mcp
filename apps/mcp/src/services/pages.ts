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
};

export function createPageDirectory(
  graph: GraphClient,
  env: Env,
): PageDirectory {
  // Page access tokens are fetched once per process; a failed lookup drops the cache so the
  // next call retries instead of pinning a transient Graph outage.
  let cached: Promise<ResolvedPage[]> | null = null;

  const invalidate = (): void => {
    cached = null;
  };

  const list = (): Promise<ResolvedPage[]> => {
    cached ??= listManagedPages(graph)
      .then((pages) =>
        pages.map((page) => toResolvedPage(page, graph, env, invalidate)),
      )
      .catch((error: unknown) => {
        cached = null;
        throw error;
      });

    return cached;
  };

  const resolve = async (pageId?: string): Promise<ResolvedPage> => {
    const pages = await list();

    if (pages.length === 0) {
      throw new PageResolutionError(
        "The configured Meta token does not administer any Facebook Page. Grant the operator's Page to this token (pages_show_list) and retry.",
      );
    }

    const requested = pageId ?? env.metaPageId ?? undefined;

    if (requested) {
      const match = pages.find((page) => page.id === requested);

      if (!match) {
        throw new PageResolutionError(
          `No Facebook Page with id ${requested} is available to this token. Available pages: ${describe(pages)}.`,
        );
      }

      return match;
    }

    if (pages.length === 1) {
      return pages[0] as ResolvedPage;
    }

    throw new PageResolutionError(
      `This token administers ${String(pages.length)} Facebook Pages, so the target is ambiguous. Pass page_id, or set META_PAGE_ID in apps/mcp/.env.local. Available pages: ${describe(pages)}.`,
    );
  };

  const resolveInstagram = async (
    pageId?: string,
  ): Promise<ResolvedInstagramAccount> => {
    const page = await resolve(pageId);

    if (!page.instagram) {
      throw new PageResolutionError(
        `Facebook Page "${page.name}" (${page.id}) has no linked Instagram Business account. Link one in Meta Business settings, then retry.`,
      );
    }

    return { account: page.instagram, page };
  };

  return { list, resolve, resolveInstagram };
}

function toResolvedPage(
  page: GraphPage,
  graph: GraphClient,
  env: Env,
  invalidate: () => void,
): ResolvedPage {
  // A Page omits access_token when the token holder's role does not expose one; the user
  // token still satisfies read edges and fails write edges with a permission error rather
  // than acting as the wrong identity.
  const accessToken = page.access_token ?? env.metaAccessToken;

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

// The cached directory pins a page access token for the process lifetime. Without this, once that
// token expires every later call keeps replaying the dead token and the operator has to restart
// the server; dropping the cache on a 190 makes the next call re-resolve fresh page tokens.
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
