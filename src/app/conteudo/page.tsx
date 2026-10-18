import type { Metadata } from "next";
import { AppShell } from "@/components/AppShell";
import { ContentList } from "@/components/ContentList";
import { Section } from "@/components/Section";
import { loadDashboard, type PageSearchParams } from "@/lib/dashboard";

export const metadata: Metadata = { title: "Conteúdo · Nichemap" };

export default async function ConteudoPage({ searchParams }: { searchParams: PageSearchParams }) {
  const result = await loadDashboard(searchParams);
  return (
    <AppShell target={result.target}>
      <Section
        title="Conteúdo"
        description="Publicações mais recentes do perfil (até 25), com curtidas, comentários e desempenho em relação à média."
        result={result}
      >
        {(data) => <ContentList items={data.content} />}
      </Section>
    </AppShell>
  );
}
