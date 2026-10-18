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
        description="Perfis do mercado com seguidores e crescimento. Ainda sem fonte real de dados (issue #3)."
        result={result}
      >
        {(data) => <MarketTable market={data.market} />}
      </Section>
    </AppShell>
  );
}
