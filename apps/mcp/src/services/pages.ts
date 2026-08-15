import type { Env } from "../env.js";
import { PageResolutionError } from "../errors.js";
import {
  listManagedPages,
  MetaTokenMissingError,
  type GraphClient,
  type GraphInstagramAccount,
  type GraphPage,
} from "../graph/index.js";

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

  const list = (): Promise<ResolvedPage[]> => {
    cached ??= listManagedPages(graph)
      .then((pages) => pages.map((page) => toResolvedPage(page, graph, env)))
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
): ResolvedPage {
  // A Page omits access_token when the token holder's role does not expose one; the user
  // token still satisfies read edges and fails write edges with a permission error rather
  // than acting as the wrong identity.
  const accessToken = page.access_token ?? env.metaAccessToken;

  if (!accessToken) {
    throw new MetaTokenMissingError();
  }

  return {
    id: page.id,
    name: page.name,
    category: page.category,
    instagram: page.instagram_business_account,
    client: page.access_token ? graph.withToken(page.access_token) : graph,
    accessToken,
  };
}

function describe(pages: ResolvedPage[]): string {
  return pages.map((page) => `${page.name} (${page.id})`).join(", ");
}
