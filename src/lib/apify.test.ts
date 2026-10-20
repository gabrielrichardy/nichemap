import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchApifyProfile, getApifyProfile, PrivateProfileError, ProfileNotFoundError } from "./apify";

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ unstable_cache: (fn: unknown) => fn }));
vi.mock("./logger", () => ({ logger: { warn: vi.fn() } }));
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

const ENDPOINT = "https://api.apify.com/v2/acts/apify~instagram-profile-scraper/run-sync-get-dataset-items";

function stubFetch(body: unknown, status = 200) {
  const fn = vi.fn<(url: string, init?: RequestInit) => Promise<Response>>(async () => Response.json(body, { status }));
  vi.stubGlobal("fetch", fn);
  return fn;
}

const post = (id: string, type: string) => ({
  id,
  type,
  caption: "c",
  likesCount: 10,
  commentsCount: 2,
  timestamp: "2026-10-01T00:00:00.000Z",
  url: `https://instagram.com/p/${id}`,
});

const item = {
  username: "pessoal",
  fullName: "Ana",
  biography: "bio",
  profilePicUrl: "p.jpg",
  followersCount: 1200,
  postsCount: 40,
  private: false,
  latestPosts: [post("1", "Video"), post("2", "Sidecar"), post("3", "Image")],
};

describe("fetchApifyProfile", () => {
  it("posts the username with a bearer header and no token in the URL", async () => {
    const fetchMock = stubFetch([item]);
    await fetchApifyProfile("pessoal", "tok");
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(ENDPOINT);
    expect(url).not.toContain("token=");
    expect(init?.method).toBe("POST");
    expect(new Headers(init?.headers).get("Authorization")).toBe("Bearer tok");
    expect(init?.body).toBe(JSON.stringify({ usernames: ["pessoal"] }));
  });

  it("maps the Apify item to the business discovery shape", async () => {
    stubFetch([item]);
    const outcome = await fetchApifyProfile("pessoal", "tok");
    if (!outcome.ok) throw new Error(`expected a profile, got ${outcome.reason}`);
    const profile = outcome.profile;
    expect(profile).toMatchObject({
      username: "pessoal",
      name: "Ana",
      biography: "bio",
      profile_picture_url: "p.jpg",
      followers_count: 1200,
      media_count: 40,
    });
    expect(profile.media?.data.map((m) => m.media_type)).toEqual(["VIDEO", "CAROUSEL_ALBUM", "IMAGE"]);
    expect(profile.media?.data[0]).toEqual({
      id: "1",
      caption: "c",
      media_type: "VIDEO",
      like_count: 10,
      comments_count: 2,
      timestamp: "2026-10-01T00:00:00.000Z",
      permalink: "https://instagram.com/p/1",
    });
  });

  it("returns private profiles as a negative outcome", async () => {
    stubFetch([{ ...item, private: true }]);
    expect(await fetchApifyProfile("pessoal", "tok")).toEqual({ ok: false, reason: "private" });
  });

  it("returns an empty answer as a not-found outcome", async () => {
    stubFetch([]);
    expect(await fetchApifyProfile("pessoal", "tok")).toEqual({ ok: false, reason: "not_found" });
  });

  it("reports the HTTP status without the token", async () => {
    stubFetch({ error: { message: "payment required" } }, 402);
    const promise = fetchApifyProfile("pessoal", "tok-secret");
    await expect(promise).rejects.toThrow(/402/);
    await expect(promise).rejects.not.toThrow(/tok-secret/);
  });

  it("returns malformed items as a negative outcome", async () => {
    stubFetch([{ foo: 1 }]);
    expect(await fetchApifyProfile("pessoal", "tok")).toEqual({ ok: false, reason: "malformed" });
  });
});

describe("getApifyProfile", () => {
  it("throws without calling Apify when the source is off", async () => {
    const fetchMock = stubFetch([item]);
    vi.stubEnv("UNOFFICIAL_SOURCE_ENABLED", "false");
    vi.stubEnv("APIFY_TOKEN", "tok");
    await expect(getApifyProfile("pessoal")).rejects.toThrow("Fonte não oficial desligada.");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("uses the configured token when the source is on", async () => {
    const fetchMock = stubFetch([item]);
    vi.stubEnv("UNOFFICIAL_SOURCE_ENABLED", "true");
    vi.stubEnv("APIFY_TOKEN", "apify_api_test");
    await expect(getApifyProfile("pessoal")).resolves.toMatchObject({ username: "pessoal" });
    expect(new Headers(fetchMock.mock.calls[0][1]?.headers).get("Authorization")).toBe("Bearer apify_api_test");
  });

  it("throws PrivateProfileError for a private profile", async () => {
    stubFetch([{ ...item, private: true }]);
    vi.stubEnv("UNOFFICIAL_SOURCE_ENABLED", "true");
    vi.stubEnv("APIFY_TOKEN", "apify_api_test");
    await expect(getApifyProfile("pessoal")).rejects.toBeInstanceOf(PrivateProfileError);
  });

  it("throws ProfileNotFoundError when Apify returns nothing", async () => {
    stubFetch([]);
    vi.stubEnv("UNOFFICIAL_SOURCE_ENABLED", "true");
    vi.stubEnv("APIFY_TOKEN", "apify_api_test");
    await expect(getApifyProfile("pessoal")).rejects.toBeInstanceOf(ProfileNotFoundError);
  });

  it("lets HTTP errors through as thrown errors", async () => {
    stubFetch({ error: { message: "payment required" } }, 402);
    vi.stubEnv("UNOFFICIAL_SOURCE_ENABLED", "true");
    vi.stubEnv("APIFY_TOKEN", "apify_api_test");
    await expect(getApifyProfile("pessoal")).rejects.toThrow(/402/);
  });
});
