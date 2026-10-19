import { date, integer, pgTable, real, serial, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

// One row per Instagram profile per day (Brazil calendar day), written by the daily cron.
export const profileSnapshots = pgTable(
  "profile_snapshots",
  {
    id: serial("id").primaryKey(),
    username: text("username").notNull(),
    takenOn: date("taken_on").notNull(),
    followers: integer("followers").notNull(),
    mediaCount: integer("media_count").notNull(),
    engagementPct: real("engagement_pct"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("profile_snapshots_username_taken_on_idx").on(t.username, t.takenOn)],
);

export type ProfileSnapshot = typeof profileSnapshots.$inferSelect;
export type NewProfileSnapshot = typeof profileSnapshots.$inferInsert;

export * from "./auth";
