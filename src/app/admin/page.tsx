import type { Metadata } from "next";
import { AdminAccountsTable } from "@/components/AdminAccountsTable";
import { AppShell } from "@/components/AppShell";
import { PLAN_LABELS, PLANS } from "@/lib/access";
import { getAccountStats, listAccounts } from "@/lib/accounts";
import { getApifyToken } from "@/lib/env";
import { requireAdmin } from "@/lib/viewer";

export const metadata: Metadata = { title: "Admin · Nichemap" };

export default async function AdminPage() {
  const viewer = await requireAdmin();
  const [stats, accounts] = await Promise.all([getAccountStats(), listAccounts()]);
  const cards: [string, number][] = [
    ["Contas", stats.total],
    ...PLANS.map((p): [string, number] => [PLAN_LABELS[p], stats.byPlan[p]]),
    ["Novas em 7 dias", stats.newLast7],
    ["Novas em 30 dias", stats.newLast30],
  ];

  return (
    <AppShell target={viewer.instagramUsername ?? ""} viewer={viewer}>
      <div className="space-y-5 pb-10">
        <h1 className="text-xl font-semibold text-slate-900">Admin</h1>
        <dl className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {cards.map(([label, value]) => (
            <div key={label} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
              <dt className="text-xs text-slate-500">{label}</dt>
              <dd className="text-2xl font-semibold text-slate-900">{value}</dd>
            </div>
          ))}
        </dl>
        <p className="text-sm text-slate-500">
          {getApifyToken() !== null
            ? "Fonte não oficial (chave geral): ligada"
            : "Fonte não oficial (chave geral): desligada — nenhuma conta usa a Apify"}
        </p>
        <AdminAccountsTable
          accounts={accounts.map((a) => ({
            ...a,
            createdAt: a.createdAt.toISOString(),
            lastSeenAt: a.lastSeenAt?.toISOString() ?? null,
          }))}
        />
      </div>
    </AppShell>
  );
}
