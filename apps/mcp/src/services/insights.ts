import {
  readInstagramMediaInsights,
  readPageInsights,
  readPostInsights,
  INSTAGRAM_MEDIA_INSIGHT_METRICS,
  PAGE_INSIGHT_METRICS,
  POST_INSIGHT_METRICS,
  type InsightEntry,
} from "../graph/index.js";
import type { ResolvedPage } from "./pages.js";

export type InsightsReport = {
  target: "page" | "post" | "ig_media";
  id: string;
  requested_metrics: string[];
  metrics: {
    name: string;
    period?: string;
    title?: string;
    values: { value: unknown; end_time?: string }[];
  }[];
};

export async function readPageInsightsReport(
  page: ResolvedPage,
  input: {
    metrics?: string[];
    period: string;
    since?: string;
    until?: string;
  },
): Promise<InsightsReport> {
  const metrics = input.metrics ?? PAGE_INSIGHT_METRICS;
  const entries = await readPageInsights(page.client, page.id, {
    metrics,
    period: input.period,
    since: input.since,
    until: input.until,
  });

  return shape("page", page.id, metrics, entries);
}

export async function readPostInsightsReport(
  page: ResolvedPage,
  postId: string,
  requested?: string[],
): Promise<InsightsReport> {
  const metrics = requested ?? POST_INSIGHT_METRICS;
  const entries = await readPostInsights(page.client, postId, metrics);

  return shape("post", postId, metrics, entries);
}

export async function readInstagramInsightsReport(
  page: ResolvedPage,
  mediaId: string,
  requested?: string[],
): Promise<InsightsReport> {
  const metrics = requested ?? INSTAGRAM_MEDIA_INSIGHT_METRICS;
  const entries = await readInstagramMediaInsights(page.client, mediaId, metrics);

  return shape("ig_media", mediaId, metrics, entries);
}

function shape(
  target: InsightsReport["target"],
  id: string,
  requestedMetrics: string[],
  entries: InsightEntry[],
): InsightsReport {
  return {
    target,
    id,
    requested_metrics: requestedMetrics,
    metrics: entries.map((entry) => ({
      name: entry.name,
      period: entry.period,
      title: entry.title,
      values: (entry.values ?? []).map((value) => ({
        value: value.value,
        end_time: value.end_time,
      })),
    })),
  };
}
