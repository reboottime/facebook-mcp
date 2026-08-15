import { afterAll, beforeAll, describe, expect, it } from "@jest/globals";

import { pageTokenFor } from "./fake-meta.js";
import { ALPHA, BOTH_USERS } from "./fixtures.js";
import {
  authorize,
  CookieJar,
  createPkce,
  discoverProtectedResource,
  openMcpClient,
  readAuthorizationServerMetadata,
  registerClient,
  requestToken,
  signInWithFacebook,
  startTestStack,
  structured,
  type TestStack,
} from "./harness.js";

// The whole phase-2 journey against the in-process fake Meta: register with Facebook, discover
// authorization from a 401, register the MCP client, authorize with PKCE, exchange the code,
// open an MCP session, pick a Page, and publish with that Page's token.
describe("remote MCP journey", () => {
  let stack: TestStack;

  beforeAll(async () => {
    stack = await startTestStack(BOTH_USERS);
  });

  afterAll(async () => {
    await stack.close();
  });

  it("carries one user from Facebook login to a published post", async () => {
    const jar = new CookieJar();

    // 1. An unauthenticated /mcp must 401 and point at protected-resource metadata.
    const { wwwAuthenticate, metadata } = await discoverProtectedResource(
      stack.baseUrl,
    );

    expect(wwwAuthenticate).toContain("Bearer");
    expect(wwwAuthenticate).toContain("resource_metadata=");
    expect(metadata.resource).toBe(`${stack.baseUrl}/mcp`);
    expect(metadata.authorization_servers).toEqual([`${stack.baseUrl}/`]);

    // 2. Authorization server metadata (RFC 8414).
    const asMetadata = await readAuthorizationServerMetadata(stack.baseUrl);

    expect(asMetadata.issuer).toBe(`${stack.baseUrl}/`);
    expect(asMetadata.code_challenge_methods_supported).toEqual(["S256"]);
    expect(asMetadata.authorization_response_iss_parameter_supported).toBe(true);
    expect(asMetadata.registration_endpoint).toBe(`${stack.baseUrl}/register`);

    // 3. Dynamic client registration.
    const client = await registerClient(stack.baseUrl);

    expect(client.clientId).toBeTruthy();

    // 4. Facebook Login is the registration step, and it seats a browser session.
    await signInWithFacebook(stack, ALPHA.fbUserId, jar);
    expect(jar.has("smcp_session")).toBe(true);

    // 5. Consent + authorization code, with the RFC 9207 issuer on the response.
    const pkce = createPkce();
    const { location } = await authorize(stack, client, pkce, jar, {
      state: "state-alpha",
      resource: `${stack.baseUrl}/mcp`,
    });

    expect(location.origin + location.pathname).toBe(client.redirectUri);
    expect(location.searchParams.get("state")).toBe("state-alpha");
    expect(location.searchParams.get("iss")).toBe(stack.baseUrl);

    const code = location.searchParams.get("code");

    expect(code).toBeTruthy();

    // 6. Token exchange.
    const token = await requestToken(stack, {
      grant_type: "authorization_code",
      code: code as string,
      code_verifier: pkce.verifier,
      client_id: client.clientId,
      redirect_uri: client.redirectUri,
      resource: `${stack.baseUrl}/mcp`,
    });

    expect(token.status).toBe(200);
    expect(token.body.token_type).toBe("Bearer");
    expect(token.body.expires_in).toBe(3600);
    expect(typeof token.body.refresh_token).toBe("string");

    // 7. MCP session over Streamable HTTP.
    const mcp = await openMcpClient(stack, token.body.access_token as string);
    const listed = await mcp.listTools();
    const names = listed.tools.map((tool) => tool.name);

    expect(names).toContain("select_page");
    expect(names).toHaveLength(13);

    // 8. The Pages come from this user's own Meta token.
    const pages = structured<{
      pages: { id: string; name: string }[];
    }>(await mcp.callTool({ name: "list_pages", arguments: {} }));

    expect(pages.pages.map((page) => page.id)).toEqual([
      "page-alpha-main",
      "page-alpha-side",
    ]);

    // 9. Selection persists for this user.
    const selection = structured<{ selected: { id: string; name: string } }>(
      await mcp.callTool({
        name: "select_page",
        arguments: { page_id: "page-alpha-side" },
      }),
    );

    expect(selection.selected).toMatchObject({
      id: "page-alpha-side",
      name: "Alpha Side Project",
    });

    const health = structured<{
      transport: string;
      authMode: string;
      pageSelected: boolean;
      page?: { id: string };
    }>(await mcp.callTool({ name: "health", arguments: {} }));

    expect(health).toMatchObject({
      transport: "http",
      authMode: "oauth",
      pageSelected: true,
    });
    expect(health.page?.id).toBe("page-alpha-side");

    // 10. Publishing targets the selected Page with that Page's own token.
    const published = structured<{ id: string; page: { id: string }; verified: boolean }>(
      await mcp.callTool({
        name: "publish_post",
        arguments: { message: "hello from the integration test" },
      }),
    );

    expect(published.page.id).toBe("page-alpha-side");
    expect(published.verified).toBe(true);

    expect(stack.fake.publishes).toHaveLength(1);
    expect(stack.fake.publishes[0]).toMatchObject({
      pageId: "page-alpha-side",
      message: "hello from the integration test",
      accessToken: pageTokenFor(ALPHA.fbUserId, "page-alpha-side"),
    });

    await mcp.close();
  });

  it("rotates the refresh token and keeps the new access token working", async () => {
    const jar = new CookieJar();
    const client = await registerClient(stack.baseUrl);
    const pkce = createPkce();

    await signInWithFacebook(stack, ALPHA.fbUserId, jar);

    const { location } = await authorize(stack, client, pkce, jar);
    const first = await requestToken(stack, {
      grant_type: "authorization_code",
      code: location.searchParams.get("code") as string,
      code_verifier: pkce.verifier,
      client_id: client.clientId,
      redirect_uri: client.redirectUri,
    });

    const refreshed = await requestToken(stack, {
      grant_type: "refresh_token",
      refresh_token: first.body.refresh_token as string,
      client_id: client.clientId,
    });

    expect(refreshed.status).toBe(200);
    expect(refreshed.body.refresh_token).not.toBe(first.body.refresh_token);

    const mcp = await openMcpClient(stack, refreshed.body.access_token as string);

    await expect(mcp.listTools()).resolves.toBeDefined();
    await mcp.close();
  });
});
