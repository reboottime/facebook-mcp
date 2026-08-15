import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import type { ToolContext, ToolRegistration } from "./context.js";
import { registerCrossPostTool } from "./cross-post.js";
import { registerDeletePostTool } from "./delete-post.js";
import { registerGetInsightsTool } from "./get-insights.js";
import { registerHealthTool } from "./health.js";
import { registerListCommentsTool } from "./list-comments.js";
import { registerListPagesTool } from "./list-pages.js";
import { registerListPostsTool } from "./list-posts.js";
import { registerModerateCommentTool } from "./moderate-comment.js";
import { registerPublishInstagramTool } from "./publish-instagram.js";
import { registerPublishPostTool } from "./publish-post.js";
import { registerPublishReelTool } from "./publish-reel.js";
import { registerReplyToCommentTool } from "./reply-to-comment.js";

const registrations: ToolRegistration[] = [
  registerHealthTool,
  registerListPagesTool,
  registerPublishPostTool,
  registerPublishReelTool,
  registerPublishInstagramTool,
  registerCrossPostTool,
  registerListPostsTool,
  registerDeletePostTool,
  registerGetInsightsTool,
  registerListCommentsTool,
  registerReplyToCommentTool,
  registerModerateCommentTool,
];

export function registerTools(server: McpServer, context: ToolContext): void {
  for (const register of registrations) {
    register(server, context);
  }
}

export type { ToolContext, ToolRegistration } from "./context.js";
