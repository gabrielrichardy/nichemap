import { afterEach, describe, expect, it, vi } from "vitest";
import { listLockedUsernames } from "./accounts";
import { collectDailySnapshots, getDashboardData, targetUsernameSchema } from "./instagram";
import { saveSnapshot } from "./snapshots";

vi.mock("server-only", () => ({}));
vi.mock("./logger", () => ({ logger: { warn: vi.fn() } }));
vi.mock("./accounts", () => ({ listLockedUsernames: vi.fn(async () => []) }));
vi.mock("./snapshots", () => ({ getRecentSnapshots: vi.fn(async () => new Map()), saveSnapshot: vi.fn(async () => {}) }));
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("targetUsernameSchema", () => {
  it("accepts Instagram-style usernames", () => {
    for (const name of ["biodev", "bio.dev_2", "A".repeat(30)]) {
      expect(targetUsernameSchema.safeParse(name).success).toBe(true);
    }
  });

  it("rejects values that could alter the Graph API fields expression", () => {
    for (const name of ["", "x){followers_count}", "a,b", "a b", "a&access_token=1", "A".repeat(31)]) {
      expect(targetUsernameSchema.safeParse(name).success).toBe(false);
    }
  });
});

describe("getDashboardData", () => {
  it("serves mock data without calling the API when Instagram is not configured", async () => {
    vi.stubEnv("INSTAGRAM_ACCESS_TOKEN", "");
    vi.stubEnv("INSTAGRAM_BUSINESS_ID", "");
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const data = await getDashboardData("biodev");
    expect(data.source).toBe("mock");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns null instead of mock data when asked not to fall back", async () => {
    vi.stubEnv("INSTAGRAM_ACCESS_TOKEN", "");
    vi.stubEnv("INSTAGRAM_BUSINESS_ID", "");
    expect(await getDashboardData("biodev", { mockOnFailure: false })).toBeNull();
  });

  it("falls back to mock data without exposing the configured value for an invalid business ID", async () => {
    vi.stubEnv("INSTAGRAM_ACCESS_TOKEN", "test-token");
    vi.stubEnv("INSTAGRAM_BUSINESS_ID", "123/../me");
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const data = await getDashboardData("biodev");
    expect(data.source).toBe("mock");
    expect(data.note).toContain("INSTAGRAM_BUSINESS_ID");
    expect(data.note).not.toContain("123/../me");
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("getDashboardData with live data", () => {
  const profile = (username: string, followers: number) => ({
    business_discovery: {
      username,
      name: username.toUpperCase(),
      biography: "bio",
      followers_count: followers,
      media_count: 2,
      media: {
        data: [
          { id: "1", media_type: "IMAGE", timestamp: "2026-10-10T10:00:00+0000", like_count: 90, comments_count: 10 },
          { id: "2", media_type: "VIDEO", timestamp: "2026-10-12T10:00:00+0000", like_count: 100 },
        ],
      },
    },
  });

  const stubGraph = () =>
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        const name = /business_discovery\.username\(([^)]+)\)/.exec(decodeURIComponent(url))?.[1] ?? "";
        if (name === "broken") return Response.json({ error: { code: 100, message: "not found" } }, { status: 400 });
        return Response.json(profile(name, name === "biodev" ? 1000 : 5000));
      }),
    );

  it("never draws an estimated curve and flags blocks without a real source", async () => {
    vi.stubEnv("INSTAGRAM_ACCESS_TOKEN", "test-token");
    vi.stubEnv("INSTAGRAM_BUSINESS_ID", "123");
    vi.stubEnv("INSTAGRAM_COMPETITORS", "");
    vi.stubEnv("DATABASE_URL", "");
    stubGraph();

    const data = await getDashboardData("biodev");
    expect(data.source).toBe("live");
    expect(data.growth).toEqual([]);
    expect(data.kpis.seguidoresGrowthPct).toBe(0);
    expect(data.kpis.engajamentoPct).toBe(10);
    expect(data.content.map((c) => c.id)).toEqual(["2", "1"]);
    expect(data.content.every((c) => c.views === undefined)).toBe(true);
    expect(data.sampleSections).toEqual(["market", "opportunities"]);
  });

  it("uses real competitors for the market and skips the ones that fail", async () => {
    vi.stubEnv("INSTAGRAM_ACCESS_TOKEN", "test-token");
    vi.stubEnv("INSTAGRAM_BUSINESS_ID", "123");
    vi.stubEnv("INSTAGRAM_COMPETITORS", "@LabTech, broken");
    vi.stubEnv("DATABASE_URL", "");
    stubGraph();

    const data = await getDashboardData("biodev");
    expect(data.market).toEqual([{ name: "LABTECH", followers: 5000, growthPct: null }]);
    // (90 + 10 + 100) / 2 posts / 5000 followers = 2% engagement -> score 20
    expect(data.opportunities).toEqual([
      { name: "LABTECH", type: "Perfil", score: 20, note: "Engajamento 2% · 5.000 seguidores" },
    ]);
    expect(data.sampleSections).toEqual([]);
  });

  it("skips competitors entirely when they are not included", async () => {
    vi.stubEnv("INSTAGRAM_ACCESS_TOKEN", "test-token");
    vi.stubEnv("INSTAGRAM_BUSINESS_ID", "123");
    vi.stubEnv("INSTAGRAM_COMPETITORS", "labtech,outro");
    vi.stubEnv("DATABASE_URL", "");
    stubGraph();

    const data = await getDashboardData("biodev", { includeCompetitors: false });
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(data.market).toEqual([]);
    expect(data.opportunities).toEqual([]);
    expect(data.sampleSections).toEqual([]);
  });

  it("leaves the full post list out when content is not included", async () => {
    vi.stubEnv("INSTAGRAM_ACCESS_TOKEN", "test-token");
    vi.stubEnv("INSTAGRAM_BUSINESS_ID", "123");
    vi.stubEnv("INSTAGRAM_COMPETITORS", "");
    vi.stubEnv("DATABASE_URL", "");
    stubGraph();

    const data = await getDashboardData("biodev", { includeContent: false });
    expect(data.content).toEqual([]);
    expect(data.topContent).toHaveLength(2);
  });

  it("returns null when the API fails and mock data is not allowed", async () => {
    vi.stubEnv("INSTAGRAM_ACCESS_TOKEN", "test-token");
    vi.stubEnv("INSTAGRAM_BUSINESS_ID", "123");
    vi.stubEnv("INSTAGRAM_COMPETITORS", "");
    stubGraph();
    expect(await getDashboardData("broken", { mockOnFailure: false })).toBeNull();
  });

  it("collects daily snapshots for customers' locked profiles too", async () => {
    vi.stubEnv("INSTAGRAM_ACCESS_TOKEN", "test-token");
    vi.stubEnv("INSTAGRAM_BUSINESS_ID", "123");
    vi.stubEnv("INSTAGRAM_COMPETITORS", "labtech");
    vi.stubEnv("INSTAGRAM_TARGET_USERNAME", "biodev");
    vi.stubEnv("DATABASE_URL", "postgres://app:pw@localhost:5432/app");
    vi.mocked(listLockedUsernames).mockResolvedValueOnce(["cliente", "labtech"]);
    stubGraph();

    const result = await collectDailySnapshots();
    expect(result.saved.sort()).toEqual(["biodev", "cliente", "labtech"]);
    expect(saveSnapshot).toHaveBeenCalledTimes(3);
  });
});
