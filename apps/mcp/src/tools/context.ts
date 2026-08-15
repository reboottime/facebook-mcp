import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import type { GraphClient } from "../graph/index.js";
import type { PageDirectory, ResolvedPage } from "../services/pages.js";

// Every tool reads its Meta credentials and its Page target through this and nothing else. On
// stdio it is built once from the environment; over HTTP it is built per authenticated request
// from that user's stored tokens, which is what makes cross-user access structurally impossible
// rather than merely checked.
export type ToolContext = {
  serverVersion: string;
  transport: "stdio" | "http";
  authMode: "env-token" | "oauth";
  metaToken: () => string | null;
  graph: GraphClient;
  pages: PageDirectory;
};

// The HTTP context additionally knows who the caller is, which is what `select_page` needs to
// persist a choice against.
export type UserToolContext = ToolContext & {
  userId: string;
  persistSelection: (page: ResolvedPage) => Promise<void>;
};

export type ToolRegistration = (
  server: McpServer,
  context: ToolContext,
) => void;

export type UserToolRegistration = (
  server: McpServer,
  context: UserToolContext,
) => void;

export const PAGE_ID_DESCRIPTION =
  "Facebook Page id to act on, e.g. \"102938475610293\". Omit to use the selected Page, or the only Page this account administers.";
