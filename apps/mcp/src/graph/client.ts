import {
  InvalidGraphPathError,
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
  del: <T>(path: string, params?: GraphParams) => Promise<T>;
  withToken: (token: string) => GraphClient;
};

type ReadToken = () => string | null;

export function createGraphClient(readToken: ReadToken): GraphClient {
  return {
    get: (path, params) => request(readToken, "GET", path, params),
    post: (path, params) => request(readToken, "POST", path, params),
    del: (path, params) => request(readToken, "DELETE", path, params),
    withToken: (token) => createGraphClient(() => token),
  };
}

export async function readGraphResponse<T>(response: Response): Promise<T> {
  const body = await response.text();
  const payload = parseJson(body, response.status);

  if (!response.ok) {
    throw toGraphApiError(response.status, payload);
  }

  return payload as T;
}

async function request<T>(
  readToken: ReadToken,
  method: "GET" | "POST" | "DELETE",
  path: string,
  params: GraphParams = {},
): Promise<T> {
  const token = readToken();

  if (!token) {
    throw new MetaTokenMissingError();
  }

  const url = new URL(`${GRAPH_API_BASE_URL}/${encodePath(path)}`);
  const entries = definedEntries(params);

  if (method !== "POST") {
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

  return readGraphResponse<T>(response);
}

// Every path is built from a fixed edge name plus ids that originate in tool input, so each
// segment is encoded individually: `?` and `#` inside an id stay inert data instead of re-steering
// the request at a different query or truncating the edge.
//
// Dot segments are rejected rather than encoded. `encodeURIComponent` leaves `.` and `..` untouched,
// and the WHATWG URL parser decodes `%2E` before resolving, so neither form survives as data —
// `v26.0/../me` collapses to `/me` and escapes the pinned API version. No Graph id is ever a dot
// segment, so refusing is exact.
export function encodePath(path: string): string {
  return path
    .replace(/^\/+/, "")
    .split("/")
    .map((segment) => {
      if (segment === "." || segment === "..") {
        throw new InvalidGraphPathError(
          `"${segment}" is not a valid Graph object id. Pass the id of the post, media, comment, or Page itself.`,
        );
      }

      return encodeURIComponent(segment);
    })
    .join("/");
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
