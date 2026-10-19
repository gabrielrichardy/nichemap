import type { Metadata } from "next";
import { AppShell } from "@/components/AppShell";
import { Opportunities } from "@/components/Opportunities";
import { Section } from "@/components/Section";
import { loadDashboard, type PageSearchParams } from "@/lib/dashboard";
import { requireViewer } from "@/lib/viewer";

export const metadata: Metadata = { title: "Oportunidades · Nichemap" };

export default async function OportunidadesPage({ searchParams }: { searchParams: PageSearchParams }) {
  const viewer = await requireViewer("/oportunidades");
  const result = await loadDashboard(searchParams, viewer);
  return (
    <AppShell target={result.target} viewer={viewer}>
      <Section
        title="Oportunidades"
        description="Concorrentes ranqueados pelo engajamento real (score = engajamento × 10, máx. 100). Sem concorrentes configurados, mostra dados de exemplo."
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
