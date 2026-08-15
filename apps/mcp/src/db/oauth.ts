import { and, eq, isNull, lt } from "drizzle-orm";

import { hashToken } from "../secret-box.js";
import type { Database } from "./client.js";
import {
  oauthAccessTokens,
  oauthAuthorizationCodes,
  oauthClients,
  oauthRefreshTokens,
} from "./schema.js";

export type ClientRecord = {
  clientId: string;
  sealedClientSecret: string | null;
  clientIdIssuedAt: number;
  clientSecretExpiresAt: number | null;
  redirectUris: string[];
  clientName: string | null;
  clientUri: string | null;
  scope: string | null;
  grantTypes: string[];
  responseTypes: string[];
  tokenEndpointAuthMethod: string;
};

export async function insertClient(
  db: Database,
  record: ClientRecord,
): Promise<void> {
  await db.insert(oauthClients).values(record);
}

export async function readClient(
  db: Database,
  clientId: string,
): Promise<ClientRecord | null> {
  const [row] = await db
    .select()
    .from(oauthClients)
    .where(eq(oauthClients.clientId, clientId))
    .limit(1);

  if (!row) {
    return null;
  }

  return {
    clientId: row.clientId,
    sealedClientSecret: row.sealedClientSecret,
    clientIdIssuedAt: row.clientIdIssuedAt,
    clientSecretExpiresAt: row.clientSecretExpiresAt,
    redirectUris: row.redirectUris,
    clientName: row.clientName,
    clientUri: row.clientUri,
    scope: row.scope,
    grantTypes: row.grantTypes,
    responseTypes: row.responseTypes,
    tokenEndpointAuthMethod: row.tokenEndpointAuthMethod,
  };
}

export type AuthorizationCodeRecord = {
  clientId: string;
  userId: string;
  familyId: string;
  redirectUri: string;
  codeChallenge: string;
  scopes: string[];
  resource: string;
  expiresAt: Date;
};

export async function insertAuthorizationCode(
  db: Database,
  code: string,
  record: AuthorizationCodeRecord,
): Promise<void> {
  await db
    .insert(oauthAuthorizationCodes)
    .values({ codeHash: hashToken(code), ...record });
}

export async function readAuthorizationCode(
  db: Database,
  code: string,
): Promise<(AuthorizationCodeRecord & { consumedAt: Date | null }) | null> {
  const [row] = await db
    .select()
    .from(oauthAuthorizationCodes)
    .where(eq(oauthAuthorizationCodes.codeHash, hashToken(code)))
    .limit(1);

  return row ?? null;
}

// Compare-and-set, not read-then-write: two token requests racing the same code must produce
// exactly one winner, and the loser must be distinguishable from an unknown code.
export async function consumeAuthorizationCode(
  db: Database,
  code: string,
): Promise<AuthorizationCodeRecord | null> {
  const [row] = await db
    .update(oauthAuthorizationCodes)
    .set({ consumedAt: new Date() })
    .where(
      and(
        eq(oauthAuthorizationCodes.codeHash, hashToken(code)),
        isNull(oauthAuthorizationCodes.consumedAt),
      ),
    )
    .returning();

  return row ?? null;
}

export type IssuedTokenRecord = {
  familyId: string;
  clientId: string;
  userId: string;
  scopes: string[];
  resource: string;
  expiresAt: Date;
};

export async function insertAccessToken(
  db: Database,
  token: string,
  record: IssuedTokenRecord,
): Promise<void> {
  await db
    .insert(oauthAccessTokens)
    .values({ tokenHash: hashToken(token), ...record });
}

export type AccessTokenRecord = IssuedTokenRecord & { revokedAt: Date | null };

export async function readAccessToken(
  db: Database,
  token: string,
): Promise<AccessTokenRecord | null> {
  const [row] = await db
    .select()
    .from(oauthAccessTokens)
    .where(eq(oauthAccessTokens.tokenHash, hashToken(token)))
    .limit(1);

  return row ?? null;
}

export async function insertRefreshToken(
  db: Database,
  token: string,
  record: IssuedTokenRecord,
): Promise<void> {
  await db
    .insert(oauthRefreshTokens)
    .values({ tokenHash: hashToken(token), ...record });
}

export type RefreshTokenRecord = IssuedTokenRecord & {
  consumedAt: Date | null;
  revokedAt: Date | null;
};

export async function readRefreshToken(
  db: Database,
  token: string,
): Promise<RefreshTokenRecord | null> {
  const [row] = await db
    .select()
    .from(oauthRefreshTokens)
    .where(eq(oauthRefreshTokens.tokenHash, hashToken(token)))
    .limit(1);

  return row ?? null;
}

export async function consumeRefreshToken(
  db: Database,
  token: string,
): Promise<IssuedTokenRecord | null> {
  const [row] = await db
    .update(oauthRefreshTokens)
    .set({ consumedAt: new Date() })
    .where(
      and(
        eq(oauthRefreshTokens.tokenHash, hashToken(token)),
        isNull(oauthRefreshTokens.consumedAt),
        isNull(oauthRefreshTokens.revokedAt),
      ),
    )
    .returning();

  return row ?? null;
}

// A replayed refresh token means the family leaked, so every credential descended from that one
// authorization — not merely the replayed token — stops working. OAuth 2.1 §4.3.1.
export async function revokeFamily(
  db: Database,
  familyId: string,
): Promise<void> {
  const now = new Date();

  await db
    .update(oauthAccessTokens)
    .set({ revokedAt: now })
    .where(
      and(
        eq(oauthAccessTokens.familyId, familyId),
        isNull(oauthAccessTokens.revokedAt),
      ),
    );

  await db
    .update(oauthRefreshTokens)
    .set({ revokedAt: now })
    .where(
      and(
        eq(oauthRefreshTokens.familyId, familyId),
        isNull(oauthRefreshTokens.revokedAt),
      ),
    );
}

// Nothing reads a credential past its expiry — every code and token path checks `expires_at` before
// honouring a row — so expired rows are dead weight. The grace period is what keeps an audit of the
// recent past: a revoked-family investigation still has the rows it needs.
const EXPIRED_ROW_GRACE_MS = 30 * 24 * 60 * 60 * 1000;

export async function deleteExpiredOAuthRows(db: Database): Promise<void> {
  const cutoff = new Date(Date.now() - EXPIRED_ROW_GRACE_MS);

  await db
    .delete(oauthAuthorizationCodes)
    .where(lt(oauthAuthorizationCodes.expiresAt, cutoff));

  await db.delete(oauthAccessTokens).where(lt(oauthAccessTokens.expiresAt, cutoff));

  await db
    .delete(oauthRefreshTokens)
    .where(lt(oauthRefreshTokens.expiresAt, cutoff));
}

export async function revokeAccessToken(
  db: Database,
  token: string,
): Promise<void> {
  await db
    .update(oauthAccessTokens)
    .set({ revokedAt: new Date() })
    .where(eq(oauthAccessTokens.tokenHash, hashToken(token)));
}

export async function revokeRefreshToken(
  db: Database,
  token: string,
): Promise<void> {
  await db
    .update(oauthRefreshTokens)
    .set({ revokedAt: new Date() })
    .where(eq(oauthRefreshTokens.tokenHash, hashToken(token)));
}
