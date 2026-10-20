import "server-only";
import type { LockResult } from "./accounts";
import { PrivateProfileError, ProfileNotFoundError } from "./apify";
import { getInstagramCredentials } from "./env";
import { resolveTarget } from "./instagram";
import { logger } from "./logger";
import { isNotBusinessError } from "./graph";
import { fetchProfileWithFallback, SourceDisabledError, type ProfileSource } from "./profile-source";

export interface ProfilePreview {
  username: string;
  name: string;
  pictureUrl: string | null;
  followers: number;
  source: ProfileSource;
}

export type LookupResult = { ok: true; profile: ProfilePreview } | { ok: false; message: string };

const UNAVAILABLE = "Serviço indisponível no momento. Tente mais tarde.";
const NOT_BUSINESS =
  "Não encontramos esse perfil como conta comercial ou de criador. Se a conta for pessoal, mude para profissional nas configurações do Instagram e tente de novo.";
const PRIVATE = "Perfis privados não funcionam. Deixe o perfil público no Instagram e tente de novo.";
const SOURCE_DISABLED =
  "Não conseguimos ler seu perfil como conta profissional e a fonte não oficial está desativada para sua conta. Para continuar, mude sua conta do Instagram para profissional (comercial ou criador).";

// Finds the public business/creator profile a customer is about to lock. The empty @ is
// rejected here: resolveTarget() would otherwise fall back to the default profile.
// allowUnofficial: the account may use the unofficial source for a non-business @.
export async function lookupProfile(raw: string, opts: { allowUnofficial?: boolean } = {}): Promise<LookupResult> {
  const username = raw.trim() ? resolveTarget(raw) : null;
  if (!username) return { ok: false, message: "Digite um @ válido: letras, números, ponto e sublinhado." };

  let credentials;
  try {
    credentials = getInstagramCredentials();
  } catch {
    credentials = null;
  }
  if (!credentials) return { ok: false, message: UNAVAILABLE };

  try {
    const { profile, source } = await fetchProfileWithFallback(username, credentials, {
      allowUnofficial: opts.allowUnofficial ?? false,
      withMedia: false,
    });
    return {
      ok: true,
      profile: {
        username,
        name: profile.name || `@${username}`,
        pictureUrl: profile.profile_picture_url ?? null,
        followers: profile.followers_count,
        source,
      },
    };
  } catch (err) {
    if (err instanceof SourceDisabledError) return { ok: false, message: SOURCE_DISABLED };
    if (isNotBusinessError(err) || err instanceof ProfileNotFoundError) return { ok: false, message: NOT_BUSINESS };
    if (err instanceof PrivateProfileError) return { ok: false, message: PRIVATE };
    // Token or quota problems are the owner's to fix: logged, never shown to customers.
    logger.warn({ target: username, error: (err as Error).message }, "Profile lookup failed");
    return { ok: false, message: UNAVAILABLE };
  }
}

export function lockMessage(result: Extract<LockResult, { ok: false }>): string {
  if (result.reason === "already_locked") return "Sua conta já tem um perfil escolhido.";
  return "Aceite os termos e a política de privacidade para continuar.";
}
