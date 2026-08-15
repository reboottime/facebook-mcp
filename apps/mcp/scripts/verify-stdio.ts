import { fileURLToPath } from "node:url";

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const serverEntry = fileURLToPath(new URL("../dist/index.js", import.meta.url));

const EXPECTED_TOOLS = [
  "health",
  "list_pages",
  "publish_post",
  "publish_reel",
  "publish_instagram",
  "cross_post",
  "list_posts",
  "delete_post",
  "get_insights",
  "list_comments",
  "reply_to_comment",
  "moderate_comment",
];

const SMOKE_CALLS: { name: string; arguments: Record<string, unknown> }[] = [
  { name: "health", arguments: {} },
  { name: "list_pages", arguments: {} },
  { name: "publish_post", arguments: { message: "zero-env smoke" } },
  {
    name: "publish_reel",
    arguments: { video_url: "https://example.com/reel.mp4" },
  },
  {
    name: "publish_instagram",
    arguments: { image_url: "https://example.com/a.jpg" },
  },
  {
    name: "cross_post",
    arguments: { source_platform: "facebook", source_id: "1_2" },
  },
  { name: "list_posts", arguments: {} },
  { name: "delete_post", arguments: { post_id: "1_2" } },
  { name: "get_insights", arguments: { target: "page" } },
  {
    name: "list_comments",
    arguments: { platform: "facebook", object_id: "1_2" },
  },
  {
    name: "reply_to_comment",
    arguments: { platform: "facebook", comment_id: "1_2", message: "hi" },
  },
  {
    name: "moderate_comment",
    arguments: { platform: "facebook", comment_id: "1_2", action: "hide" },
  },
];

// Proves the built server boots and answers with no configuration at all. SOCIAL_MCP_NO_ENV_FILE
// is the only entry: it stops the child from loading apps/mcp/.env.local, so a real operator token
// on disk can never turn these smoke calls into live publishes.
const transport = new StdioClientTransport({
  command: process.execPath,
  args: [serverEntry],
  env: { SOCIAL_MCP_NO_ENV_FILE: "1" },
  stderr: "inherit",
});

const client = new Client({ name: "social-mcp-verify", version: "0.0.0" });
const failures: string[] = [];

await client.connect(transport);

process.stdout.write(
  `initialize -> ${JSON.stringify(client.getServerVersion())}\n\n`,
);

const listed = await client.listTools();
const names = listed.tools.map((tool) => tool.name);

process.stdout.write(`tools/list -> ${String(names.length)} tools\n`);
for (const tool of listed.tools) {
  process.stdout.write(`  ${tool.name} :: ${Object.keys((tool.inputSchema.properties as Record<string, unknown> | undefined) ?? {}).join(", ") || "(no params)"}\n`);
}
process.stdout.write("\n");

for (const expected of EXPECTED_TOOLS) {
  if (!names.includes(expected)) {
    failures.push(`tools/list is missing ${expected}`);
  }
}

if (names.length !== EXPECTED_TOOLS.length) {
  failures.push(
    `tools/list returned ${String(names.length)} tools, expected ${String(EXPECTED_TOOLS.length)}`,
  );
}

for (const call of SMOKE_CALLS) {
  const result = await client.callTool(call);
  const text = firstText(result);

  process.stdout.write(
    `tools/call ${call.name} -> isError=${String(result.isError ?? false)} :: ${text}\n`,
  );

  if (call.name === "health") {
    if (result.isError) {
      failures.push("health returned a tool error with no env");
    }

    const structured = result.structuredContent as
      | { metaAccessToken?: string; graph?: string }
      | undefined;

    if (structured?.metaAccessToken !== "not configured") {
      failures.push(
        `health reported metaAccessToken=${String(structured?.metaAccessToken)}, expected "not configured"`,
      );
    }

    continue;
  }

  if (!result.isError) {
    failures.push(`${call.name} did not report the missing token as a tool error`);
  }

  if (!text.includes("META_ACCESS_TOKEN")) {
    failures.push(`${call.name} error text does not name META_ACCESS_TOKEN`);
  }
}

await client.close();

process.stdout.write(
  `\n${failures.length === 0 ? "zero-env verification PASSED" : `zero-env verification FAILED:\n  ${failures.join("\n  ")}`}\n`,
);

process.exitCode = failures.length === 0 ? 0 : 1;

function firstText(result: Awaited<ReturnType<Client["callTool"]>>): string {
  const content = result.content as { type: string; text?: string }[] | undefined;
  const text = content?.find((item) => item.type === "text")?.text ?? "";

  return text.replace(/\s+/g, " ").slice(0, 160);
}
