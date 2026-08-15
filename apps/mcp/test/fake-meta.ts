import { createHmac } from "node:crypto";
import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import type { AddressInfo } from "node:net";

// An in-process stand-in for Meta's OAuth dialog and Graph API. Test-only: nothing under src/
// imports it, and neither shipped entry can start it. It exists so the entire phase-2 journey can
// be exercised end to end without app credentials and without a single live Meta call.

export type FakePage = {
  id: string;
  name: string;
  category?: string;
  instagram?: { id: string; username: string };
};

export type FakeMetaUser = {
  fbUserId: string;
  name: string;
  pages: FakePage[];
};

export type RecordedPublish = {
  pageId: string;
  accessToken: string;
  message?: string;
  postId: string;
};

export type FakeMetaOptions = {
  appId: string;
  appSecret: string;
  users: FakeMetaUser[];
  apiVersion: string;
};

export type FakeMeta = {
  baseUrl: string;
  // The dialog auto-approves; this is how a test says which fixture human is at the keyboard.
  loginAs: (fbUserId: string) => void;
  publishes: RecordedPublish[];
  requests: { method: string; path: string }[];
  close: () => Promise<void>;
};

// Token shapes are deliberately readable so a failing assertion says which credential was used.
const SHORT_LIVED = (fbUserId: string): string => `fb-short.${fbUserId}`;
const LONG_LIVED = (fbUserId: string): string => `fb-long.${fbUserId}`;
const PAGE_TOKEN = (fbUserId: string, pageId: string): string =>
  `fb-page.${fbUserId}.${pageId}`;

