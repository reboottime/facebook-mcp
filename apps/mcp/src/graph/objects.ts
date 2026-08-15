import type { GraphClient } from "./client.js";
import { GraphApiError } from "./errors.js";

// Graph reports a deleted or never-existing node as a 100/803 "does not exist" error rather
// than an empty success, so absence has to be read off the error shape.
const MISSING_OBJECT_CODES = new Set([100, 803]);

export async function deleteGraphObject(
  client: GraphClient,
  objectId: string,
): Promise<{ success?: boolean }> {
  return client.del<{ success?: boolean }>(objectId);
}

export async function graphObjectExists(
  client: GraphClient,
  objectId: string,
): Promise<boolean> {
  try {
    await client.get<{ id?: string }>(objectId, { fields: "id" });
    return true;
  } catch (error) {
    if (error instanceof GraphApiError && isMissingObject(error)) {
      return false;
    }

    throw error;
  }
}

function isMissingObject(error: GraphApiError): boolean {
  return (
    (error.code !== undefined && MISSING_OBJECT_CODES.has(error.code)) ||
    error.status === 404
  );
}
