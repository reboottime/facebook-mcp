import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

export type Env = {
  metaAccessToken: string | null;
  metaPageId: string | null;
};

// Resolved from the module URL, not cwd: MCP clients spawn the server from arbitrary directories.
const ENV_FILE_PATH = fileURLToPath(new URL("../.env.local", import.meta.url));

export function readEnv(): Env {
  if (existsSync(ENV_FILE_PATH)) {
    process.loadEnvFile(ENV_FILE_PATH);
  }

  const token = process.env.META_ACCESS_TOKEN?.trim();
  const pageId = process.env.META_PAGE_ID?.trim();

  return {
    metaAccessToken: token ? token : null,
    metaPageId: pageId ? pageId : null,
  };
}
