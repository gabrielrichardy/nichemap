import { describe, expect, it } from "vitest";
import { computeProfileScore, type ScoredMedia } from "./profileScore";

const now = new Date("2026-10-18T12:00:00Z");
const daysAgo = (d: number) => new Date(now.getTime() - d * 24 * 60 * 60 * 1000).toISOString();
const types: ScoredMedia["media_type"][] = ["VIDEO", "CAROUSEL_ALBUM", "IMAGE"];

describe("computeProfileScore", () => {
  it("gives 100 and no tips to a profile that meets every reference", () => {
    const media = Array.from({ length: 12 }, (_, i) => ({ caption: "legenda", media_type: types[i % 3], timestamp: daysAgo(i * 2) }));
    const result = computeProfileScore({ engagementPct: 4, biography: "bio", media, now });
    expect(result.score).toBe(100);
    expect(result.label).toBe("Ótimo");
    expect(result.breakdown.every((c) => c.tip === undefined)).toBe(true);
  });

  it("does not let high engagement alone max out the score", () => {
    const media = [{ media_type: "IMAGE" as const, timestamp: daysAgo(90) }];
    const result = computeProfileScore({ engagementPct: 40, media, now });
    // engagement 25 + frequency 0 + formats 8 + completeness 0
    expect(result.score).toBe(33);
    expect(result.label).toBe("Atenção");
  });

  it("explains each lost point with a tip", () => {
    const media = [
      { caption: "a", media_type: "IMAGE" as const, timestamp: daysAgo(1) },
      { media_type: "IMAGE" as const, timestamp: daysAgo(3) },
    ];
    const [engagement, frequency, formats, completeness] = computeProfileScore({ engagementPct: 1.5, media, now }).breakdown;
    expect(engagement.points).toBe(13);
    expect(frequency.points).toBe(4);
    expect(frequency.tip).toContain("Faltaram 10");
    expect(formats.tip).toContain("Reels e carrosséis");
    expect(completeness.points).toBe(7);
    expect(completeness.tip).toContain("bio");
    expect(completeness.tip).toContain("legenda");
  });

  it("scores zero without posts or engagement", () => {
    expect(computeProfileScore({ engagementPct: 0, media: [], now }).score).toBe(0);
  });
});
