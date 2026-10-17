import { AppShell } from "@/components/AppShell";
import { DashboardClient } from "@/components/DashboardClient";

export default async function Home({ searchParams }: { searchParams: Promise<{ target?: string }> }) {
  const { target: targetParam } = await searchParams;
  const defaultTarget = process.env.INSTAGRAM_TARGET_USERNAME || "biodev";
  const target = targetParam || defaultTarget;

  return (
    <AppShell target={target}>
      {/* key resets loading/error state when the searched profile changes */}
      <DashboardClient key={target} target={target} />
    </AppShell>
  );
}
