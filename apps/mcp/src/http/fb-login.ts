import { randomBytes } from "node:crypto";

import express, { type Request, type Response, type Router } from "express";

import {
  readMetaAccessToken,
  readPageSelection,
  readUser,
  upsertUserFromMeta,
} from "../db/users.js";
import { logError, logInfo } from "../logger.js";
import { constantTimeEquals } from "../secret-box.js";
import type { HttpDeps } from "./deps.js";
import { escapeHtml, renderPage } from "./html.js";
import {
  buildLoginDialogUrl,
  exchangeForLongLivedToken,
  exchangeLoginCode,
  readAppCredentials,
  readMetaProfile,
  tokenExpiryDate,
} from "./meta-oauth.js";
import { authRateLimit } from "./rate-limit.js";
import {
  clearSession,
  readSession,
  safeNextPath,
  takeLoginState,
  writeLoginState,
  writeSession,
} from "./sessions.js";

// Facebook Login IS registration — step 1 of the product's state machine. There is no password,
// no separate account record, and no second identity provider.
export function createFacebookLoginRouter(deps: HttpDeps): Router {
  const router = express.Router();

  router.get("/auth/facebook", authRateLimit(), (req, res) => {
    const app = readAppCredentials(deps.config);

    if (!app) {
      renderUnconfigured(res);

      return;
    }

    const state = randomBytes(24).toString("base64url");
    const next = safeNextPath(
      readSingleQueryValue(req, "next"),
      deps.config.publicUrl,
    );

    writeLoginState(deps, res, state, next);
    res.redirect(302, buildLoginDialogUrl(deps.config, app, state));
  });

  router.get(
    "/auth/facebook/callback",
    authRateLimit(),
    (req, res, next) => void handleCallback(deps, req, res).catch(next),
  );

  router.post("/auth/signout", authRateLimit(), (_req, res) => {
    clearSession(deps, res);
    res.redirect(302, "/");
  });

  return router;
}

async function handleCallback(
  deps: HttpDeps,
  req: Request,
  res: Response,
): Promise<void> {
  const app = readAppCredentials(deps.config);

  if (!app) {
    renderUnconfigured(res);

    return;
  }

  const login = takeLoginState(deps, req, res);
  const returnedState = readSingleQueryValue(req, "state");
  const code = readSingleQueryValue(req, "code");
  const error = readSingleQueryValue(req, "error_description");

  if (error) {
    renderLoginFailure(res, `Facebook declined the login: ${error}`);

    return;
  }

  // The state cookie is the only thing that ties this callback to a login this browser started.
  if (!login || !returnedState || !constantTimeEquals(login.state, returnedState)) {
    renderLoginFailure(
      res,
      "This Facebook login could not be matched to a login started from this browser. Start again from the home page.",
    );

    return;
  }

  if (!code) {
    renderLoginFailure(res, "Facebook returned no authorization code.");

    return;
  }

  try {
    const shortLived = await exchangeLoginCode(deps.config, app, code);
    const longLived = await exchangeForLongLivedToken(
      deps.config,
      app,
      shortLived.access_token,
    );
    const profile = await readMetaProfile(
      deps.config,
      app,
      longLived.access_token,
    );

    const user = await upsertUserFromMeta(deps.db, deps.box, {
      fbUserId: profile.id,
      name: profile.name,
      accessToken: longLived.access_token,
      expiresAt: tokenExpiryDate(longLived),
    });

    writeSession(deps, res, user.id);
    logInfo(`facebook login: stored identity for user ${user.id}`);
    res.redirect(302, login.next);
  } catch (failure) {
    logError("facebook login failed", failure);
    renderLoginFailure(
      res,
      "Facebook accepted the login but the token exchange failed. Check the server log and try again.",
    );
  }
}

// Step 1 and step 2 of the state machine on one page: connect the Facebook account, then copy the
// /mcp URL into an MCP client.
export function createHomeRouter(deps: HttpDeps): Router {
  const router = express.Router();

  router.get("/", (req, res, next) => {
    void renderHome(deps, req, res).catch(next);
  });

  return router;
}

