import { describe, expect, it } from "vitest";
import { dayInBrazil, summarizeGrowth, withToday, type SnapshotPoint } from "./growth";

const point = (takenOn: string, followers: number, mediaCount = 10, engagementPct: number | null = 2): SnapshotPoint => ({
  takenOn,
  followers,
  mediaCount,
  engagementPct,
});

describe("summarizeGrowth", () => {
  it("returns null with less than two days, so no fake curve is drawn", () => {
    expect(summarizeGrowth([])).toBeNull();
    expect(summarizeGrowth([point("2026-10-17", 1000)])).toBeNull();
  });

  it("computes growth between the first and last day", () => {
    const summary = summarizeGrowth([point("2026-10-01", 1000, 10, 2), point("2026-10-11", 1100, 12, 3)]);
    expect(summary).toEqual({
      growth: [
        { date: "01/10", value: 1000 },
        { date: "11/10", value: 1100 },
      ],
      followersPct: 10,
      mediaPct: 20,
      engagementPct: 50,
      days: 10,
    });
  });

  it("does not invent engagement growth when a day has no engagement", () => {
    expect(summarizeGrowth([point("2026-10-01", 1000, 10, null), point("2026-10-02", 1000)])?.engagementPct).toBe(0);
  });
});

describe("withToday", () => {
  it("appends today's live values only when today has no snapshot", () => {
    const history = [point("2026-10-16", 1000)];
    expect(withToday(history, point("2026-10-17", 1010))).toHaveLength(2);
    expect(withToday([...history, point("2026-10-17", 1005)], point("2026-10-17", 1010))).toHaveLength(2);
  });
});

describe("dayInBrazil", () => {
  it("uses the Brazil calendar day, not UTC", () => {
    expect(dayInBrazil(new Date("2026-10-18T02:00:00Z"))).toBe("2026-10-17");
  });
});
