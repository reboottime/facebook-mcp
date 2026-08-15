import { createHash, randomBytes } from "node:crypto";
import { createServer } from "node:net";
import type { AddressInfo } from "node:net";

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

import { startHttpServer } from "../src/http/serve.js";
import { startFakeMeta, type FakeMeta, type FakeMetaUser } from "./fake-meta.js";

// Belt and braces on top of the per-test overrides: no harness process may read the operator's
// real apps/mcp/.env.local, so a real Meta token on disk can never reach these tests. Set at
// module scope, which runs before any test calls startTestStack.
process.env.SOCIAL_MCP_NO_ENV_FILE = "1";

export const TEST_APP_ID = "fake-app-id";
export const TEST_APP_SECRET = "fake-app-secret";
export const GRAPH_VERSION = "v26.0";

export type TestStack = {
  baseUrl: string;
  fake: FakeMeta;
  close: () => Promise<void>;
};

export async function startTestStack(users: FakeMetaUser[]): Promise<TestStack> {
  const fake = await startFakeMeta({
    appId: TEST_APP_ID,
    appSecret: TEST_APP_SECRET,
    users,
    apiVersion: GRAPH_VERSION,
  });

  const port = await freePort();
  const publicUrl = new URL(`http://127.0.0.1:${String(port)}`);

  const running = await startHttpServer({
    port,
    host: "127.0.0.1",
    publicUrl,
    fbAppId: TEST_APP_ID,
    fbAppSecret: TEST_APP_SECRET,
    // Never a real database, never a key from the environment: each stack gets its own in-memory
    // PGlite and its own encryption key.
    databaseUrl: null,
    tokenEncryptionKey: randomBytes(32).toString("base64"),
    facebookBaseUrl: fake.baseUrl,
    graphBaseUrl: fake.baseUrl,
    allowedOrigins: [publicUrl.origin],
  });

  return {
    baseUrl: publicUrl.origin,
    fake,
    close: async () => {
      await running.close();
      await fake.close();
    },
  };
}

// A cookie jar is what makes the browser half of the flow real: the session and login-state
// cookies are the only things tying /authorize to a signed-in Facebook identity.
export class CookieJar {
  private readonly cookies = new Map<string, string>();

  absorb(response: Response): void {
    for (const raw of response.headers.getSetCookie()) {
      const [pair] = raw.split(";");
      const separator = pair?.indexOf("=") ?? -1;

      if (!pair || separator === -1) {
        continue;
      }

      const name = pair.slice(0, separator).trim();
      const value = pair.slice(separator + 1).trim();

      if (value === "") {
        this.cookies.delete(name);
      } else {
        this.cookies.set(name, value);
      }
    }
  }

  header(): string {
    return [...this.cookies]
      .map(([name, value]) => `${name}=${value}`)
      .join("; ");
  }

  has(name: string): boolean {
    return this.cookies.has(name);
  }
}

export type Pkce = {
  verifier: string;
  challenge: string;
};

export function createPkce(): Pkce {
  const verifier = randomBytes(32).toString("base64url");

  return {
    verifier,
    challenge: createHash("sha256").update(verifier).digest("base64url"),
  };
}

export const REDIRECT_URI = "http://127.0.0.1:41234/callback";

export type RegisteredClient = {
  clientId: string;
  redirectUri: string;
};

export async function discoverProtectedResource(
  baseUrl: string,
): Promise<{ wwwAuthenticate: string; metadata: Record<string, unknown> }> {
  const unauthorized = await fetch(`${baseUrl}/mcp`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(initializeRequest()),
  });

  if (unauthorized.status !== 401) {
    throw new Error(
      `Expected 401 from an unauthenticated /mcp, got ${String(unauthorized.status)}.`,
    );
  }

  const wwwAuthenticate = unauthorized.headers.get("www-authenticate") ?? "";
  const resourceMetadataUrl = /resource_metadata="([^"]+)"/.exec(wwwAuthenticate)?.[1];

  if (!resourceMetadataUrl) {
    throw new Error(
      `401 did not advertise resource_metadata: ${wwwAuthenticate}`,
    );
  }

  const metadata = (await (await fetch(resourceMetadataUrl)).json()) as Record<
    string,
    unknown
  >;

  return { wwwAuthenticate, metadata };
}

export async function readAuthorizationServerMetadata(
  issuer: string,
): Promise<Record<string, unknown>> {
  const response = await fetch(`${issuer}/.well-known/oauth-authorization-server`);

  return (await response.json()) as Record<string, unknown>;
}

export async function registerClient(
  baseUrl: string,
  redirectUri = REDIRECT_URI,
): Promise<RegisteredClient> {
  const response = await fetch(`${baseUrl}/register`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      client_name: "Integration Test Client",
      redirect_uris: [redirectUri],
      grant_types: ["authorization_code", "refresh_token"],
      response_types: ["code"],
      token_endpoint_auth_method: "none",
    }),
  });

  if (response.status !== 201) {
    throw new Error(
      `Dynamic client registration failed with ${String(response.status)}: ${await response.text()}`,
    );
  }

  const client = (await response.json()) as { client_id: string };

  return { clientId: client.client_id, redirectUri };
}

