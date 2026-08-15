import { randomUUID } from "node:crypto";

import {
  InvalidGrantError,
  InvalidScopeError,
  InvalidTargetError,
  InvalidTokenError,
} from "@modelcontextprotocol/sdk/server/auth/errors.js";
import type { OAuthServerProvider } from "@modelcontextprotocol/sdk/server/auth/provider.js";
import type { AuthInfo } from "@modelcontextprotocol/sdk/server/auth/types.js";
import type {
  OAuthClientInformationFull,
  OAuthTokenRevocationRequest,
  OAuthTokens,
} from "@modelcontextprotocol/sdk/shared/auth.js";

import {
  consumeAuthorizationCode,
  consumeRefreshToken,
  insertAccessToken,
  insertAuthorizationCode,
  insertRefreshToken,
  readAccessToken,
  readAuthorizationCode,
  readRefreshToken,
  revokeAccessToken,
  revokeFamily,
  revokeRefreshToken,
  type IssuedTokenRecord,
} from "../../db/oauth.js";
import { logWarn } from "../../logger.js";
import { newOpaqueToken } from "../../secret-box.js";
import { resourceUrl } from "../config.js";
import type { HttpDeps } from "../deps.js";
import { readSession } from "../sessions.js";
import { createClientsStore } from "./clients-store.js";
import {
  renderConsentPage,
  sealPendingGrant,
  type PendingGrant,
} from "./consent.js";

// Short enough that a code leaked through a referrer or a shell history is dead before it can be
// spent, long enough for a browser redirect and a token request over a slow link.
const AUTHORIZATION_CODE_TTL_MS = 60_000;
const ACCESS_TOKEN_TTL_SECONDS = 60 * 60;
const REFRESH_TOKEN_TTL_SECONDS = 30 * 24 * 60 * 60;

export const DEFAULT_SCOPES = ["social:manage"];

export function createOAuthProvider(deps: HttpDeps): OAuthServerProvider {
  const canonicalResource = resourceUrl(deps.config).href;

  return {
    clientsStore: createClientsStore(deps),

    // The SDK has already validated client_id, the registered redirect_uri, response_type=code and
    // code_challenge_method=S256 before this runs. What is left is the part only this server can
    // decide: who the human is, and whether they agree.
    authorize: (client, params, res) => {
      const request = res.req;
      const session = readSession(deps, request);
      const resource = assertResource(params.resource, canonicalResource);

      if (!session) {
        // Step 3 of the product flow: an unauthenticated authorize routes through Facebook Login
        // first, then re-enters this same URL with a session in hand.
        const next = encodeURIComponent(request.originalUrl);

        res.redirect(302, `/auth/facebook?next=${next}`);

        return Promise.resolve();
      }

      const grant: PendingGrant = {
        clientId: client.client_id,
        redirectUri: params.redirectUri,
        codeChallenge: params.codeChallenge,
        scopes: params.scopes?.length ? params.scopes : DEFAULT_SCOPES,
        state: params.state,
        resource,
        userId: session.userId,
        expiresAt: Date.now() + 10 * 60_000,
      };

      res
        .status(200)
        .type("html")
        .send(renderConsentPage(client, grant, sealPendingGrant(deps, grant)));

      return Promise.resolve();
    },

    // The SDK calls this before exchangeAuthorizationCode, to verify PKCE. That makes it the first
    // place a replayed code is seen, so the leak response belongs here as well as there.
    challengeForAuthorizationCode: async (client, authorizationCode) => {
      const record = await readAuthorizationCode(deps.db, authorizationCode);

      if (!record || record.clientId !== client.client_id) {
        throw new InvalidGrantError("Authorization code is unknown.");
      }

      if (record.consumedAt !== null) {
        await revokeLeakedCode(deps, record.familyId, client.client_id);

        throw new InvalidGrantError("Authorization code has already been used.");
      }

      if (record.expiresAt.getTime() <= Date.now()) {
        throw new InvalidGrantError("Authorization code has expired.");
      }

      return record.codeChallenge;
    },

    // PKCE was verified by the SDK against the challenge returned above before this runs.
    exchangeAuthorizationCode: async (
      client,
      authorizationCode,
      _codeVerifier,
      redirectUri,
      resource,
    ) => {
      const existing = await readAuthorizationCode(deps.db, authorizationCode);

      if (!existing || existing.clientId !== client.client_id) {
        throw new InvalidGrantError("Authorization code is unknown.");
      }

      // Reached only when two exchanges race past the challenge check; the ordinary replay is
      // caught above.
      if (existing.consumedAt !== null) {
        await revokeLeakedCode(deps, existing.familyId, client.client_id);

        throw new InvalidGrantError("Authorization code has already been used.");
      }

      const claimed = await consumeAuthorizationCode(deps.db, authorizationCode);

      if (!claimed) {
        throw new InvalidGrantError(
          "Authorization code has already been used.",
        );
      }

      if (claimed.expiresAt.getTime() <= Date.now()) {
        throw new InvalidGrantError("Authorization code has expired.");
      }

      if (redirectUri !== undefined && redirectUri !== claimed.redirectUri) {
        throw new InvalidGrantError(
          "redirect_uri does not match the one used to obtain this authorization code.",
        );
      }

      assertResource(resource, canonicalResource);

      return issueTokens(deps, {
        familyId: claimed.familyId,
        clientId: claimed.clientId,
        userId: claimed.userId,
        scopes: claimed.scopes,
        resource: claimed.resource,
      });
    },

    exchangeRefreshToken: async (client, refreshToken, scopes, resource) => {
      const existing = await readRefreshToken(deps.db, refreshToken);

      if (!existing || existing.clientId !== client.client_id) {
        throw new InvalidGrantError("Refresh token is unknown.");
      }

      if (existing.revokedAt !== null) {
        throw new InvalidGrantError("Refresh token has been revoked.");
      }

      if (existing.consumedAt !== null) {
        await revokeFamily(deps.db, existing.familyId);
        logWarn(
          `oauth: rotated refresh token replayed for client ${client.client_id}; revoked token family`,
        );

        throw new InvalidGrantError(
          "Refresh token has already been used. All tokens from this authorization have been revoked.",
        );
      }

      const claimed = await consumeRefreshToken(deps.db, refreshToken);

      if (!claimed) {
        throw new InvalidGrantError("Refresh token has already been used.");
      }

      if (claimed.expiresAt.getTime() <= Date.now()) {
        throw new InvalidGrantError("Refresh token has expired.");
      }

      if (scopes?.some((scope) => !claimed.scopes.includes(scope))) {
        throw new InvalidScopeError(
          "A refresh cannot ask for scopes the original authorization did not grant.",
        );
      }

      assertResource(resource, canonicalResource);

      return issueTokens(deps, {
        familyId: claimed.familyId,
        clientId: claimed.clientId,
        userId: claimed.userId,
        scopes: scopes?.length ? scopes : claimed.scopes,
        resource: claimed.resource,
      });
    },

    // The only door into the tool surface. A token this server did not mint — a Facebook user or
    // Page token included — has no row here and is rejected as an invalid token, which is what the
    // MCP spec's "MUST NOT accept or transit any other tokens" comes down to in practice.
    verifyAccessToken: async (token) => {
      const record = await readAccessToken(deps.db, token);

      if (!record) {
        throw new InvalidTokenError("Access token is not valid for this server.");
      }

      if (record.revokedAt !== null) {
        throw new InvalidTokenError("Access token has been revoked.");
      }

      if (record.expiresAt.getTime() <= Date.now()) {
        throw new InvalidTokenError("Access token has expired.");
      }

      // RFC 8707: the token must have been issued for this resource specifically.
      if (record.resource !== canonicalResource) {
        throw new InvalidTokenError(
          "Access token was issued for a different resource server.",
        );
      }

      const authInfo: AuthInfo = {
        token,
        clientId: record.clientId,
        scopes: record.scopes,
        expiresAt: Math.floor(record.expiresAt.getTime() / 1000),
        resource: new URL(record.resource),
        extra: { userId: record.userId },
      };

      return authInfo;
    },

    // RFC 7009 §2.1: a client may only revoke its own tokens. §2.2 makes the failure silent —
    // a token this client does not own is answered exactly like an unknown one, so revocation
    // cannot be used to probe which token strings exist.
    revokeToken: async (
      client: OAuthClientInformationFull,
      request: OAuthTokenRevocationRequest,
    ) => {
      const access = await readAccessToken(deps.db, request.token);

      if (access) {
        if (access.clientId === client.client_id) {
          await revokeAccessToken(deps.db, request.token);
        } else {
          logWarn(
            `oauth: client ${client.client_id} tried to revoke an access token issued to another client; ignored`,
          );
        }

        return;
      }

      const refresh = await readRefreshToken(deps.db, request.token);

      if (!refresh) {
        return;
      }

      if (refresh.clientId !== client.client_id) {
        logWarn(
          `oauth: client ${client.client_id} tried to revoke a refresh token issued to another client; ignored`,
        );

        return;
      }

      await revokeRefreshToken(deps.db, request.token);
    },
  };
}

