import "server-only";
import {
  authSecretSchema,
  databaseUrlSchema,
  httpUrlSchema,
  instagramBusinessIdSchema,
  instagramUsernameSchema,
  logLevelSchema,
  parseEnv,
  whatsappDigitsSchema,
} from "./env-schema";

const MAX_COMPETITORS = 10;

// INSTAGRAM_COMPETITORS: comma-separated usernames ("@perfil" accepted) tracked by Market Radar.
export function getCompetitorUsernames(): string[] {
  const names = (process.env.INSTAGRAM_COMPETITORS ?? "")
    .split(",")
    .map((n) => n.trim().replace(/^@/, "").toLowerCase())
    .filter(Boolean);
  for (const name of names) parseEnv("INSTAGRAM_COMPETITORS", name, instagramUsernameSchema);
  return [...new Set(names)].slice(0, MAX_COMPETITORS);
}

export function isDatabaseConfigured() {
  return Boolean(process.env.DATABASE_URL?.trim());
}

// Returns null when Instagram is not configured (the dashboard then serves mock data).
export function getInstagramCredentials() {
  const accessToken = process.env.INSTAGRAM_ACCESS_TOKEN;
  const businessId = process.env.INSTAGRAM_BUSINESS_ID;
  if (!accessToken || !businessId) return null;
  return {
    accessToken,
    businessId: parseEnv("INSTAGRAM_BUSINESS_ID", businessId, instagramBusinessIdSchema),
  };
}

export function getDatabaseUrl() {
  return parseEnv("DATABASE_URL", process.env.DATABASE_URL, databaseUrlSchema);
}

export function getLogLevel() {
  return parseEnv("LOG_LEVEL", process.env.LOG_LEVEL, logLevelSchema);
}

// Returns null until Google login is fully configured (all four variables set).
export function getAuthConfig() {
  const googleClientId = process.env.GOOGLE_CLIENT_ID?.trim();
  const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();
  const secret = process.env.BETTER_AUTH_SECRET?.trim();
  const baseURL = process.env.BETTER_AUTH_URL?.trim();
  if (!googleClientId || !googleClientSecret || !secret || !baseURL) return null;
  return {
    googleClientId,
    googleClientSecret,
    secret: parseEnv("BETTER_AUTH_SECRET", secret, authSecretSchema),
    baseURL: parseEnv("BETTER_AUTH_URL", baseURL, httpUrlSchema),
  };
}

// ADMIN_EMAILS: comma-separated Google account emails with access to /admin.
export function isAdminEmail(email: string | null | undefined): boolean {
  const normalized = email?.trim().toLowerCase();
  if (!normalized) return false;
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .includes(normalized);
}

// SUPPORT_WHATSAPP: support number shown to customers, any formatting accepted.
export function getSupportWhatsappUrl(): string | null {
  const raw = process.env.SUPPORT_WHATSAPP?.trim();
  if (!raw) return null;
  const digits = parseEnv("SUPPORT_WHATSAPP", raw.replace(/\D/g, ""), whatsappDigitsSchema);
  return `https://wa.me/${digits.length <= 11 ? `55${digits}` : digits}`;
}
