#!/usr/bin/env node
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

import { createServer } from "./server.js";

async function main(): Promise<void> {
  const server = createServer();
  await server.connect(new StdioServerTransport());
}

// stdout carries the JSON-RPC stream — every diagnostic goes to stderr or the client's parser breaks.
main().catch((error: unknown) => {
  const detail = error instanceof Error ? error.message : String(error);
  process.stderr.write(`social-mcp failed to start: ${detail}\n`);
  process.exitCode = 1;
});
