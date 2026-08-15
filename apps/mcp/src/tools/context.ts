import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import type { Env } from "../env.js";
import type { GraphClient } from "../graph/index.js";

export type ToolContext = {
  serverVersion: string;
  env: Env;
  graph: GraphClient;
};

export type ToolRegistration = (
  server: McpServer,
  context: ToolContext,
) => void;
