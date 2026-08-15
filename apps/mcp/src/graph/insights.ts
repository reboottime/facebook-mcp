import type { GraphClient } from "./client.js";

export type InsightValue = {
  value: unknown;
  end_time?: string;
};

export type InsightEntry = {
  name: string;
  period?: string;
  title?: string;
  description?: string;
  values?: InsightValue[];
};

// Metric presets verified against the v26.0 reference. Names Meta marked deprecated at v25
// (page_impressions_unique, post_impressions, post_impressions_unique) are excluded: Graph
// rejects the whole insights call when any single metric name is invalid.
export const PAGE_INSIGHT_METRICS = [
  "page_impressions",
  "page_post_engagements",
  "page_fans",
  "page_views_total",
];

export const POST_INSIGHT_METRICS = [
  "post_impressions_organic",
  "post_impressions_paid",
  "post_clicks",
  "post_reactions_by_type_total",
];

export const INSTAGRAM_MEDIA_INSIGHT_METRICS = [
  "reach",
  "likes",
  "comments",
  "saved",
  "shares",
  "total_interactions",
  "views",
];

export type PageInsightsInput = {
  metrics: string[];
  period: string;
  since?: string;
  until?: string;
};

export async function readPageInsights(
  page: GraphClient,
  pageId: string,
  input: PageInsightsInput,
): Promise<InsightEntry[]> {
  const response = await page.get<{ data?: InsightEntry[] }>(
    `${pageId}/insights`,
    {
      metric: input.metrics.join(","),
      period: input.period,
      since: input.since,
      until: input.until,
    },
  );

  return response.data ?? [];
}

export async function readPostInsights(
  page: GraphClient,
  postId: string,
  metrics: string[],
): Promise<InsightEntry[]> {
  const response = await page.get<{ data?: InsightEntry[] }>(
    `${postId}/insights`,
    { metric: metrics.join(",") },
  );

  return response.data ?? [];
}

export async function readInstagramMediaInsights(
  page: GraphClient,
  mediaId: string,
  metrics: string[],
): Promise<InsightEntry[]> {
  const response = await page.get<{ data?: InsightEntry[] }>(
    `${mediaId}/insights`,
    { metric: metrics.join(",") },
  );

  return response.data ?? [];
}
