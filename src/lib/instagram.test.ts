import { afterEach, describe, expect, it, vi } from "vitest";
import { listLockedUsernames, listUnofficialUsernames } from "./accounts";
import { getApifyProfile } from "./apify";
import { collectDailySnapshots, getDashboardData, targetUsernameSchema } from "./instagram";
import { getRecentSnapshots, saveSnapshot } from "./snapshots";

vi.mock("server-only", () => ({}));
vi.mock("./logger", () => ({ logger: { warn: vi.fn() } }));
vi.mock("./accounts", () => ({
  listLockedUsernames: vi.fn(async () => []),
  listUnofficialUsernames: vi.fn(async () => []),
}));
vi.mock("./apify", () => ({ getApifyProfile: vi.fn() }));
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

  it("reports unavailable instead of mock data when asked not to fall back", async () => {
    vi.stubEnv("INSTAGRAM_ACCESS_TOKEN", "");
    vi.stubEnv("INSTAGRAM_BUSINESS_ID", "");
    expect(await getDashboardData("biodev", { mockOnFailure: false })).toEqual({ failure: "unavailable" });
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
        if (name === "down") return Response.json({ error: { code: 2, message: "service down" } }, { status: 500 });
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

  it("reports unavailable when the API fails and mock data is not allowed", async () => {
    vi.stubEnv("INSTAGRAM_ACCESS_TOKEN", "test-token");
    vi.stubEnv("INSTAGRAM_BUSINESS_ID", "123");
    vi.stubEnv("INSTAGRAM_COMPETITORS", "");
    stubGraph();
    expect(await getDashboardData("down", { mockOnFailure: false })).toEqual({ failure: "unavailable" });
  });

  it("labels data from the unofficial source when the official one refuses a non-business @", async () => {
    vi.stubEnv("INSTAGRAM_ACCESS_TOKEN", "test-token");
    vi.stubEnv("INSTAGRAM_BUSINESS_ID", "123");
    vi.stubEnv("INSTAGRAM_COMPETITORS", "labtech");
    vi.stubEnv("DATABASE_URL", "");
    vi.stubEnv("UNOFFICIAL_SOURCE_ENABLED", "true");
    vi.stubEnv("APIFY_TOKEN", "apify-token");
    stubGraph();
    vi.mocked(getApifyProfile).mockResolvedValueOnce(profile("broken", 800).business_discovery as never);

    const data = await getDashboardData("broken", { allowUnofficial: true, mockOnFailure: false });
    if ("failure" in data) throw new Error(`expected data, got ${data.failure}`);
    expect(data.source).toBe("unofficial");
    expect(data.note).toMatch(/^Perfil e últimos posts vêm de uma fonte não oficial \(Apify\)\. /);
    expect(data.kpis.seguidores).toBe(800);
    // Competitors stay on the official source only.
    expect(data.market).toEqual([{ name: "LABTECH", followers: 5000, growthPct: null }]);
    expect(getApifyProfile).toHaveBeenCalledTimes(1);
    expect(getApifyProfile).toHaveBeenCalledWith("broken");
  });

  it("words the growth note without 'real' for unofficial data", async () => {
    vi.stubEnv("INSTAGRAM_ACCESS_TOKEN", "test-token");
    vi.stubEnv("INSTAGRAM_BUSINESS_ID", "123");
    vi.stubEnv("INSTAGRAM_COMPETITORS", "");
    vi.stubEnv("DATABASE_URL", "postgres://app:pw@localhost:5432/app");
    vi.stubEnv("UNOFFICIAL_SOURCE_ENABLED", "true");
    vi.stubEnv("APIFY_TOKEN", "apify-token");
    vi.mocked(getRecentSnapshots).mockResolvedValueOnce(
      new Map([["broken", [{ takenOn: "2026-10-01", followers: 700, mediaCount: 1, engagementPct: 1 }]]]),
    );
    stubGraph();
    vi.mocked(getApifyProfile).mockResolvedValueOnce(profile("broken", 800).business_discovery as never);

    const data = await getDashboardData("broken", { allowUnofficial: true, mockOnFailure: false });
    if ("failure" in data) throw new Error(`expected data, got ${data.failure}`);
    expect(data.note).toMatch(/ Crescimento dos últimos \d+ dias\. /);
    expect(data.note).not.toContain("Crescimento real");
  });

  it("keeps the original unavailable result for a non-opted account, even with the source on", async () => {
    vi.stubEnv("INSTAGRAM_ACCESS_TOKEN", "test-token");
    vi.stubEnv("INSTAGRAM_BUSINESS_ID", "123");
    vi.stubEnv("INSTAGRAM_COMPETITORS", "");
    vi.stubEnv("UNOFFICIAL_SOURCE_ENABLED", "true");
    vi.stubEnv("APIFY_TOKEN", "apify-token");
    stubGraph();
    const result = await getDashboardData("broken", { allowUnofficial: false, mockOnFailure: false });
    expect(result).toEqual({ failure: "unavailable" });
    expect(getApifyProfile).not.toHaveBeenCalled();
  });

  it("reports not_business for an allowed account while the source is off", async () => {
    vi.stubEnv("INSTAGRAM_ACCESS_TOKEN", "test-token");
    vi.stubEnv("INSTAGRAM_BUSINESS_ID", "123");
    vi.stubEnv("INSTAGRAM_COMPETITORS", "");
    stubGraph();
    const result = await getDashboardData("broken", { allowUnofficial: true, mockOnFailure: false });
    expect(result).toEqual({ failure: "not_business" });
    expect(getApifyProfile).not.toHaveBeenCalled();
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

  it("uses the unofficial source only for opted-in customers' locked profiles", async () => {
    vi.stubEnv("INSTAGRAM_ACCESS_TOKEN", "test-token");
    vi.stubEnv("INSTAGRAM_BUSINESS_ID", "123");
    vi.stubEnv("INSTAGRAM_COMPETITORS", "labtech");
    vi.stubEnv("INSTAGRAM_TARGET_USERNAME", "biodev");
    vi.stubEnv("DATABASE_URL", "postgres://app:pw@localhost:5432/app");
    vi.stubEnv("UNOFFICIAL_SOURCE_ENABLED", "true");
    vi.stubEnv("APIFY_TOKEN", "apify-token");
    vi.mocked(listLockedUsernames).mockResolvedValueOnce(["cliente", "pessoal"]);
    vi.mocked(listUnofficialUsernames).mockResolvedValueOnce(["pessoal"]);
    // Every @ is refused as non-business, so only an allowed fallback can save a snapshot.
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => Response.json({ error: { code: 100, message: "not found" } }, { status: 400 })),
    );
    vi.mocked(getApifyProfile).mockResolvedValueOnce(profile("pessoal", 300).business_discovery as never);

    const result = await collectDailySnapshots();
    expect(result.saved).toEqual(["pessoal"]);
    expect(result.failed.map((f) => f.username).sort()).toEqual(["biodev", "cliente", "labtech"]);
    expect(getApifyProfile).toHaveBeenCalledTimes(1);
    expect(getApifyProfile).toHaveBeenCalledWith("pessoal");
    expect(saveSnapshot).toHaveBeenCalledWith(expect.objectContaining({ username: "pessoal", followers: 300 }));
  });

  it("never uses the unofficial source for a competitor, even when it is an opted-in customer's locked profile", async () => {
    vi.stubEnv("INSTAGRAM_ACCESS_TOKEN", "test-token");
    vi.stubEnv("INSTAGRAM_BUSINESS_ID", "123");
    vi.stubEnv("INSTAGRAM_COMPETITORS", "labtech");
    vi.stubEnv("INSTAGRAM_TARGET_USERNAME", "biodev");
    vi.stubEnv("DATABASE_URL", "postgres://app:pw@localhost:5432/app");
    vi.stubEnv("UNOFFICIAL_SOURCE_ENABLED", "true");
    vi.stubEnv("APIFY_TOKEN", "apify-token");
    vi.mocked(listLockedUsernames).mockResolvedValueOnce(["labtech"]);
    vi.mocked(listUnofficialUsernames).mockResolvedValueOnce(["labtech"]);
    // Every @ is refused as non-business; a competitor must not get the Apify fallback.
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => Response.json({ error: { code: 100, message: "not found" } }, { status: 400 })),
    );

    const result = await collectDailySnapshots();
    expect(result.saved).toEqual([]);
    expect(result.failed.map((f) => f.username)).toContain("labtech");
    expect(getApifyProfile).not.toHaveBeenCalled();
  });
});
