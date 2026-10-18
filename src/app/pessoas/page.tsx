import type { Metadata } from "next";
import { AppShell } from "@/components/AppShell";
import { RelevantPeople } from "@/components/RelevantPeople";
import { Section } from "@/components/Section";
import { loadDashboard, type PageSearchParams } from "@/lib/dashboard";

export const metadata: Metadata = { title: "Pessoas · Nichemap" };

export default async function PessoasPage({ searchParams }: { searchParams: PageSearchParams }) {
  const result = await loadDashboard(searchParams);
  return (
    <AppShell target={result.target}>
      <Section
        title="Pessoas"
        description="Pessoas relevantes no nicho, com cargo e score. Ainda sem fonte real de dados (issue #4)."
        result={result}
      >
        {(data) => <RelevantPeople people={data.people} sample={data.sampleSections.includes("people")} />}
      </Section>
    </AppShell>
  );
}
