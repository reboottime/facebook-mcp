import { InvalidToolInputError, MediaProcessingError } from "../errors.js";
import {
  createFeedPost,
  createImageContainer,
  createReelContainer,
  createStoryContainer,
  createUnpublishedPhoto,
  finishReelUpload,
  publishContainer,
  readContainerStatus,
  readInstagramMedia,
  readPost,
  readReel,
  startReelUpload,
  uploadReelFromUrl,
  type GraphClient,
} from "../graph/index.js";
import { assertHostedMediaUrl } from "./media.js";
import type { ResolvedInstagramAccount, ResolvedPage } from "./pages.js";
import { toIsoTimestamp } from "./scheduling.js";

const CONTAINER_POLL_INTERVAL_MS = 3000;
const CONTAINER_POLL_BUDGET_MS = 55_000;

export type FacebookPostResult = {
  id: string;
  status: "published" | "scheduled";
  page: { id: string; name: string };
  message?: string;
  permalink_url?: string;
  scheduled_publish_time?: string;
  photo_ids?: string[];
  verified: boolean;
  warnings: string[];
};

export type FacebookReelResult = {
  video_id: string;
  status: "published" | "scheduled";
  page: { id: string; name: string };
  description?: string;
  permalink_url?: string;
  scheduled_publish_time?: string;
  video_status?: string;
  verified: boolean;
  warnings: string[];
};

export type InstagramPostResult = {
  id: string;
  container_id: string;
  media_type: "IMAGE" | "REELS" | "STORIES";
  instagram_account: { id: string; username?: string };
  caption?: string;
  permalink?: string;
  verified: boolean;
  warnings: string[];
};

export type FacebookPostInput = {
  message?: string;
  link?: string;
  photoUrls?: string[];
  scheduledPublishTime?: number;
};

export async function publishFacebookPost(
  page: ResolvedPage,
  input: FacebookPostInput,
): Promise<FacebookPostResult> {
  const photoUrls = input.photoUrls ?? [];

  if (!input.message && !input.link && photoUrls.length === 0) {
    throw new InvalidToolInputError(
      "A post needs at least one of message, link, or photo_urls.",
    );
  }

  if (input.link && photoUrls.length > 0) {
    throw new InvalidToolInputError(
      "A post carries either a link preview or photos, not both. Drop link, or drop photo_urls.",
    );
  }

  const scheduled = input.scheduledPublishTime !== undefined;
  const photoIds: string[] = [];

  for (const [index, photoUrl] of photoUrls.entries()) {
    const hosted = assertHostedMediaUrl(photoUrl, `photo_urls[${String(index)}]`);
    const photo = await createUnpublishedPhoto(
      page.client,
      page.id,
      hosted,
      scheduled,
    );

    photoIds.push(photo.id);
  }

  const created = await createFeedPost(page.client, page.id, {
    message: input.message,
    link: input.link,
    photoIds: photoIds.length > 0 ? photoIds : undefined,
    scheduledPublishTime: input.scheduledPublishTime,
  });

  const warnings: string[] = [];
  let verified = false;
  let permalink: string | undefined;
  let scheduledIso = toIsoTimestamp(input.scheduledPublishTime);
  let readbackMessage: string | undefined;

  try {
    const stored = await readPost(page.client, created.id);

    permalink = stored.permalink_url;
    readbackMessage = stored.message;
    scheduledIso = toIsoTimestamp(stored.scheduled_publish_time) ?? scheduledIso;
    verified = true;

    if (input.message && stored.message !== input.message) {
      verified = false;
      warnings.push(
        "Meta stored a different message than the one submitted — check the post before relying on it.",
      );
    }

    if (scheduled && stored.is_published === true) {
      verified = false;
      warnings.push(
        "The post was requested as scheduled but Meta reports it as already published.",
      );
    }
  } catch (error) {
    warnings.push(
      `Created the post but could not read it back: ${describe(error)}`,
    );
  }

  return {
    id: created.id,
    status: scheduled ? "scheduled" : "published",
    page: { id: page.id, name: page.name },
    message: readbackMessage ?? input.message,
    permalink_url: permalink,
    scheduled_publish_time: scheduledIso,
    photo_ids: photoIds.length > 0 ? photoIds : undefined,
    verified,
    warnings,
  };
}

export type FacebookReelInput = {
  videoUrl: string;
  description?: string;
  scheduledPublishTime?: number;
};