// Steps 1 and 3 of the product state machine, driven the way a browser drives them: Facebook
// Login first, then our own consent page.
export async function signInWithFacebook(
  stack: TestStack,
  fbUserId: string,
  jar: CookieJar,
): Promise<void> {
  stack.fake.loginAs(fbUserId);

  const start = await fetch(`${stack.baseUrl}/auth/facebook?next=%2F`, {
    redirect: "manual",
    headers: { cookie: jar.header() },
  });

  jar.absorb(start);

  const dialogUrl = start.headers.get("location");

  if (!dialogUrl) {
    throw new Error("/auth/facebook did not redirect to the Facebook dialog.");
  }

  const dialog = await fetch(dialogUrl, { redirect: "manual" });
  const callbackUrl = dialog.headers.get("location");

  if (!callbackUrl) {
    throw new Error("The Facebook dialog did not redirect back to the callback.");
  }

  const callback = await fetch(callbackUrl, {
    redirect: "manual",
    headers: { cookie: jar.header() },
  });

  jar.absorb(callback);

  if (callback.status !== 302) {
    throw new Error(
      `Facebook callback failed with ${String(callback.status)}: ${await callback.text()}`,
    );
  }
}

export type AuthorizationResult = {
  location: URL;
  status: number;
};

export async function authorize(
  stack: TestStack,
  client: RegisteredClient,
  pkce: Pkce,
  jar: CookieJar,
  options: { state?: string; resource?: string; approve?: boolean } = {},
): Promise<AuthorizationResult> {
  const url = new URL(`${stack.baseUrl}/authorize`);

  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", client.clientId);
  url.searchParams.set("redirect_uri", client.redirectUri);
  url.searchParams.set("code_challenge", pkce.challenge);
  url.searchParams.set("code_challenge_method", "S256");

  if (options.state) {
    url.searchParams.set("state", options.state);
  }

  if (options.resource) {
    url.searchParams.set("resource", options.resource);
  }

  const consent = await fetch(url, {
    redirect: "manual",
    headers: { cookie: jar.header() },
  });

  jar.absorb(consent);

  if (consent.status === 302) {
    return {
      status: consent.status,
      location: new URL(consent.headers.get("location") as string),
    };
  }

  const html = await consent.text();
  const grant = /name="grant" value="([^"]+)"/.exec(html)?.[1];

  if (!grant) {
    throw new Error(`The consent page carried no sealed grant: ${html.slice(0, 400)}`);
  }

  const decided = await fetch(`${stack.baseUrl}/authorize/consent`, {
    method: "POST",
    redirect: "manual",
    headers: {
      cookie: jar.header(),
      "content-type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant: decodeHtml(grant),
      action: options.approve === false ? "deny" : "approve",
    }).toString(),
  });

  jar.absorb(decided);

  return {
    status: decided.status,
    location: new URL(decided.headers.get("location") as string),
  };
}

export type TokenResponse = {
  status: number;
  body: Record<string, unknown>;
};

export async function requestToken(
  stack: TestStack,
  form: Record<string, string>,
): Promise<TokenResponse> {
  const response = await fetch(`${stack.baseUrl}/token`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(form).toString(),
  });

  return {
    status: response.status,
    body: (await response.json()) as Record<string, unknown>,
  };
}

// The full journey in one call, for the tests whose subject is what happens *after* authorization.
export async function connectUser(
  stack: TestStack,
  fbUserId: string,
): Promise<{ accessToken: string; refreshToken: string; client: RegisteredClient }> {
  const jar = new CookieJar();
  const client = await registerClient(stack.baseUrl);
  const pkce = createPkce();

  await signInWithFacebook(stack, fbUserId, jar);

  const { location } = await authorize(stack, client, pkce, jar);
  const code = location.searchParams.get("code");

  if (!code) {
    throw new Error(`Authorization returned no code: ${location.href}`);
  }

  const token = await requestToken(stack, {
    grant_type: "authorization_code",
    code,
    code_verifier: pkce.verifier,
    client_id: client.clientId,
    redirect_uri: client.redirectUri,
  });

  if (token.status !== 200) {
    throw new Error(`Token request failed: ${JSON.stringify(token.body)}`);
  }

  return {
    accessToken: token.body.access_token as string,
    refreshToken: token.body.refresh_token as string,
    client,
  };
}

export async function openMcpClient(
  stack: TestStack,
  accessToken: string,
): Promise<Client> {
  const client = new Client({ name: "integration-test", version: "0.0.0" });

  await client.connect(
    new StreamableHTTPClientTransport(new URL(`${stack.baseUrl}/mcp`), {
      requestInit: { headers: { authorization: `Bearer ${accessToken}` } },
    }),
  );

  return client;
}

export function initializeRequest(): Record<string, unknown> {
  return {
    jsonrpc: "2.0",
    id: 1,
    method: "initialize",
    params: {
      protocolVersion: "2025-06-18",
      capabilities: {},
      clientInfo: { name: "raw-probe", version: "0.0.0" },
    },
  };
}

// `callTool` widens to a union that still carries the legacy `toolResult` shape, so these three
// read the result through one narrow lens instead of every assertion re-narrowing it.
export function structured<T>(result: unknown): T {
  return (result as { structuredContent?: unknown }).structuredContent as T;
}

export function isToolError(result: unknown): boolean {
  return (result as { isError?: boolean }).isError === true;
}

export function toolText(result: unknown): string {
  const content = (result as { content?: { type: string; text?: string }[] })
    .content;

  return content?.find((item) => item.type === "text")?.text ?? "";
}

async function freePort(): Promise<number> {
  const probe = createServer();

  await new Promise<void>((resolve) => {
    probe.listen(0, "127.0.0.1", resolve);
  });

  const { port } = probe.address() as AddressInfo;

  await new Promise<void>((resolve) => {
    probe.close(() => {
      resolve();
    });
  });

  return port;
}

function decodeHtml(value: string): string {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}
