import type { Server } from "node:http";

import { logInfo } from "../logger.js";
import { createHttpApp } from "./app.js";
import { readHttpConfig, type HttpConfig } from "./config.js";
import { createHttpDeps } from "./deps.js";

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
