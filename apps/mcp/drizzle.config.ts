import { defineConfig } from "drizzle-kit";

// `generate` is the only command run against this config; migrations are applied by PGlite on
// boot (dev) or out-of-band against Neon before a deploy (docs/fly-deployment.md §4).
export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema.ts",
  out: "./drizzle",
});
