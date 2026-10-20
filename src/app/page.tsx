import { AppShell } from "@/components/AppShell";
import { DashboardClient } from "@/components/DashboardClient";
import { canSeeCompetitors } from "@/lib/access";
import { Landing } from "@/components/Landing";
import { getSupportLink } from "@/lib/env";
import { getViewer, requireViewer, targetFor } from "@/lib/viewer";

export default async function Home({ searchParams }: { searchParams: Promise<{ target?: string }> }) {
  // Visitors without a session see the public landing page; logged-in users keep the dashboard rules.
  if (!(await getViewer())) return <Landing whatsapp={getSupportLink()} />;
  const viewer = await requireViewer("/");
  const { target: targetParam } = await searchParams;
  // Customers: their locked @. Admins: ?target or the default profile (invalid → raw value, the API answers 400).
  const target = targetFor(viewer, targetParam) ?? targetParam ?? "";

  return (
    <AppShell target={target} viewer={viewer}>
      {/* key resets loading/error state when the searched profile changes */}
      <DashboardClient key={target} target={target} showCompetitors={canSeeCompetitors(viewer)} />
    </AppShell>
  );
}
