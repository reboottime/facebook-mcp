import { InvalidToolInputError } from "../errors.js";

// Phase 1 has no resumable upload path, so Meta must be able to fetch the asset itself.
export function assertHostedMediaUrl(value: string, field: string): string {
  let parsed: URL;

  try {
    parsed = new URL(value);
  } catch {
    throw new InvalidToolInputError(
      `${field} must be a publicly reachable https URL. Local file paths are not supported — host the file and pass its URL.`,
    );
  }

  if (parsed.protocol !== "https:") {
    throw new InvalidToolInputError(
      `${field} must be a publicly reachable https URL. Local file paths are not supported — host the file and pass its URL.`,
    );
  }

  // Serializing the parsed URL rather than echoing the input percent-encodes control characters,
  // so a CRLF in a video_url cannot forge extra headers on the reel upload request.
  return parsed.toString();
}
