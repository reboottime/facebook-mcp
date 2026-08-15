import type { GraphClient, GraphParams } from "./client.js";

export type GraphPost = {
  id: string;
  message?: string;
  created_time?: string;
  is_published?: boolean;
  scheduled_publish_time?: number | string;
  permalink_url?: string;
};

export const POST_FIELDS =
  "id,message,created_time,is_published,scheduled_publish_time,permalink_url";

export type FeedPostInput = {
  message?: string;
  link?: string;
  photoIds?: string[];
  scheduledPublishTime?: number;
};

export async function createUnpublishedPhoto(
  page: GraphClient,
  pageId: string,
  photoUrl: string,
  forScheduledPost: boolean,
): Promise<{ id: string }> {
  return page.post<{ id: string }>(`${pageId}/photos`, {
    url: photoUrl,
    published: false,
    temporary: forScheduledPost ? true : undefined,
  });
}

export async function createFeedPost(
  page: GraphClient,
  pageId: string,
  input: FeedPostInput,
): Promise<{ id: string }> {
  const params: GraphParams = {
    message: input.message,
    link: input.link,
  };

  // Graph takes attached_media as indexed form fields, each a JSON object naming one
  // previously uploaded unpublished photo.
  input.photoIds?.forEach((photoId, index) => {
    params[`attached_media[${index}]`] = JSON.stringify({
      media_fbid: photoId,
    });
  });

  if (input.scheduledPublishTime !== undefined) {
    params.published = false;
    params.scheduled_publish_time = input.scheduledPublishTime;
  }

  return page.post<{ id: string }>(`${pageId}/feed`, params);
}

export async function readPost(
  page: GraphClient,
  postId: string,
): Promise<GraphPost> {
  return page.get<GraphPost>(postId, { fields: POST_FIELDS });
}

export type PostAttachment = {
  media_type?: string;
  type?: string;
  media?: { image?: { src?: string }; source?: string };
  subattachments?: { data?: PostAttachment[] };
};

export type PostWithAttachments = GraphPost & {
  attachments?: { data?: PostAttachment[] };
};

export async function readPostWithAttachments(
  page: GraphClient,
  postId: string,
): Promise<PostWithAttachments> {
  return page.get<PostWithAttachments>(postId, {
    // `media` is returned as a free-form blob; asking for sub-fields of it is rejected.
    fields: `${POST_FIELDS},attachments{media_type,type,media,subattachments{media_type,type,media}}`,
  });
}

export async function listFeedPosts(
  page: GraphClient,
  pageId: string,
  limit: number,
): Promise<GraphPost[]> {
  const response = await page.get<{ data?: GraphPost[] }>(`${pageId}/feed`, {
    fields: POST_FIELDS,
    limit,
  });

  return response.data ?? [];
}

export async function listScheduledPosts(
  page: GraphClient,
  pageId: string,
  limit: number,
): Promise<GraphPost[]> {
  const response = await page.get<{ data?: GraphPost[] }>(
    `${pageId}/scheduled_posts`,
    { fields: POST_FIELDS, limit },
  );

  return response.data ?? [];
}
