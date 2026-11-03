import { describe, expect, it } from "vitest";
import {
  daysBetween,
  formatDurationSeconds,
  parseAnalyticsRange,
  percentChange,
  previousPeriod,
} from "@/lib/analytics-range";

describe("parseAnalyticsRange", () => {
  const now = new Date("2026-11-16T15:00:00.000Z");

  it("defaults to 30d ending today UTC", () => {
    const range = parseAnalyticsRange({ now });
    expect(range.preset).toBe("30d");
    expect(range.days).toBe(30);
    expect(range.from.toISOString()).toBe("2026-10-18T00:00:00.000Z");
    expect(range.to.toISOString()).toBe("2026-11-17T00:00:00.000Z");
  });

  it("parses 7d and custom windows", () => {
    expect(parseAnalyticsRange({ range: "7d", now }).days).toBe(7);
    const custom = parseAnalyticsRange({
      range: "custom",
      from: "2026-11-01",
      to: "2026-11-10",
      now,
    });
    expect(custom.days).toBe(10);
    expect(daysBetween(custom.from, new Date("2026-11-10T00:00:00.000Z"))).toBe(
      10,
    );
  });

  it("builds the previous period of equal length", () => {
    const range = parseAnalyticsRange({ range: "7d", now });
    const prev = previousPeriod(range);
    expect(prev.days).toBe(7);
    expect(prev.to.toISOString()).toBe(range.from.toISOString());
  });
});

describe("analytics format helpers", () => {
  it("formats durations and percent changes", () => {
    expect(formatDurationSeconds(45)).toBe("45s");
    expect(formatDurationSeconds(120)).toBe("2m");
    expect(percentChange(12, 10)).toBeCloseTo(20);
    expect(percentChange(5, 0)).toBeNull();
  });
});
