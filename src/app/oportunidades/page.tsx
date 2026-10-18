import type { Metadata } from "next";
import { AppShell } from "@/components/AppShell";
import { Opportunities } from "@/components/Opportunities";
import { Section } from "@/components/Section";
import { loadDashboard, type PageSearchParams } from "@/lib/dashboard";

export const metadata: Metadata = { title: "Oportunidades · Nichemap" };

export default async function OportunidadesPage({ searchParams }: { searchParams: PageSearchParams }) {
  const result = await loadDashboard(searchParams);
  return (
    <AppShell target={result.target}>
      <Section
        title="Oportunidades"
        description="Empresas e pessoas com maior potencial para o seu negócio. Scoring real pendente (issue #5)."
        result={result}
      >
        {(data) => (
          <Opportunities
            title="Todas as oportunidades"
            items={data.opportunities}
            sample={data.sampleSections.includes("opportunities")}
          />
        )}
      </Section>
    </AppShell>
  );
}
