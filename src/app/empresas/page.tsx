import type { Metadata } from "next";
import { AppShell } from "@/components/AppShell";
import { MarketTable } from "@/components/MarketTable";
import { Opportunities } from "@/components/Opportunities";
import { Section } from "@/components/Section";
import { loadDashboard, type PageSearchParams } from "@/lib/dashboard";
import { requireViewer } from "@/lib/viewer";

export const metadata: Metadata = { title: "Empresas · Nichemap" };

export default async function EmpresasPage({ searchParams }: { searchParams: PageSearchParams }) {
  const result = await loadDashboard(searchParams, await requireViewer("/empresas"));
  return (
    <AppShell target={result.target}>
      <Section
        title="Empresas"
        description="Perfis concorrentes (INSTAGRAM_COMPETITORS) com seguidores, crescimento e engajamento reais."
        result={result}
      >
        {(data) => (
          <div className="grid grid-cols-1 gap-4">
            <MarketTable market={data.market} sample={data.sampleSections.includes("market")} />
            <Opportunities
              title="Oportunidades no mercado"
              items={data.opportunities.filter((o) => o.type !== "Pessoa")}
              sample={data.sampleSections.includes("opportunities")}
            />
          </div>
        )}
      </Section>
    </AppShell>
  );
}
