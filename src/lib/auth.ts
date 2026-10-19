import "server-only";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import * as schema from "@/db/schema";
import { getAuthConfig, isDatabaseConfigured } from "./env";
import { logger } from "./logger";

function createAuth(config: NonNullable<ReturnType<typeof getAuthConfig>>) {
  const db = getDb();
  return betterAuth({
    baseURL: config.baseURL,
    secret: config.secret,
    database: drizzleAdapter(db, { provider: "pg", schema }),
    socialProviders: {
      google: { clientId: config.googleClientId, clientSecret: config.googleClientSecret },
    },
    // The app never uses Google's tokens; keep them encrypted at rest (LGPD: minimal exposure).
    account: { encryptOAuthTokens: true },
    // Server-owned: `input: false` makes Better Auth reject these in sign-up/update-user bodies.
    user: {
      additionalFields: {
        plan: { type: "string", required: false, defaultValue: "basico", input: false },
        instagramUsername: { type: "string", required: false, input: false },
        termsAcceptedAt: { type: "date", required: false, input: false },
        lastSeenAt: { type: "date", required: false, input: false },
        complimentary: { type: "boolean", required: false, defaultValue: false, input: false },
      },
    },
    databaseHooks: {
      session: {
        create: {
          // "Último acesso" shown to the admin = last sign-in.
          after: async (session) => {
            try {
              await db.update(schema.user).set({ lastSeenAt: new Date() }).where(eq(schema.user.id, session.userId));
            } catch (err) {
              logger.warn({ userId: session.userId, code: (err as { code?: string }).code }, "Could not record last sign-in");
            }
          },
        },
      },
    },
    plugins: [nextCookies()], // must stay last
  });
}

type Auth = ReturnType<typeof createAuth>;
let cached: Auth | undefined;

// Null until Google login and the database are configured; created once, on first use.
export function getAuth(): Auth | null {
  if (cached) return cached;
  const config = getAuthConfig();
  if (!config || !isDatabaseConfigured()) return null;
  cached = createAuth(config);
  return cached;
}
