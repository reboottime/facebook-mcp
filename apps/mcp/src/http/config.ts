import { loadLocalEnvFile, readOptional } from "../env.js";
import { GRAPH_API_VERSION } from "../graph/index.js";

const DEFAULT_PORT = 8787;
const DEFAULT_HOST = "127.0.0.1";
const DEFAULT_FACEBOOK_BASE_URL = "https://www.facebook.com";
const DEFAULT_GRAPH_BASE_URL = "https://graph.facebook.com";

export type HttpConfig = {
  port: number;
  host: string;
  // Canonical origin the OAuth issuer, redirect URIs, and the RFC 8707 audience are all built
  // from. Everything the server hands a client must agree with this or discovery breaks.
  publicUrl: URL;
  fbAppId: string | null;
  fbAppSecret: string | null;
  databaseUrl: string | null;
  tokenEncryptionKey: string | null;
  // Overridable so the integration harness can point the whole Meta surface at its in-process
  // fake; production never sets these.
  facebookBaseUrl: string;
  graphBaseUrl: string;
  allowedOrigins: string[];
};

export function readHttpConfig(): HttpConfig {
  loadLocalEnvFile();

  const port = readPort();
  const publicUrl = new URL(
    readOptional("PUBLIC_URL") ?? `http://localhost:${String(port)}`,
  );

  // A trailing path on PUBLIC_URL would silently corrupt every issuer and redirect URI built
  // from it, and RFC 8414 forbids query/fragment on an issuer identifier.
  publicUrl.search = "";
  publicUrl.hash = "";

  const configuredOrigins = readOptional("ALLOWED_ORIGINS");

  return {
    port,
    host: readOptional("HOST") ?? DEFAULT_HOST,
    publicUrl,
    fbAppId: readOptional("FB_APP_ID"),
    fbAppSecret: readOptional("FB_APP_SECRET"),
    databaseUrl: readOptional("DATABASE_URL"),
    tokenEncryptionKey: readOptional("TOKEN_ENCRYPTION_KEY"),
    facebookBaseUrl: trimSlash(
      readOptional("FB_DIALOG_BASE_URL") ?? DEFAULT_FACEBOOK_BASE_URL,
    ),
    graphBaseUrl: trimSlash(
      readOptional("GRAPH_BASE_URL") ?? DEFAULT_GRAPH_BASE_URL,
    ),
    allowedOrigins: configuredOrigins
      ? configuredOrigins.split(",").map((origin) => origin.trim())
      : [publicUrl.origin],
  };
}

export function graphApiBaseUrl(config: HttpConfig): string {
  return `${config.graphBaseUrl}/${GRAPH_API_VERSION}`;
}

export function facebookDialogUrl(config: HttpConfig): string {
  return `${config.facebookBaseUrl}/${GRAPH_API_VERSION}/dialog/oauth`;
}

export function resourceUrl(config: HttpConfig): URL {
  return new URL("/mcp", config.publicUrl);
}

function readPort(): number {
  const raw = readOptional("PORT");

  if (!raw) {
    return DEFAULT_PORT;
  }

  const parsed = Number.parseInt(raw, 10);

  if (!Number.isInteger(parsed) || parsed < 0 || parsed > 65535) {
    throw new Error(`PORT must be a TCP port number, got "${raw}".`);
  }

  return parsed;
}

function trimSlash(value: string): string {
  return value.replace(/\/+$/, "");
}
