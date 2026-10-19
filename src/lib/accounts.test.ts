import { describe, expect, it, vi } from "vitest";
import { isUniqueViolation } from "./accounts";

vi.mock("server-only", () => ({}));
vi.mock("@/db", () => ({ getDb: vi.fn() }));

describe("isUniqueViolation", () => {
  it("detects the PostgreSQL unique violation code", () => {
    expect(isUniqueViolation({ code: "23505" })).toBe(true);
    expect(isUniqueViolation({ code: "23503" })).toBe(false);
    expect(isUniqueViolation(new Error("boom"))).toBe(false);
    expect(isUniqueViolation(null)).toBe(false);
  });

  it("looks inside the cause that Drizzle wraps around pg errors", () => {
    expect(isUniqueViolation(new Error("Failed query", { cause: { code: "23505" } }))).toBe(true);
  });
});
