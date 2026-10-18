import type { Metadata } from "next";
import { AppShell } from "@/components/AppShell";
import { MarketTable } from "@/components/MarketTable";
import { Section } from "@/components/Section";
import { loadDashboard, type PageSearchParams } from "@/lib/dashboard";

export const metadata: Metadata = { title: "Market Radar · Nichemap" };

export default async function MercadoPage({ searchParams }: { searchParams: PageSearchParams }) {
  const result = await loadDashboard(searchParams);
  return (
    <AppShell target={result.target}>
      <Section
        title="Market Radar"
        description="Concorrentes definidos em INSTAGRAM_COMPETITORS, com seguidores reais e crescimento a partir da coleta diária. Sem concorrentes configurados, mostra dados de exemplo."
        result={result}
      >
        {(data) => <MarketTable market={data.market} sample={data.sampleSections.includes("market")} />}
      </Section>
    </AppShell>
  );
}
