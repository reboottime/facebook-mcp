import { readTokenHolderName, type GraphClient } from "../graph/index.js";
import type { PageDirectory } from "./pages.js";

export type HealthReport = {
  metaAccessToken: "configured" | "not configured";
  graph: "ok" | "unreachable" | "not checked";
  tokenHolder?: string;
  pagesCount?: number;
  page?: { id: string; name: string };
  instagramLinked?: boolean;
  detail?: string;
};

export type HealthInput = {
  metaToken: string | null;
  graph: GraphClient;
  pages: PageDirectory;
};

// Health never fails: an unreachable Graph is itself the answer the operator is asking for.
export async function readHealth(input: HealthInput): Promise<HealthReport> {
  if (!input.metaToken) {
    return { metaAccessToken: "not configured", graph: "not checked" };
  }

  try {
    const [tokenHolder, managed] = await Promise.all([
      readTokenHolderName(input.graph),
      input.pages.list(),
    ]);
    const resolved = await input.pages.resolve().catch(() => undefined);

    return {
      metaAccessToken: "configured",
      graph: "ok",
      tokenHolder,
      pagesCount: managed.length,
      page: resolved ? { id: resolved.id, name: resolved.name } : undefined,
      instagramLinked: resolved ? Boolean(resolved.instagram) : undefined,
    };
  } catch (error) {
    return {
      metaAccessToken: "configured",
      graph: "unreachable",
      detail: error instanceof Error ? error.message : String(error),
    };
  }
}
