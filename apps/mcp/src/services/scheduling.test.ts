import { describe, expect, it, beforeEach, afterEach, jest } from "@jest/globals";

import { InvalidToolInputError } from "../errors.js";
import {
  toIsoTimestamp,
  toScheduledPostUnixSeconds,
  toScheduledReelUnixSeconds,
} from "./scheduling.js";

const NOW = new Date("2026-01-01T00:00:00.000Z");

function isoAfter(offsetMs: number): string {
  return new Date(NOW.getTime() + offsetMs).toISOString();
}

const MINUTE = 60 * 1000;
const DAY = 24 * 60 * MINUTE;

describe("toScheduledPostUnixSeconds", () => {
  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(NOW);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("throws when the timestamp is not valid ISO 8601", () => {
    expect(() => toScheduledPostUnixSeconds("not-a-date")).toThrow(
      InvalidToolInputError,
    );
  });

  it("throws when the lead time is under 10 minutes", () => {
    expect(() => toScheduledPostUnixSeconds(isoAfter(9 * MINUTE + 59_000))).toThrow(
      /at least 10 minutes/,
    );
  });

  it("accepts a lead time of exactly 10 minutes", () => {
    expect(toScheduledPostUnixSeconds(isoAfter(10 * MINUTE))).toBe(
      Math.floor((NOW.getTime() + 10 * MINUTE) / 1000),
    );
  });

  it("accepts a lead time of exactly 30 days", () => {
    expect(toScheduledPostUnixSeconds(isoAfter(30 * DAY))).toBe(
      Math.floor((NOW.getTime() + 30 * DAY) / 1000),
    );
  });

  it("throws when the lead time exceeds 30 days", () => {
    expect(() => toScheduledPostUnixSeconds(isoAfter(30 * DAY + 1000))).toThrow(
      /within 30 days/,
    );
  });
});

describe("toScheduledReelUnixSeconds", () => {
  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(NOW);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("accepts a lead time of exactly 29 days", () => {
    expect(toScheduledReelUnixSeconds(isoAfter(29 * DAY))).toBe(
      Math.floor((NOW.getTime() + 29 * DAY) / 1000),
    );
  });

  it("throws when the lead time exceeds 29 days", () => {
    expect(() => toScheduledReelUnixSeconds(isoAfter(29 * DAY + 1000))).toThrow(
      /within 29 days/,
    );
  });

  it("throws when the lead time is under 10 minutes", () => {
    expect(() => toScheduledReelUnixSeconds(isoAfter(1 * MINUTE))).toThrow(
      /at least 10 minutes/,
    );
  });
});

describe("toIsoTimestamp", () => {
  it("returns undefined when given undefined", () => {
    expect(toIsoTimestamp(undefined)).toBeUndefined();
  });

  it("converts unix seconds to an ISO string", () => {
    expect(toIsoTimestamp(1_735_689_600)).toBe("2025-01-01T00:00:00.000Z");
  });

  it("accepts a numeric string and converts it the same way", () => {
    expect(toIsoTimestamp("1735689600")).toBe("2025-01-01T00:00:00.000Z");
  });

  it("returns undefined for a non-positive or non-finite value", () => {
    expect(toIsoTimestamp(0)).toBeUndefined();
    expect(toIsoTimestamp("not-a-number")).toBeUndefined();
  });
});
