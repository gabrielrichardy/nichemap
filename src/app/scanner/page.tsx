import type { Metadata } from "next";
import { AppShell } from "@/components/AppShell";
import { ContentTypeDonut } from "@/components/ContentTypeDonut";
import { KpiCards } from "@/components/KpiCards";
import { ProfileHeader } from "@/components/ProfileHeader";
import { Section } from "@/components/Section";
import { ThemeAnalysis } from "@/components/ThemeAnalysis";
import { loadDashboard, type PageSearchParams } from "@/lib/dashboard";
import { requireViewer } from "@/lib/viewer";

export const metadata: Metadata = { title: "Profile Scanner · Nichemap" };

export default async function ScannerPage({ searchParams }: { searchParams: PageSearchParams }) {
  const viewer = await requireViewer("/scanner");
  const result = await loadDashboard(searchParams, viewer);
  return (
    <AppShell target={result.target} viewer={viewer}>
      <Section
        title="Profile Scanner"
        description="Análise do perfil buscado: indicadores, formatos de conteúdo e temas. Use a busca no topo para escanear outro perfil."
        result={result}
      >
        {(data) => (
          <>
            <ProfileHeader name={data.profile.name} username={data.profile.username} bio={data.profile.bio} />
            <KpiCards kpis={data.kpis} />
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <ContentTypeDonut data={data.contentTypes} total={data.kpis.publicacoes} />
              <ThemeAnalysis themes={data.themes} />
            </div>
          </>
        )}
      </Section>
    </AppShell>
  );
}
