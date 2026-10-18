import "server-only";
import { and, asc, gte, inArray } from "drizzle-orm";
import { getDb } from "@/db";
import { profileSnapshots, type NewProfileSnapshot } from "@/db/schema";
import { dayInBrazil, type SnapshotPoint } from "./growth";

// Re-running on the same day updates that day's row instead of adding another.
export async function saveSnapshot(snapshot: NewProfileSnapshot): Promise<void> {
  const db = getDb();
  await db
    .insert(profileSnapshots)
    .values(snapshot)
    .onConflictDoUpdate({
      target: [profileSnapshots.username, profileSnapshots.takenOn],
      set: {
        followers: snapshot.followers,
        mediaCount: snapshot.mediaCount,
        engagementPct: snapshot.engagementPct ?? null,
      },
    });
}

// Snapshots of the last `days` days for each username, oldest first.
export async function getRecentSnapshots(
  usernames: string[],
  days = 30,
): Promise<Map<string, SnapshotPoint[]>> {
  const byUser = new Map<string, SnapshotPoint[]>();
  if (!usernames.length) return byUser;
  const since = dayInBrazil(new Date(Date.now() - days * 86_400_000));
  const rows = await getDb()
    .select({
      username: profileSnapshots.username,
      takenOn: profileSnapshots.takenOn,
      followers: profileSnapshots.followers,
      mediaCount: profileSnapshots.mediaCount,
      engagementPct: profileSnapshots.engagementPct,
    })
    .from(profileSnapshots)
    .where(and(inArray(profileSnapshots.username, usernames), gte(profileSnapshots.takenOn, since)))
    .orderBy(asc(profileSnapshots.takenOn))
    .limit(usernames.length * (days + 1));
  for (const { username, ...point } of rows) {
    byUser.set(username, [...(byUser.get(username) ?? []), point]);
  }
  return byUser;
}