async function renderHome(
  deps: HttpDeps,
  req: Request,
  res: Response,
): Promise<void> {
  const session = readSession(deps, req);
  const mcpUrl = new URL("/mcp", deps.config.publicUrl).href;
  const configured = readAppCredentials(deps.config) !== null;

  const identity = session ? await readUser(deps.db, session.userId) : null;
  // An identity row on its own is not a working connection: if the stored Meta token cannot be
  // read back — the state after a restart with no TOKEN_ENCRYPTION_KEY — nothing this server does
  // will work, so the operator is shown step 1 again rather than a "Connected" page with no way
  // out of it.
  const linked =
    identity !== null &&
    (await readMetaAccessToken(deps.db, deps.box, identity.id)) !== null;
  const selection =
    identity && linked
      ? await readPageSelection(deps.db, deps.box, identity.id)
      : null;

  const connect =
    identity && linked
      ? `<h1>Connected as ${escapeHtml(identity.name ?? identity.fbUserId)}</h1>
       <p class="note">Facebook account linked. Your Meta token is stored encrypted and is only ever used for your own requests.</p>
       <dl>
         <dt>Selected Page</dt>
         <dd>${selection ? `${escapeHtml(selection.name)} <code>${escapeHtml(selection.id)}</code>` : "none yet — call the <code>select_page</code> tool"}</dd>
       </dl>
       <form class="actions" method="post" action="/auth/signout"><button type="submit">Sign out</button></form>`
    : `<h1>Social MCP</h1>
       <p>Manage your Facebook Pages, Reels, and Instagram from an MCP client.</p>
       ${
         identity
           ? `<p class="note">Your stored Facebook token can no longer be read by this server — it was encrypted with a key this process does not have, which happens when it restarts without <code>TOKEN_ENCRYPTION_KEY</code> set. Connect again to restore access.</p>`
           : ""
       }
       ${
         configured
           ? `<div class="actions"><a class="button primary" href="/auth/facebook">Connect with Facebook</a></div>`
           : `<p class="note">Facebook Login is not configured on this server yet: <code>FB_APP_ID</code> and <code>FB_APP_SECRET</code> are unset, so the connect step is unavailable. The MCP endpoint and its OAuth metadata are still live.</p>`
       }`;

  res
    .status(200)
    .type("html")
    .send(
      renderPage(
        "Social MCP",
        `${connect}
         <h2>Connect an MCP client</h2>
         <p>Add this server URL to your MCP client. It will walk you through authorization automatically.</p>
         <p><code>${escapeHtml(mcpUrl)}</code></p>
         <h2>Then</h2>
         <ul>
           <li>Call <code>list_pages</code> to see the Facebook Pages you administer.</li>
           <li>Call <code>select_page</code> to pick the one every other tool should target.</li>
         </ul>`,
      ),
    );
}

function renderUnconfigured(res: Response): void {
  res
    .status(503)
    .type("html")
    .send(
      renderPage(
        "Facebook Login unavailable",
        `<h1>Facebook Login is not configured</h1>
         <p>This server has no Meta app credentials, so it cannot start a Facebook login.</p>
         <p class="note">Set <code>FB_APP_ID</code> and <code>FB_APP_SECRET</code> and restart. Everything else — the MCP endpoint, OAuth metadata, discovery — is running.</p>
         <div class="actions"><a class="button" href="/">Back</a></div>`,
      ),
    );
}

function renderLoginFailure(res: Response, detail: string): void {
  res
    .status(400)
    .type("html")
    .send(
      renderPage(
        "Facebook login failed",
        `<h1>Facebook login failed</h1>
         <p>${escapeHtml(detail)}</p>
         <div class="actions"><a class="button" href="/">Back</a></div>`,
      ),
    );
}

// Express 5 parses repeated query parameters into arrays; an attacker choosing the array branch
// must not get a different code path than the string branch.
export function readSingleQueryValue(
  req: Request,
  name: string,
): string | undefined {
  const value = req.query[name];

  return typeof value === "string" ? value : undefined;
}
