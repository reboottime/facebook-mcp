import { z } from "zod";

import { GRAPH_API_VERSION } from "../graph/index.js";
import { readHealth } from "../services/health.js";
import type { ToolRegistration } from "./context.js";
import { runTool } from "./result.js";
import { pageRefSchema } from "./schemas.js";

const outputSchema = {
  serverVersion: z.string(),
  graphApiVersion: z.string(),
  metaAccessToken: z.enum(["configured", "not configured"]),
  graph: z.enum(["ok", "unreachable", "not checked"]),
  tokenHolder: z.string().optional(),
  pagesCount: z.number().optional(),
  page: pageRefSchema.optional(),
  instagramLinked: z.boolean().optional(),
  detail: z.string().optional(),
};

export const registerHealthTool: ToolRegistration = (server, context) => {
  server.registerTool(
    "health",
    {
      title: "Server health",
      description:
        "Reports whether the Meta access token is configured and working: token holder name, how many Facebook Pages it administers, the Page that Page-scoped tools will target, and whether that Page has a linked Instagram account. Never fails — an unreachable Graph API is reported as a result.",
      outputSchema,
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    () =>
      runTool(async () => {
        const report = await readHealth(
          context.env,
          context.graph,
          context.pages,
        );

        return {
          serverVersion: context.serverVersion,
          graphApiVersion: GRAPH_API_VERSION,
          ...report,
        };
      }),
  );
};
