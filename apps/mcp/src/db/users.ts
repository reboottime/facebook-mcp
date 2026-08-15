import { randomUUID } from "node:crypto";

import { eq } from "drizzle-orm";

import { logWarn } from "../logger.js";
import { SealedValueError, type SecretBox } from "../secret-box.js";
import type { Database } from "./client.js";
import { metaTokens, pageSelections, users } from "./schema.js";

// A row sealed with a key this process does not have is unrecoverable, so it means exactly what an
// absent row means: nothing is connected, and the operator has to re-link Facebook. Every caller
// already handles that answer. Letting the failure escape instead turns the home page into a 500 —
// the one screen that offers the reconnect button — and the MCP endpoint into an opaque one.
const warnedStaleRows = new Set<string>();

function openStoredSecret(
  box: SecretBox,
  sealed: string,
  kind: string,
  userId: string,
): string | null {
  try {
    return box.open(sealed);
  } catch (error) {
    if (!(error instanceof SealedValueError)) {
      throw error;
    }

    // Once per user per kind: this state repeats on every request until the operator reconnects,
    // and a line per request would bury everything else in the log.
    const seen = `${kind}:${userId}`;

    if (!warnedStaleRows.has(seen)) {
      warnedStaleRows.add(seen);
      logWarn(
        `stored ${kind} for user ${userId} could not be decrypted with the current TOKEN_ENCRYPTION_KEY; treating the account as not connected until Facebook is reconnected`,
      );
    }

    return null;
  }
}

export type UserRecord = {
  id: string;
  fbUserId: string;
  name: string | null;
};

export type MetaIdentity = {
  fbUserId: string;
  name?: string;
  accessToken: string;
  expiresAt: Date | null;
};

// Facebook Login IS registration: the first successful callback creates the row, every later one
// refreshes the name and re-seals the freshly issued long-lived token. One transaction, because a
// user row without its token — or a token row for a user that was never committed — is a state the
// login flow has no way back out of.
export async function upsertUserFromMeta(
  db: Database,
  box: SecretBox,
  identity: MetaIdentity,
): Promise<UserRecord> {
  const now = new Date();
  const sealedAccessToken = box.seal(identity.accessToken);

  return db.transaction(async (tx) => {
    const [user] = await tx
      .insert(users)
      .values({
        id: randomUUID(),
        fbUserId: identity.fbUserId,
        name: identity.name ?? null,
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: users.fbUserId,
        set: { name: identity.name ?? null, updatedAt: now },
      })
      .returning({
        id: users.id,
        fbUserId: users.fbUserId,
        name: users.name,
      });

    if (!user) {
      throw new Error("Failed to store the Facebook user record.");
    }

    await tx
      .insert(metaTokens)
      .values({
        userId: user.id,
        sealedAccessToken,
        expiresAt: identity.expiresAt,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: metaTokens.userId,
        set: {
          sealedAccessToken,
          expiresAt: identity.expiresAt,
          updatedAt: now,
        },
      });

    return user;
  });
}

export async function readUser(
  db: Database,
  userId: string,
): Promise<UserRecord | null> {
  const [user] = await db
    .select({ id: users.id, fbUserId: users.fbUserId, name: users.name })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  return user ?? null;
}

export async function readMetaAccessToken(
  db: Database,
  box: SecretBox,
  userId: string,
): Promise<string | null> {
  const [row] = await db
    .select({ sealed: metaTokens.sealedAccessToken })
    .from(metaTokens)
    .where(eq(metaTokens.userId, userId))
    .limit(1);

  return row ? openStoredSecret(box, row.sealed, "Meta token", userId) : null;
}

export type PageSelectionRecord = {
  id: string;
  name: string;
  accessToken: string;
};

export async function readPageSelection(
  db: Database,
  box: SecretBox,
  userId: string,
): Promise<PageSelectionRecord | null> {
  const [row] = await db
    .select({
      pageId: pageSelections.pageId,
      pageName: pageSelections.pageName,
      sealed: pageSelections.sealedPageToken,
    })
    .from(pageSelections)
    .where(eq(pageSelections.userId, userId))
    .limit(1);

  if (!row) {
    return null;
  }

  const accessToken = openStoredSecret(box, row.sealed, "Page token", userId);

  return accessToken
    ? { id: row.pageId, name: row.pageName, accessToken }
    : null;
}

export async function writePageSelection(
  db: Database,
  box: SecretBox,
  userId: string,
  selection: PageSelectionRecord,
): Promise<void> {
  const sealedPageToken = box.seal(selection.accessToken);
  const now = new Date();

  await db
    .insert(pageSelections)
    .values({
      userId,
      pageId: selection.id,
      pageName: selection.name,
      sealedPageToken,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: pageSelections.userId,
      set: {
        pageId: selection.id,
        pageName: selection.name,
        sealedPageToken,
        updatedAt: now,
      },
    });
}
