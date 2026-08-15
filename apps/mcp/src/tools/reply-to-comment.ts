import { z } from "zod";

import {
  replyToFacebookComment,
  replyToInstagramComment,
} from "../services/comments.js";
import { PAGE_ID_DESCRIPTION, type ToolRegistration } from "./context.js";
import { runTool } from "./result.js";
import { platformSchema, verificationSchema } from "./schemas.js";

const inputSchema = {
  platform: platformSchema,
  comment_id: z
    .string()
    .describe(
      'Id of the comment being replied to, e.g. "9988776655_1122334455" on Facebook or "17895695668004550" on Instagram.',
    ),
  message: z
    .string()
    .min(1)
    .describe('Reply text, e.g. "Thanks for watching — more on Friday!"'),
  page_id: z.string().optional().describe(PAGE_ID_DESCRIPTION),
};

const outputSchema = {
  id: z.string(),
  platform: z.enum(["facebook", "instagram"]),
  parent_comment_id: z.string(),
  message: z.string().optional(),
  ...verificationSchema,
};

export const registerReplyToCommentTool: ToolRegistration = (
  server,
  context,
) => {
  server.registerTool(
    "reply_to_comment",
    {
      title: "Reply to a comment",
      description:
        "Posts a reply under an existing comment on a Facebook post or an Instagram post. The reply is read back from Meta and the result reports whether the stored text matched what was sent.",
      inputSchema,
      outputSchema,
      annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: true },
    },
    (args) =>
      runTool(async () => {
        const page = await context.pages.resolve(args.page_id);

        return args.platform === "facebook"
          ? replyToFacebookComment(page, args.comment_id, args.message)
          : replyToInstagramComment(page, args.comment_id, args.message);
      }),
  );
};
