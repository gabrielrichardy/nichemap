import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { AppShell } from "@/components/AppShell";
import { DeleteAccountButton } from "@/components/DeleteAccountButton";
import { SignOutButton } from "@/components/SignOutButton";
import { SubscriptionPanel } from "@/components/SubscriptionPanel";
import { PLAN_LABELS } from "@/lib/access";
import { getViewerBilling, type BillingSummary } from "@/lib/billing";
import { getSupportLink } from "@/lib/env";
import { requireViewer, type Viewer } from "@/lib/viewer";

export const metadata: Metadata = { title: "Minha conta · Nichemap" };

const fullDate = (date: Date) => date.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });

// Statuses where the customer still has something to pay or cancel.
const OPEN = new Set<BillingSummary["status"]>(["pending", "active", "overdue", "suspended"]);

function statusLines(s: BillingSummary): string[] {
  switch (s.status) {
    case "pending":
      return ["Aguardando pagamento"];
    case "active": {
      const lines = [s.periodEnd ? `Ativa — renova em ${fullDate(s.periodEnd)}` : "Ativa"];
      if (s.scheduledPlan && s.scheduledPlan !== s.plan && s.periodEnd) {
        lines.push(`Muda para ${PLAN_LABELS[s.scheduledPlan]} em ${fullDate(s.periodEnd)}`);
      }
      return lines;
    }
    case "overdue":
    case "suspended":
      return ["Pagamento pendente"];
    case "canceled":
      return [s.periodEnd ? `Cancelada — ativa até ${fullDate(s.periodEnd)}` : "Cancelada"];
    case "ended":
      return [];
  }
}

function PlanValue({ viewer, billing }: { viewer: Viewer; billing: BillingSummary | null }): ReactNode {
  if (viewer.isAdmin) return "Administrador";
  if (viewer.complimentary) return `${PLAN_LABELS[viewer.plan]} — cortesia`;
  if (!billing || billing.status === "ended") return PLAN_LABELS[viewer.plan];
  // The invoice link is stale outside these statuses (the charge was paid or closed).
  const payUrl = billing.status === "pending" || billing.status === "overdue" || billing.status === "suspended" ? billing.invoiceUrl : null;
  return (
    <span className="flex flex-col gap-1 sm:items-end">
      <span>{PLAN_LABELS[billing.plan]}</span>
      {statusLines(billing).map((line) => (
        <span key={line} className="text-slate-600">
          {line}
        </span>
      ))}
      {payUrl && (
        <a href={payUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">
          Pagar
        </a>
      )}
    </span>
  );
}

export default async function ContaPage() {
  const viewer = await requireViewer("/conta");
  const billing = viewer.complimentary ? null : await getViewerBilling(viewer);
  const whatsapp = getSupportLink();
  const rows: [string, ReactNode][] = [
    ["Nome", viewer.name],
    ["E-mail", viewer.email],
    ["Perfil do Instagram", viewer.instagramUsername ? `@${viewer.instagramUsername}` : "Não escolhido"],
    ["Plano", <PlanValue key="plan" viewer={viewer} billing={billing} />],
  ];

  return (
    <AppShell target={viewer.instagramUsername ?? ""} viewer={viewer}>
      <div className="space-y-4 pb-10 max-w-xl">
        <h1 className="text-xl font-semibold text-slate-900">Minha conta</h1>
        <dl className="bg-white rounded-2xl border border-slate-100 shadow-sm divide-y divide-slate-100">
          {rows.map(([label, value]) => (
            <div key={label} className="flex flex-col sm:flex-row sm:justify-between gap-1 px-5 py-3 text-sm">
              <dt className="text-slate-500">{label}</dt>
              <dd className="text-slate-900 break-all sm:text-right">{value}</dd>
            </div>
          ))}
        </dl>
        {billing && OPEN.has(billing.status) && (
          <SubscriptionPanel
            status={billing.status}
            plan={billing.plan}
            scheduledPlan={billing.scheduledPlan}
            periodEnd={billing.periodEnd}
          />
        )}
        {!viewer.isAdmin && !viewer.complimentary && (!billing || !OPEN.has(billing.status)) && (
          <Link href="/plano" className="inline-block text-sm text-blue-600 underline">
            Ver planos
          </Link>
        )}
        {whatsapp && (
          <a href={whatsapp} target="_blank" rel="noopener noreferrer" className="block text-sm text-blue-600 underline">
            Falar com o suporte no WhatsApp
          </a>
        )}
        <div className="flex flex-wrap gap-2">
          <SignOutButton />
          <DeleteAccountButton />
        </div>
      </div>
    </AppShell>
  );
}
