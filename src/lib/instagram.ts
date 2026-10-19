import "server-only";
import { listLockedUsernames, listUnofficialUsernames } from "./accounts";
import { buildMockData } from "./mockData";
import { getCompetitorUsernames, getInstagramCredentials, isDatabaseConfigured } from "./env";
import { instagramUsernameSchema } from "./env-schema";
import { computeEngagementPct, fetchProfile, type RawBusinessDiscovery, type RawMedia } from "./graph";
import { dayInBrazil, percentChange, summarizeGrowth, withToday, type SnapshotPoint } from "./growth";
import { logger } from "./logger";
import { fetchProfileWithFallback, SourceDisabledError, type ProfileSource } from "./profile-source";
import { computeProfileScore } from "./profileScore";
import { getRecentSnapshots, saveSnapshot } from "./snapshots";
import { extractThemes } from "./themes";
import type { ContentItem, ContentTypeSlice, DashboardData, MarketProfile, Opportunity, SampleSection } from "./types";

export { GRAPH_VERSION } from "./graph";

export const targetUsernameSchema = instagramUsernameSchema;

export const INVALID_TARGET_MESSAGE = "Perfil inválido: use só letras, números, ponto e sublinhado (até 30).";

// Profile to analyse: the ?target value ("@perfil" accepted) or the configured default.
// Lowercased because Instagram usernames are case-insensitive and snapshots are keyed by them.
// Returns null when the username is invalid.
export function resolveTarget(raw?: string | null): string | null {
  const value = (raw || process.env.INSTAGRAM_TARGET_USERNAME || "biodev").trim().replace(/^@/, "").toLowerCase();
  return targetUsernameSchema.safeParse(value).success ? value : null;
}

function mapContentType(mediaType: RawMedia["media_type"]): ContentItem["type"] {
  if (mediaType === "VIDEO") return "Reel";
  if (mediaType === "CAROUSEL_ALBUM") return "Carrossel";
  return "Imagem";
}

function buildContentTypeBreakdown(media: RawMedia[]): ContentTypeSlice[] {
  const colors: Record<string, string> = {
    Reel: "#3B82F6",
    Carrossel: "#8B5CF6",
    Imagem: "#22C55E",
  };
  const counts = new Map<string, number>();
  media.forEach((m) => {
    const type = mapContentType(m.media_type);
    counts.set(type, (counts.get(type) ?? 0) + 1);
  });
  const total = media.length || 1;
  return Array.from(counts.entries()).map(([label, value]) => ({
    label: label === "Reel" ? "Reels" : label === "Carrossel" ? "Carrosséis" : "Imagens",
    value: Math.round((value / total) * 100),
    color: colors[label],
  }));
}

// An invalid INSTAGRAM_COMPETITORS must not take the whole dashboard down.
function competitorsOrNone(): string[] {
  try {
    return getCompetitorUsernames();
  } catch (err) {
    logger.warn({ error: (err as Error).message }, "Ignoring invalid INSTAGRAM_COMPETITORS");
    return [];
  }
}

// History is optional: without a database (or if it fails) the dashboard still works.
async function loadHistory(usernames: string[]): Promise<Map<string, SnapshotPoint[]>> {
  if (!isDatabaseConfigured()) return new Map();
  try {
    return await getRecentSnapshots(usernames);
  } catch (err) {
    logger.warn({ error: (err as Error).message }, "Snapshot history unavailable");
    return new Map();
  }
}

function buildMarket(
  competitors: string[],
  results: PromiseSettledResult<RawBusinessDiscovery>[],
  history: Map<string, SnapshotPoint[]>,
): MarketProfile[] {
  return results
    .flatMap((r, i) => {
      if (r.status === "rejected") {
        logger.warn({ competitor: competitors[i], error: (r.reason as Error)?.message }, "Competitor unavailable");
        return [];
      }
      const oldest = history.get(competitors[i])?.[0];
      return [
        {
          name: r.value.name || `@${r.value.username}`,
          followers: r.value.followers_count,
          growthPct: oldest ? percentChange(r.value.followers_count, oldest.followers) : null,
        },
      ];
    })
    .sort((a, b) => b.followers - a.followers);
}

