import { z } from "zod";

import { GRAPH_API_VERSION } from "../graph/index.js";
import { readHealth } from "../services/health.js";
import type { ToolRegistration } from "./context.js";
import { runTool } from "./result.js";
import { pageRefSchema } from "./schemas.js";

const outputSchema = {
  serverVersion: z.string(),
  graphApiVersion: z.string(),
  transport: z.enum(["stdio", "http"]),
  authMode: z.enum(["env-token", "oauth"]),
  pageSelected: z.boolean(),
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
        "Reports how this server is running — transport, how it authenticates you, and whether a Facebook Page is selected — plus whether the Meta access token works: token holder name, how many Facebook Pages it administers, the Page that Page-scoped tools will target, and whether that Page has a linked Instagram account. Never fails — an unreachable Graph API is reported as a result.",
      outputSchema,
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    () =>
      runTool(async () => {
        const [report, selectedPageId] = await Promise.all([
          readHealth({
            metaToken: context.metaToken(),
            graph: context.graph,
            pages: context.pages,
          }),
          context.pages.readSelectedPageId(),
        ]);

        return {
          serverVersion: context.serverVersion,
          graphApiVersion: GRAPH_API_VERSION,
          transport: context.transport,
          authMode: context.authMode,
          pageSelected: selectedPageId !== null,
          ...report,
        };
      }),
  );
};
