import type { Request, Response } from "express";

import { SealedValueError } from "../secret-box.js";
import type { HttpDeps } from "./deps.js";

const SESSION_COOKIE = "smcp_session";
const LOGIN_STATE_COOKIE = "smcp_login";
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
  // that triggered the login. Always same-origin; an absolute URL here would be an open redirect.
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

  setCookie(deps, res, SESSION_COOKIE, deps.box.seal(JSON.stringify(session)), {
    maxAgeMs: SESSION_TTL_MS,
  });
}

export function readSession(
  deps: HttpDeps,
  req: Request,
): BrowserSession | null {
  const session = openCookie<BrowserSession>(deps, req, SESSION_COOKIE);

  if (!session || typeof session.userId !== "string") {
    return null;
  }

  return session.expiresAt > Date.now() ? session : null;
}

export function clearSession(deps: HttpDeps, res: Response): void {
  setCookie(deps, res, SESSION_COOKIE, "", { maxAgeMs: 0 });
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
    LOGIN_STATE_COOKIE,
    deps.box.seal(JSON.stringify(payload)),
    { maxAgeMs: LOGIN_STATE_TTL_MS },
  );
}

export function takeLoginState(
  deps: HttpDeps,
  req: Request,
  res: Response,
): LoginState | null {
  const payload = openCookie<LoginState>(deps, req, LOGIN_STATE_COOKIE);

  setCookie(deps, res, LOGIN_STATE_COOKIE, "", { maxAgeMs: 0 });

  if (!payload || typeof payload.state !== "string") {
    return null;
  }

  return payload.expiresAt > Date.now() ? payload : null;
}

// Same-origin paths only. Facebook's callback is the one place an attacker could try to steer the
// post-login redirect, so anything that is not a rooted path is discarded rather than sanitised.
export function safeNextPath(candidate: string | undefined): string {
  if (!candidate || !candidate.startsWith("/") || candidate.startsWith("//")) {
    return "/";
  }

  return candidate;
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
    secure: deps.config.publicUrl.protocol === "https:",
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
