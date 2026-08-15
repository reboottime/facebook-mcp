import { z } from "zod";

const graphErrorEnvelopeSchema = z.object({
  error: z.object({
    message: z.string(),
    type: z.string().optional(),
    code: z.number().optional(),
    error_subcode: z.number().optional(),
    error_user_title: z.string().optional(),
    error_user_msg: z.string().optional(),
    fbtrace_id: z.string().optional(),
  }),
});

export type GraphApiErrorDetails = {
  status: number;
  type?: string;
  code?: number;
  subcode?: number;
  userTitle?: string;
  userMessage?: string;
  fbtraceId?: string;
};

export class GraphApiError extends Error {
  readonly status: number;
  readonly type?: string;
  readonly code?: number;
  readonly subcode?: number;
  readonly userTitle?: string;
  readonly userMessage?: string;
  readonly fbtraceId?: string;

  constructor(message: string, details: GraphApiErrorDetails) {
    super(message);
    this.name = "GraphApiError";
    this.status = details.status;
    this.type = details.type;
    this.code = details.code;
    this.subcode = details.subcode;
    this.userTitle = details.userTitle;
    this.userMessage = details.userMessage;
    this.fbtraceId = details.fbtraceId;
  }
}

export class MetaTokenMissingError extends Error {
  constructor() {
    super(
      "Meta access token is not configured. Add META_ACCESS_TOKEN to apps/mcp/.env.local and restart the server.",
    );
    this.name = "MetaTokenMissingError";
  }
}

export function toGraphApiError(
  status: number,
  payload: unknown,
): GraphApiError {
  const parsed = graphErrorEnvelopeSchema.safeParse(payload);

  if (!parsed.success) {
    return new GraphApiError(`Graph API request failed with HTTP ${status}.`, {
      status,
    });
  }

  const { error } = parsed.data;

  return new GraphApiError(error.message, {
    status,
    type: error.type,
    code: error.code,
    subcode: error.error_subcode,
    userTitle: error.error_user_title,
    userMessage: error.error_user_msg,
    fbtraceId: error.fbtrace_id,
  });
}
