import { InvalidToolInputError } from "../errors.js";

// Graph rejects a publish date outside 10 minutes to 30 days from the request.
const MIN_LEAD_SECONDS = 10 * 60;
const MAX_LEAD_SECONDS = 30 * 24 * 60 * 60;

export function toScheduledUnixSeconds(isoTimestamp: string): number {
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

  if (lead > MAX_LEAD_SECONDS) {
    throw new InvalidToolInputError(
      "scheduled_publish_time must be within 30 days — Meta rejects anything further out.",
    );
  }

  return seconds;
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
