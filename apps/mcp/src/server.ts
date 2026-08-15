import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import { readEnv } from "./env.js";
import { createGraphClient, type GraphClient } from "./graph/index.js";
import {
  createPageDirectory,
  type PageDirectory,
  type ResolvedPage,
} from "./services/pages.js";
import { registerTools, registerUserTools } from "./tools/index.js";
import { SERVER_NAME, SERVER_VERSION } from "./version.js";

// stdio: one operator, credentials from the environment, no account system.
export function createServer(): McpServer {
  const env = readEnv();
  const server = new McpServer({ name: SERVER_NAME, version: SERVER_VERSION });
  const graph = createGraphClient(() => env.metaAccessToken);

  registerTools(server, {
    serverVersion: SERVER_VERSION,
    transport: "stdio",
    authMode: "env-token",
    metaToken: () => env.metaAccessToken,
    graph,
    pages: createPageDirectory(graph, env),
  });

  return server;
}

export type UserServerDeps = {
  userId: string;
  metaAccessToken: string | null;
  graph: GraphClient;
  pages: PageDirectory;
  persistSelection: (page: ResolvedPage) => Promise<void>;
};

// HTTP: one server instance per authenticated request, wired to exactly one user's decrypted
// credentials. Nothing here is shared between calls, so there is no cache or client another user's
// request could reach.
export function createUserServer(deps: UserServerDeps): McpServer {
  const server = new McpServer({ name: SERVER_NAME, version: SERVER_VERSION });

  registerUserTools(server, {
    serverVersion: SERVER_VERSION,
    transport: "http",
    authMode: "oauth",
    metaToken: () => deps.metaAccessToken,
    graph: deps.graph,
    pages: deps.pages,
    userId: deps.userId,
    persistSelection: deps.persistSelection,
  });

  return server;
}
