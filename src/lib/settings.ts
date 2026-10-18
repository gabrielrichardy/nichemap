import "server-only";
import { getCompetitorUsernames, getDatabaseUrl, getInstagramCredentials } from "./env";
import { checkConnection, GRAPH_VERSION } from "./graph";
import { resolveTarget } from "./instagram";

export type IntegrationState = "ok" | "missing" | "invalid";

export interface IntegrationStatus {
  name: string;
  variables: string;
  state: IntegrationState;
  help: string;
}

const isSet = (key: string) => Boolean(process.env[key]?.trim());

// "invalid" when the value is present but fails the same validation the app uses.
function stateOf(configured: boolean, validate?: () => unknown): IntegrationState {
  if (!configured) return "missing";
  try {
    validate?.();
    return "ok";
  } catch {
    return "invalid";
  }
}

// Only states and variable names leave this module, never the values themselves.
export function getIntegrationStatus() {
  const integrations: IntegrationStatus[] = [
    {
      name: "Instagram Graph API",
      variables: "INSTAGRAM_ACCESS_TOKEN, INSTAGRAM_BUSINESS_ID",
      state: stateOf(isSet("INSTAGRAM_ACCESS_TOKEN") && isSet("INSTAGRAM_BUSINESS_ID"), getInstagramCredentials),
      help: "Sem as duas variáveis o app mostra dados de exemplo.",
    },
    {
      name: "Banco PostgreSQL",
      variables: "DATABASE_URL",
      state: stateOf(isSet("DATABASE_URL"), getDatabaseUrl),
      help: "Necessário para o histórico diário de crescimento (issue #8).",
    },
    {
      name: "Concorrentes (Market Radar)",
      variables: "INSTAGRAM_COMPETITORS",
      state: stateOf(isSet("INSTAGRAM_COMPETITORS"), getCompetitorUsernames),
      help: "Perfis separados por vírgula; sem eles o Market Radar mostra dados de exemplo.",
    },
    {
      name: "Coleta diária (Vercel Cron)",
      variables: "CRON_SECRET",
      state: stateOf(isSet("CRON_SECRET")),
      help: "Protege /api/cron/snapshot; a Vercel envia esse segredo ao chamar a coleta.",
    },
    {
      name: "Verificação de domínio Meta",
      variables: "META_VERIFICATION_CODE",
      state: stateOf(isSet("META_VERIFICATION_CODE")),
      help: "Injeta a meta tag facebook-domain-verification no <head>.",
    },
  ];
  return { integrations, defaultTarget: resolveTarget(undefined), graphVersion: GRAPH_VERSION };
}

// Live check of the Instagram token: "configured" is not enough, tokens expire.
export async function checkInstagramConnection(): Promise<{ ok: true } | { ok: false; message: string } | null> {
  let credentials;
  try {
    credentials = getInstagramCredentials();
  } catch {
    return null; // invalid configuration is already reported by getIntegrationStatus
  }
  if (!credentials) return null;
  try {
    await checkConnection(credentials);
    return { ok: true };
  } catch (err) {
    return { ok: false, message: (err as Error).message };
  }
}
