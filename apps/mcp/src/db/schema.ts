import {
  bigint,
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

// Facebook Login is the whole account system: a user exists because they completed the Meta
// consent dialog, and their identity is the app-scoped Facebook user id.
export const users = pgTable("users", {
  id: text("id").primaryKey(),
  fbUserId: text("fb_user_id").notNull().unique(),
  name: text("name"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// One long-lived Meta user access token per user. `sealed_` marks every column that holds an
// AES-256-GCM envelope rather than a readable value — no credential is ever stored in plaintext.
export const metaTokens = pgTable("meta_tokens", {
  userId: text("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  sealedAccessToken: text("sealed_access_token").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// The standing Page target for a user. Written only after the Page was found in that user's own
// /me/accounts, and only ever read back keyed by the authenticated user id.
export const pageSelections = pgTable("page_selections", {
  userId: text("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  pageId: text("page_id").notNull(),
  pageName: text("page_name").notNull(),
  sealedPageToken: text("sealed_page_token").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// RFC 7591 dynamic client registration, plus operator pre-registration through the same table.
// MCP clients register as public clients (`token_endpoint_auth_method: "none"`) and get no secret
// at all; the column exists for a pre-registered confidential client, and it is sealed rather than
// hashed because the SDK's client-auth middleware compares the secret by value.
export const oauthClients = pgTable("oauth_clients", {
  clientId: text("client_id").primaryKey(),
  sealedClientSecret: text("sealed_client_secret"),
  clientIdIssuedAt: bigint("client_id_issued_at", { mode: "number" }).notNull(),
  clientSecretExpiresAt: bigint("client_secret_expires_at", { mode: "number" }),
  redirectUris: jsonb("redirect_uris").$type<string[]>().notNull(),
  clientName: text("client_name"),
  clientUri: text("client_uri"),
  scope: text("scope"),
  grantTypes: jsonb("grant_types").$type<string[]>().notNull(),
  responseTypes: jsonb("response_types").$type<string[]>().notNull(),
  tokenEndpointAuthMethod: text("token_endpoint_auth_method").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// Codes are single-use and short-lived; `consumed_at` is what makes replay detectable rather
// than merely unlikely.
export const oauthAuthorizationCodes = pgTable("oauth_authorization_codes", {
  codeHash: text("code_hash").primaryKey(),
  clientId: text("client_id").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  familyId: text("family_id").notNull(),
  redirectUri: text("redirect_uri").notNull(),
  codeChallenge: text("code_challenge").notNull(),
  scopes: jsonb("scopes").$type<string[]>().notNull(),
  resource: text("resource").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  consumedAt: timestamp("consumed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const oauthAccessTokens = pgTable(
  "oauth_access_tokens",
  {
    tokenHash: text("token_hash").primaryKey(),
    familyId: text("family_id").notNull(),
    clientId: text("client_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    scopes: jsonb("scopes").$type<string[]>().notNull(),
    // RFC 8707 audience. Compared against this server's canonical resource identifier on every
    // request, so a token minted for some other resource can never be spent here.
    resource: text("resource").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("oauth_access_tokens_family_idx").on(table.familyId)],
);

// Rotated on every use per OAuth 2.1 §4.3.1. A second presentation of an already-consumed token
// means the family leaked, so the whole family is revoked rather than just the replayed token.
export const oauthRefreshTokens = pgTable(
  "oauth_refresh_tokens",
  {
    tokenHash: text("token_hash").primaryKey(),
    familyId: text("family_id").notNull(),
    clientId: text("client_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    scopes: jsonb("scopes").$type<string[]>().notNull(),
    resource: text("resource").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    consumedAt: timestamp("consumed_at", { withTimezone: true }),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("oauth_refresh_tokens_family_idx").on(table.familyId)],
);
