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
  it("accepts a rooted, same-origin path", () => {
    expect(safeNextPath("/dashboard")).toBe("/dashboard");
  });

  it("defaults to / when no candidate is given", () => {
    expect(safeNextPath(undefined)).toBe("/");
  });

  it("defaults to / for a protocol-relative path", () => {
    expect(safeNextPath("//evil.com")).toBe("/");
  });

  it("defaults to / for an absolute URL", () => {
    expect(safeNextPath("http://evil.com")).toBe("/");
  });

  it("defaults to / for a backslash-prefixed path", () => {
    expect(safeNextPath("\\evil.com")).toBe("/");
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
