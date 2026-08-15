import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

export type Env = {
  metaAccessToken: string | null;
  metaPageId: string | null;
};

// Resolved from the module URL, not cwd: MCP clients spawn the server from arbitrary directories.
const ENV_FILE_PATH = fileURLToPath(new URL("../.env.local", import.meta.url));

// Harness-only flag, deliberately absent from .env.example: the zero-env verification and every
// HTTP integration test spawn the server unconfigured to prove it boots, and without this the
// child would still read the operator's real .env.local and run against live accounts.
export function loadLocalEnvFile(): void {
  if (process.env.SOCIAL_MCP_NO_ENV_FILE === "1") {
    return;
  }

  if (existsSync(ENV_FILE_PATH)) {
    process.loadEnvFile(ENV_FILE_PATH);
  }
}

export function readEnv(): Env {
  loadLocalEnvFile();

  return {
    metaAccessToken: readOptional("META_ACCESS_TOKEN"),
    metaPageId: readOptional("META_PAGE_ID"),
  };
}

export function readOptional(name: string): string | null {
  const value = process.env[name]?.trim();

  return value ? value : null;
}
