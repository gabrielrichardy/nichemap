import "server-only";

export const GRAPH_VERSION = "v25.0";

export interface RawMedia {
  id: string;
  caption?: string;
  media_type: "IMAGE" | "VIDEO" | "CAROUSEL_ALBUM";
  like_count?: number;
  comments_count?: number;
  timestamp: string;
  permalink?: string;
}

export interface RawBusinessDiscovery {
  username: string;
  name?: string;
  biography?: string;
  followers_count: number;
  media_count: number;
  media?: { data: RawMedia[] };
}

export interface GraphCredentials {
  accessToken: string;
  businessId: string;
}

interface GraphError {
  message?: string;
  code?: number;
}

// Turns the Graph API error into an action the user can take (pt-BR).
export function describeGraphError(error: GraphError | undefined, status: number): string {
  const code = error?.code;
  if (code === 190) {
    return "Token do Instagram expirado ou inválido. Gere um novo (System User ou long-lived) e atualize INSTAGRAM_ACCESS_TOKEN.";
  }
  if (code === 10 || (code !== undefined && code >= 200 && code < 300)) {
    return "Permissão negada pela Meta. Confira se o app está em Live e com Advanced Access (instagram_business_basic e instagram_manage_insights).";
  }
  if (code === 4 || code === 17 || code === 32 || code === 613) {
    return "Limite de chamadas da Instagram Graph API atingido. Tente de novo mais tarde.";
  }
  return error?.message || `Instagram Graph API respondeu ${status}`;
}

async function graphGet<T>(path: string, fields: string, accessToken: string): Promise<T> {
  const url = `https://graph.facebook.com/${GRAPH_VERSION}/${path}?fields=${encodeURIComponent(fields)}&access_token=${encodeURIComponent(accessToken)}`;
  const res = await fetch(url, { cache: "no-store" });
  const json = await res.json();
  if (!res.ok || json.error) throw new Error(describeGraphError(json.error, res.status));
  return json as T;
}

const PROFILE_FIELDS = "username,name,biography,followers_count,media_count";
const MEDIA_FIELDS = "media.limit(25){caption,media_type,like_count,comments_count,timestamp,permalink}";

// `username` must already be validated: it is interpolated into the fields expression.
export async function fetchProfile(
  username: string,
  credentials: GraphCredentials,
  withMedia = true,
): Promise<RawBusinessDiscovery> {
  const fields = `business_discovery.username(${username}){${PROFILE_FIELDS}${withMedia ? `,${MEDIA_FIELDS}` : ""}}`;
  const json = await graphGet<{ business_discovery: RawBusinessDiscovery }>(
    credentials.businessId,
    fields,
    credentials.accessToken,
  );
  return json.business_discovery;
}

// Cheap call used by the settings page to confirm the token still works.
export async function checkConnection(credentials: GraphCredentials): Promise<void> {
  await graphGet(credentials.businessId, "id", credentials.accessToken);
}

// Average likes + comments per post as a percentage of followers.
export function computeEngagementPct(media: RawMedia[], followers: number): number {
  if (!media.length || !followers) return 0;
  const interactions = media.reduce((s, m) => s + (m.like_count ?? 0) + (m.comments_count ?? 0), 0);
  return Number(((interactions / media.length / followers) * 100).toFixed(1));
}
