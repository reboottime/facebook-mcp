import { z } from "zod";

import {
  deleteComment,
  setFacebookCommentVisibility,
  setInstagramCommentVisibility,
  type ModerationResult,
} from "../services/comments.js";
import type { ResolvedPage } from "../services/pages.js";
import { PAGE_ID_DESCRIPTION, type ToolRegistration } from "./context.js";
import { runTool } from "./result.js";
import {
  graphIdSchema,
  platformSchema,
  verificationSchema,
} from "./schemas.js";

const inputSchema = {
  platform: platformSchema,
  comment_id: graphIdSchema("comment_id").describe(
    'Id of the comment to moderate, e.g. "9988776655_1122334455" on Facebook or "17895695668004550" on Instagram.',
  ),
  action: z
    .enum(["hide", "unhide", "delete"])
    .describe(
      'What to do: "hide" removes it from public view but keeps it, "unhide" restores it, "delete" removes it permanently.',
    ),
  page_id: graphIdSchema("page_id").optional().describe(PAGE_ID_DESCRIPTION),
};

const outputSchema = {
  id: z.string(),
  platform: z.enum(["facebook", "instagram"]),
  action: z.enum(["hide", "unhide", "delete"]),
  ...verificationSchema,
};

export const registerModerateCommentTool: ToolRegistration = (
  server,
  context,
) => {
  server.registerTool(
    "moderate_comment",
    {
      title: "Hide, unhide, or delete a comment",
      description:
        "Moderates a comment on a Facebook post or an Instagram post. Hiding is reversible; deleting is not. The comment is read back after the change and the result reports whether it took effect.",
      inputSchema,
      outputSchema,
      annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: false, openWorldHint: true },
    },
    (args) =>
      runTool(async () => {
        const page = await context.pages.resolve(args.page_id);

        return moderate(page, args);
      }),
  );
};

function moderate(
  page: ResolvedPage,
  args: {
    platform: "facebook" | "instagram";
    comment_id: string;
    action: "hide" | "unhide" | "delete";
  },
): Promise<ModerationResult> {
  if (args.action === "delete") {
    return deleteComment(page, args.comment_id, args.platform);
  }

  const hidden = args.action === "hide";

  return args.platform === "facebook"
    ? setFacebookCommentVisibility(page, args.comment_id, hidden)
    : setInstagramCommentVisibility(page, args.comment_id, hidden);
}
