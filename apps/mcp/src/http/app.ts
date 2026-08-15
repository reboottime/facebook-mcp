import express, { type Express, type NextFunction, type Request, type Response } from "express";
import { OAuthError, ServerError } from "@modelcontextprotocol/sdk/server/auth/errors.js";
import { authorizationHandler } from "@modelcontextprotocol/sdk/server/auth/handlers/authorize.js";
import { metadataHandler } from "@modelcontextprotocol/sdk/server/auth/handlers/metadata.js";
import { clientRegistrationHandler } from "@modelcontextprotocol/sdk/server/auth/handlers/register.js";
import { revocationHandler } from "@modelcontextprotocol/sdk/server/auth/handlers/revoke.js";
import { tokenHandler } from "@modelcontextprotocol/sdk/server/auth/handlers/token.js";
import {
  createOAuthMetadata,
  mcpAuthMetadataRouter,
} from "@modelcontextprotocol/sdk/server/auth/router.js";
import { hostHeaderValidation } from "@modelcontextprotocol/sdk/server/middleware/hostHeaderValidation.js";

import { logError } from "../logger.js";
import { SERVER_NAME } from "../version.js";
import { createOAuthProvider, DEFAULT_SCOPES } from "./auth/provider.js";
import { createConsentRouter } from "./auth/consent.js";
import { resourceUrl } from "./config.js";
import type { HttpDeps } from "./deps.js";
import { createFacebookLoginRouter, createHomeRouter } from "./fb-login.js";
import { renderPage } from "./html.js";
import { createMcpRouter } from "./mcp-route.js";
import { originValidation } from "./origin.js";

const LOOPBACK_HOSTS = ["localhost", "127.0.0.1", "[::1]"];

// This server is both the authorization server and the resource server. Facebook Login sits
// *inside* our /authorize flow as the identity step — Meta is an upstream identity and API
// provider, never the MCP authorization server, and the two token domains never mix.
export function createHttpApp(deps: HttpDeps): Express {
  const app = express();
  const provider = createOAuthProvider(deps);

  // Fly terminates TLS in front of the app, so the client address the rate limiters key on comes
  // from a single trusted hop.
  app.set("trust proxy", 1);
  app.disable("x-powered-by");
  app.use(hostHeaderValidation(allowedHostnames(deps)));

  app.use(createHomeRouter(deps));
  app.use(createFacebookLoginRouter(deps));
  app.use(createConsentRouter(deps));
  app.use(createAuthorizationServerRouter(deps, provider));
  app.use(originValidation(deps.config.allowedOrigins), createMcpRouter(deps, provider));

  app.use(notFound);
  app.use(errorResponse);

  return app;
}

// mcpAuthRouter would do this in one call, but its metadata document cannot advertise RFC 9207 —
// so the same handlers are mounted here against a metadata document that can.
function createAuthorizationServerRouter(
  deps: HttpDeps,
  provider: ReturnType<typeof createOAuthProvider>,
) {
  const router = express.Router();
  const issuerUrl = deps.config.publicUrl;
  const base = createOAuthMetadata({
    provider,
    issuerUrl,
    scopesSupported: DEFAULT_SCOPES,
  });
  const oauthMetadata = {
    ...base,
    // We put `iss` on every authorization response (RFC 9207), so clients that check it know they
    // can rely on it being there.
    authorization_response_iss_parameter_supported: true,
  };

  router.use("/authorize", authorizationHandler({ provider }));
  router.use("/token", tokenHandler({ provider }));
  router.use("/register", clientRegistrationHandler({ clientsStore: provider.clientsStore }));
  router.use("/revoke", revocationHandler({ provider }));

  // RFC 8414 metadata + RFC 9728 protected-resource metadata at the path-specific URL for /mcp.
  router.use(
    mcpAuthMetadataRouter({
      oauthMetadata,
      resourceServerUrl: resourceUrl(deps.config),
      scopesSupported: DEFAULT_SCOPES,
      resourceName: SERVER_NAME,
    }),
  );

  // Root alias for the same document: RFC 9728 puts a path-scoped resource's metadata under the
  // path, but clients in the wild still probe the bare well-known URL first.
  router.use(
    "/.well-known/oauth-protected-resource",
    metadataHandler({
      resource: resourceUrl(deps.config).href,
      authorization_servers: [issuerUrl.href],
      scopes_supported: DEFAULT_SCOPES,
      resource_name: SERVER_NAME,
    }),
  );

  return router;
}

function allowedHostnames(deps: HttpDeps): string[] {
  const hostnames = new Set([deps.config.publicUrl.hostname]);

  if (LOOPBACK_HOSTS.includes(deps.config.host)) {
    for (const host of LOOPBACK_HOSTS) {
      hostnames.add(host);
    }
  }

  return [...hostnames];
}

function notFound(req: Request, res: Response): void {
  if (req.accepts("html")) {
    res
      .status(404)
      .type("html")
      .send(
        renderPage(
          "Not found",
          `<h1>Not found</h1><p>Nothing is served at this address.</p><div class="actions"><a class="button" href="/">Home</a></div>`,
        ),
      );

    return;
  }

  res.status(404).json({ error: "not_found" });
}

function errorResponse(
  error: unknown,
  _req: Request,
  res: Response,
  next: NextFunction,
): void {
  if (res.headersSent) {
    next(error);

    return;
  }

  logError("http request failed", error);

  if (error instanceof OAuthError) {
    res.status(error instanceof ServerError ? 500 : 400).json(error.toResponseObject());

    return;
  }

  res.status(500).json(new ServerError("Internal Server Error").toResponseObject());
}
