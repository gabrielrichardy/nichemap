import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getDb } from "@/db";
import { getViewerBilling } from "./billing";
import { logger } from "./logger";

vi.mock("server-only", () => ({}));
vi.mock("@/db", () => ({ getDb: vi.fn() }));
vi.mock("./logger", () => ({ logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn() } }));

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("DATABASE_URL", "postgres://localhost/x");
  vi.stubEnv("ASAAS_API_KEY", "key");
  vi.stubEnv("ASAAS_WEBHOOK_TOKEN", "a".repeat(32));
});
afterEach(() => vi.unstubAllEnvs());

describe("getViewerBilling", () => {
  it("skips admins without touching the database", async () => {
    await expect(getViewerBilling({ userId: "u1", isAdmin: true })).resolves.toBeNull();
    expect(getDb).not.toHaveBeenCalled();
  });

  it("skips accounts when billing is not configured", async () => {
    vi.stubEnv("ASAAS_API_KEY", "");
    await expect(getViewerBilling({ userId: "u1", isAdmin: false })).resolves.toBeNull();
    expect(getDb).not.toHaveBeenCalled();
  });

  it("logs a failed lookup and returns null instead of breaking the page", async () => {
    vi.mocked(getDb).mockImplementation(() => {
      throw new Error("db down");
    });
    await expect(getViewerBilling({ userId: "u2", isAdmin: false })).resolves.toBeNull();
    expect(logger.error).toHaveBeenCalledWith({ userId: "u2", error: "db down" }, "Billing summary failed");
  });
});
