import {
  appSecretProof,
  readGraphResponse,
  type GraphClient,
} from "../graph/index.js";
import { createGraphClient } from "../graph/index.js";
import { facebookDialogUrl, graphApiBaseUrl, type HttpConfig } from "./config.js";

// What the tool catalog needs: read the Pages a user administers, publish and read Page posts and
// reels, publish to the linked Instagram account, and moderate comments on both.
export const META_LOGIN_SCOPES = [
  "public_profile",
  "pages_show_list",
  "pages_read_engagement",
  "pages_read_user_content",
  "pages_manage_posts",
  "pages_manage_engagement",
  "read_insights",
  "instagram_basic",
  "instagram_content_publish",
  "instagram_manage_comments",
];

export class MetaLoginNotConfiguredError extends Error {
  constructor() {
    super(
      "Facebook Login is not configured on this server. Set FB_APP_ID and FB_APP_SECRET, then restart.",
    );
    this.name = "MetaLoginNotConfiguredError";
  }
}

export type MetaAppCredentials = {
  appId: string;
  appSecret: string;
};

export function readAppCredentials(
  config: HttpConfig,
): MetaAppCredentials | null {
  if (!config.fbAppId || !config.fbAppSecret) {
    return null;
  }

  return { appId: config.fbAppId, appSecret: config.fbAppSecret };
}

export function loginRedirectUri(config: HttpConfig): string {
  return new URL("/auth/facebook/callback", config.publicUrl).href;
}

// "https://www.facebook.com/vX.Y/dialog/oauth" with client_id, redirect_uri and state — the state
// "should be used for preventing Cross-site Request Forgery and will be passed back to you,
// unchanged, in your redirect URI." (developers.facebook.com, Manually Build a Login Flow)
export function buildLoginDialogUrl(
  config: HttpConfig,
  app: MetaAppCredentials,
  state: string,
): string {
  const url = new URL(facebookDialogUrl(config));

  url.searchParams.set("client_id", app.appId);
  url.searchParams.set("redirect_uri", loginRedirectUri(config));
  url.searchParams.set("state", state);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", META_LOGIN_SCOPES.join(","));

  return url.href;
}

export type MetaTokenResponse = {
  access_token: string;
  token_type?: string;
  expires_in?: number;
};

// GET oauth/access_token with client_id, redirect_uri, client_secret and code. redirect_uri "must
// be the same as the original request_uri that you used when starting the OAuth login process".
export async function exchangeLoginCode(
  config: HttpConfig,
  app: MetaAppCredentials,
  code: string,
): Promise<MetaTokenResponse> {
  return readMetaOauth(config, {
    client_id: app.appId,
    client_secret: app.appSecret,
    redirect_uri: loginRedirectUri(config),
    code,
  });
}

// GET oauth/access_token with grant_type=fb_exchange_token. The result is the long-lived User
// access token every later Graph call — and every minted Page token — descends from.
export async function exchangeForLongLivedToken(
  config: HttpConfig,
  app: MetaAppCredentials,
  shortLivedToken: string,
): Promise<MetaTokenResponse> {
  return readMetaOauth(config, {
    grant_type: "fb_exchange_token",
    client_id: app.appId,
    client_secret: app.appSecret,
    fb_exchange_token: shortLivedToken,
  });
}

export type MetaProfile = {
  id: string;
  name?: string;
};

export async function readMetaProfile(
  config: HttpConfig,
  app: MetaAppCredentials,
  accessToken: string,
): Promise<MetaProfile> {
  const graph = createUserGraphClient(config, () => accessToken);

  return graph.get<MetaProfile>("me", { fields: "id,name" });
}

export function createUserGraphClient(
  config: HttpConfig,
  readToken: () => string | null,
): GraphClient {
  return createGraphClient(readToken, {
    baseUrl: graphApiBaseUrl(config),
    appSecret: config.fbAppSecret,
  });
}

async function readMetaOauth(
  config: HttpConfig,
  params: Record<string, string>,
): Promise<MetaTokenResponse> {
  const url = new URL(`${graphApiBaseUrl(config)}/oauth/access_token`);

  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }

  // Meta's own token endpoint takes the app secret directly, so there is no token to prove
  // possession of yet; appsecret_proof starts at the first /me call.
  const response = await fetch(url, { method: "GET" });
  const payload = await readGraphResponse<MetaTokenResponse>(response);

  if (typeof payload.access_token !== "string") {
    throw new Error("Meta returned no access token for this login.");
  }

  return payload;
}

export function tokenExpiryDate(response: MetaTokenResponse): Date | null {
  return typeof response.expires_in === "number" && response.expires_in > 0
    ? new Date(Date.now() + response.expires_in * 1000)
    : null;
}

export { appSecretProof };