export async function publishFacebookReel(
  page: ResolvedPage,
  input: FacebookReelInput,
): Promise<FacebookReelResult> {
  const hosted = assertHostedMediaUrl(input.videoUrl, "video_url");
  const scheduled = input.scheduledPublishTime !== undefined;

  const session = await startReelUpload(page.client, page.id);

  await uploadReelFromUrl(session.upload_url, page.accessToken, hosted);

  await finishReelUpload(page.client, page.id, {
    videoId: session.video_id,
    videoState: scheduled ? "SCHEDULED" : "PUBLISHED",
    description: input.description,
    scheduledPublishTime: input.scheduledPublishTime,
  });

  const warnings: string[] = [];
  let verified = false;
  let permalink: string | undefined;
  let videoStatus: string | undefined;
  let scheduledIso = toIsoTimestamp(input.scheduledPublishTime);

  try {
    const stored = await readReel(page.client, session.video_id);
    const phase = stored.status?.publishing_phase;

    permalink = stored.permalink_url;
    videoStatus = stored.status?.video_status;
    verified = true;

    if (scheduled) {
      scheduledIso = toIsoTimestamp(phase?.publish_time) ?? scheduledIso;

      if (phase?.publish_status === undefined) {
        verified = false;
        warnings.push(
          "Meta has not reported a publishing status for the reel yet, so the schedule is unconfirmed — check it in Meta Business Suite before relying on it.",
        );
      } else if (phase.publish_status !== "scheduled") {
        verified = false;
        warnings.push(
          `The reel was requested as scheduled but Meta reports its publishing status as "${phase.publish_status}".`,
        );
      }
    }
  } catch (error) {
    warnings.push(
      `Finished the reel upload but could not read the video back: ${describe(error)}`,
    );
  }

  return {
    video_id: session.video_id,
    status: scheduled ? "scheduled" : "published",
    page: { id: page.id, name: page.name },
    description: input.description,
    permalink_url: permalink,
    scheduled_publish_time: scheduledIso,
    video_status: videoStatus,
    verified,
    warnings,
  };
}

export async function publishInstagramImage(
  target: ResolvedInstagramAccount,
  input: { imageUrl: string; caption?: string },
): Promise<InstagramPostResult> {
  const hosted = assertHostedMediaUrl(input.imageUrl, "image_url");
  const container = await createImageContainer(
    target.page.client,
    target.account.id,
    { imageUrl: hosted, caption: input.caption },
  );

  return completeInstagramPublish(target, container.id, "IMAGE", input.caption);
}

export async function publishInstagramReel(
  target: ResolvedInstagramAccount,
  input: { videoUrl: string; caption?: string; shareToFeed?: boolean },
): Promise<InstagramPostResult> {
  const hosted = assertHostedMediaUrl(input.videoUrl, "video_url");
  const container = await createReelContainer(
    target.page.client,
    target.account.id,
    { videoUrl: hosted, caption: input.caption, shareToFeed: input.shareToFeed },
  );

  return completeInstagramPublish(target, container.id, "REELS", input.caption);
}

export async function publishInstagramStory(
  target: ResolvedInstagramAccount,
  input: { imageUrl?: string; videoUrl?: string },
): Promise<InstagramPostResult> {
  if ((input.imageUrl ? 1 : 0) + (input.videoUrl ? 1 : 0) !== 1) {
    throw new InvalidToolInputError(
      "A story needs exactly one of image_url or video_url.",
    );
  }

  const container = await createStoryContainer(
    target.page.client,
    target.account.id,
    {
      imageUrl: input.imageUrl
        ? assertHostedMediaUrl(input.imageUrl, "image_url")
        : undefined,
      videoUrl: input.videoUrl
        ? assertHostedMediaUrl(input.videoUrl, "video_url")
        : undefined,
    },
  );

  return completeInstagramPublish(target, container.id, "STORIES", undefined);
}

async function completeInstagramPublish(
  target: ResolvedInstagramAccount,
  containerId: string,
  mediaType: "IMAGE" | "REELS" | "STORIES",
  caption: string | undefined,
): Promise<InstagramPostResult> {
  await awaitContainerReady(target.page.client, containerId);

  const published = await publishContainer(
    target.page.client,
    target.account.id,
    containerId,
  );

  const warnings: string[] = [];
  let verified = false;
  let permalink: string | undefined;
  let storedCaption: string | undefined;

  try {
    const media = await readInstagramMedia(target.page.client, published.id);

    permalink = media.permalink;
    storedCaption = media.caption;
    verified = true;

    if (caption && media.caption !== caption) {
      verified = false;
      warnings.push(
        "Instagram stored a different caption than the one submitted — check the post before relying on it.",
      );
    }
  } catch (error) {
    warnings.push(
      `Published the media but could not read it back: ${describe(error)}`,
    );
  }

  return {
    id: published.id,
    container_id: containerId,
    media_type: mediaType,
    instagram_account: {
      id: target.account.id,
      username: target.account.username,
    },
    caption: storedCaption ?? caption,
    permalink,
    verified,
    warnings,
  };
}

async function awaitContainerReady(
  client: GraphClient,
  containerId: string,
): Promise<void> {
  const deadline = Date.now() + CONTAINER_POLL_BUDGET_MS;

  for (;;) {
    const status = await readContainerStatus(client, containerId);

    if (status.status_code === "FINISHED" || status.status_code === "PUBLISHED") {
      return;
    }

    if (status.status_code === "ERROR") {
      throw new MediaProcessingError(
        `Instagram could not process the media (${status.status ?? "no detail returned"}). Confirm the URL is publicly reachable and the file matches Instagram's format requirements.`,
      );
    }

    if (status.status_code === "EXPIRED") {
      throw new MediaProcessingError(
        "The Instagram media container expired before publishing. Re-run the tool to create a fresh one.",
      );
    }

    if (Date.now() >= deadline) {
      throw new MediaProcessingError(
        "Instagram is still processing the media after 55 seconds. Nothing was published — re-run the tool once the source file is smaller or already transcoded.",
      );
    }

    await delay(CONTAINER_POLL_INTERVAL_MS);
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function describe(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
