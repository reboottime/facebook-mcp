import { z } from "zod";

import { InvalidToolInputError } from "../errors.js";
import {
  INSTAGRAM_MEDIA_INSIGHT_METRICS,
  PAGE_INSIGHT_METRICS,
  POST_INSIGHT_METRICS,
} from "../graph/index.js";
import {
  readInstagramInsightsReport,
  readPageInsightsReport,
  readPostInsightsReport,
} from "../services/insights.js";
import { PAGE_ID_DESCRIPTION, type ToolRegistration } from "./context.js";
import { runTool } from "./result.js";

const inputSchema = {
  target: z
    .enum(["page", "post", "ig_media"])
    .describe(
      'What to measure: "page" for whole-Page metrics, "post" for one Facebook post, "ig_media" for one Instagram post or reel.',
    ),
  id: z
    .string()
    .optional()
    .describe(
      'The post or media id to measure, e.g. "102938475610293_9988776655" or "17895695668004550". Required for "post" and "ig_media"; ignored for "page".',
    ),
  page_id: z.string().optional().describe(PAGE_ID_DESCRIPTION),
  period: z
    .enum(["day", "week", "days_28"])
    .optional()
    .describe(
      'Aggregation window for "page" metrics. Defaults to "day". Ignored for post and Instagram media, which are lifetime totals.',
    ),
  since: z
    .string()
    .optional()
    .describe(
      'Start of the range for "page" metrics as an ISO 8601 date, e.g. "2026-08-01".',
    ),
  until: z
    .string()
    .optional()
    .describe(
      'End of the range for "page" metrics as an ISO 8601 date, e.g. "2026-08-14".',
    ),
  metrics: z
    .array(z.string())
    .optional()
    .describe(
      `Override the metric preset. Defaults: page = ${PAGE_INSIGHT_METRICS.join("/")}; post = ${POST_INSIGHT_METRICS.join("/")}; ig_media = ${INSTAGRAM_MEDIA_INSIGHT_METRICS.join("/")}. Meta rejects the whole call if any name is invalid.`,
    ),
};

const outputSchema = {
  target: z.enum(["page", "post", "ig_media"]),
  id: z.string(),
  requested_metrics: z.array(z.string()),
  metrics: z.array(
    z.object({
      name: z.string(),
      period: z.string().optional(),
      title: z.string().optional(),
      values: z.array(
        z.object({ value: z.unknown(), end_time: z.string().optional() }),
      ),
    }),
  ),
};

export const registerGetInsightsTool: ToolRegistration = (server, context) => {
  server.registerTool(
    "get_insights",
    {
      title: "Read insights",
      description:
        "Reads performance metrics for the Page, a single Facebook post, or a single Instagram post. Each target has a preset of metric names verified against the current Graph API version; pass metrics to override it.",
      inputSchema,
      outputSchema,
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    (args) =>
      runTool(async () => {
        const page = await context.pages.resolve(args.page_id);

        if (args.target === "page") {
          return readPageInsightsReport(page, {
            metrics: args.metrics,
            period: args.period ?? "day",
            since: args.since,
            until: args.until,
          });
        }

        if (!args.id) {
          throw new InvalidToolInputError(
            `target "${args.target}" needs an id — pass the post or media id to measure.`,
          );
        }

        return args.target === "post"
          ? readPostInsightsReport(page, args.id, args.metrics)
          : readInstagramInsightsReport(page, args.id, args.metrics);
      }),
  );
};
