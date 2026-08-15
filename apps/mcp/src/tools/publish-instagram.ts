import { z } from "zod";

import { InvalidToolInputError } from "../errors.js";
import {
  publishInstagramImage,
  publishInstagramReel,
  publishInstagramStory,
  type InstagramPostResult,
} from "../services/publishing.js";
import type { ResolvedInstagramAccount } from "../services/pages.js";
import { PAGE_ID_DESCRIPTION, type ToolRegistration } from "./context.js";
import { runTool } from "./result.js";
import { graphIdSchema, verificationSchema } from "./schemas.js";

const inputSchema = {
  page_id: graphIdSchema("page_id")
    .optional()
    .describe(
      `${PAGE_ID_DESCRIPTION} The Instagram account is taken from that Page's link.`,
    ),
  image_url: z
    .string()
    .optional()
    .describe(
      'Publicly reachable https image URL, e.g. "https://cdn.example.com/a.jpg". Supply this or video_url, not both.',
    ),
  video_url: z
    .string()
    .optional()
    .describe(
      'Publicly reachable https video URL, e.g. "https://cdn.example.com/reel.mp4". Supply this or image_url, not both.',
    ),
  media_type: z
    .enum(["IMAGE", "REELS", "STORIES"])
    .optional()
    .describe(
      'What to publish. Defaults to "IMAGE" for image_url and "REELS" for video_url; pass "STORIES" explicitly for a story.',
    ),
  caption: z
    .string()
    .optional()
    .describe(
      'Caption text with hashtags, e.g. "Studio day ☕ #behindthescenes". Ignored for stories.',
    ),
  share_to_feed: z
    .boolean()
    .optional()
    .describe("Reels only: also show the reel on the profile feed grid."),
};

const outputSchema = {
  id: z.string(),
  container_id: z.string(),
  media_type: z.enum(["IMAGE", "REELS", "STORIES"]),
  instagram_account: z.object({
    id: z.string(),
    username: z.string().optional(),
  }),
  caption: z.string().optional(),
  permalink: z.string().optional(),
  ...verificationSchema,
};

export const registerPublishInstagramTool: ToolRegistration = (
  server,
  context,
) => {
  server.registerTool(
    "publish_instagram",
    {
      title: "Publish to Instagram",
      description:
        "Publishes an image, reel, or story to the Instagram Business account linked to a Facebook Page. Meta fetches the media from the URL, so it must be publicly reachable. Instagram has no scheduling API — publishing is immediate. The published media is read back and the result reports whether the caption matched.",
      inputSchema,
      outputSchema,
      annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: true },
    },
    (args) =>
      runTool(async () => {
        const target = await context.pages.resolveInstagram(args.page_id);

        return publish(target, args);
      }),
  );
};

function publish(
  target: ResolvedInstagramAccount,
  args: {
    image_url?: string;
    video_url?: string;
    media_type?: "IMAGE" | "REELS" | "STORIES";
    caption?: string;
    share_to_feed?: boolean;
  },
): Promise<InstagramPostResult> {
  if (args.image_url && args.video_url) {
    throw new InvalidToolInputError(
      "Pass either image_url or video_url, not both.",
    );
  }

  const mediaType =
    args.media_type ?? (args.video_url ? "REELS" : args.image_url ? "IMAGE" : undefined);

  if (!mediaType) {
    throw new InvalidToolInputError(
      "Pass image_url or video_url — there is nothing to publish.",
    );
  }

  if (mediaType === "STORIES") {
    return publishInstagramStory(target, {
      imageUrl: args.image_url,
      videoUrl: args.video_url,
    });
  }

  if (mediaType === "REELS") {
    if (!args.video_url) {
      throw new InvalidToolInputError(
        'media_type "REELS" needs video_url.',
      );
    }

    return publishInstagramReel(target, {
      videoUrl: args.video_url,
      caption: args.caption,
      shareToFeed: args.share_to_feed,
    });
  }

  if (!args.image_url) {
    throw new InvalidToolInputError('media_type "IMAGE" needs image_url.');
  }

  return publishInstagramImage(target, {
    imageUrl: args.image_url,
    caption: args.caption,
  });
}
