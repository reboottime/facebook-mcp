import express, { type Request, type Response, type Router } from "express";
import type { OAuthClientInformationFull } from "@modelcontextprotocol/sdk/shared/auth.js";

import { SealedValueError } from "../../secret-box.js";
import type { HttpDeps } from "../deps.js";
import { escapeHtml, renderPage } from "../html.js";
import { authRateLimit } from "../rate-limit.js";
import { readSession } from "../sessions.js";
import { issueAuthorizationCode } from "./provider.js";

export const CONSENT_PATH = "/authorize/consent";

// The authorization request as it stood when the consent page was rendered, sealed with the same
// AES-256-GCM box as everything else. Sealing rather than posting the fields back as hidden inputs
// is what stops a tampered consent POST from redirecting a code somewhere the client never
// registered.
export type PendingGrant = {
  clientId: string;
  redirectUri: string;
  codeChallenge: string;
  scopes: string[];
  state?: string;
  resource: string;
  userId: string;
  expiresAt: number;
};

export function sealPendingGrant(deps: HttpDeps, grant: PendingGrant): string {
  return deps.box.seal(JSON.stringify(grant));
}

export function createConsentRouter(deps: HttpDeps): Router {
  const router = express.Router();

  router.post(
    CONSENT_PATH,
    authRateLimit(),
    express.urlencoded({ extended: false }),
    (req, res, next) => void handleConsent(deps, req, res).catch(next),
  );

  return router;
}

async function handleConsent(
  deps: HttpDeps,
  req: Request,
  res: Response,
): Promise<void> {
  const body = req.body as Record<string, unknown>;
  const sealed = typeof body.grant === "string" ? body.grant : null;
  const approved = body.action === "approve";
  const grant = sealed ? openPendingGrant(deps, sealed) : null;

  if (!grant || grant.expiresAt <= Date.now()) {
    renderConsentFailure(
      res,
      "This authorization request has expired. Start the connection again from your MCP client.",
    );

    return;
  }

  // The sealed grant names a user; the cookie proves who is actually at the keyboard. A mismatch
  // means the page was carried between browsers or sessions, and no code is issued.
  const session = readSession(deps, req);

  if (!session || session.userId !== grant.userId) {
    renderConsentFailure(
      res,
      "You are no longer signed in as the account that started this authorization. Sign in again and retry from your MCP client.",
    );

    return;
  }

  if (!approved) {
    res.redirect(
      302,
      buildRedirect(deps, grant, {
        error: "access_denied",
        error_description: "The user declined the authorization request.",
      }),
    );

    return;
  }

  const code = await issueAuthorizationCode(deps, {
    clientId: grant.clientId,
    userId: grant.userId,
    redirectUri: grant.redirectUri,
    codeChallenge: grant.codeChallenge,
    scopes: grant.scopes,
    resource: grant.resource,
  });

  res.redirect(302, buildRedirect(deps, grant, { code }));
}

// RFC 9207: the authorization response carries `iss` so a client with several authorization
// servers configured can tell which one answered.
function buildRedirect(
  deps: HttpDeps,
  grant: PendingGrant,
  params: Record<string, string>,
): string {
  const url = new URL(grant.redirectUri);

  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }

  if (grant.state !== undefined) {
    url.searchParams.set("state", grant.state);
  }

  url.searchParams.set("iss", deps.config.publicUrl.origin);

  return url.href;
}

function openPendingGrant(
  deps: HttpDeps,
  sealed: string,
): PendingGrant | null {
  try {
    return JSON.parse(deps.box.open(sealed)) as PendingGrant;
  } catch (error) {
    if (error instanceof SealedValueError || error instanceof SyntaxError) {
      return null;
    }

    throw error;
  }
}

const SCOPE_DESCRIPTIONS: Record<string, string> = {
  "social:manage":
    "Publish, schedule, read, and moderate content on the Facebook Page you select, and its linked Instagram account.",
};

export function renderConsentPage(
  client: OAuthClientInformationFull,
  scopes: string[],
  sealedGrant: string,
): string {
  const name = client.client_name ?? client.client_id;
  const permissions = scopes
    .map(
      (scope) =>
        `<li><code>${escapeHtml(scope)}</code> — ${escapeHtml(SCOPE_DESCRIPTIONS[scope] ?? "Access to this server's tools.")}</li>`,
    )
    .join("");

  return renderPage(
    "Authorize MCP client",
    `<h1>Authorize ${escapeHtml(name)}</h1>
     <p>This MCP client is asking to act on your Facebook and Instagram accounts through Social MCP.</p>
     <h2>It will be able to</h2>
     <ul>${permissions}</ul>
     <dl>
       <dt>Redirects to</dt>
       <dd><code>${escapeHtml(client.redirect_uris[0] ?? "")}</code></dd>
     </dl>
     <p class="note">Your Facebook token is never given to this client. It receives a token that only this server accepts.</p>
     <form method="post" action="${escapeHtml(CONSENT_PATH)}" class="actions">
       <input type="hidden" name="grant" value="${escapeHtml(sealedGrant)}">
       <button type="submit" name="action" value="approve" class="primary">Authorize</button>
       <button type="submit" name="action" value="deny">Cancel</button>
     </form>`,
  );
}

function renderConsentFailure(res: Response, detail: string): void {
  res
    .status(400)
    .type("html")
    .send(
      renderPage(
        "Authorization failed",
        `<h1>Authorization could not be completed</h1>
         <p>${escapeHtml(detail)}</p>`,
      ),
    );
}
