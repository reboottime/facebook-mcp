import type { GraphClient } from "./client.js";

export type InstagramContainer = { id: string };

export type InstagramContainerStatus = {
  id: string;
  status_code?: "EXPIRED" | "ERROR" | "FINISHED" | "IN_PROGRESS" | "PUBLISHED";
  status?: string;
};

export type InstagramMedia = {
  id: string;
  caption?: string;
  media_type?: string;
  media_product_type?: string;
  media_url?: string;
  thumbnail_url?: string;
  permalink?: string;
  timestamp?: string;
  username?: string;
};

export const INSTAGRAM_MEDIA_FIELDS =
  "id,caption,media_type,media_product_type,media_url,thumbnail_url,permalink,timestamp,username";

export async function createImageContainer(
  page: GraphClient,
  igUserId: string,
  input: { imageUrl: string; caption?: string },
): Promise<InstagramContainer> {
  return page.post<InstagramContainer>(`${igUserId}/media`, {
    image_url: input.imageUrl,
    caption: input.caption,
  });
}

export async function createReelContainer(
  page: GraphClient,
  igUserId: string,
  input: { videoUrl: string; caption?: string; shareToFeed?: boolean },
): Promise<InstagramContainer> {
  return page.post<InstagramContainer>(`${igUserId}/media`, {
    media_type: "REELS",
    video_url: input.videoUrl,
    caption: input.caption,
    share_to_feed: input.shareToFeed,
  });
}

export async function createStoryContainer(
  page: GraphClient,
  igUserId: string,
  input: { imageUrl?: string; videoUrl?: string },
): Promise<InstagramContainer> {
  return page.post<InstagramContainer>(`${igUserId}/media`, {
    media_type: "STORIES",
    image_url: input.imageUrl,
    video_url: input.videoUrl,
  });
}

export async function readContainerStatus(
  page: GraphClient,
  containerId: string,
): Promise<InstagramContainerStatus> {
  return page.get<InstagramContainerStatus>(containerId, {
    fields: "id,status_code,status",
  });
}

export async function publishContainer(
  page: GraphClient,
  igUserId: string,
  containerId: string,
): Promise<{ id: string }> {
  return page.post<{ id: string }>(`${igUserId}/media_publish`, {
    creation_id: containerId,
  });
}

export async function readInstagramMedia(
  page: GraphClient,
  mediaId: string,
): Promise<InstagramMedia> {
  return page.get<InstagramMedia>(mediaId, {
    fields: INSTAGRAM_MEDIA_FIELDS,
  });
}

export async function listInstagramMediaChildren(
  page: GraphClient,
  mediaId: string,
): Promise<InstagramMedia[]> {
  const response = await page.get<{ data?: InstagramMedia[] }>(
    `${mediaId}/children`,
    { fields: "id,media_type,media_url,thumbnail_url" },
  );

  return response.data ?? [];
}
