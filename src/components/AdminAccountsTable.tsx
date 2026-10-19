"use client";

import type { FormEvent } from "react";
import { changePlan, unlockAccountProfile } from "@/app/admin/actions";
import { PLAN_LABELS, PLANS, type Plan } from "@/lib/access";
import type { Cycle } from "@/lib/billing-plans";
import { isPlanLockedBy, type BillingStatus } from "@/lib/billing-rules";

export interface AdminAccount {
  id: string;
  name: string;
  email: string;
  instagramUsername: string | null;
  plan: Plan;
  complimentary: boolean;
  createdAt: string;
  lastSeenAt: string | null;
  billingStatus: BillingStatus | null;
  cycle: Cycle | null;
  periodEnd: string | null;
  asaasPanelUrl: string | null;
}

const BILLING_LABELS: Record<BillingStatus, string> = {
  pending: "Aguardando pagamento",
  active: "Ativa",
  overdue: "Pagamento pendente",
  suspended: "Rebaixada por atraso",
  canceled: "Cancelada",
  ended: "Encerrada",
};
const CYCLE_LABELS: Record<Cycle, string> = { monthly: "Mensal", yearly: "Anual" };

const date = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString("pt-BR") : "—");

function billingLine(a: AdminAccount): string {
  if (!a.billingStatus) return "Sem assinatura";
  if (a.billingStatus === "canceled") return `Cancelada, ativa até ${date(a.periodEnd)}`;
  return BILLING_LABELS[a.billingStatus];
}

function confirmPlan(name: string) {
  return (e: FormEvent<HTMLFormElement>) => {
    const data = new FormData(e.currentTarget);
    const plan = data.get("plan") as Plan;
    const cortesia = data.get("complimentary") === "on" ? " (cortesia)" : "";
    if (!window.confirm(`Mudar o plano de ${name} para ${PLAN_LABELS[plan]}${cortesia}?`)) e.preventDefault();
  };
}

function confirmUnlock(name: string) {
  return (e: FormEvent<HTMLFormElement>) => {
    if (!window.confirm(`Destravar o perfil de ${name}? Ele vai escolher um @ de novo no próximo acesso.`)) e.preventDefault();
  };
}

// One card per account: stacks on phones, row-like grid from lg.
export function AdminAccountsTable({ accounts }: { accounts: AdminAccount[] }) {
  if (!accounts.length) return <p className="text-sm text-slate-500">Nenhuma conta ainda.</p>;
  return (
    <ul className="space-y-3">
      {accounts.map((a) => {
        const locked = isPlanLockedBy(a.billingStatus);
        return (
          <li
            key={a.id}
            className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 grid gap-3 lg:grid-cols-[2fr_1.4fr_1.2fr_auto] lg:items-center text-sm"
          >
            <div className="min-w-0">
              <p className="font-medium text-slate-900 truncate">{a.name}</p>
              <p className="text-slate-500 break-all">{a.email}</p>
              <p className="text-slate-500">{a.instagramUsername ? `@${a.instagramUsername}` : "Perfil não travado"}</p>
              {a.asaasPanelUrl && (
                <a
                  href={a.asaasPanelUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-slate-700 underline underline-offset-2"
                >
                  Abrir no Asaas
                </a>
              )}
            </div>
            <dl className="text-xs text-slate-500 space-y-0.5">
              <div>
                <dt className="inline">Cadastro: </dt>
                <dd className="inline">{date(a.createdAt)}</dd>
              </div>
              <div>
                <dt className="inline">Último acesso: </dt>
                <dd className="inline">{date(a.lastSeenAt)}</dd>
              </div>
              <div>
                <dt className="inline">Assinatura: </dt>
                <dd className="inline">{billingLine(a)}</dd>
              </div>
              {a.cycle && (
                <div>
                  <dt className="inline">Ciclo: </dt>
                  <dd className="inline">{CYCLE_LABELS[a.cycle]}</dd>
                </div>
              )}
              {a.periodEnd && a.billingStatus !== "canceled" && (
                <div>
                  <dt className="inline">Pago até: </dt>
                  <dd className="inline">{date(a.periodEnd)}</dd>
                </div>
              )}
            </dl>
            {/* Keyed by plan and cortesia: React resets the form after the action, so it must remount with the saved values. */}
            <div className="space-y-1">
              <form
                key={`${a.plan}-${a.complimentary}`}
                action={changePlan}
                onSubmit={confirmPlan(a.name)}
                className="flex flex-wrap gap-2 items-center"
              >
                <input type="hidden" name="userId" value={a.id} />
                <label className="sr-only" htmlFor={`plan-${a.id}`}>
                  Plano de {a.name}
                </label>
                <select
                  id={`plan-${a.id}`}
                  name="plan"
                  defaultValue={a.plan}
                  disabled={locked}
                  className="rounded-lg border border-slate-200 px-2 py-1.5 text-sm bg-white disabled:opacity-60"
                >
                  {PLANS.map((p) => (
                    <option key={p} value={p}>
                      {PLAN_LABELS[p]}
                    </option>
                  ))}
                </select>
                <label className="flex items-center gap-1.5 text-xs text-slate-700">
                  <input
                    type="checkbox"
                    name="complimentary"
                    defaultChecked={a.complimentary}
                    disabled={locked}
                    className="rounded border-slate-300"
                  />
                  Cortesia (nunca cobra)
                </label>
                <button
                  type="submit"
                  disabled={locked}
                  className="rounded-lg bg-slate-900 text-white px-3 py-1.5 text-xs font-medium disabled:opacity-50"
                >
                  Salvar
                </button>
              </form>
              {locked && <p className="text-xs text-amber-700">Plano controlado pela assinatura</p>}
            </div>
            {a.instagramUsername ? (
              <form action={unlockAccountProfile} onSubmit={confirmUnlock(a.name)}>
                <input type="hidden" name="userId" value={a.id} />
                <button type="submit" className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50">
                  Destravar perfil
                </button>
              </form>
            ) : (
              <span aria-hidden="true" />
            )}
          </li>
        );
      })}
    </ul>
  );
}
