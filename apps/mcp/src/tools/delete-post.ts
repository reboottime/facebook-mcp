import { z } from "zod";

import { deletePost } from "../services/queue.js";
import { PAGE_ID_DESCRIPTION, type ToolRegistration } from "./context.js";
import { runTool } from "./result.js";
import { graphIdSchema, verificationSchema } from "./schemas.js";

const inputSchema = {
  post_id: graphIdSchema("post_id").describe(
    'Facebook post id to remove, e.g. "102938475610293_9988776655". Works for both scheduled and already published posts.',
  ),
  page_id: graphIdSchema("page_id").optional().describe(PAGE_ID_DESCRIPTION),
};

const outputSchema = {
  id: z.string(),
  deleted: z.boolean(),
  ...verificationSchema,
};

export const registerDeletePostTool: ToolRegistration = (server, context) => {
  server.registerTool(
    "delete_post",
    {
      title: "Delete a Facebook Page post",
      description:
        "Permanently deletes a Page post. Use this to cancel a scheduled post or take down a published one. After the delete the id is looked up again and the result reports whether it is really gone. This cannot be undone.",
      inputSchema,
      outputSchema,
      annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: false, openWorldHint: true },
    },
    (args) =>
      runTool(async () => {
        const page = await context.pages.resolve(args.page_id);

        return deletePost(page, args.post_id);
      }),
  );
};
