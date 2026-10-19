import type { ScoreCriterion } from "./types";

// Fields of a post the score needs (a subset of the Graph API media object).
export interface ScoredMedia {
  caption?: string;
  media_type: "IMAGE" | "VIDEO" | "CAROUSEL_ALBUM";
  timestamp: string;
}

export interface ProfileScoreInput {
  engagementPct: number;
  biography?: string;
  media: ScoredMedia[]; // the most recent posts fetched (up to 25)
  now: Date;
}

// Reference values: ~3% engagement is a healthy average on Instagram; 12 posts a month is 3 a week.
const ENGAGEMENT_TARGET_PCT = 3;
const POSTS_PER_MONTH_TARGET = 12;
const DAY_MS = 24 * 60 * 60 * 1000;

const FORMAT_NAMES: Record<ScoredMedia["media_type"], string> = {
  VIDEO: "Reels",
  CAROUSEL_ALBUM: "carrosséis",
  IMAGE: "imagens",
};

const ratio = (value: number, target: number) => Math.max(0, Math.min(1, value / target));

// Four criteria of 25 points each. A criterion below its maximum carries a tip on what to improve.
export function computeProfileScore({ engagementPct, biography, media, now }: ProfileScoreInput): {
  score: number;
  label: string;
  breakdown: ScoreCriterion[];
} {
  const engagement = Math.round(25 * ratio(engagementPct, ENGAGEMENT_TARGET_PCT));

  const recentPosts = media.filter((m) => now.getTime() - new Date(m.timestamp).getTime() <= 30 * DAY_MS).length;
  const frequency = Math.round(25 * ratio(recentPosts, POSTS_PER_MONTH_TARGET));

  const formatsUsed = new Set(media.map((m) => m.media_type));
  const missingFormats = (Object.keys(FORMAT_NAMES) as ScoredMedia["media_type"][]).filter((t) => !formatsUsed.has(t));
  const formats = Math.round((25 * formatsUsed.size) / 3);

  const hasBio = Boolean(biography?.trim());
  const captioned = media.filter((m) => m.caption?.trim()).length;
  const captionShare = media.length ? captioned / media.length : 0;
  const completeness = (hasBio ? 12 : 0) + Math.round(13 * captionShare);

  const pct = (value: number) => value.toLocaleString("pt-BR");
  const breakdown: ScoreCriterion[] = [
    {
      label: "Engajamento",
      points: engagement,
      max: 25,
      detail: `${pct(engagementPct)}% de curtidas e comentários por seguidor (referência: ${ENGAGEMENT_TARGET_PCT}%)`,
      tip:
        engagement < 25
          ? "Termine as legendas com uma pergunta ou chamada para comentar e responda os comentários nas primeiras horas."
          : undefined,
    },
    {
      label: "Frequência",
      points: frequency,
      max: 25,
      detail: `${recentPosts} ${recentPosts === 1 ? "publicação" : "publicações"} nos últimos 30 dias (referência: ${POSTS_PER_MONTH_TARGET})`,
      tip:
        frequency < 25
          ? `Publique com regularidade: cerca de 3 vezes por semana. Faltaram ${POSTS_PER_MONTH_TARGET - Math.min(recentPosts, POSTS_PER_MONTH_TARGET)} no último mês.`
          : undefined,
    },
    {
      label: "Variedade de formatos",
      points: formats,
      max: 25,
      detail: formatsUsed.size
        ? `Usa ${[...formatsUsed].map((t) => FORMAT_NAMES[t]).join(", ")} nas publicações recentes`
        : "Nenhuma publicação recente",
      tip: missingFormats.length
        ? `Teste ${missingFormats.map((t) => FORMAT_NAMES[t]).join(" e ")}: cada formato alcança o público de um jeito.`
        : undefined,
    },
    {
      label: "Perfil e legendas",
      points: completeness,
      max: 25,
      detail: `${hasBio ? "Bio preenchida" : "Sem bio"} · ${captioned} de ${media.length} publicações com legenda`,
      tip:
        completeness < 25
          ? [
              !hasBio && "Escreva uma bio dizendo o que você faz e para quem.",
              captionShare < 1 && "Coloque legenda em todas as publicações: ela ajuda a busca e o engajamento.",
            ]
              .filter(Boolean)
              .join(" ")
          : undefined,
    },
  ];

  const score = breakdown.reduce((s, c) => s + c.points, 0);
  const label = score >= 80 ? "Ótimo" : score >= 60 ? "Bom" : score >= 40 ? "Regular" : "Atenção";
  return { score, label, breakdown };
}
