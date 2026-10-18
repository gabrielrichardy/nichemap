import type { Metadata } from "next";
import { AppShell } from "@/components/AppShell";
import { KpiCards } from "@/components/KpiCards";
import { PrintButton } from "@/components/PrintButton";
import { Section } from "@/components/Section";
import { ThemeAnalysis } from "@/components/ThemeAnalysis";
import { TopContent } from "@/components/TopContent";
import { loadDashboard, type PageSearchParams } from "@/lib/dashboard";

export const metadata: Metadata = { title: "Relatórios · Nichemap" };

export default async function RelatoriosPage({ searchParams }: { searchParams: PageSearchParams }) {
  const result = await loadDashboard(searchParams);
  return (
    <AppShell target={result.target}>
      <Section title="Relatórios" description="Resumo do perfil pronto para imprimir ou salvar em PDF." result={result}>
        {(data) => (
          <>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">
                  {data.profile.name} <span className="font-normal text-slate-400">@{data.profile.username}</span>
                </h2>
                <p className="text-xs text-slate-500">
                  Gerado em {new Date(data.fetchedAt).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}
                </p>
              </div>
              <PrintButton />
            </div>
            <KpiCards kpis={data.kpis} />
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <TopContent items={data.topContent} />
              <ThemeAnalysis themes={data.themes} />
            </div>
          </>
        )}
      </Section>
    </AppShell>
  );
}
