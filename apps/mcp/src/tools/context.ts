import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import type { Env } from "../env.js";
import type { GraphClient } from "../graph/index.js";
import type { PageDirectory } from "../services/pages.js";

export type ToolContext = {
  serverVersion: string;
  env: Env;
  graph: GraphClient;
  pages: PageDirectory;
};

export type ToolRegistration = (
  server: McpServer,
  context: ToolContext,
) => void;

export const PAGE_ID_DESCRIPTION =
  "Facebook Page id to act on, e.g. \"102938475610293\". Omit to use META_PAGE_ID, or the only Page this token administers.";
