import { z } from "zod";

import { publishFacebookReel } from "../services/publishing.js";
import { toScheduledReelUnixSeconds } from "../services/scheduling.js";
import { PAGE_ID_DESCRIPTION, type ToolRegistration } from "./context.js";
import { runTool } from "./result.js";
import { pageRefSchema, verificationSchema } from "./schemas.js";

const inputSchema = {
  page_id: z.string().optional().describe(PAGE_ID_DESCRIPTION),
  video_url: z
    .string()
    .describe(
      'Publicly reachable https URL of the video file, e.g. "https://cdn.example.com/reel.mp4". Meta downloads it directly; local file paths are not supported.',
    ),
  description: z
    .string()
    .optional()
    .describe(
      'Reel caption, hashtags allowed, e.g. "Studio day #behindthescenes".',
    ),
  scheduled_publish_time: z
    .string()
    .optional()
    .describe(
      'ISO 8601 timestamp to publish at, e.g. "2026-09-01T10:15:30Z". Must be 10 minutes to 29 days out — Meta caps scheduled reels at 29 days. Omit to publish immediately.',
    ),
};

const outputSchema = {
  video_id: z.string(),
  status: z.enum(["published", "scheduled"]),
  page: pageRefSchema,
  description: z.string().optional(),
  permalink_url: z.string().optional(),
  scheduled_publish_time: z.string().optional(),
  video_status: z.string().optional(),
  ...verificationSchema,
};

export const registerPublishReelTool: ToolRegistration = (server, context) => {
  server.registerTool(
    "publish_reel",
    {
      title: "Publish or schedule a Facebook Page reel",
      description:
        "Publishes a reel to a Facebook Page from a hosted video URL, immediately or scheduled. Meta fetches the video itself, so the URL must be publicly reachable. The reel is read back after upload and the result reports its processing status.",
      inputSchema,
      outputSchema,
      annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: true },
    },
    (args) =>
      runTool(async () => {
        const page = await context.pages.resolve(args.page_id);

        return publishFacebookReel(page, {
          videoUrl: args.video_url,
          description: args.description,
          scheduledPublishTime: args.scheduled_publish_time
            ? toScheduledReelUnixSeconds(args.scheduled_publish_time)
            : undefined,
        });
      }),
  );
};
