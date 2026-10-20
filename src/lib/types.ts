export interface Kpis {
  seguidores: number;
  seguidoresGrowthPct: number;
  engajamentoPct: number;
  engajamentoGrowthPct: number;
  publicacoes: number;
  publicacoesGrowthPct: number;
  profileScore: number;
  profileScoreLabel: string;
  profileScoreBreakdown: ScoreCriterion[]; // what makes up the score, with tips where points were lost
  growthLabel?: string; // comparison window shown next to growth percentages
}

export interface ScoreCriterion {
  label: string;
  points: number;
  max: number;
  detail: string; // the measured value behind the points
  tip?: string; // what to improve; only when points < max
}

export interface GrowthPoint {
  date: string;
  value: number;
}

export interface ContentTypeSlice {
  label: string;
  value: number;
  color: string;
}

export interface ThemeItem {
  label: string;
  percent: number;
  color: string;
}

export interface MarketProfile {
  name: string;
  followers: number;
  growthPct: number | null; // null until there is snapshot history
}

export interface ContentItem {
  id: string;
  type: "Reel" | "Carrossel" | "Imagem";
  title: string;
  date: string;
  views?: number; // not available from business_discovery (live data)
  likes: number;
  comments: number;
  multiplier: number;
  permalink?: string;
}

export interface Opportunity {
  name: string;
  type: "Empresa" | "Pessoa" | "Perfil";
  score: number;
  note: string;
}

// Blocks that still show sample data even when the profile itself is live.
export type SampleSection = "market" | "opportunities";

export interface DashboardData {
  source: "live" | "mock" | "unofficial";
  fetchedAt: string;
  note?: string;
  profile: {
    username: string;
    name: string;
    bio: string;
  };
  kpis: Kpis;
  growth: GrowthPoint[];
  contentTypes: ContentTypeSlice[];
  themes: ThemeItem[];
  market: MarketProfile[];
  topContent: ContentItem[];
  content: ContentItem[]; // every fetched post, newest first
  opportunities: Opportunity[];
  sampleSections: SampleSection[];
}
