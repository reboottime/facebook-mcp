import type { GraphClient } from "./client.js";
import { GraphApiError } from "./errors.js";

// Graph signals a node that is gone in exactly two shapes: code 803 ("Some of the aliases you
// requested do not exist") and code 100 with subcode 33 ("Object with ID ... does not exist,
// cannot be loaded due to missing permissions, or does not support this operation"). Bare code
// 100 is the generic "Invalid parameter" and says nothing about existence, so it must never be
// read as proof of deletion — every other error is inconclusive and re-thrown to the caller.
const ALIAS_MISSING_CODE = 803;
const GRAPH_METHOD_CODE = 100;
const GRAPH_METHOD_MISSING_SUBCODE = 33;

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
    error.code === ALIAS_MISSING_CODE ||
    (error.code === GRAPH_METHOD_CODE &&
      error.subcode === GRAPH_METHOD_MISSING_SUBCODE)
  );
}
