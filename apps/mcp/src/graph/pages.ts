import type { GraphClient } from "./client.js";

export type GraphInstagramAccount = {
  id: string;
  username?: string;
};

export type GraphPage = {
  id: string;
  name: string;
  category?: string;
  access_token?: string;
  instagram_business_account?: GraphInstagramAccount;
};

const PAGE_FIELDS =
  "id,name,category,access_token,instagram_business_account{id,username}";

export async function listManagedPages(
  graph: GraphClient,
): Promise<GraphPage[]> {
  const response = await graph.get<{ data?: GraphPage[] }>("me/accounts", {
    fields: PAGE_FIELDS,
    limit: 100,
  });

  return response.data ?? [];
}

export async function readTokenHolderName(
  graph: GraphClient,
): Promise<string | undefined> {
  const holder = await graph.get<{ name?: string }>("me", { fields: "name" });

  return holder.name;
}
