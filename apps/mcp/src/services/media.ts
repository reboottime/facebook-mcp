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

  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    throw new InvalidToolInputError(
      `${field} must be a publicly reachable https URL. Local file paths are not supported — host the file and pass its URL.`,
    );
  }

  return parsed.toString();
}
