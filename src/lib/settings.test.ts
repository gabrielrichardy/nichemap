import { afterEach, describe, expect, it, vi } from "vitest";
import { getIntegrationStatus } from "./settings";

vi.mock("server-only", () => ({}));
vi.mock("./logger", () => ({ logger: { warn: vi.fn() } }));
afterEach(() => vi.unstubAllEnvs());

const stateOf = (name: string) => getIntegrationStatus().integrations.find((i) => i.name === name)?.state;

describe("getIntegrationStatus", () => {
  it("reports missing integrations when nothing is configured", () => {
    for (const key of ["INSTAGRAM_ACCESS_TOKEN", "INSTAGRAM_BUSINESS_ID", "DATABASE_URL", "META_VERIFICATION_CODE"]) {
      vi.stubEnv(key, "");
    }
    expect(getIntegrationStatus().integrations.every((i) => i.state === "missing")).toBe(true);
  });

  it("validates values and never returns them", () => {
    vi.stubEnv("INSTAGRAM_ACCESS_TOKEN", "secret-token-value");
    vi.stubEnv("INSTAGRAM_BUSINESS_ID", "not-a-number");
    vi.stubEnv("DATABASE_URL", "postgres://app:secret-db-pass@localhost:5432/app");
    vi.stubEnv("META_VERIFICATION_CODE", "secret-meta-code");

    expect(stateOf("Instagram Graph API")).toBe("invalid");
    expect(stateOf("Banco PostgreSQL")).toBe("ok");
    expect(stateOf("Verificação de domínio Meta")).toBe("ok");

    const serialized = JSON.stringify(getIntegrationStatus());
    for (const secret of ["secret-token-value", "not-a-number", "secret-db-pass", "secret-meta-code"]) {
      expect(serialized).not.toContain(secret);
    }
  });

  it("returns the default profile, or null when it is invalid", () => {
    vi.stubEnv("INSTAGRAM_TARGET_USERNAME", "@biodev");
    expect(getIntegrationStatus().defaultTarget).toBe("biodev");
    vi.stubEnv("INSTAGRAM_TARGET_USERNAME", "a,b");
    expect(getIntegrationStatus().defaultTarget).toBeNull();
  });
});
