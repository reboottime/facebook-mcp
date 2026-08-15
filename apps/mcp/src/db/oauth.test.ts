import { randomUUID } from "node:crypto";

import { afterAll, beforeAll, describe, expect, it } from "@jest/globals";

import type { DatabaseHandle } from "./client.js";
import { openDatabase } from "./client.js";
import {
  consumeAuthorizationCode,
  consumeRefreshToken,
  insertAccessToken,
  insertAuthorizationCode,
  insertRefreshToken,
  readAccessToken,
  readRefreshToken,
  revokeFamily,
  type AuthorizationCodeRecord,
  type IssuedTokenRecord,
} from "./oauth.js";
import { users } from "./schema.js";

// Never a real database in a unit test: DATABASE_URL is never read here, only the in-memory
// PGlite path (openDatabase(null)).
let handle: DatabaseHandle;

beforeAll(async () => {
  handle = await openDatabase(null);
});

afterAll(async () => {
  await handle.close();
});

// oauth_authorization_codes.user_id and oauth_access_tokens/oauth_refresh_tokens.user_id carry a
// foreign key to users; a fresh user per test keeps rows from colliding across tests sharing one
// PGlite instance.
async function createUser(): Promise<string> {
  const id = randomUUID();
  const now = new Date();

  await handle.db.insert(users).values({
    id,
    fbUserId: `fb-${id}`,
    createdAt: now,
    updatedAt: now,
  });

  return id;
}

function authCode(userId: string): AuthorizationCodeRecord {
  return {
    clientId: "client-1",
    userId,
    familyId: randomUUID(),
    redirectUri: "https://client.example/callback",
    codeChallenge: "challenge",
    scopes: ["mcp"],
    resource: "https://social-mcp.example/mcp",
    expiresAt: new Date(Date.now() + 60_000),
  };
}

function issuedToken(userId: string, familyId: string): IssuedTokenRecord {
  return {
    familyId,
    clientId: "client-1",
    userId,
    scopes: ["mcp"],
    resource: "https://social-mcp.example/mcp",
    expiresAt: new Date(Date.now() + 60_000),
  };
}

describe("consumeAuthorizationCode", () => {
  it("returns the record once, then null on a repeat consumption", async () => {
    const userId = await createUser();
    const code = randomUUID();

    await insertAuthorizationCode(handle.db, code, authCode(userId));

    const first = await consumeAuthorizationCode(handle.db, code);
    const second = await consumeAuthorizationCode(handle.db, code);

    expect(first).toMatchObject({ userId, clientId: "client-1" });
    expect(second).toBeNull();
  });

  it("returns null for a code that was never issued", async () => {
    expect(await consumeAuthorizationCode(handle.db, randomUUID())).toBeNull();
  });
});

describe("consumeRefreshToken", () => {
  it("returns the record once, marks it consumed, then rejects a repeat consumption", async () => {
    const userId = await createUser();
    const familyId = randomUUID();
    const token = randomUUID();

    await insertRefreshToken(handle.db, token, issuedToken(userId, familyId));

    const first = await consumeRefreshToken(handle.db, token);
    const second = await consumeRefreshToken(handle.db, token);
    const stored = await readRefreshToken(handle.db, token);

    expect(first).toMatchObject({ userId, familyId });
    expect(second).toBeNull();
    expect(stored?.consumedAt).not.toBeNull();
  });
});

describe("revokeFamily", () => {
  it("revokes every access and refresh token in the family, leaving other families untouched", async () => {
    const userId = await createUser();
    const targetFamily = randomUUID();
    const otherFamily = randomUUID();
    const accessToken = randomUUID();
    const refreshToken = randomUUID();
    const otherAccessToken = randomUUID();

    await insertAccessToken(handle.db, accessToken, issuedToken(userId, targetFamily));
    await insertRefreshToken(handle.db, refreshToken, issuedToken(userId, targetFamily));
    await insertAccessToken(handle.db, otherAccessToken, issuedToken(userId, otherFamily));

    await revokeFamily(handle.db, targetFamily);

    const revokedAccess = await readAccessToken(handle.db, accessToken);
    const revokedRefresh = await readRefreshToken(handle.db, refreshToken);
    const untouchedAccess = await readAccessToken(handle.db, otherAccessToken);

    expect(revokedAccess?.revokedAt).not.toBeNull();
    expect(revokedRefresh?.revokedAt).not.toBeNull();
    expect(untouchedAccess?.revokedAt).toBeNull();
  });

  it("makes a revoked refresh token unconsumable even if it was never rotated", async () => {
    const userId = await createUser();
    const familyId = randomUUID();
    const token = randomUUID();

    await insertRefreshToken(handle.db, token, issuedToken(userId, familyId));
    await revokeFamily(handle.db, familyId);

    expect(await consumeRefreshToken(handle.db, token)).toBeNull();
  });
});
