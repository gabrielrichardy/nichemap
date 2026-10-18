import type { GrowthPoint } from "./types";

export interface SnapshotPoint {
  takenOn: string; // YYYY-MM-DD
  followers: number;
  mediaCount: number;
  engagementPct: number | null;
}

// Calendar day in Brazil, so a snapshot taken at 23:00 BRT is not filed under tomorrow (UTC).
export function dayInBrazil(date: Date): string {
  return date.toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
}

export function percentChange(now: number, before: number): number {
  return before ? Number((((now - before) / before) * 100).toFixed(1)) : 0;
}

// Stored history plus today's live values (when today has no snapshot yet).
export function withToday(history: SnapshotPoint[], today: SnapshotPoint): SnapshotPoint[] {
  const sorted = [...history].sort((a, b) => a.takenOn.localeCompare(b.takenOn));
  return sorted.at(-1)?.takenOn === today.takenOn ? sorted : [...sorted, today];
}

export interface GrowthSummary {
  growth: GrowthPoint[];
  followersPct: number;
  mediaPct: number;
  engagementPct: number;
  days: number;
}

// Needs at least two days of data; otherwise there is no real growth to show.
export function summarizeGrowth(points: SnapshotPoint[]): GrowthSummary | null {
  if (points.length < 2) return null;
  const first = points[0];
  const last = points[points.length - 1];
  const days = Math.round((Date.parse(last.takenOn) - Date.parse(first.takenOn)) / 86_400_000);
  return {
    growth: points.map((p) => ({ date: `${p.takenOn.slice(8, 10)}/${p.takenOn.slice(5, 7)}`, value: p.followers })),
    followersPct: percentChange(last.followers, first.followers),
    mediaPct: percentChange(last.mediaCount, first.mediaCount),
    engagementPct:
      first.engagementPct !== null && last.engagementPct !== null
        ? percentChange(last.engagementPct, first.engagementPct)
        : 0,
    days,
  };
}
