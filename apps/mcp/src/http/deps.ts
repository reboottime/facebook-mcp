import type { Database, DatabaseHandle } from "../db/client.js";
import { openDatabase } from "../db/client.js";
import { logWarn } from "../logger.js";
import {
  createSecretBox,
  resolveEncryptionKey,
  type SecretBox,
} from "../secret-box.js";
import type { HttpConfig } from "./config.js";

// Everything the HTTP surface needs, resolved once at boot and threaded explicitly. No module
// holds a token, a connection, or a key at import time — that is what keeps per-user isolation a
// property of construction rather than of discipline.
export type HttpDeps = {
  config: HttpConfig;
  db: Database;
  box: SecretBox;
  storage: {
    kind: DatabaseHandle["kind"];
    ephemeralEncryptionKey: boolean;
  };
};

export async function createHttpDeps(config: HttpConfig): Promise<{
  deps: HttpDeps;
  close: () => Promise<void>;
}> {
  const { key, ephemeral } = resolveEncryptionKey(config.tokenEncryptionKey);

  if (ephemeral) {
    logWarn(
      "TOKEN_ENCRYPTION_KEY is unset — sealing credentials with a key generated for this process. Stored Meta tokens and Page selections will not survive a restart. Set TOKEN_ENCRYPTION_KEY (openssl rand -base64 32) before relying on this server.",
    );
  }

  const handle = await openDatabase(config.databaseUrl);

  return {
    deps: {
      config,
      db: handle.db,
      box: createSecretBox(key),
      storage: { kind: handle.kind, ephemeralEncryptionKey: ephemeral },
    },
    close: handle.close,
  };
}
