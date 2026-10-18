import type { Metadata } from "next";
import { AppShell } from "@/components/AppShell";
import { MarketTable } from "@/components/MarketTable";
import { Opportunities } from "@/components/Opportunities";
import { Section } from "@/components/Section";
import { loadDashboard, type PageSearchParams } from "@/lib/dashboard";

export const metadata: Metadata = { title: "Empresas · Nichemap" };

export default async function EmpresasPage({ searchParams }: { searchParams: PageSearchParams }) {
  const result = await loadDashboard(searchParams);
  return (
    <AppShell target={result.target}>
      <Section
        title="Empresas"
        description="Empresas do mercado e oportunidades com empresas. Ainda sem fontes reais (issues #3 e #5)."
        result={result}
      >
        {(data) => (
          <div className="grid grid-cols-1 gap-4">
            <MarketTable market={data.market} />
            <Opportunities
              title="Oportunidades com empresas"
              items={data.opportunities.filter((o) => o.type === "Empresa")}
            />
          </div>
        )}
      </Section>
    </AppShell>
  );
}
