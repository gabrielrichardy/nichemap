// Integration test against a real PostgreSQL. Runs only when TEST_DATABASE_URL points to a
// disposable database (never production); CI skips it.
import { sql } from "drizzle-orm";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/logger", () => ({ logger: { error: vi.fn(), warn: vi.fn() } }));

const url = process.env.TEST_DATABASE_URL;

describe.skipIf(!url)("profile snapshots (PostgreSQL)", () => {
  beforeAll(async () => {
    vi.stubEnv("DATABASE_URL", url!);
    const { getDb } = await import("@/db");
    await migrate(getDb(), { migrationsFolder: "drizzle" });
    await getDb().execute(sql`truncate table profile_snapshots`);
  });

  afterAll(async () => {
    const { closeDatabase } = await import("@/db");
    await closeDatabase();
    vi.unstubAllEnvs();
  });

  it("keeps one row per profile per day and returns history oldest first", async () => {
    const { getRecentSnapshots, saveSnapshot } = await import("./snapshots");
    const { dayInBrazil } = await import("./growth");
    const today = dayInBrazil(new Date());
    const yesterday = dayInBrazil(new Date(Date.now() - 86_400_000));
    const old = dayInBrazil(new Date(Date.now() - 40 * 86_400_000));

    await saveSnapshot({ username: "biodev", takenOn: old, followers: 900, mediaCount: 8, engagementPct: 1 });
    await saveSnapshot({ username: "biodev", takenOn: yesterday, followers: 1000, mediaCount: 10, engagementPct: 2 });
    await saveSnapshot({ username: "biodev", takenOn: today, followers: 1005, mediaCount: 10, engagementPct: 2 });
    await saveSnapshot({ username: "biodev", takenOn: today, followers: 1010, mediaCount: 11, engagementPct: 2.5 });
    await saveSnapshot({ username: "labtech", takenOn: today, followers: 5000, mediaCount: 40, engagementPct: null });

    const history = await getRecentSnapshots(["biodev", "labtech", "unknown"]);
    expect(history.get("biodev")).toEqual([
      { takenOn: yesterday, followers: 1000, mediaCount: 10, engagementPct: 2 },
      { takenOn: today, followers: 1010, mediaCount: 11, engagementPct: 2.5 },
    ]);
    expect(history.get("labtech")).toHaveLength(1);
    expect(history.has("unknown")).toBe(false);
  });
});
