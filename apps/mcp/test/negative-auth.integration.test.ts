import { afterAll, beforeAll, describe, expect, it } from "@jest/globals";

import { ALPHA, BOTH_USERS } from "./fixtures.js";
import {
  authorize,
  connectUser,
  CookieJar,
  createPkce,
  openMcpClient,
  registerClient,
  requestToken,
  signInWithFacebook,
  startTestStack,
  type RegisteredClient,
  type TestStack,
} from "./harness.js";

describe("authorization server rejections", () => {
  let stack: TestStack;

  beforeAll(async () => {
    stack = await startTestStack(BOTH_USERS);
  });

  afterAll(async () => {
    await stack.close();
  });

  it("rejects a token request whose code_verifier does not match the challenge", async () => {
    const { client, code } = await authorizedCode(stack);

    const response = await requestToken(stack, {
      grant_type: "authorization_code",
      code,
      code_verifier: createPkce().verifier,
      client_id: client.clientId,
      redirect_uri: client.redirectUri,
    });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe("invalid_grant");
  });

  it("rejects a replayed authorization code and revokes what the first exchange issued", async () => {
    const { client, code, verifier } = await authorizedCode(stack);

    const first = await requestToken(stack, {
      grant_type: "authorization_code",
      code,
      code_verifier: verifier,
      client_id: client.clientId,
      redirect_uri: client.redirectUri,
    });

    expect(first.status).toBe(200);

    const replay = await requestToken(stack, {
      grant_type: "authorization_code",
      code,
      code_verifier: verifier,
      client_id: client.clientId,
      redirect_uri: client.redirectUri,
    });

    expect(replay.status).toBe(400);
    expect(replay.body.error).toBe("invalid_grant");

    // The replay means the code leaked, so the tokens from the first exchange are dead too.
    const response = await fetch(`${stack.baseUrl}/mcp`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${String(first.body.access_token)}`,
        "content-type": "application/json",
        accept: "application/json, text/event-stream",
      },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/list", params: {} }),
    });

    expect(response.status).toBe(401);
  });

  it("revokes the whole family when a rotated refresh token is replayed", async () => {
    const alpha = await connectUser(stack, ALPHA.fbUserId);

    const rotated = await requestToken(stack, {
      grant_type: "refresh_token",
      refresh_token: alpha.refreshToken,
      client_id: alpha.client.clientId,
    });

    expect(rotated.status).toBe(200);

    const replay = await requestToken(stack, {
      grant_type: "refresh_token",
      refresh_token: alpha.refreshToken,
      client_id: alpha.client.clientId,
    });

    expect(replay.status).toBe(400);
    expect(replay.body.error).toBe("invalid_grant");

    // Both the rotated refresh token and the access token it minted are revoked with the family.
    const afterRevocation = await requestToken(stack, {
      grant_type: "refresh_token",
      refresh_token: rotated.body.refresh_token as string,
      client_id: alpha.client.clientId,
    });

    expect(afterRevocation.status).toBe(400);
    expect(afterRevocation.body.error).toBe("invalid_grant");
  });

  it("never accepts an access token from the query string", async () => {
    const alpha = await connectUser(stack, ALPHA.fbUserId);

    // Proves the token is live, so the query-string rejection below is about placement.
    const mcp = await openMcpClient(stack, alpha.accessToken);

    await expect(mcp.listTools()).resolves.toBeDefined();
    await mcp.close();

    const response = await fetch(
      `${stack.baseUrl}/mcp?access_token=${encodeURIComponent(alpha.accessToken)}`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          accept: "application/json, text/event-stream",
        },
        body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/list", params: {} }),
      },
    );

    expect(response.status).toBe(401);
    expect(response.headers.get("www-authenticate")).toContain("resource_metadata=");
  });

  it("rejects an authorization for a resource this server does not serve", async () => {
    const jar = new CookieJar();
    const client = await registerClient(stack.baseUrl);

    await signInWithFacebook(stack, ALPHA.fbUserId, jar);

    const { location } = await authorize(stack, client, createPkce(), jar, {
      resource: "https://someone-else.example/mcp",
    });

    expect(location.searchParams.get("error")).toBe("invalid_target");
    expect(location.searchParams.get("code")).toBeNull();
  });

  it("issues no code when the user declines consent", async () => {
    const jar = new CookieJar();
    const client = await registerClient(stack.baseUrl);

    await signInWithFacebook(stack, ALPHA.fbUserId, jar);

    const { location } = await authorize(stack, client, createPkce(), jar, {
      approve: false,
      state: "declined",
    });

    expect(location.searchParams.get("error")).toBe("access_denied");
    expect(location.searchParams.get("state")).toBe("declined");
    expect(location.searchParams.get("code")).toBeNull();
  });

  it("refuses an unregistered redirect_uri", async () => {
    const client = await registerClient(stack.baseUrl);
    const url = new URL(`${stack.baseUrl}/authorize`);

    url.searchParams.set("response_type", "code");
    url.searchParams.set("client_id", client.clientId);
    url.searchParams.set("redirect_uri", "https://attacker.example/callback");
    url.searchParams.set("code_challenge", createPkce().challenge);
    url.searchParams.set("code_challenge_method", "S256");

    const response = await fetch(url, { redirect: "manual" });

    expect(response.status).toBe(400);
    expect(((await response.json()) as { error: string }).error).toBe(
      "invalid_request",
    );
  });

  it("sends an unauthenticated authorize request through Facebook Login first", async () => {
    const client = await registerClient(stack.baseUrl);
    const url = new URL(`${stack.baseUrl}/authorize`);

    url.searchParams.set("response_type", "code");
    url.searchParams.set("client_id", client.clientId);
    url.searchParams.set("redirect_uri", client.redirectUri);
    url.searchParams.set("code_challenge", createPkce().challenge);
    url.searchParams.set("code_challenge_method", "S256");

    const response = await fetch(url, { redirect: "manual" });

    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toContain("/auth/facebook?next=");
  });
});

async function authorizedCode(
  stack: TestStack,
): Promise<{ client: RegisteredClient; code: string; verifier: string }> {
  const jar = new CookieJar();
  const client = await registerClient(stack.baseUrl);
  const pkce = createPkce();

  await signInWithFacebook(stack, ALPHA.fbUserId, jar);

  const { location } = await authorize(stack, client, pkce, jar);

  return {
    client,
    code: location.searchParams.get("code") as string,
    verifier: pkce.verifier,
  };
}
