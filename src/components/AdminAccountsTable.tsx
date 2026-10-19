"use client";

import type { FormEvent } from "react";
import { changePlan, unlockAccountProfile } from "@/app/admin/actions";
import { PLAN_LABELS, PLANS, type Plan } from "@/lib/access";

export interface AdminAccount {
  id: string;
  name: string;
  email: string;
  instagramUsername: string | null;
  plan: Plan;
  createdAt: string;
  lastSeenAt: string | null;
}

const date = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString("pt-BR") : "—");

function confirmPlan(name: string) {
  return (e: FormEvent<HTMLFormElement>) => {
    const plan = new FormData(e.currentTarget).get("plan") as Plan;
    if (!window.confirm(`Mudar o plano de ${name} para ${PLAN_LABELS[plan]}?`)) e.preventDefault();
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
      {accounts.map((a) => (
        <li
          key={a.id}
          className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 grid gap-3 lg:grid-cols-[2fr_1fr_1fr_auto] lg:items-center text-sm"
        >
          <div className="min-w-0">
            <p className="font-medium text-slate-900 truncate">{a.name}</p>
            <p className="text-slate-500 break-all">{a.email}</p>
            <p className="text-slate-500">{a.instagramUsername ? `@${a.instagramUsername}` : "Perfil não travado"}</p>
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
          </dl>
          <form action={changePlan} onSubmit={confirmPlan(a.name)} className="flex gap-2 items-center">
            <input type="hidden" name="userId" value={a.id} />
            <label className="sr-only" htmlFor={`plan-${a.id}`}>
              Plano de {a.name}
            </label>
            <select
              id={`plan-${a.id}`}
              name="plan"
              defaultValue={a.plan}
              className="rounded-lg border border-slate-200 px-2 py-1.5 text-sm bg-white"
            >
              {PLANS.map((p) => (
                <option key={p} value={p}>
                  {PLAN_LABELS[p]}
                </option>
              ))}
            </select>
            <button type="submit" className="rounded-lg bg-slate-900 text-white px-3 py-1.5 text-xs font-medium">
              Salvar
            </button>
          </form>
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
      ))}
    </ul>
  );
}