export async function startFakeMeta(
  options: FakeMetaOptions,
): Promise<FakeMeta> {
  const publishes: RecordedPublish[] = [];
  const requests: { method: string; path: string }[] = [];
  const posts = new Map<string, { message?: string; pageId: string }>();
  let nextLogin = options.users[0]?.fbUserId ?? "unknown";
  let counter = 0;

  const usersById = new Map(options.users.map((user) => [user.fbUserId, user]));

  const server = createServer((req, res) => {
    const url = new URL(req.url ?? "/", "http://fake-meta.local");

    requests.push({ method: req.method ?? "GET", path: url.pathname });

    void handle(req, res, url).catch(() => {
      sendError(res, 500, "Fake Meta failed to handle the request.");
    });
  });

  async function handle(
    req: IncomingMessage,
    res: ServerResponse,
    url: URL,
  ): Promise<void> {
    const prefix = `/${options.apiVersion}`;

    if (!url.pathname.startsWith(prefix)) {
      sendError(res, 404, `Unknown fake Meta path ${url.pathname}.`);

      return;
    }

    const path = url.pathname.slice(prefix.length + 1);
    const body = req.method === "POST" ? await readBody(req) : new URLSearchParams();
    const params = new URLSearchParams([...url.searchParams, ...body]);

    if (path === "dialog/oauth") {
      handleDialog(res, params);

      return;
    }

    if (path === "oauth/access_token") {
      handleTokenExchange(res, params);

      return;
    }

    const token = readBearer(req);

    if (!token) {
      sendGraphError(res, 401, "An access token is required to request this resource.", 190);

      return;
    }

    // Security carry-forward: once an app secret exists every Graph call must carry a
    // well-formed appsecret_proof. The fake rejects a call that omits it or gets it wrong.
    const proof = params.get("appsecret_proof");
    const expected = createHmac("sha256", options.appSecret).update(token).digest("hex");

    if (proof !== expected) {
      sendGraphError(
        res,
        400,
        proof
          ? "Invalid appsecret_proof provided in the API argument."
          : "API calls from the server require an appsecret_proof argument.",
        100,
      );

      return;
    }

    if (path === "me") {
      handleMe(res, token);

      return;
    }

    if (path === "me/accounts") {
      handleAccounts(res, token);

      return;
    }

    if (req.method === "POST" && path.endsWith("/feed")) {
      handleFeedPost(res, token, path.slice(0, -"/feed".length), params);

      return;
    }

    if (req.method === "GET" && posts.has(path)) {
      const post = posts.get(path) as { message?: string; pageId: string };

      sendJson(res, 200, {
        id: path,
        message: post.message,
        is_published: true,
        permalink_url: `https://www.facebook.com/${path}`,
      });

      return;
    }

    sendGraphError(res, 400, `Unsupported fake Graph path "${path}".`, 100);
  }

  function handleDialog(res: ServerResponse, params: URLSearchParams): void {
    const redirectUri = params.get("redirect_uri");
    const state = params.get("state");

    if (params.get("client_id") !== options.appId) {
      sendError(res, 400, "Invalid client_id at the login dialog.");

      return;
    }

    if (!redirectUri || !state) {
      sendError(res, 400, "The login dialog needs redirect_uri and state.");

      return;
    }

    const target = new URL(redirectUri);

    target.searchParams.set("code", `fb-code.${nextLogin}`);
    target.searchParams.set("state", state);

    res.writeHead(302, { location: target.href });
    res.end();
  }

  function handleTokenExchange(res: ServerResponse, params: URLSearchParams): void {
    if (
      params.get("client_id") !== options.appId ||
      params.get("client_secret") !== options.appSecret
    ) {
      sendGraphError(res, 400, "Invalid app credentials.", 101);

      return;
    }

    if (params.get("grant_type") === "fb_exchange_token") {
      const shortLived = params.get("fb_exchange_token") ?? "";
      const fbUserId = shortLived.startsWith("fb-short.")
        ? shortLived.slice("fb-short.".length)
        : null;

      if (!fbUserId || !usersById.has(fbUserId)) {
        sendGraphError(res, 400, "Cannot exchange an unknown short-lived token.", 190);

        return;
      }

      sendJson(res, 200, {
        access_token: LONG_LIVED(fbUserId),
        token_type: "bearer",
        expires_in: 5_184_000,
      });

      return;
    }

    const code = params.get("code") ?? "";
    const fbUserId = code.startsWith("fb-code.") ? code.slice("fb-code.".length) : null;

    if (!fbUserId || !usersById.has(fbUserId)) {
      sendGraphError(res, 400, "This authorization code is invalid.", 100);

      return;
    }

    sendJson(res, 200, {
      access_token: SHORT_LIVED(fbUserId),
      token_type: "bearer",
      expires_in: 5184,
    });
  }

  function handleMe(res: ServerResponse, token: string): void {
    const user = userForUserToken(token);

    if (!user) {
      sendGraphError(res, 401, "Invalid OAuth access token.", 190);

      return;
    }

    sendJson(res, 200, { id: user.fbUserId, name: user.name });
  }

  function handleAccounts(res: ServerResponse, token: string): void {
    const user = userForUserToken(token);

    if (!user) {
      sendGraphError(res, 401, "Invalid OAuth access token.", 190);

      return;
    }

    sendJson(res, 200, {
      data: user.pages.map((page) => ({
        id: page.id,
        name: page.name,
        category: page.category,
        access_token: PAGE_TOKEN(user.fbUserId, page.id),
        instagram_business_account: page.instagram,
      })),
    });
  }

  function handleFeedPost(
    res: ServerResponse,
    token: string,
    pageId: string,
    params: URLSearchParams,
  ): void {
    const owner = ownerOfPageToken(token);

    if (!owner || owner.pageId !== pageId) {
      sendGraphError(
        res,
        403,
        "This access token does not grant permission to publish to this Page.",
        200,
      );

      return;
    }

    counter += 1;

    const postId = `${pageId}_${String(counter)}`;
    const message = params.get("message") ?? undefined;

    posts.set(postId, { message, pageId });
    publishes.push({ pageId, accessToken: token, message, postId });

    sendJson(res, 200, { id: postId });
  }

  function userForUserToken(token: string): FakeMetaUser | null {
    if (!token.startsWith("fb-long.")) {
      return null;
    }

    return usersById.get(token.slice("fb-long.".length)) ?? null;
  }

  function ownerOfPageToken(
    token: string,
  ): { fbUserId: string; pageId: string } | null {
    const parts = token.split(".");

    if (parts.length !== 3 || parts[0] !== "fb-page") {
      return null;
    }

    const [, fbUserId, pageId] = parts as [string, string, string];
    const user = usersById.get(fbUserId);

    if (!user?.pages.some((page) => page.id === pageId)) {
      return null;
    }

    return { fbUserId, pageId };
  }

  await new Promise<void>((resolve) => {
    server.listen(0, "127.0.0.1", resolve);
  });

  const { port } = server.address() as AddressInfo;

  return {
    baseUrl: `http://127.0.0.1:${String(port)}`,
    loginAs: (fbUserId) => {
      nextLogin = fbUserId;
    },
    publishes,
    requests,
    close: () => closeServer(server),
  };
}

export function longLivedTokenFor(fbUserId: string): string {
  return LONG_LIVED(fbUserId);
}

export function pageTokenFor(fbUserId: string, pageId: string): string {
  return PAGE_TOKEN(fbUserId, pageId);
}

function readBearer(req: IncomingMessage): string | null {
  const header = req.headers.authorization;

  if (!header) {
    return null;
  }

  const [scheme, value] = header.split(" ");

  return scheme?.toLowerCase() === "bearer" && value ? value : null;
}

async function readBody(req: IncomingMessage): Promise<URLSearchParams> {
  const chunks: Buffer[] = [];

  for await (const chunk of req) {
    chunks.push(chunk as Buffer);
  }

  return new URLSearchParams(Buffer.concat(chunks).toString("utf8"));
}

function sendJson(res: ServerResponse, status: number, payload: unknown): void {
  const body = JSON.stringify(payload);

  res.writeHead(status, {
    "content-type": "application/json",
    "content-length": Buffer.byteLength(body),
  });
  res.end(body);
}

function sendGraphError(
  res: ServerResponse,
  status: number,
  message: string,
  code: number,
): void {
  sendJson(res, status, {
    error: { message, type: "OAuthException", code, fbtrace_id: "fake" },
  });
}

function sendError(res: ServerResponse, status: number, message: string): void {
  res.writeHead(status, { "content-type": "text/plain" });
  res.end(message);
}

function closeServer(server: Server): Promise<void> {
  return new Promise((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error);
      } else {
        resolve();
      }
    });
  });
}
