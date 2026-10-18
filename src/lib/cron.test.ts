import { afterEach, describe, expect, it, vi } from "vitest";
import { isAuthorizedCron } from "./cron";

vi.mock("server-only", () => ({}));
afterEach(() => vi.unstubAllEnvs());

describe("isAuthorizedCron", () => {
  it("accepts only the exact Bearer secret", () => {
    vi.stubEnv("CRON_SECRET", "a-long-random-secret");
    expect(isAuthorizedCron("Bearer a-long-random-secret")).toBe(true);
    expect(isAuthorizedCron("Bearer wrong")).toBe(false);
    expect(isAuthorizedCron("a-long-random-secret")).toBe(false);
    expect(isAuthorizedCron(null)).toBe(false);
  });

  it("rejects everything when no secret is configured", () => {
    vi.stubEnv("CRON_SECRET", "");
    expect(isAuthorizedCron("Bearer ")).toBe(false);
    expect(isAuthorizedCron("Bearer undefined")).toBe(false);
  });
});
