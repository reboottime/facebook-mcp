import { InvalidToolInputError } from "../errors.js";
import {
  listInstagramMediaChildren,
  readInstagramMedia,
  readPostWithAttachments,
  type PostAttachment,
} from "../graph/index.js";
import type { ResolvedInstagramAccount, ResolvedPage } from "./pages.js";
import {
  toScheduledPostUnixSeconds,
  toScheduledReelUnixSeconds,
} from "./scheduling.js";
import {
  publishFacebookPost,
  publishFacebookReel,
  publishInstagramImage,
  publishInstagramReel,
  type FacebookPostResult,
  type FacebookReelResult,
  type InstagramPostResult,
} from "./publishing.js";

export type CrossPostToInstagramResult = {
  source: { platform: "facebook"; id: string; permalink_url?: string };
  target: { platform: "instagram" } & InstagramPostResult;
};

export type CrossPostToFacebookResult = {
  source: { platform: "instagram"; id: string; permalink?: string };
  target:
    | ({ platform: "facebook"; kind: "post" } & FacebookPostResult)
    | ({ platform: "facebook"; kind: "reel" } & FacebookReelResult);
};

export async function crossPostFacebookToInstagram(
  page: ResolvedPage,
  target: ResolvedInstagramAccount,
  input: { postId: string; caption?: string },
): Promise<CrossPostToInstagramResult> {
  const post = await readPostWithAttachments(page.client, input.postId);
  const attachment = flatten(post.attachments?.data ?? [])[0];
  const caption = input.caption ?? post.message;

  if (!attachment) {
    throw new InvalidToolInputError(
      `Facebook post ${input.postId} carries no image or video. Instagram requires media, so a text-only post cannot be cross-posted.`,
    );
  }

  const videoUrl = attachment.media?.source;
  const imageUrl = attachment.media?.image?.src;

  if (videoUrl) {
    const published = await publishInstagramReel(target, {
      videoUrl,
      caption,
    });

    return {
      source: {
        platform: "facebook",
        id: input.postId,
        permalink_url: post.permalink_url,
      },
      target: { platform: "instagram", ...published },
    };
  }

  if (!imageUrl) {
    throw new InvalidToolInputError(
      `Facebook post ${input.postId} carries an attachment Meta exposes no media URL for (type: ${attachment.media_type ?? attachment.type ?? "unknown"}). Instagram cannot be given the source file.`,
    );
  }

  const published = await publishInstagramImage(target, {
    imageUrl,
    caption,
  });

  return {
    source: {
      platform: "facebook",
      id: input.postId,
      permalink_url: post.permalink_url,
    },
    target: { platform: "instagram", ...published },
  };
}

export async function crossPostInstagramToFacebook(
  page: ResolvedPage,
  input: {
    mediaId: string;
    caption?: string;
    scheduledPublishTime?: string;
  },
): Promise<CrossPostToFacebookResult> {
  const media = await readInstagramMedia(page.client, input.mediaId);
  const message = input.caption ?? media.caption;
  const source = {
    platform: "instagram" as const,
    id: input.mediaId,
    permalink: media.permalink,
  };

  if (media.media_type === "VIDEO") {
    if (!media.media_url) {
      throw new InvalidToolInputError(
        `Instagram media ${input.mediaId} exposes no media_url, so the video cannot be re-uploaded to Facebook.`,
      );
    }

    const published = await publishFacebookReel(page, {
      videoUrl: media.media_url,
      description: message,
      scheduledPublishTime: input.scheduledPublishTime
        ? toScheduledReelUnixSeconds(input.scheduledPublishTime)
        : undefined,
    });

    return { source, target: { platform: "facebook", kind: "reel", ...published } };
  }

  const photoUrls =
    media.media_type === "CAROUSEL_ALBUM"
      ? (await listInstagramMediaChildren(page.client, input.mediaId))
          .map((child) => child.media_url)
          .filter((url): url is string => Boolean(url))
      : [media.media_url].filter((url): url is string => Boolean(url));

  if (photoUrls.length === 0) {
    throw new InvalidToolInputError(
      `Instagram media ${input.mediaId} exposes no media_url, so there is nothing to publish to Facebook.`,
    );
  }

  const published = await publishFacebookPost(page, {
    message,
    photoUrls,
    scheduledPublishTime: input.scheduledPublishTime
      ? toScheduledPostUnixSeconds(input.scheduledPublishTime)
      : undefined,
  });

  return { source, target: { platform: "facebook", kind: "post", ...published } };
}

// Meta nests album members one level down; the first leaf is the media the cross-post carries.
function flatten(attachments: PostAttachment[]): PostAttachment[] {
  return attachments.flatMap((attachment) => {
    const children = attachment.subattachments?.data ?? [];

    return children.length > 0 ? children : [attachment];
  });
}
