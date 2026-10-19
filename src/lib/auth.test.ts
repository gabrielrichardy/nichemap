import { afterEach, describe, expect, it, vi } from "vitest";
import { getDb } from "@/db";
import { getAuth } from "./auth";

vi.mock("server-only", () => ({}));
vi.mock("@/db", () => ({ getDb: vi.fn(() => ({})) }));
afterEach(() => vi.unstubAllEnvs());

describe("getAuth", () => {
  it("is null without login variables and never touches the database", () => {
    for (const key of ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET", "BETTER_AUTH_SECRET", "BETTER_AUTH_URL"]) {
      vi.stubEnv(key, undefined);
    }
    vi.stubEnv("DATABASE_URL", "postgres://app:pw@localhost:5432/app");
    expect(getAuth()).toBeNull();
    expect(getDb).not.toHaveBeenCalled();
  });

  it("is null without a database even when login is configured", () => {
    vi.stubEnv("GOOGLE_CLIENT_ID", "id");
    vi.stubEnv("GOOGLE_CLIENT_SECRET", "secret");
    vi.stubEnv("BETTER_AUTH_SECRET", "s".repeat(32));
    vi.stubEnv("BETTER_AUTH_URL", "http://localhost:3000");
    vi.stubEnv("DATABASE_URL", "");
    expect(getAuth()).toBeNull();
    expect(getDb).not.toHaveBeenCalled();
  });
});
