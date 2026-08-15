import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import type { ToolContext, ToolRegistration } from "./context.js";
import { registerHealthTool } from "./health.js";

const registrations: ToolRegistration[] = [registerHealthTool];

export function registerTools(server: McpServer, context: ToolContext): void {
  for (const register of registrations) {
    register(server, context);
  }
}

export type { ToolContext, ToolRegistration } from "./context.js";
