import {
  createFacebookCommentReply,
  createInstagramCommentReply,
  deleteGraphObject,
  graphObjectExists,
  listFacebookComments,
  listInstagramComments,
  readFacebookComment,
  readInstagramComment,
  setFacebookCommentHidden,
  setInstagramCommentHidden,
  type FacebookComment,
  type InstagramComment,
} from "../graph/index.js";
import type { ResolvedPage } from "./pages.js";

export type NormalizedComment = {
  id: string;
  platform: "facebook" | "instagram";
  message?: string;
  author?: string;
  author_id?: string;
  created_time?: string;
  hidden?: boolean;
  like_count?: number;
  reply_count?: number;
};

export type ReplyResult = {
  id: string;
  platform: "facebook" | "instagram";
  parent_comment_id: string;
  message?: string;
  verified: boolean;
  warnings: string[];
};

export type ModerationResult = {
  id: string;
  platform: "facebook" | "instagram";
  action: "hide" | "unhide" | "delete";
  verified: boolean;
  warnings: string[];
};

export async function readFacebookThread(
  page: ResolvedPage,
  objectId: string,
  limit: number,
): Promise<NormalizedComment[]> {
  const comments = await listFacebookComments(page.client, objectId, limit);

  return comments.map(normalizeFacebookComment);
}

export async function readInstagramThread(
  page: ResolvedPage,
  mediaId: string,
  limit: number,
): Promise<NormalizedComment[]> {
  const comments = await listInstagramComments(page.client, mediaId, limit);

  return comments.map(normalizeInstagramComment);
}

export async function replyToFacebookComment(
  page: ResolvedPage,
  commentId: string,
  message: string,
): Promise<ReplyResult> {
  const created = await createFacebookCommentReply(
    page.client,
    commentId,
    message,
  );
  const warnings: string[] = [];
  let verified = false;
  let stored: string | undefined;

  try {
    const readback = await readFacebookComment(page.client, created.id);

    stored = readback.message;
    verified = readback.message === message;

    if (!verified) {
      warnings.push(
        "Facebook stored a different reply text than the one submitted.",
      );
    }
  } catch (error) {
    warnings.push(`Posted the reply but could not read it back: ${describe(error)}`);
  }

  return {
    id: created.id,
    platform: "facebook",
    parent_comment_id: commentId,
    message: stored ?? message,
    verified,
    warnings,
  };
}

export async function replyToInstagramComment(
  page: ResolvedPage,
  commentId: string,
  message: string,
): Promise<ReplyResult> {
  const created = await createInstagramCommentReply(
    page.client,
    commentId,
    message,
  );
  const warnings: string[] = [];
  let verified = false;
  let stored: string | undefined;

  try {
    const readback = await readInstagramComment(page.client, created.id);

    stored = readback.text;
    verified = readback.text === message;

    if (!verified) {
      warnings.push(
        "Instagram stored a different reply text than the one submitted.",
      );
    }
  } catch (error) {
    warnings.push(`Posted the reply but could not read it back: ${describe(error)}`);
  }

  return {
    id: created.id,
    platform: "instagram",
    parent_comment_id: commentId,
    message: stored ?? message,
    verified,
    warnings,
  };
}

export async function setFacebookCommentVisibility(
  page: ResolvedPage,
  commentId: string,
  hidden: boolean,
): Promise<ModerationResult> {
  await setFacebookCommentHidden(page.client, commentId, hidden);

  const warnings: string[] = [];
  let verified = false;

  try {
    const readback = await readFacebookComment(page.client, commentId);

    verified = readback.is_hidden === hidden;

    if (!verified) {
      warnings.push(
        `Facebook still reports the comment as ${readback.is_hidden ? "hidden" : "visible"}.`,
      );
    }
  } catch (error) {
    warnings.push(
      `Applied the change but could not read the comment back: ${describe(error)}`,
    );
  }

  return {
    id: commentId,
    platform: "facebook",
    action: hidden ? "hide" : "unhide",
    verified,
    warnings,
  };
}

export async function setInstagramCommentVisibility(
  page: ResolvedPage,
  commentId: string,
  hidden: boolean,
): Promise<ModerationResult> {
  await setInstagramCommentHidden(page.client, commentId, hidden);

  const warnings: string[] = [];
  let verified = false;

  try {
    const readback = await readInstagramComment(page.client, commentId);

    verified = readback.hidden === hidden;

    if (!verified) {
      warnings.push(
        `Instagram still reports the comment as ${readback.hidden ? "hidden" : "visible"}.`,
      );
    }
  } catch (error) {
    warnings.push(
      `Applied the change but could not read the comment back: ${describe(error)}`,
    );
  }

  return {
    id: commentId,
    platform: "instagram",
    action: hidden ? "hide" : "unhide",
    verified,
    warnings,
  };
}

export async function deleteComment(
  page: ResolvedPage,
  commentId: string,
  platform: "facebook" | "instagram",
): Promise<ModerationResult> {
  await deleteGraphObject(page.client, commentId);

  const warnings: string[] = [];
  let verified = false;

  try {
    verified = !(await graphObjectExists(page.client, commentId));

    if (!verified) {
      warnings.push("Meta still resolves the comment id after the delete call.");
    }
  } catch (error) {
    warnings.push(
      `Issued the delete but could not confirm removal: ${describe(error)}`,
    );
  }

  return { id: commentId, platform, action: "delete", verified, warnings };
}

function normalizeFacebookComment(
  comment: FacebookComment,
): NormalizedComment {
  return {
    id: comment.id,
    platform: "facebook",
    message: comment.message,
    author: comment.from?.name,
    author_id: comment.from?.id,
    created_time: comment.created_time,
    hidden: comment.is_hidden,
    like_count: comment.like_count,
    reply_count: comment.comment_count,
  };
}

function normalizeInstagramComment(
  comment: InstagramComment,
): NormalizedComment {
  return {
    id: comment.id,
    platform: "instagram",
    message: comment.text,
    author: comment.from?.username ?? comment.username,
    author_id: comment.from?.id,
    created_time: comment.timestamp,
    hidden: comment.hidden,
    like_count: comment.like_count,
    reply_count: comment.replies?.data?.length,
  };
}

function describe(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
