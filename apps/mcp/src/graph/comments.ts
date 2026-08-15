import type { GraphClient } from "./client.js";

export type FacebookComment = {
  id: string;
  message?: string;
  created_time?: string;
  is_hidden?: boolean;
  comment_count?: number;
  like_count?: number;
  from?: { id?: string; name?: string };
};

export type InstagramComment = {
  id: string;
  text?: string;
  timestamp?: string;
  hidden?: boolean;
  like_count?: number;
  username?: string;
  from?: { id?: string; username?: string };
  replies?: { data?: { id: string }[] };
};

export const FACEBOOK_COMMENT_FIELDS =
  "id,from{name,id},message,created_time,is_hidden,comment_count,like_count";

export const INSTAGRAM_COMMENT_FIELDS =
  "id,from{id,username},username,text,timestamp,like_count,hidden,replies{id}";

export async function listFacebookComments(
  page: GraphClient,
  objectId: string,
  limit: number,
): Promise<FacebookComment[]> {
  const response = await page.get<{ data?: FacebookComment[] }>(
    `${objectId}/comments`,
    { fields: FACEBOOK_COMMENT_FIELDS, filter: "toplevel", limit },
  );

  return response.data ?? [];
}

export async function listInstagramComments(
  page: GraphClient,
  mediaId: string,
  limit: number,
): Promise<InstagramComment[]> {
  const response = await page.get<{ data?: InstagramComment[] }>(
    `${mediaId}/comments`,
    { fields: INSTAGRAM_COMMENT_FIELDS, limit },
  );

  return response.data ?? [];
}

export async function readFacebookComment(
  page: GraphClient,
  commentId: string,
): Promise<FacebookComment> {
  return page.get<FacebookComment>(commentId, {
    fields: FACEBOOK_COMMENT_FIELDS,
  });
}

export async function readInstagramComment(
  page: GraphClient,
  commentId: string,
): Promise<InstagramComment> {
  return page.get<InstagramComment>(commentId, {
    fields: INSTAGRAM_COMMENT_FIELDS,
  });
}

export async function createFacebookCommentReply(
  page: GraphClient,
  commentId: string,
  message: string,
): Promise<{ id: string }> {
  return page.post<{ id: string }>(`${commentId}/comments`, { message });
}

export async function createInstagramCommentReply(
  page: GraphClient,
  commentId: string,
  message: string,
): Promise<{ id: string }> {
  return page.post<{ id: string }>(`${commentId}/replies`, { message });
}

export async function setFacebookCommentHidden(
  page: GraphClient,
  commentId: string,
  hidden: boolean,
): Promise<{ success?: boolean }> {
  return page.post<{ success?: boolean }>(commentId, { is_hidden: hidden });
}

export async function setInstagramCommentHidden(
  page: GraphClient,
  commentId: string,
  hidden: boolean,
): Promise<{ success?: boolean }> {
  return page.post<{ success?: boolean }>(commentId, { hide: hidden });
}
