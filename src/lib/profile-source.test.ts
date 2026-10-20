import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getApifyProfile } from "./apify";
import { fetchProfile, GraphRequestError, type RawBusinessDiscovery } from "./graph";
import { logger } from "./logger";
import { fetchProfileWithFallback, SourceDisabledError } from "./profile-source";

vi.mock("server-only", () => ({}));
vi.mock("./logger", () => ({ logger: { warn: vi.fn() } }));
vi.mock("./graph", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./graph")>()),
  fetchProfile: vi.fn(),
}));
vi.mock("./apify", () => ({ getApifyProfile: vi.fn() }));

const credentials = { accessToken: "graph-token", businessId: "123" };
const official: RawBusinessDiscovery = { username: "ana", followers_count: 10, media_count: 1 };
const unofficial: RawBusinessDiscovery = { username: "ana", followers_count: 9, media_count: 1 };
const notBusiness = new GraphRequestError("not business", 100);

function flagOn() {
  vi.stubEnv("UNOFFICIAL_SOURCE_ENABLED", "true");
  vi.stubEnv("APIFY_TOKEN", "apify-token");
}

beforeEach(() => {
  vi.stubEnv("UNOFFICIAL_SOURCE_ENABLED", undefined);
  vi.stubEnv("APIFY_TOKEN", undefined);
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.clearAllMocks();
});

describe("fetchProfileWithFallback", () => {
  it("returns the official profile as live without calling Apify", async () => {
    flagOn();
    vi.mocked(fetchProfile).mockResolvedValue(official);
    await expect(fetchProfileWithFallback("ana", credentials, { allowUnofficial: true })).resolves.toEqual({
      profile: official,
      source: "live",
    });
    expect(fetchProfile).toHaveBeenCalledWith("ana", credentials, true);
    expect(getApifyProfile).not.toHaveBeenCalled();
  });

  it("passes withMedia to the official call", async () => {
    vi.mocked(fetchProfile).mockResolvedValue(official);
    await fetchProfileWithFallback("ana", credentials, { allowUnofficial: false, withMedia: false });
    expect(fetchProfile).toHaveBeenCalledWith("ana", credentials, false);
  });

  it("falls back to Apify on a not-business refusal when allowed and the flag is on", async () => {
    flagOn();
    vi.mocked(fetchProfile).mockRejectedValue(notBusiness);
    vi.mocked(getApifyProfile).mockResolvedValue(unofficial);
    await expect(fetchProfileWithFallback("ana", credentials, { allowUnofficial: true })).resolves.toEqual({
      profile: unofficial,
      source: "unofficial",
    });
    expect(getApifyProfile).toHaveBeenCalledWith("ana");
  });

  it("rethrows the original not-business error when the account is not allowed", async () => {
    flagOn();
    vi.mocked(fetchProfile).mockRejectedValue(notBusiness);
    await expect(fetchProfileWithFallback("ana", credentials, { allowUnofficial: false })).rejects.toBe(notBusiness);
    expect(getApifyProfile).not.toHaveBeenCalled();
  });

  it("rethrows the original not-business error when the flag is off for a non-opted account", async () => {
    vi.mocked(fetchProfile).mockRejectedValue(notBusiness);
    await expect(fetchProfileWithFallback("ana", credentials, { allowUnofficial: false })).rejects.toBe(notBusiness);
    expect(getApifyProfile).not.toHaveBeenCalled();
  });

  it("throws SourceDisabledError for an allowed account while the flag is off", async () => {
    vi.mocked(fetchProfile).mockRejectedValue(notBusiness);
    await expect(fetchProfileWithFallback("ana", credentials, { allowUnofficial: true })).rejects.toBeInstanceOf(
      SourceDisabledError,
    );
    expect(getApifyProfile).not.toHaveBeenCalled();
  });

  it("rethrows any other Graph error unchanged", async () => {
    flagOn();
    const expired = new GraphRequestError("expired", 190);
    vi.mocked(fetchProfile).mockRejectedValue(expired);
    await expect(fetchProfileWithFallback("ana", credentials, { allowUnofficial: true })).rejects.toBe(expired);
    expect(getApifyProfile).not.toHaveBeenCalled();
  });

  it("propagates an Apify failure and logs it without the token", async () => {
    flagOn();
    const failure = new Error("Apify respondeu 500");
    vi.mocked(fetchProfile).mockRejectedValue(notBusiness);
    vi.mocked(getApifyProfile).mockRejectedValue(failure);
    await expect(fetchProfileWithFallback("ana", credentials, { allowUnofficial: true })).rejects.toBe(failure);
    expect(logger.warn).toHaveBeenCalledWith(
      { target: "ana", error: "Apify respondeu 500" },
      "Unofficial source failed",
    );
  });
});
