import { afterEach, describe, expect, it, vi } from "vitest";
import { getIntegrationStatus } from "./settings";

vi.mock("server-only", () => ({}));
vi.mock("./logger", () => ({ logger: { warn: vi.fn() } }));
afterEach(() => vi.unstubAllEnvs());

const stateOf = (name: string) => getIntegrationStatus().integrations.find((i) => i.name === name)?.state;

describe("getIntegrationStatus", () => {
  it("reports missing integrations when nothing is configured", () => {
    for (const key of [
      "INSTAGRAM_ACCESS_TOKEN",
      "INSTAGRAM_BUSINESS_ID",
      "DATABASE_URL",
      "META_VERIFICATION_CODE",
      "INSTAGRAM_COMPETITORS",
      "CRON_SECRET",
      "GOOGLE_CLIENT_ID",
      "GOOGLE_CLIENT_SECRET",
      "BETTER_AUTH_SECRET",
      "BETTER_AUTH_URL",
      "ADMIN_EMAILS",
      "SUPPORT_WHATSAPP",
    ]) {
      vi.stubEnv(key, "");
    }
    expect(getIntegrationStatus().integrations.every((i) => i.state === "missing")).toBe(true);
  });

  it("validates values and never returns them", () => {
    vi.stubEnv("INSTAGRAM_ACCESS_TOKEN", "secret-token-value");
    vi.stubEnv("INSTAGRAM_BUSINESS_ID", "not-a-number");
    vi.stubEnv("DATABASE_URL", "postgres://app:secret-db-pass@localhost:5432/app");
    vi.stubEnv("META_VERIFICATION_CODE", "secret-meta-code");
    vi.stubEnv("CRON_SECRET", "secret-cron-value");
    vi.stubEnv("INSTAGRAM_COMPETITORS", "labtech, a,b!");
    vi.stubEnv("GOOGLE_CLIENT_ID", "secret-google-id");
    vi.stubEnv("GOOGLE_CLIENT_SECRET", "secret-google-secret");
    vi.stubEnv("BETTER_AUTH_SECRET", "secret-short");
    vi.stubEnv("BETTER_AUTH_URL", "http://localhost:3000");
    vi.stubEnv("ADMIN_EMAILS", "secret-admin@example.com");
    vi.stubEnv("SUPPORT_WHATSAPP", "61900000000");

    expect(stateOf("Instagram Graph API")).toBe("invalid");
    expect(stateOf("Banco PostgreSQL")).toBe("ok");
    expect(stateOf("Verificação de domínio Meta")).toBe("ok");
    expect(stateOf("Coleta diária (Vercel Cron)")).toBe("ok");
    expect(stateOf("Concorrentes (Market Radar)")).toBe("invalid");
    expect(stateOf("Login com Google")).toBe("invalid");
    expect(stateOf("Administradores")).toBe("ok");
    expect(stateOf("Suporte (WhatsApp)")).toBe("ok");

    const serialized = JSON.stringify(getIntegrationStatus());
    for (const secret of ["secret-token-value", "not-a-number", "secret-db-pass", "secret-meta-code", "secret-cron-value", "secret-google-id", "secret-google-secret", "secret-short", "secret-admin", "61900000000"]) {
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
