import { afterEach, describe, expect, it, vi } from "vitest";
import { getDashboardData, targetUsernameSchema } from "./instagram";

vi.mock("server-only", () => ({}));
vi.mock("./logger", () => ({ logger: { warn: vi.fn() } }));
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
