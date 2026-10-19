import "server-only";
import { isUsernameTaken, type LockResult } from "./accounts";
import { getInstagramCredentials } from "./env";
import { fetchProfile, GraphRequestError } from "./graph";
import { resolveTarget } from "./instagram";
import { logger } from "./logger";

export interface ProfilePreview {
  username: string;
  name: string;
  pictureUrl: string | null;
  followers: number;
}

export type LookupResult = { ok: true; profile: ProfilePreview } | { ok: false; message: string; inUse?: true };

const IN_USE = "Este perfil já está ligado a outra conta. Fale com o suporte.";
const UNAVAILABLE = "Serviço indisponível no momento. Tente mais tarde.";
// Graph API code 100: business_discovery found no business/creator account with that @.
const NOT_FOUND_CODE = 100;

// Finds the public business/creator profile a customer is about to lock. The empty @ is
// rejected here: resolveTarget() would otherwise fall back to the default profile.
export async function lookupProfile(raw: string): Promise<LookupResult> {
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
    const profile = await fetchProfile(username, credentials, false);
    if (await isUsernameTaken(username)) return { ok: false, message: IN_USE, inUse: true };
    return {
      ok: true,
      profile: {
        username,
        name: profile.name || `@${username}`,
        pictureUrl: profile.profile_picture_url ?? null,
        followers: profile.followers_count,
      },
    };
  } catch (err) {
    if (err instanceof GraphRequestError && err.code === NOT_FOUND_CODE) {
      return {
        ok: false,
        message:
          "Não encontramos esse perfil como conta comercial ou de criador. Se a conta for pessoal, mude para profissional nas configurações do Instagram e tente de novo.",
      };
    }
    // Token or quota problems are the owner's to fix: logged, never shown to customers.
    logger.warn({ target: username, error: (err as Error).message }, "Profile lookup failed");
    return { ok: false, message: UNAVAILABLE };
  }
}

export function lockMessage(result: Extract<LockResult, { ok: false }>): string {
  if (result.reason === "in_use") return IN_USE;
  if (result.reason === "already_locked") return "Sua conta já tem um perfil escolhido.";
  return "Aceite os termos e a política de privacidade para continuar.";
}
