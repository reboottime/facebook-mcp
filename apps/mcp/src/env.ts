import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

export type Env = {
  metaAccessToken: string | null;
  metaPageId: string | null;
};

// Resolved from the module URL, not cwd: MCP clients spawn the server from arbitrary directories.
const ENV_FILE_PATH = fileURLToPath(new URL("../.env.local", import.meta.url));

export function readEnv(): Env {
  // Harness-only flag, deliberately absent from .env.example: the zero-env verification spawns
  // the built server to prove it boots unconfigured, and without this the child would still read
  // the operator's real .env.local and run its smoke calls against live accounts.
  const envFileDisabled = process.env.SOCIAL_MCP_NO_ENV_FILE === "1";

  if (!envFileDisabled && existsSync(ENV_FILE_PATH)) {
    process.loadEnvFile(ENV_FILE_PATH);
  }

  const token = process.env.META_ACCESS_TOKEN?.trim();
  const pageId = process.env.META_PAGE_ID?.trim();

  return {
    metaAccessToken: token ? token : null,
    metaPageId: pageId ? pageId : null,
  };
}
