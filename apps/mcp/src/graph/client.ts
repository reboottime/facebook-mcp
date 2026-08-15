import {
  MetaTokenMissingError,
  toGraphApiError,
  GraphApiError,
} from "./errors.js";

export const GRAPH_API_VERSION = "v26.0";
export const GRAPH_API_BASE_URL = `https://graph.facebook.com/${GRAPH_API_VERSION}`;

export type GraphParams = Record<string, string | number | boolean | undefined>;

export type GraphClient = {
  get: <T>(path: string, params?: GraphParams) => Promise<T>;
  post: <T>(path: string, params?: GraphParams) => Promise<T>;
};

type ReadToken = () => string | null;

export function createGraphClient(readToken: ReadToken): GraphClient {
  return {
    get: (path, params) => request(readToken, "GET", path, params),
    post: (path, params) => request(readToken, "POST", path, params),
  };
}

async function request<T>(
  readToken: ReadToken,
  method: "GET" | "POST",
  path: string,
  params: GraphParams = {},
): Promise<T> {
  const token = readToken();

  if (!token) {
    throw new MetaTokenMissingError();
  }

  const url = new URL(`${GRAPH_API_BASE_URL}/${path.replace(/^\/+/, "")}`);
  const entries = definedEntries(params);

  if (method === "GET") {
    for (const [key, value] of entries) {
      url.searchParams.set(key, value);
    }
  }

  // Bearer keeps the token out of the URL, where the documented `access_token` query
  // parameter would leave it in proxy logs and error strings.
  const response = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(method === "POST"
        ? { "Content-Type": "application/x-www-form-urlencoded" }
        : {}),
    },
    body:
      method === "POST" ? new URLSearchParams(entries).toString() : undefined,
  });

  const body = await response.text();
  const payload = parseJson(body, response.status);

  if (!response.ok) {
    throw toGraphApiError(response.status, payload);
  }

  return payload as T;
}

function definedEntries(params: GraphParams): [string, string][] {
  return Object.entries(params)
    .filter(([, value]) => value !== undefined)
    .map(([key, value]) => [key, String(value)]);
}

function parseJson(body: string, status: number): unknown {
  if (body.length === 0) {
    return null;
  }

  try {
    return JSON.parse(body);
  } catch {
    throw new GraphApiError(
      `Graph API returned a non-JSON response (HTTP ${status}).`,
      { status },
    );
  }
}
