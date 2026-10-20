import "server-only";
import { getApifyProfile } from "./apify";
import { getApifyToken } from "./env";
import { fetchProfile, isNotBusinessError, type GraphCredentials, type RawBusinessDiscovery } from "./graph";
import { logger } from "./logger";

export type ProfileSource = "live" | "unofficial";

// Official Graph refused the @ as not business, and the unofficial source is off or not enabled for the account.
export class SourceDisabledError extends Error {
  constructor() {
    super(
      "Não conseguimos ler seu perfil como conta profissional e a fonte não oficial está desativada para sua conta. Para continuar, mude sua conta do Instagram para profissional (comercial ou criador).",
    );
    this.name = "SourceDisabledError";
  }
}

// Official Graph first. Only its "not business" refusal may fall back to Apify, and only when allowed.
// Accounts not allowed get the original Graph error, so non-opted customers see the same copy as before.
export async function fetchProfileWithFallback(
  username: string,
  credentials: GraphCredentials,
  opts: { allowUnofficial: boolean; withMedia?: boolean },
): Promise<{ profile: RawBusinessDiscovery; source: ProfileSource }> {
  try {
    return { profile: await fetchProfile(username, credentials, opts.withMedia ?? true), source: "live" };
  } catch (err) {
    if (!isNotBusinessError(err) || !opts.allowUnofficial) throw err;
    if (getApifyToken() === null) throw new SourceDisabledError();
  }
  try {
    return { profile: await getApifyProfile(username), source: "unofficial" };
  } catch (err) {
    logger.warn({ target: username, error: (err as Error).message }, "Unofficial source failed");
    throw err;
  }
}
