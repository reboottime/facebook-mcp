import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import { readEnv } from "./env.js";
import { createGraphClient } from "./graph/index.js";
import { registerTools } from "./tools/index.js";
import { SERVER_NAME, SERVER_VERSION } from "./version.js";

export function createServer(): McpServer {
  const env = readEnv();
  const server = new McpServer({ name: SERVER_NAME, version: SERVER_VERSION });

  registerTools(server, {
    serverVersion: SERVER_VERSION,
    env,
    graph: createGraphClient(() => env.metaAccessToken),
  });

  return server;
}
