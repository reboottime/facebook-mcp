import { z } from "zod";

import { GRAPH_API_VERSION } from "../graph/index.js";
import type { ToolRegistration } from "./context.js";

const outputSchema = {
  serverVersion: z.string(),
  graphApiVersion: z.string(),
  metaAccessToken: z.enum(["configured", "not configured"]),
};

export const registerHealthTool: ToolRegistration = (server, context) => {
  server.registerTool(
    "health",
    {
      title: "Server health",
      description:
        "Reports the Social MCP server version, the pinned Meta Graph API version, and whether a Meta access token is configured.",
      outputSchema,
    },
    () => {
      const metaAccessToken = context.env.metaAccessToken
        ? "configured"
        : "not configured";

      return {
        content: [
          {
            type: "text",
            text: `social-mcp ${context.serverVersion} · Graph API ${GRAPH_API_VERSION} · token: ${metaAccessToken}`,
          },
        ],
        structuredContent: {
          serverVersion: context.serverVersion,
          graphApiVersion: GRAPH_API_VERSION,
          metaAccessToken,
        },
      };
    },
  );
};
