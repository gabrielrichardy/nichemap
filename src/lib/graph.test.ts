import { afterEach, describe, expect, it, vi } from "vitest";
import { computeEngagementPct, describeGraphError, fetchProfile } from "./graph";

vi.mock("server-only", () => ({}));
afterEach(() => vi.unstubAllGlobals());

describe("describeGraphError", () => {
  it("explains expired tokens, permissions and rate limits in pt-BR", () => {
    expect(describeGraphError({ code: 190, message: "Session has expired" }, 400)).toMatch(/Token do Instagram expirado/);
    expect(describeGraphError({ code: 10 }, 403)).toMatch(/Permissão negada/);
    expect(describeGraphError({ code: 200 }, 403)).toMatch(/Permissão negada/);
    expect(describeGraphError({ code: 4 }, 400)).toMatch(/Limite de chamadas/);
  });

  it("falls back to the Graph message or the HTTP status", () => {
    expect(describeGraphError({ code: 100, message: "Invalid parameter" }, 400)).toBe("Invalid parameter");
    expect(describeGraphError(undefined, 502)).toBe("Instagram Graph API respondeu 502");
  });
});

describe("fetchProfile", () => {
  it("throws the friendly message without leaking the token", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => Response.json({ error: { code: 190, message: "expired" } }, { status: 400 })),
    );
    const promise = fetchProfile("biodev", { accessToken: "secret-token", businessId: "123" });
    await expect(promise).rejects.toThrow(/Token do Instagram expirado/);
    await expect(promise).rejects.not.toThrow(/secret-token/);
  });
});

describe("computeEngagementPct", () => {
  it("averages likes + comments per post over followers", () => {
    const media = [
      { id: "1", media_type: "IMAGE" as const, timestamp: "", like_count: 90, comments_count: 10 },
      { id: "2", media_type: "IMAGE" as const, timestamp: "", like_count: 100 },
    ];
    expect(computeEngagementPct(media, 1000)).toBe(10);
    expect(computeEngagementPct([], 1000)).toBe(0);
    expect(computeEngagementPct(media, 0)).toBe(0);
  });
});
