import { z } from "zod";

// Meta publishes no formal id grammar — the Graph reference only calls these fields "token with
// structure: Post ID". Every documented example across Pages, posts, comments and IG media is
// either all digits ("17895695668004550") or the compound `{page-id}_{post-id}` form, so letters
// and hyphen widen that to a safe superset. What the charset excludes is the point: `/`, `?`, `#`
// and `.` are the characters that would let an id re-steer a Graph request at another object,
// edge, or query. encodePath still encodes segments and rejects dot segments underneath this —
// the schema is the front door, not a replacement.
const GRAPH_ID_PATTERN = /^[A-Za-z0-9_-]+$/;

export function graphIdSchema(field: string) {
  return z
    .string()
    .regex(
      GRAPH_ID_PATTERN,
      `${field} must be a Graph object id (letters, digits, underscore, hyphen) — not a URL, a path, or a query string.`,
    );
}

export const platformSchema = z
  .enum(["facebook", "instagram"])
  .describe(
    'Which network the id belongs to: "facebook" for Page posts and Page comments, "instagram" for IG media and IG comments.',
  );

export const pageRefSchema = z.object({
  id: z.string(),
  name: z.string(),
});

export const verificationSchema = {
  verified: z
    .boolean()
    .describe(
      "True when the object was read back from Meta and matched what was sent.",
    ),
  warnings: z.array(z.string()),
};
