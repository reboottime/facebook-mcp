import { fileURLToPath } from "node:url";

import { PGlite } from "@electric-sql/pglite";
import { drizzle as drizzleNodePg } from "drizzle-orm/node-postgres";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { drizzle as drizzlePglite } from "drizzle-orm/pglite";
import { migrate as migratePglite } from "drizzle-orm/pglite/migrator";
import { Pool } from "pg";

import { logInfo, logWarn } from "../logger.js";
import * as schema from "./schema.js";

// The two drivers expose the same query builder; only the result-set HKT differs, and that
// difference never reaches a call site. Naming node-postgres as the shared type keeps every
// repository free of driver generics, at the cost of one cast in openPglite below.
export type Database = NodePgDatabase<typeof schema>;

export type DatabaseHandle = {
  db: Database;
  kind: "neon" | "pglite";
  close: () => Promise<void>;
};

const MIGRATIONS_FOLDER = fileURLToPath(
  new URL("../../drizzle", import.meta.url),
);

// Zero-env boot: with no DATABASE_URL the server still comes up, on an in-process PGlite that
// migrates itself. `DATABASE_URL` must be Neon's direct (non-pooler) host — see
// docs/fly-deployment.md §4 — because migrations need prepared statements and DDL locks.
export async function openDatabase(
  databaseUrl: string | null,
): Promise<DatabaseHandle> {
  return databaseUrl ? openNeon(databaseUrl) : openPglite();
}

function openNeon(databaseUrl: string): DatabaseHandle {
  const pool = new Pool({ connectionString: databaseUrl });

  logInfo("database: connected to Postgres via DATABASE_URL");

  return {
    db: drizzleNodePg(pool, { schema }),
    kind: "neon",
    close: () => pool.end(),
  };
}

async function openPglite(): Promise<DatabaseHandle> {
  const client = new PGlite();
  const pglite = drizzlePglite(client, { schema });

  await migratePglite(pglite, { migrationsFolder: MIGRATIONS_FOLDER });

  logWarn(
    "database: DATABASE_URL is unset — running on an in-memory PGlite. Users, tokens, and Page selections are lost when this process exits.",
  );

  return {
    db: pglite as unknown as Database,
    kind: "pglite",
    close: () => client.close(),
  };
}
