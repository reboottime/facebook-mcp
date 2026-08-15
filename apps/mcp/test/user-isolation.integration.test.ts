import { afterAll, beforeAll, describe, expect, it } from "@jest/globals";

import { longLivedTokenFor, pageTokenFor } from "./fake-meta.js";
import { ALPHA, BETA, BOTH_USERS } from "./fixtures.js";
import {
  connectUser,
  isToolError,
  openMcpClient,
  startTestStack,
  structured,
  toolText,
  type TestStack,
} from "./harness.js";

// Two users on one server. Everything a tool reads — Meta token, Page list, Page selection — is
// keyed by the identity inside the bearer token, so neither user can reach the other's accounts
// even when they name the other's Page id explicitly.
describe("per-user isolation", () => {
  let stack: TestStack;

  beforeAll(async () => {
    stack = await startTestStack(BOTH_USERS);
  });

  afterAll(async () => {
    await stack.close();
  });

  it("keeps two users' Pages, selections, and tokens apart", async () => {
    const alpha = await connectUser(stack, ALPHA.fbUserId);
    const beta = await connectUser(stack, BETA.fbUserId);

    expect(alpha.accessToken).not.toBe(beta.accessToken);

    const alphaMcp = await openMcpClient(stack, alpha.accessToken);
    const betaMcp = await openMcpClient(stack, beta.accessToken);

    const alphaPages = structured<{ pages: { id: string }[] }>(
      await alphaMcp.callTool({ name: "list_pages", arguments: {} }),
    );
    const betaPages = structured<{ pages: { id: string }[] }>(
      await betaMcp.callTool({ name: "list_pages", arguments: {} }),
    );

    expect(alphaPages.pages.map((page) => page.id)).toEqual([
      "page-alpha-main",
      "page-alpha-side",
    ]);
    expect(betaPages.pages.map((page) => page.id)).toEqual(["page-beta-main"]);

    // Selections are independent and simultaneous.
    await alphaMcp.callTool({
      name: "select_page",
      arguments: { page_id: "page-alpha-main" },
    });
    await betaMcp.callTool({
      name: "select_page",
      arguments: { page_id: "page-beta-main" },
    });

    const alphaHealth = structured<{ page?: { id: string } }>(
      await alphaMcp.callTool({ name: "health", arguments: {} }),
    );
    const betaHealth = structured<{ page?: { id: string } }>(
      await betaMcp.callTool({ name: "health", arguments: {} }),
    );

    expect(alphaHealth.page?.id).toBe("page-alpha-main");
    expect(betaHealth.page?.id).toBe("page-beta-main");

    // Confused deputy: Beta names Alpha's Page id directly. It is looked up in Beta's own
    // /me/accounts, is not there, and the selection is refused.
    const stolen = await betaMcp.callTool({
      name: "select_page",
      arguments: { page_id: "page-alpha-main" },
    });

    expect(isToolError(stolen)).toBe(true);
    expect(toolText(stolen)).toContain("page-alpha-main");

    const publishAttempt = await betaMcp.callTool({
      name: "publish_post",
      arguments: { page_id: "page-alpha-main", message: "not mine" },
    });

    expect(isToolError(publishAttempt)).toBe(true);

    // Each publish carried its own owner's Page token; nothing was published to Alpha's Page.
    await alphaMcp.callTool({
      name: "publish_post",
      arguments: { message: "alpha post" },
    });
    await betaMcp.callTool({
      name: "publish_post",
      arguments: { message: "beta post" },
    });

    expect(stack.fake.publishes).toEqual([
      expect.objectContaining({
        pageId: "page-alpha-main",
        accessToken: pageTokenFor(ALPHA.fbUserId, "page-alpha-main"),
      }),
      expect.objectContaining({
        pageId: "page-beta-main",
        accessToken: pageTokenFor(BETA.fbUserId, "page-beta-main"),
      }),
    ]);

    await alphaMcp.close();
    await betaMcp.close();
  });

  it("rejects a tampered access token and a Facebook token used as an MCP bearer", async () => {
    const alpha = await connectUser(stack, ALPHA.fbUserId);
    const tampered = `${alpha.accessToken.slice(0, -2)}XY`;

    await expect(callRaw(stack, tampered)).resolves.toBe(401);

    // MCP servers "MUST NOT accept or transit any other tokens": a Facebook user token and a
    // Facebook Page token are credentials for a different system and have no standing here.
    await expect(
      callRaw(stack, longLivedTokenFor(ALPHA.fbUserId)),
    ).resolves.toBe(401);
    await expect(
      callRaw(stack, pageTokenFor(ALPHA.fbUserId, "page-alpha-main")),
    ).resolves.toBe(401);
  });
});

async function callRaw(stack: TestStack, bearer: string): Promise<number> {
  const response = await fetch(`${stack.baseUrl}/mcp`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${bearer}`,
      "content-type": "application/json",
      accept: "application/json, text/event-stream",
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "tools/list",
      params: {},
    }),
  });

  return response.status;
}
