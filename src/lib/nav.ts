// Sections reachable from the sidebar and the mobile menu.
export const MAIN_SECTIONS = [
  { href: "/", label: "Dashboard" },
  { href: "/scanner", label: "Profile Scanner" },
  { href: "/conteudo", label: "Conteúdo" },
  { href: "/mercado", label: "Market Radar" },
  { href: "/pessoas", label: "Pessoas" },
  { href: "/empresas", label: "Empresas" },
  { href: "/oportunidades", label: "Oportunidades" },
] as const;

export const SECONDARY_SECTIONS = [
  { href: "/relatorios", label: "Relatórios" },
  { href: "/configuracoes", label: "Configurações" },
] as const;

export type SectionHref = (typeof MAIN_SECTIONS)[number]["href"] | (typeof SECONDARY_SECTIONS)[number]["href"];

// Keeps the analysed profile when moving between sections.
export function withTarget(href: SectionHref, target: string) {
  return `${href}?target=${encodeURIComponent(target)}`;
}