// Profiles in the niche ranked by real engagement: candidates for partnerships and collabs.
// Score = engagement % x 10, capped at 100 (10% engagement or more scores 100).
export function buildOpportunities(
  competitors: string[],
  results: PromiseSettledResult<RawBusinessDiscovery>[],
  history: Map<string, SnapshotPoint[]>,
): Opportunity[] {
  return results
    .flatMap((r, i) => {
      if (r.status === "rejected") return [];
      const profile = r.value;
      const engagement = computeEngagementPct(profile.media?.data ?? [], profile.followers_count);
      const oldest = history.get(competitors[i])?.[0];
      const growth = oldest ? percentChange(profile.followers_count, oldest.followers) : null;
      const parts = [
        `Engajamento ${engagement.toLocaleString("pt-BR")}%`,
        `${profile.followers_count.toLocaleString("pt-BR")} seguidores`,
        ...(growth !== null ? [`${growth > 0 ? "+" : ""}${growth.toLocaleString("pt-BR")}% no período`] : []),
      ];
      return [
        {
          name: profile.name || `@${profile.username}`,
          type: "Perfil" as const,
          score: Math.min(100, Math.round(engagement * 10)),
          note: parts.join(" · "),
        },
      ];
    })
    .sort((a, b) => b.score - a.score);
}

function buildNote(source: ProfileSource, days: number | null, sampleSections: SampleSection[]): string {
  const history =
    days !== null
      ? `Crescimento real dos últimos ${days} ${days === 1 ? "dia" : "dias"}.`
      : isDatabaseConfigured()
        ? "Histórico de crescimento em coleta: o gráfico aparece a partir do segundo dia."
        : "Sem banco configurado, ainda não há histórico de crescimento.";
  const samples = sampleSections.length ? " Blocos marcados como “Exemplo” ainda não têm fonte real." : "";
  const origin =
    source === "unofficial"
      ? "Perfil e últimos posts vêm de uma fonte não oficial (Apify)."
      : "Perfil, publicações, conteúdos e temas vêm da API do Instagram.";
  return `${origin} ${history}${samples}`;
}

// Why real data is missing: the official source refused a non-business @ with the fallback off, or anything else.
export type DashboardFailure = { failure: "unavailable" | "not_business" };

export interface DashboardOptions {
  // false: no competitor calls at all (plans without Market Radar).
  includeCompetitors?: boolean;
  // false: no full post list (plans without the Conteúdo section).
  includeContent?: boolean;
  // false: return a DashboardFailure instead of sample data when real data is unavailable (customers).
  mockOnFailure?: boolean;
  // true: the main profile may fall back to the unofficial source (never competitors).
  allowUnofficial?: boolean;
}

