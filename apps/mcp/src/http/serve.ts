import type { Server } from "node:http";

import { deleteExpiredOAuthRows } from "../db/oauth.js";
import type { Database } from "../db/client.js";
import { logError, logInfo } from "../logger.js";
import { createHttpApp } from "./app.js";
import { readHttpConfig, type HttpConfig } from "./config.js";
import { createHttpDeps } from "./deps.js";

const REAP_INTERVAL_MS = 60 * 60 * 1000;

export type RunningHttpServer = {
  server: Server;
  config: HttpConfig;
  close: () => Promise<void>;
};

// Boots with no environment at all: PGlite in memory, an ephemeral encryption key, and a home page
// that says Facebook Login is unconfigured. Discovery, 401s, and the MCP endpoint all work.
export async function startHttpServer(
  overrides: Partial<HttpConfig> = {},
): Promise<RunningHttpServer> {
  const config = { ...readHttpConfig(), ...overrides };
  const { deps, close: closeDeps } = await createHttpDeps(config);
  const app = createHttpApp(deps);

  await reapExpiredRows(deps.db);

  // Scale-to-zero means there is no separate cron VM to hang this off, and unref'd means the timer
  // never keeps a process alive that would otherwise exit.
  const reaper = setInterval(() => {
    void reapExpiredRows(deps.db);
  }, REAP_INTERVAL_MS);

  reaper.unref();

  const server = await new Promise<Server>((resolve, reject) => {
    const listener = app.listen(config.port, config.host, () => {
      resolve(listener);
    });

    listener.once("error", reject);
  });

  logInfo(
    `http: listening on ${config.host}:${String(config.port)} — public URL ${config.publicUrl.origin}, storage ${deps.storage.kind}`,
  );

  return {
    server,
    config,
    close: async () => {
      clearInterval(reaper);

      await new Promise<void>((resolve, reject) => {
        server.close((error) => {
          if (error) {
            reject(error);
          } else {
            resolve();
          }
        });
      });

      await closeDeps();
    },
  };
}

// Housekeeping must never take the server down with it: a reap that fails is logged and retried on
// the next tick, whether it ran at boot or on the interval.
async function reapExpiredRows(db: Database): Promise<void> {
  try {
    await deleteExpiredOAuthRows(db);
  } catch (error) {
    logError("failed to delete expired OAuth rows", error);
  }
}
