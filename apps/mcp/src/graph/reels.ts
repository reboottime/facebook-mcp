import { readGraphResponse, type GraphClient } from "./client.js";
import { GraphUploadTargetError } from "./errors.js";

export type ReelUploadSession = {
  video_id: string;
  upload_url: string;
};

// `status.publishing_phase` is the only scheduled-state signal Meta exposes for a reel:
// publish_status is one of draft / published / scheduled / error, publish_time is the actual
// or scheduled publish time as a Unix timestamp.
export type ReelVideo = {
  id: string;
  permalink_url?: string;
  status?: {
    video_status?: string;
    publishing_phase?: {
      status?: string;
      publish_status?: string;
      publish_time?: number;
    };
  };
};

export type FinishReelInput = {
  videoId: string;
  videoState: "PUBLISHED" | "SCHEDULED";
  description?: string;
  scheduledPublishTime?: number;
};

export async function startReelUpload(
  page: GraphClient,
  pageId: string,
): Promise<ReelUploadSession> {
  return page.post<ReelUploadSession>(`${pageId}/video_reels`, {
    upload_phase: "start",
  });
}

// The rupload host is a separate endpoint from the Graph host and only accepts the legacy
// `OAuth` authorization scheme; `file_url` makes it pull the hosted video itself.
export async function uploadReelFromUrl(
  uploadUrl: string,
  pageAccessToken: string,
  videoUrl: string,
): Promise<void> {
  assertMetaUploadHost(uploadUrl);

  const response = await fetch(uploadUrl, {
    method: "POST",
    headers: {
      Authorization: `OAuth ${pageAccessToken}`,
      file_url: videoUrl,
      offset: "0",
    },
  });

  await readGraphResponse<unknown>(response);
}

// upload_url comes back from Meta rather than from our code, and the very next line puts a live
// page access token in an Authorization header pointed at it. Anything that redirected that value
// off Meta's own hosts — a compromised or spoofed start-phase response — would hand the token away,
// so the destination is checked before the token is attached.
export function assertMetaUploadHost(uploadUrl: string): URL {
  let parsed: URL;

  try {
    parsed = new URL(uploadUrl);
  } catch {
    throw new GraphUploadTargetError(
      "Meta returned an unusable reel upload URL, so nothing was uploaded and no token was sent. Retry the reel, and check the Graph API status if it repeats.",
    );
  }

  const host = parsed.hostname.toLowerCase();
  const isMetaHost = host === "facebook.com" || host.endsWith(".facebook.com");

  if (parsed.protocol !== "https:" || !isMetaHost) {
    throw new GraphUploadTargetError(
      `Meta returned a reel upload URL pointing at ${parsed.protocol}//${parsed.host}, which is not an https facebook.com host. Nothing was uploaded and no token was sent. Retry the reel, and report it if it repeats.`,
    );
  }

  return parsed;
}

export async function finishReelUpload(
  page: GraphClient,
  pageId: string,
  input: FinishReelInput,
): Promise<{ success?: boolean; post_id?: string }> {
  return page.post<{ success?: boolean; post_id?: string }>(
    `${pageId}/video_reels`,
    {
      video_id: input.videoId,
      upload_phase: "finish",
      video_state: input.videoState,
      description: input.description,
      scheduled_publish_time: input.scheduledPublishTime,
    },
  );
}

export async function readReel(
  page: GraphClient,
  videoId: string,
): Promise<ReelVideo> {
  return page.get<ReelVideo>(videoId, {
    fields: "id,permalink_url,status",
  });
}
