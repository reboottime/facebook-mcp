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

// Raised before a request leaves the process, when Meta hands back a destination we will not
// send a token to. Distinct from GraphApiError because nothing was ever called: there is no HTTP
// status, no Graph code, and nothing was uploaded.
export class GraphUploadTargetError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GraphUploadTargetError";
  }
}

// Raised when an id would steer the request somewhere other than the object it names.
export class InvalidGraphPathError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidGraphPathError";
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
