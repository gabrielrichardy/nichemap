import "server-only";
import {
  databaseUrlSchema,
  instagramBusinessIdSchema,
  instagramUsernameSchema,
  logLevelSchema,
  parseEnv,
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
