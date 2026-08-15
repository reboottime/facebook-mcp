import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { describe, expect, it, beforeEach, afterEach } from "@jest/globals";

import { createServer } from "./server.js";

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

describe("createServer", () => {
  const savedToken = process.env.META_ACCESS_TOKEN;
  const savedPageId = process.env.META_PAGE_ID;

  beforeEach(() => {
    delete process.env.META_ACCESS_TOKEN;
    delete process.env.META_PAGE_ID;
  });

  afterEach(() => {
    if (savedToken === undefined) delete process.env.META_ACCESS_TOKEN;
    else process.env.META_ACCESS_TOKEN = savedToken;
    if (savedPageId === undefined) delete process.env.META_PAGE_ID;
    else process.env.META_PAGE_ID = savedPageId;
  });

  it("constructs and lists all 12 registered tools, including health", async () => {
    const server = createServer();
    const [serverTransport, clientTransport] = InMemoryTransport.createLinkedPair();
    const client = new Client({ name: "test-client", version: "0.0.0" });

    await Promise.all([
      server.connect(serverTransport),
      client.connect(clientTransport),
    ]);

    const { tools } = await client.listTools();
    const names = tools.map((tool) => tool.name).sort();

    expect(names).toEqual([...EXPECTED_TOOLS].sort());

    await client.close();
  });
});
