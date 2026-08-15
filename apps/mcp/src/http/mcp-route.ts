import express, { type Request, type Response, type Router } from "express";
import { requireBearerAuth } from "@modelcontextprotocol/sdk/server/auth/middleware/bearerAuth.js";
import type { OAuthServerProvider } from "@modelcontextprotocol/sdk/server/auth/provider.js";
import { getOAuthProtectedResourceMetadataUrl } from "@modelcontextprotocol/sdk/server/auth/router.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";

import { readMetaAccessToken, readPageSelection, writePageSelection } from "../db/users.js";
import { MetaTokenMissingError } from "../graph/index.js";
import { logError } from "../logger.js";
import { createUserServer } from "../server.js";
import { createUserPageDirectory } from "../services/pages.js";
import { resourceUrl } from "./config.js";
import type { HttpDeps } from "./deps.js";
import { createUserGraphClient } from "./meta-oauth.js";

export const MCP_PATH = "/mcp";

export function createMcpRouter(
  deps: HttpDeps,
  provider: OAuthServerProvider,
): Router {
  const router = express.Router();
  // RFC 9728 / MCP authorization: an unauthenticated or expired token gets a 401 whose
  // WWW-Authenticate header points the client at this server's protected-resource metadata, which
  // is how a fresh client discovers where to authorize.
  const bearer = requireBearerAuth({
    verifier: provider,
    resourceMetadataUrl: getOAuthProtectedResourceMetadataUrl(
      resourceUrl(deps.config),
    ),
  });

  router.post(MCP_PATH, bearer, express.json({ limit: "4mb" }), (req, res) => {
    void handleMcpRequest(deps, req, res).catch((error: unknown) => {
      logError("mcp request failed", error);

      if (!res.headersSent) {
        res.status(500).json(jsonRpcError("Internal server error."));
      }
    });
  });

  // Stateless: every request carries its own bearer token and gets its own server instance, so
  // there is no session to resume over a GET stream and nothing to DELETE.
  router.get(MCP_PATH, bearer, rejectStreamMethod);
  router.delete(MCP_PATH, bearer, rejectStreamMethod);

  return router;
}

async function handleMcpRequest(
  deps: HttpDeps,
  req: Request,
  res: Response,
): Promise<void> {
  const userId = readUserId(req);

  if (!userId) {
    res.status(401).json(jsonRpcError("Access token is not bound to a user."));

    return;
  }

  const server = createUserServer(await buildUserDeps(deps, userId));
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
  });

  // Per-request lifecycle: the transport and the server both die with the response, which is what
  // guarantees no Graph client or Page cache outlives the user it was built for.
  res.on("close", () => {
    void transport.close();
    void server.close();
  });

  await server.connect(transport);
  await transport.handleRequest(req, res, req.body);
}

async function buildUserDeps(deps: HttpDeps, userId: string) {
  // A credential sealed with a key this process no longer has reads as absent — see
  // openStoredSecret in db/users.ts — so the operator gets the reconnect message, not a 500.
  const metaAccessToken = await readMetaAccessToken(deps.db, deps.box, userId);
  const graph = createUserGraphClient(deps.config, () => {
    if (!metaAccessToken) {
      throw new MetaTokenMissingError(
        `No Meta access token is stored for your account. Sign in again at ${deps.config.publicUrl.origin} to reconnect Facebook.`,
      );
    }

    return metaAccessToken;
  });

  return {
    userId,
    metaAccessToken,
    graph,
    // Both reads are keyed by the authenticated user id and nothing else — a client-supplied Page
    // id can never reach another user's stored selection or token.
    pages: createUserPageDirectory({
      graph,
      readSelection: () => readPageSelection(deps.db, deps.box, userId),
    }),
    persistSelection: (page: { id: string; name: string; accessToken: string }) =>
      writePageSelection(deps.db, deps.box, userId, {
        id: page.id,
        name: page.name,
        accessToken: page.accessToken,
      }),
  };
}

function readUserId(req: Request): string | null {
  const userId = req.auth?.extra?.userId;

  return typeof userId === "string" ? userId : null;
}

function rejectStreamMethod(_req: Request, res: Response): void {
  res
    .status(405)
    .json(
      jsonRpcError(
        "This MCP endpoint is stateless: send JSON-RPC over POST. Server-initiated streams and session deletion are not supported.",
      ),
    );
}

function jsonRpcError(message: string): Record<string, unknown> {
  return {
    jsonrpc: "2.0",
    error: { code: -32000, message },
    id: null,
  };
}
