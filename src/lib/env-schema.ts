import { z } from "zod";

export const databaseUrlSchema = z.string().refine((value) => {
  try {
    const url = new URL(value);
    return ["postgres:", "postgresql:"].includes(url.protocol) && Boolean(url.hostname);
  } catch {
    return false;
  }
});

// Instagram usernames: letters, digits, "." and "_", up to 30 chars. The value is
// interpolated into the Graph API `fields` expression, so anything else is rejected.
export const instagramUsernameSchema = z.string().regex(/^[A-Za-z0-9._]{1,30}$/);

// Interpolated into the Graph API URL path, so only a numeric ID is accepted.
export const instagramBusinessIdSchema = z.string().regex(/^\d+$/);

export const httpUrlSchema = z.string().refine((value) => {
  try {
    return ["http:", "https:"].includes(new URL(value).protocol);
  } catch {
    return false;
  }
});

// Signs session cookies: Better Auth requires at least 32 characters.
export const authSecretSchema = z.string().min(32);

// Brazilian phone in digits: DDD + number (10-11 digits), optionally prefixed with 55.
export const whatsappDigitsSchema = z.string().regex(/^(55)?\d{10,11}$/);

export const logLevelSchema = z.enum(["trace", "debug", "info", "warn", "error", "fatal", "silent"]).default("info");

export function parseEnv<T>(key: string, value: unknown, schema: z.ZodType<T>): T {
  const result = schema.safeParse(value);
  // Zod issues can include input values; expose only the variable name.
  if (!result.success) throw new Error(`Invalid or missing environment variable: ${key}`);
  return result.data;
}
