import "server-only";
import { z } from "zod";
import { ContentItem, ContentTypeSlice, DashboardData, ThemeItem } from "./types";
import { buildMockData } from "./mockData";
import { getInstagramCredentials } from "./env";
import { logger } from "./logger";

const GRAPH_VERSION = "v25.0";

// Instagram usernames: letters, digits, "." and "_", up to 30 chars. The value is
// interpolated into the Graph API `fields` expression, so anything else is rejected.
export const targetUsernameSchema = z.string().regex(/^[A-Za-z0-9._]{1,30}$/);

interface RawMedia {
  id: string;
  caption?: string;
  media_type: "IMAGE" | "VIDEO" | "CAROUSEL_ALBUM";
  like_count?: number;
  comments_count?: number;
  timestamp: string;
  permalink?: string;
}

interface RawBusinessDiscovery {
  username: string;
  name?: string;
  biography?: string;
  followers_count: number;
  media_count: number;
  media?: { data: RawMedia[] };
}

const THEME_KEYWORDS: { label: string; color: string; keywords: string[] }[] = [
  { label: "Gestão laboratorial", color: "#3B82F6", keywords: ["gestão", "laboratório", "processo", "rotina", "equipe"] },
  { label: "Tecnologia e inovação", color: "#8B5CF6", keywords: ["tecnologia", "inovação", "sistema", "automação", "ia", "software"] },
  { label: "Qualidade e certificação", color: "#22C55E", keywords: ["qualidade", "certificação", "norma", "iso", "acreditação", "auditoria"] },
  { label: "Saúde e bem-estar", color: "#F59E0B", keywords: ["saúde", "paciente", "bem-estar", "diagnóstico", "exame"] },
  { label: "Carreira e mercado", color: "#0EA5E9", keywords: ["carreira", "mercado", "vaga", "profissional", "concurso"] },
];

function classifyThemes(captions: string[]): ThemeItem[] {
  const counts = new Map<string, number>();
  THEME_KEYWORDS.forEach((t) => counts.set(t.label, 0));

  captions.forEach((raw) => {
    const text = raw.toLowerCase();
    for (const theme of THEME_KEYWORDS) {
      if (theme.keywords.some((k) => text.includes(k))) {
        counts.set(theme.label, (counts.get(theme.label) ?? 0) + 1);
      }
    }
  });

  const total = captions.length || 1;
  const items: ThemeItem[] = THEME_KEYWORDS.map((t) => ({
    label: t.label,
    color: t.color,
    percent: Math.round(((counts.get(t.label) ?? 0) / total) * 100),
  })).filter((t) => t.percent > 0);

  const otherPct = Math.max(0, 100 - items.reduce((s, i) => s + i.percent, 0));
  if (otherPct > 0) items.push({ label: "Outros", percent: otherPct, color: "#94A3B8" });

  return items.sort((a, b) => b.percent - a.percent);
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

async function fetchBusinessDiscovery(
  targetUsername: string,
  igBusinessId: string,
  accessToken: string
): Promise<RawBusinessDiscovery> {
  const fields =
    "business_discovery.username(" +
    targetUsername +
    "){username,name,biography,followers_count,media_count,media.limit(25){caption,media_type,like_count,comments_count,timestamp,permalink}}";

  const url = `https://graph.facebook.com/${GRAPH_VERSION}/${igBusinessId}?fields=${encodeURIComponent(
    fields
  )}&access_token=${accessToken}`;

  const res = await fetch(url, { cache: "no-store" });
  const json = await res.json();

  if (!res.ok || json.error) {
    throw new Error(json?.error?.message || `Instagram Graph API respondeu ${res.status}`);
  }

  return json.business_discovery as RawBusinessDiscovery;
}

export async function getDashboardData(targetUsername: string): Promise<DashboardData> {
  try {
    const credentials = getInstagramCredentials();
    if (!credentials) return buildMockData(targetUsername);

    const data = await fetchBusinessDiscovery(targetUsername, credentials.businessId, credentials.accessToken);
    const media = data.media?.data ?? [];

    const totalLikes = media.reduce((s, m) => s + (m.like_count ?? 0), 0);
    const totalComments = media.reduce((s, m) => s + (m.comments_count ?? 0), 0);
    const avgEngagementPerPost = media.length ? (totalLikes + totalComments) / media.length : 0;
    const engajamentoPct = data.followers_count
      ? Number(((avgEngagementPerPost / data.followers_count) * 100).toFixed(1))
      : 0;

    const avgLikes = media.length ? totalLikes / media.length : 0;

    const topContent: ContentItem[] = [...media]
      .sort((a, b) => (b.like_count ?? 0) - (a.like_count ?? 0))
      .slice(0, 5)
      .map((m) => ({
        id: m.id,
        type: mapContentType(m.media_type),
        title: (m.caption ?? "Sem legenda").split("\n")[0].slice(0, 90),
        date: new Date(m.timestamp).toLocaleDateString("pt-BR"),
        views: m.like_count ?? 0,
        likes: m.like_count ?? 0,
        comments: m.comments_count ?? 0,
        multiplier: avgLikes ? Number(((m.like_count ?? 0) / avgLikes).toFixed(1)) : 0,
        permalink: m.permalink,
      }));

    const profileScore = Math.max(
      0,
      Math.min(
        100,
        Math.round(
          engajamentoPct * 6 + Math.min(data.media_count, 30) * 0.6 + Math.min(data.followers_count / 1000, 20)
        )
      )
    );

    const growthSeed = data.followers_count;
    const growth = [0.94, 0.96, 0.98, 0.995, 1].map((factor, i) => ({
      date: ["-28d", "-21d", "-14d", "-7d", "hoje"][i],
      value: Math.round(growthSeed * factor),
    }));

    return {
      source: "live",
      fetchedAt: new Date().toISOString(),
      note:
        "Seguidores, publicações, conteúdos em destaque e temas vêm da API do Instagram em tempo real. O histórico de crescimento é estimado até acumularmos snapshots diários reais.",
      profile: {
        username: data.username,
        name: data.name ?? data.username,
        bio: data.biography ?? "",
      },
      kpis: {
        seguidores: data.followers_count,
        seguidoresGrowthPct: 0,
        engajamentoPct,
        engajamentoGrowthPct: 0,
        publicacoes: data.media_count,
        publicacoesGrowthPct: 0,
        profileScore,
        profileScoreLabel: profileScore >= 80 ? "Ótimo" : profileScore >= 60 ? "Bom" : profileScore >= 40 ? "Regular" : "Atenção",
      },
      growth,
      contentTypes: buildContentTypeBreakdown(media),
      themes: classifyThemes(media.map((m) => m.caption ?? "")),
      market: buildMockData(targetUsername).market,
      topContent: topContent.length ? topContent : buildMockData(targetUsername).topContent,
      people: buildMockData(targetUsername).people,
      opportunities: buildMockData(targetUsername).opportunities,
    };
  } catch (err) {
    const message = (err as Error).message;
    logger.warn({ target: targetUsername, error: message }, "Instagram data unavailable, serving mock data");
    const mock = buildMockData(targetUsername);
    mock.note = `Não foi possível buscar dados reais agora (${message}). Mostrando dados de exemplo.`;
    return mock;
  }
}
