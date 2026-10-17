import "server-only";
import { databaseUrlSchema, instagramBusinessIdSchema, logLevelSchema, parseEnv } from "./env-schema";

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
