import type { Request, Response } from "express";

import { SealedValueError } from "../secret-box.js";
import type { HttpDeps } from "./deps.js";

const SESSION_COOKIE = "smcp_session";
const LOGIN_STATE_COOKIE = "smcp_login";
const HOST_PREFIX = "__Host-";
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const LOGIN_STATE_TTL_MS = 10 * 60 * 1000;

// The browser session exists only to carry a signed-in identity through our own /authorize
// consent step. It is AES-256-GCM sealed, so it is authenticated as well as opaque — a client
// cannot mint one, and cannot read the user id out of one.
export type BrowserSession = {
  userId: string;
  expiresAt: number;
};

export type LoginState = {
  state: string;
  // Where to send the browser once Facebook hands the identity back — normally the /authorize URL
  // that triggered the login. Only ever written through safeNextPath, so it is an absolute URL on
  // our own origin; any other origin would be an open redirect.
  next: string;
  expiresAt: number;
};

export function writeSession(
  deps: HttpDeps,
  res: Response,
  userId: string,
): void {
  const session: BrowserSession = {
    userId,
    expiresAt: Date.now() + SESSION_TTL_MS,
  };

  setCookie(
    deps,
    res,
    cookieName(deps, SESSION_COOKIE),
    deps.box.seal(JSON.stringify(session)),
    { maxAgeMs: SESSION_TTL_MS },
  );
}

export function readSession(
  deps: HttpDeps,
  req: Request,
): BrowserSession | null {
  const session = openCookie<BrowserSession>(
    deps,
    req,
    cookieName(deps, SESSION_COOKIE),
  );

  if (!session || typeof session.userId !== "string") {
    return null;
  }

  return session.expiresAt > Date.now() ? session : null;
}

export function clearSession(deps: HttpDeps, res: Response): void {
  setCookie(deps, res, cookieName(deps, SESSION_COOKIE), "", { maxAgeMs: 0 });
}

export function writeLoginState(
  deps: HttpDeps,
  res: Response,
  state: string,
  next: string,
): void {
  const payload: LoginState = {
    state,
    next,
    expiresAt: Date.now() + LOGIN_STATE_TTL_MS,
  };

  setCookie(
    deps,
    res,
    cookieName(deps, LOGIN_STATE_COOKIE),
    deps.box.seal(JSON.stringify(payload)),
    { maxAgeMs: LOGIN_STATE_TTL_MS },
  );
}

export function takeLoginState(
  deps: HttpDeps,
  req: Request,
  res: Response,
): LoginState | null {
  const name = cookieName(deps, LOGIN_STATE_COOKIE);
  const payload = openCookie<LoginState>(deps, req, name);

  setCookie(deps, res, name, "", { maxAgeMs: 0 });

  if (!payload || typeof payload.state !== "string") {
    return null;
  }

  return payload.expiresAt > Date.now() ? payload : null;
}

// Same-origin destinations only. Facebook's callback is the one place an attacker could try to
// steer the post-login redirect, so the candidate is resolved against our own origin and anything
// landing elsewhere collapses to "/". Pattern-matching the string cannot be trusted: a URL parser
// reads `/\evil.example` as protocol-relative exactly like `//evil.example`, which a
// startsWith("//") check does not catch.
//
// The proven-safe result is returned as an ABSOLUTE URL, not a bare path, because a path has to be
// re-parsed by the browser against whatever origin it likes: `/..//evil.example` normalizes to the
// pathname `//evil.example`, same-origin here but protocol-relative — so cross-origin — the moment
// it is emitted as a Location header on its own. Carrying our origin in the value removes that
// second parse.
export function safeNextPath(
  candidate: string | undefined,
  publicUrl: URL,
): string {
  if (!candidate) {
    return "/";
  }

  let resolved: URL;

  try {
    resolved = new URL(candidate, publicUrl);
  } catch {
    return "/";
  }

  return resolved.origin === publicUrl.origin ? resolved.href : "/";
}

// `__Host-` is only legal on a cookie that is Secure, Path=/ and Domain-less, so the name follows
// the scheme: an https deployment gets the browser-enforced binding, http/localhost development
// keeps the plain name and behaves exactly as before.
function cookieName(deps: HttpDeps, base: string): string {
  return isSecureOrigin(deps) ? `${HOST_PREFIX}${base}` : base;
}

function isSecureOrigin(deps: HttpDeps): boolean {
  return deps.config.publicUrl.protocol === "https:";
}

function setCookie(
  deps: HttpDeps,
  res: Response,
  name: string,
  value: string,
  options: { maxAgeMs: number },
): void {
  res.cookie(name, value, {
    httpOnly: true,
    sameSite: "lax",
    secure: isSecureOrigin(deps),
    path: "/",
    maxAge: options.maxAgeMs,
  });
}

function openCookie<T>(deps: HttpDeps, req: Request, name: string): T | null {
  const raw = readCookieHeader(req.headers.cookie, name);

  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(deps.box.open(raw)) as T;
  } catch (error) {
    // A cookie sealed with a previous ephemeral key, or a forged one: both are simply "no session".
    if (error instanceof SealedValueError || error instanceof SyntaxError) {
      return null;
    }

    throw error;
  }
}

// One cookie, read by name. Pulling in a cookie parser for this would be a dependency with a
// single call site.
function readCookieHeader(
  header: string | undefined,
  name: string,
): string | null {
  if (!header) {
    return null;
  }

  for (const part of header.split(";")) {
    const separator = part.indexOf("=");

    if (separator === -1) {
      continue;
    }

    if (part.slice(0, separator).trim() === name) {
      return decodeURIComponent(part.slice(separator + 1).trim());
    }
  }

  return null;
}
