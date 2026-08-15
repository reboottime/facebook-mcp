import { InvalidToolInputError } from "../errors.js";

// Both surfaces reject anything under 10 minutes out, but the far edge differs: feed posts
// accept 30 days, reels only 29 ("the publish time must be greater than 10 minutes from the
// current time and within 29 days of the current date" — Reels Publishing guide).
const MIN_LEAD_SECONDS = 10 * 60;
const POST_MAX_LEAD_DAYS = 30;
const REEL_MAX_LEAD_DAYS = 29;

export function toScheduledPostUnixSeconds(isoTimestamp: string): number {
  return toUnixSecondsWithin(isoTimestamp, POST_MAX_LEAD_DAYS);
}

export function toScheduledReelUnixSeconds(isoTimestamp: string): number {
  return toUnixSecondsWithin(isoTimestamp, REEL_MAX_LEAD_DAYS);
}

export function toIsoTimestamp(
  unixSeconds: number | string | undefined,
): string | undefined {
  if (unixSeconds === undefined) {
    return undefined;
  }

  const seconds =
    typeof unixSeconds === "number" ? unixSeconds : Number(unixSeconds);

  return Number.isFinite(seconds) && seconds > 0
    ? new Date(seconds * 1000).toISOString()
    : undefined;
}

function toUnixSecondsWithin(
  isoTimestamp: string,
  maxLeadDays: number,
): number {
  const parsed = Date.parse(isoTimestamp);

  if (Number.isNaN(parsed)) {
    throw new InvalidToolInputError(
      `scheduled_publish_time "${isoTimestamp}" is not a valid ISO 8601 timestamp. Use a form like 2026-09-01T10:15:30Z.`,
    );
  }

  const seconds = Math.floor(parsed / 1000);
  const lead = seconds - Math.floor(Date.now() / 1000);

  if (lead < MIN_LEAD_SECONDS) {
    throw new InvalidToolInputError(
      "scheduled_publish_time must be at least 10 minutes in the future — Meta rejects anything sooner.",
    );
  }

  if (lead > maxLeadDays * 24 * 60 * 60) {
    throw new InvalidToolInputError(
      `scheduled_publish_time must be within ${String(maxLeadDays)} days — Meta rejects anything further out.`,
    );
  }

  return seconds;
}