export function getDashboardData(
  targetUsername: string,
  options?: DashboardOptions & { mockOnFailure?: true },
): Promise<DashboardData>;
export function getDashboardData(
  targetUsername: string,
  options: DashboardOptions,
): Promise<DashboardData | DashboardFailure>;
export async function getDashboardData(
  targetUsername: string,
  { includeCompetitors = true, includeContent = true, mockOnFailure = true, allowUnofficial = false }: DashboardOptions = {},
): Promise<DashboardData | DashboardFailure> {
  try {
    const credentials = getInstagramCredentials();
    if (!credentials) return mockOnFailure ? buildMockData(targetUsername) : { failure: "unavailable" };

    const competitors = includeCompetitors ? competitorsOrNone() : [];
    const [{ profile: data, source }, history, competitorResults] = await Promise.all([
      fetchProfileWithFallback(targetUsername, credentials, { allowUnofficial }),
      loadHistory([targetUsername, ...competitors]),
      Promise.allSettled(competitors.map((c) => fetchProfile(c, credentials))),
    ]);
    const media = data.media?.data ?? [];
    const engajamentoPct = computeEngagementPct(media, data.followers_count);
    const totalLikes = media.reduce((s, m) => s + (m.like_count ?? 0), 0);
    const avgLikes = media.length ? totalLikes / media.length : 0;

    // business_discovery has no view counts, so `views` stays unset for live data.
    const toContentItem = (m: RawMedia): ContentItem => ({
      id: m.id,
      type: mapContentType(m.media_type),
      title: (m.caption ?? "Sem legenda").split("\n")[0].slice(0, 90),
      date: new Date(m.timestamp).toLocaleDateString("pt-BR"),
      likes: m.like_count ?? 0,
      comments: m.comments_count ?? 0,
      multiplier: avgLikes ? Number(((m.like_count ?? 0) / avgLikes).toFixed(1)) : 0,
      permalink: m.permalink,
    });

    const topContent = [...media]
      .sort((a, b) => (b.like_count ?? 0) - (a.like_count ?? 0))
      .slice(0, 5)
      .map(toContentItem);
    const content = includeContent
      ? [...media].sort((a, b) => b.timestamp.localeCompare(a.timestamp)).map(toContentItem)
      : [];

    const profileScore = computeProfileScore({
      engagementPct: engajamentoPct,
      biography: data.biography,
      media,
      now: new Date(),
    });

    const today: SnapshotPoint = {
      takenOn: dayInBrazil(new Date()),
      followers: data.followers_count,
      mediaCount: data.media_count,
      engagementPct: engajamentoPct,
    };
    const summary = summarizeGrowth(withToday(history.get(targetUsername) ?? [], today));

    const mock = buildMockData(targetUsername);
    const sampleSections: SampleSection[] = competitors.length || !includeCompetitors ? [] : ["market", "opportunities"];
    const marketFallback = includeCompetitors ? mock.market : [];
    const opportunitiesFallback = includeCompetitors ? mock.opportunities : [];

    return {
      source,
      fetchedAt: new Date().toISOString(),
      note: buildNote(source, summary?.days ?? null, sampleSections),
      profile: {
        username: data.username,
        name: data.name ?? data.username,
        bio: data.biography ?? "",
      },
      kpis: {
        seguidores: data.followers_count,
        seguidoresGrowthPct: summary?.followersPct ?? 0,
        engajamentoPct,
        engajamentoGrowthPct: summary?.engagementPct ?? 0,
        publicacoes: data.media_count,
        publicacoesGrowthPct: summary?.mediaPct ?? 0,
        profileScore: profileScore.score,
        profileScoreLabel: profileScore.label,
        profileScoreBreakdown: profileScore.breakdown,
        growthLabel: summary ? `em ${summary.days} ${summary.days === 1 ? "dia" : "dias"}` : undefined,
      },
      growth: summary?.growth ?? [],
      contentTypes: buildContentTypeBreakdown(media),
      themes: extractThemes(media.map((m) => m.caption ?? "")),
      market: competitors.length ? buildMarket(competitors, competitorResults, history) : marketFallback,
      topContent,
      content,
      opportunities: competitors.length
        ? buildOpportunities(competitors, competitorResults, history)
        : opportunitiesFallback,
      sampleSections,
    };
  } catch (err) {
    const message = (err as Error).message;
    logger.warn({ target: targetUsername, error: message }, "Instagram data unavailable");
    if (!mockOnFailure) return { failure: err instanceof SourceDisabledError ? "not_business" : "unavailable" };
    const mock = buildMockData(targetUsername);
    mock.note = `Não foi possível buscar dados reais agora (${message}). Mostrando dados de exemplo.`;
    return mock;
  }
}

export interface CollectResult {
  takenOn: string;
  saved: string[];
  failed: { username: string; error: string }[];
}

// Customers' locked profiles (all, or only those opted in to the unofficial source);
// without a database (or on failure) the job tracks the rest on the official source.
async function lockedOrNone(list: () => Promise<string[]> = listLockedUsernames): Promise<string[]> {
  if (!isDatabaseConfigured()) return [];
  try {
    return await list();
  } catch (err) {
    logger.warn({ error: (err as Error).message }, "Locked profiles unavailable for snapshots");
    return [];
  }
}

// Daily job: one snapshot per tracked profile (default target, competitors, customers).
// Only locked profiles of opted-in accounts may use the unofficial source.
export async function collectDailySnapshots(): Promise<CollectResult> {
  const credentials = getInstagramCredentials();
  if (!credentials) throw new Error("Instagram não configurado (INSTAGRAM_ACCESS_TOKEN e INSTAGRAM_BUSINESS_ID).");
  const target = resolveTarget(undefined);
  const [locked, unofficial] = await Promise.all([lockedOrNone(), lockedOrNone(listUnofficialUsernames)]);
  const usernames = [...new Set([...(target ? [target] : []), ...getCompetitorUsernames(), ...locked])];
  const unofficialSet = new Set(unofficial);
  const takenOn = dayInBrazil(new Date());

  const results = await Promise.allSettled(
    usernames.map(async (username) => {
      const { profile } = await fetchProfileWithFallback(username, credentials, {
        allowUnofficial: unofficialSet.has(username),
      });
      await saveSnapshot({
        username,
        takenOn,
        followers: profile.followers_count,
        mediaCount: profile.media_count,
        engagementPct: computeEngagementPct(profile.media?.data ?? [], profile.followers_count),
      });
    }),
  );

  return {
    takenOn,
    saved: usernames.filter((_, i) => results[i].status === "fulfilled"),
    failed: usernames.flatMap((username, i) => {
      const r = results[i];
      return r.status === "rejected" ? [{ username, error: (r.reason as Error)?.message ?? "erro desconhecido" }] : [];
    }),
  };
}
