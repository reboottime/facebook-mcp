import { z } from "zod";

import { publishFacebookPost } from "../services/publishing.js";
import { toScheduledPostUnixSeconds } from "../services/scheduling.js";
import { PAGE_ID_DESCRIPTION, type ToolRegistration } from "./context.js";
import { runTool } from "./result.js";
import { pageRefSchema, verificationSchema } from "./schemas.js";

const inputSchema = {
  page_id: z.string().optional().describe(PAGE_ID_DESCRIPTION),
  message: z
    .string()
    .optional()
    .describe(
      'Post body text, e.g. "New reel is up — behind the scenes of this week\'s shoot."',
    ),
  link: z
    .string()
    .optional()
    .describe(
      'URL to attach as a link preview, e.g. "https://example.com/post". Cannot be combined with photo_urls.',
    ),
  photo_urls: z
    .array(z.string())
    .optional()
    .describe(
      'Publicly reachable https image URLs to attach, e.g. ["https://cdn.example.com/a.jpg"]. Local file paths are not supported. Cannot be combined with link.',
    ),
  scheduled_publish_time: z
    .string()
    .optional()
    .describe(
      'ISO 8601 timestamp to publish at, e.g. "2026-09-01T10:15:30Z". Must be 10 minutes to 30 days out. Omit to publish immediately.',
    ),
};

const outputSchema = {
  id: z.string(),
  status: z.enum(["published", "scheduled"]),
  page: pageRefSchema,
  message: z.string().optional(),
  permalink_url: z.string().optional(),
  scheduled_publish_time: z.string().optional(),
  photo_ids: z.array(z.string()).optional(),
  ...verificationSchema,
};

export const registerPublishPostTool: ToolRegistration = (server, context) => {
  server.registerTool(
    "publish_post",
    {
      title: "Publish or schedule a Facebook Page post",
      description:
        "Publishes a text, link, or photo post to a Facebook Page, immediately or scheduled. Photos are uploaded unpublished first and attached to the post. The created post is read back from Meta and the result reports whether it matched.",
      inputSchema,
      outputSchema,
      annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: true },
    },
    (args) =>
      runTool(async () => {
        const page = await context.pages.resolve(args.page_id);

        return publishFacebookPost(page, {
          message: args.message,
          link: args.link,
          photoUrls: args.photo_urls,
          scheduledPublishTime: args.scheduled_publish_time
            ? toScheduledPostUnixSeconds(args.scheduled_publish_time)
            : undefined,
        });
      }),
  );
};
