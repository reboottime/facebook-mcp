import {
  deleteGraphObject,
  graphObjectExists,
  listFeedPosts,
  listScheduledPosts,
  type GraphPost,
} from "../graph/index.js";
import type { ResolvedPage } from "./pages.js";
import { toIsoTimestamp } from "./scheduling.js";

export type QueueEntry = {
  id: string;
  status: "published" | "scheduled";
  message?: string;
  created_time?: string;
  scheduled_publish_time?: string;
  permalink_url?: string;
};

export type DeleteResult = {
  id: string;
  deleted: boolean;
  verified: boolean;
  warnings: string[];
};

export async function readPostQueue(
  page: ResolvedPage,
  limit: number,
): Promise<QueueEntry[]> {
  const [feed, scheduled] = await Promise.all([
    listFeedPosts(page.client, page.id, limit),
    listScheduledPosts(page.client, page.id, limit),
  ]);

  // The feed edge already includes unpublished posts on some Pages, so the scheduled edge is
  // merged by id rather than concatenated.
  const merged = new Map<string, QueueEntry>();

  for (const post of [...feed, ...scheduled]) {
    merged.set(post.id, toQueueEntry(post));
  }

  return [...merged.values()].sort(byQueueOrder);
}

export async function deletePost(
  page: ResolvedPage,
  postId: string,
): Promise<DeleteResult> {
  await deleteGraphObject(page.client, postId);

  const warnings: string[] = [];
  let verified = false;

  try {
    verified = !(await graphObjectExists(page.client, postId));

    if (!verified) {
      warnings.push("Meta still resolves the post id after the delete call.");
    }
  } catch (error) {
    warnings.push(
      `Issued the delete but could not confirm removal: ${error instanceof Error ? error.message : String(error)}`,
    );
  }

  return { id: postId, deleted: true, verified, warnings };
}

function toQueueEntry(post: GraphPost): QueueEntry {
  const scheduledAt = toIsoTimestamp(post.scheduled_publish_time);

  return {
    id: post.id,
    status: scheduledAt && post.is_published !== true ? "scheduled" : "published",
    message: post.message,
    created_time: post.created_time,
    scheduled_publish_time: scheduledAt,
    permalink_url: post.permalink_url,
  };
}

// The queue reads as work ahead then work done: soonest scheduled first, newest published next.
function byQueueOrder(left: QueueEntry, right: QueueEntry): number {
  if (left.status !== right.status) {
    return left.status === "scheduled" ? -1 : 1;
  }

  if (left.status === "scheduled") {
    return (
      timestamp(left.scheduled_publish_time) -
      timestamp(right.scheduled_publish_time)
    );
  }

  return timestamp(right.created_time) - timestamp(left.created_time);
}

function timestamp(value: string | undefined): number {
  return value ? Date.parse(value) : 0;
}
