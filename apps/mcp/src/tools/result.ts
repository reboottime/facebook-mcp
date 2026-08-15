import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";

import { GraphApiError, MetaTokenMissingError } from "../graph/index.js";

const RATE_LIMIT_CODES = new Set([4, 17, 32, 613]);
const PERMISSION_CODES = new Set([10, 200, 299, 3, 803]);
const EXPIRED_TOKEN_CODE = 190;

export async function runTool(
  run: () => Promise<Record<string, unknown>>,
): Promise<CallToolResult> {
  try {
    const value = await run();

    return {
      content: [{ type: "text", text: JSON.stringify(value, null, 2) }],
      structuredContent: value,
    };
  } catch (error) {
    return {
      content: [{ type: "text", text: describeToolError(error) }],
      isError: true,
    };
  }
}

function describeToolError(error: unknown): string {
  if (error instanceof MetaTokenMissingError) {
    return error.message;
  }

  if (error instanceof GraphApiError) {
    return [describeGraphFailure(error), graphAdvice(error)]
      .filter(Boolean)
      .join(" ");
  }

  if (error instanceof Error) {
    return error.message;
  }

  return `Unexpected failure: ${String(error)}`;
}

function describeGraphFailure(error: GraphApiError): string {
  const facts = [
    error.code !== undefined ? `code ${String(error.code)}` : undefined,
    error.subcode !== undefined ? `subcode ${String(error.subcode)}` : undefined,
    error.type ? `type ${error.type}` : undefined,
    `HTTP ${String(error.status)}`,
  ].filter(Boolean);

  const operatorNote = error.userMessage ? ` ${error.userMessage}` : "";

  return `Meta Graph API rejected the call: ${error.message} (${facts.join(", ")}).${operatorNote}`;
}

function graphAdvice(error: GraphApiError): string {
  if (error.code === EXPIRED_TOKEN_CODE) {
    return "The Meta token is expired or invalid — re-issue a long-lived token and update META_ACCESS_TOKEN in apps/mcp/.env.local.";
  }

  if (error.code !== undefined && RATE_LIMIT_CODES.has(error.code)) {
    return "This is a Meta rate limit, not a bad request — wait for the current window to reset and retry.";
  }

  if (error.code !== undefined && PERMISSION_CODES.has(error.code)) {
    return "The token is missing a permission or a Page task for this action — re-authorize with the scopes the tool needs.";
  }

  return "";
}
