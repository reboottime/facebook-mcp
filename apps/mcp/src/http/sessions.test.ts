import { randomBytes } from "node:crypto";

import { describe, expect, it } from "@jest/globals";
import type { Request, Response } from "express";

import { createSecretBox } from "../secret-box.js";
import type { HttpDeps } from "./deps.js";
import {
  readSession,
  safeNextPath,
  takeLoginState,
  writeLoginState,
  writeSession,
} from "./sessions.js";

// Minimal HttpDeps: only config.publicUrl (for the cookie `secure` flag) and box are read by
// sessions.ts.
function fakeDeps(box: ReturnType<typeof createSecretBox>): HttpDeps {
  return {
    config: { publicUrl: new URL("http://localhost:8787") } as HttpDeps["config"],
    db: {} as HttpDeps["db"],
    box,
    storage: { kind: "pglite", ephemeralEncryptionKey: true },
  };
}

// Stands in for Express's Response: captures whatever sessions.ts sets via res.cookie so a
// matching fake Request can be built from it.
function fakeResponse(): { res: Response; cookies: Map<string, string> } {
  const cookies = new Map<string, string>();
  const res = {
    cookie: (name: string, value: string) => {
      if (value === "") {
        cookies.delete(name);
      } else {
        cookies.set(name, value);
      }
    },
  } as unknown as Response;

  return { res, cookies };
}

function fakeRequest(cookies: Map<string, string>): Request {
  const header = [...cookies].map(([name, value]) => `${name}=${value}`).join("; ");

  return { headers: { cookie: header } } as unknown as Request;
}

describe("safeNextPath", () => {
  const publicUrl = new URL("https://mcp.example.com");

  // The property, not the spelling: whatever comes back must still be same-origin after the
  // browser re-parses it as a Location header. Asserting exact strings let `/..//evil.example`
  // through once already — it returned the pathname `//evil.example`, same-origin at parse time
  // and protocol-relative on re-parse.
  it.each([
    ["a protocol-relative path", "//evil.example"],
    ["an absolute cross-origin URL", "http://evil.example"],
    ["the slash-backslash bypass form", "/\\evil.example"],
    ["a dot-segment escape", "/..//evil.example"],
    ["a repeated dot-segment escape", "/../..//evil.example"],
    ["a dot-segment escape below a real path", "/x/..//evil.example"],
    ["a bare-backslash prefix", "\\evil.com"],
    ["a rooted path", "/dashboard"],
    ["a rooted path with a query", "/authorize?client_id=abc"],
    ["no candidate at all", undefined],
  ])("keeps %s on our own origin once re-parsed", (_label, candidate) => {
    const next = safeNextPath(candidate, publicUrl);

    expect(new URL(next, publicUrl).origin).toBe(publicUrl.origin);
  });

  it("preserves a benign destination instead of collapsing it to /", () => {
    expect(safeNextPath("/dashboard", publicUrl)).toBe(
      "https://mcp.example.com/dashboard",
    );
    expect(safeNextPath("/authorize?client_id=abc", publicUrl)).toBe(
      "https://mcp.example.com/authorize?client_id=abc",
    );
  });

  it("defaults to / when no candidate is given", () => {
    expect(safeNextPath(undefined, publicUrl)).toBe("/");
  });
});

describe("session cookie", () => {
  it("round-trips a session through writeSession and readSession", () => {
    const deps = fakeDeps(createSecretBox(randomBytes(32)));
    const { res, cookies } = fakeResponse();

    writeSession(deps, res, "user-1");
    const session = readSession(deps, fakeRequest(cookies));

    expect(session).toMatchObject({ userId: "user-1" });
  });

  it("returns null when there is no session cookie", () => {
    const deps = fakeDeps(createSecretBox(randomBytes(32)));

    expect(readSession(deps, fakeRequest(new Map()))).toBeNull();
  });

  it("returns null once the session has expired", () => {
    const box = createSecretBox(randomBytes(32));
    const deps = fakeDeps(box);
    const { res, cookies } = fakeResponse();

    writeSession(deps, res, "user-1");
    const [cookieName] = [...cookies.keys()];
    cookies.set(
      cookieName as string,
      box.seal(JSON.stringify({ userId: "user-1", expiresAt: Date.now() - 1000 })),
    );

    expect(readSession(deps, fakeRequest(cookies))).toBeNull();
  });

  it("returns null when the cookie was sealed with a different key", () => {
    const { res, cookies } = fakeResponse();

    writeSession(fakeDeps(createSecretBox(randomBytes(32))), res, "user-1");

    const otherDeps = fakeDeps(createSecretBox(randomBytes(32)));

    expect(readSession(otherDeps, fakeRequest(cookies))).toBeNull();
  });
});

describe("login state cookie", () => {
  it("round-trips login state through writeLoginState and takeLoginState", () => {
    const deps = fakeDeps(createSecretBox(randomBytes(32)));
    const { res, cookies } = fakeResponse();

    writeLoginState(deps, res, "state-abc", "/next-path");
    const taken = takeLoginState(deps, fakeRequest(cookies), fakeResponse().res);

    expect(taken).toMatchObject({ state: "state-abc", next: "/next-path" });
  });
});