export async function issueAuthorizationCode(
  deps: HttpDeps,
  grant: {
    clientId: string;
    userId: string;
    redirectUri: string;
    codeChallenge: string;
    scopes: string[];
    resource: string;
  },
): Promise<string> {
  const code = newOpaqueToken();

  await insertAuthorizationCode(deps.db, code, {
    ...grant,
    familyId: randomUUID(),
    expiresAt: new Date(Date.now() + AUTHORIZATION_CODE_TTL_MS),
  });

  return code;
}

// A second presentation of a single-use code means it leaked. Everything descended from that
// authorization goes with it, not just the replayed credential.
async function revokeLeakedCode(
  deps: HttpDeps,
  familyId: string,
  clientId: string,
): Promise<void> {
  await revokeFamily(deps.db, familyId);
  logWarn(
    `oauth: authorization code replayed for client ${clientId}; revoked token family`,
  );
}

async function issueTokens(
  deps: HttpDeps,
  grant: Omit<IssuedTokenRecord, "expiresAt">,
): Promise<OAuthTokens> {
  const accessToken = newOpaqueToken();
  const refreshToken = newOpaqueToken();

  await insertAccessToken(deps.db, accessToken, {
    ...grant,
    expiresAt: new Date(Date.now() + ACCESS_TOKEN_TTL_SECONDS * 1000),
  });

  await insertRefreshToken(deps.db, refreshToken, {
    ...grant,
    expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_SECONDS * 1000),
  });

  return {
    access_token: accessToken,
    token_type: "Bearer",
    expires_in: ACCESS_TOKEN_TTL_SECONDS,
    refresh_token: refreshToken,
    scope: grant.scopes.join(" "),
  };
}

// RFC 8707 resource indicator. We are the only resource this authorization server serves, so a
// `resource` that is not ours is a client aiming at something else and must not get a token that
// happens to work here.
function assertResource(
  presented: URL | undefined,
  canonical: string,
): string {
  if (presented === undefined) {
    return canonical;
  }

  const normalized = new URL(presented.href);

  normalized.hash = "";

  if (normalized.href !== canonical) {
    throw new InvalidTargetError(
      `resource "${normalized.href}" is not this MCP server. This server's resource identifier is "${canonical}".`,
    );
  }

  return canonical;
}
