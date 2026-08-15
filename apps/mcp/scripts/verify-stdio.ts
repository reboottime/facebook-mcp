import { fileURLToPath } from "node:url";

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const serverEntry = fileURLToPath(new URL("../dist/index.js", import.meta.url));

// Empty env: proves the built server boots and answers with no configuration at all.
const transport = new StdioClientTransport({
  command: process.execPath,
  args: [serverEntry],
  env: {},
  stderr: "inherit",
});

const client = new Client({ name: "social-mcp-verify", version: "0.0.0" });

await client.connect(transport);

process.stdout.write(
  `initialize -> ${JSON.stringify(client.getServerVersion(), null, 2)}\n`,
);

const listed = await client.listTools();
process.stdout.write(`tools/list -> ${JSON.stringify(listed, null, 2)}\n`);

const called = await client.callTool({ name: "health", arguments: {} });
process.stdout.write(
  `tools/call health -> ${JSON.stringify(called, null, 2)}\n`,
);

await client.close();
