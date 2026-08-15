#!/usr/bin/env node
import { startHttpServer } from "./serve.js";

// Diagnostics go to stderr here too: the stdio entry shares this codebase, and a stray stdout
// write there corrupts the JSON-RPC stream.
startHttpServer().catch((error: unknown) => {
  const detail = error instanceof Error ? error.message : String(error);

  process.stderr.write(`social-mcp http failed to start: ${detail}\n`);
  process.exitCode = 1;
});
