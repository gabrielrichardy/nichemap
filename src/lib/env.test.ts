import { afterEach, describe, expect, it, vi } from "vitest";
import { getApifyToken, getAuthConfig, getDatabaseUrl, getLogLevel, getSupportLink, getSupportWhatsappUrl, isAdminEmail } from "./env";

vi.mock("server-only", () => ({}));
afterEach(() => vi.unstubAllEnvs());

describe("server environment", () => {
  it("does not require a database URL to read independent configuration", () => {
    vi.stubEnv("DATABASE_URL", undefined);
    vi.stubEnv("LOG_LEVEL", undefined);
    expect(getLogLevel()).toBe("info");
    expect(() => getDatabaseUrl()).toThrow("DATABASE_URL");
  });

  it("accepts PostgreSQL connection protocols", () => {
    for (const protocol of ["postgres", "postgresql"]) {
      const value = `${protocol}://app:development@localhost:5432/app`;
      vi.stubEnv("DATABASE_URL", value);
      expect(getDatabaseUrl()).toBe(value);
    }
  });

  it("rejects a wrong protocol without exposing its credentials", () => {
    vi.stubEnv("DATABASE_URL", "https://app:sensitive-test-value@example.invalid/db");
    expect(() => getDatabaseUrl()).toThrow("DATABASE_URL");
    expect(() => getDatabaseUrl()).not.toThrow("sensitive-test-value");
  });

  it("rejects malformed URLs and invalid log levels", () => {
    vi.stubEnv("DATABASE_URL", "not a URL");
    vi.stubEnv("LOG_LEVEL", "not-a-level");
    expect(() => getDatabaseUrl()).toThrow("DATABASE_URL");
    expect(() => getLogLevel()).toThrow("LOG_LEVEL");
  });
});

describe("admin emails", () => {
  it("matches ignoring case and surrounding spaces", () => {
    vi.stubEnv("ADMIN_EMAILS", " admin@example.com,outro@example.com");
    expect(isAdminEmail("Admin@Example.com ")).toBe(true);
    expect(isAdminEmail("x@example.com")).toBe(false);
    expect(isAdminEmail(undefined)).toBe(false);
  });

  it("has no admins when the variable is unset", () => {
    vi.stubEnv("ADMIN_EMAILS", undefined);
    expect(isAdminEmail("admin@example.com")).toBe(false);
    expect(isAdminEmail("")).toBe(false);
  });
});

describe("support WhatsApp", () => {
  it("builds a wa.me link with the Brazil country code", () => {
    vi.stubEnv("SUPPORT_WHATSAPP", "(61) 90000-0000");
    expect(getSupportWhatsappUrl()).toBe("https://wa.me/5561900000000");
    vi.stubEnv("SUPPORT_WHATSAPP", "5561900000000");
    expect(getSupportWhatsappUrl()).toBe("https://wa.me/5561900000000");
  });

  it("returns null when unset and rejects other formats without echoing them", () => {
    vi.stubEnv("SUPPORT_WHATSAPP", undefined);
    expect(getSupportWhatsappUrl()).toBeNull();
    vi.stubEnv("SUPPORT_WHATSAPP", "123");
    expect(() => getSupportWhatsappUrl()).toThrow("SUPPORT_WHATSAPP");
    expect(() => getSupportWhatsappUrl()).not.toThrow("123");
    expect(getSupportLink()).toBeNull();
  });
});

describe("auth config", () => {
  const stubAuth = (secret: string) => {
    vi.stubEnv("GOOGLE_CLIENT_ID", "client-id");
    vi.stubEnv("GOOGLE_CLIENT_SECRET", "client-secret");
    vi.stubEnv("BETTER_AUTH_SECRET", secret);
    vi.stubEnv("BETTER_AUTH_URL", "http://localhost:3000");
  };

  it("is null when any variable is missing", () => {
    for (const key of ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET", "BETTER_AUTH_SECRET", "BETTER_AUTH_URL"]) {
      vi.stubEnv(key, undefined);
    }
    expect(getAuthConfig()).toBeNull();
  });

  it("returns the config when complete", () => {
    stubAuth("s".repeat(32));
    expect(getAuthConfig()).toEqual({
      googleClientId: "client-id",
      googleClientSecret: "client-secret",
      secret: "s".repeat(32),
      baseURL: "http://localhost:3000",
    });
  });

  it("rejects a short secret without exposing it", () => {
    stubAuth("curto-sensitive");
    expect(() => getAuthConfig()).toThrow("BETTER_AUTH_SECRET");
    expect(() => getAuthConfig()).not.toThrow("curto-sensitive");
  });

  it("rejects a non-http base URL", () => {
    stubAuth("s".repeat(32));
    vi.stubEnv("BETTER_AUTH_URL", "ftp://example.com");
    expect(() => getAuthConfig()).toThrow("BETTER_AUTH_URL");
  });
});

describe("Apify token", () => {
  it("is null with no variables", () => {
    vi.stubEnv("UNOFFICIAL_SOURCE_ENABLED", undefined);
    vi.stubEnv("APIFY_TOKEN", undefined);
    expect(getApifyToken()).toBeNull();
  });

  it("is null unless the flag is exactly \"true\"", () => {
    vi.stubEnv("APIFY_TOKEN", "apify-token");
    for (const flag of ["1", "false"]) {
      vi.stubEnv("UNOFFICIAL_SOURCE_ENABLED", flag);
      expect(getApifyToken()).toBeNull();
    }
  });

  it("returns the trimmed token when the flag is \"true\"", () => {
    vi.stubEnv("UNOFFICIAL_SOURCE_ENABLED", "true");
    vi.stubEnv("APIFY_TOKEN", "  apify-token  ");
    expect(getApifyToken()).toBe("apify-token");
  });
});
