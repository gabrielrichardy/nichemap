"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import { PLAN_LABELS, PLANS, type Plan } from "@/lib/access";
import { PRICES, formatBRL, isPaidPlan, type Cycle, type PaidPlan } from "@/lib/billing-plans";
import { cn } from "@/lib/utils";
import { CheckoutForm } from "./CheckoutForm";

// Same table as PRODUCT.md: each plan includes everything of the plans before it.
const INCLUDES: Record<Plan, string[]> = {
  basico: ["Dashboard: perfil, KPIs, profile score, destaques, crescimento, tipos e temas", "Profile Scanner"],
  intermediario: ["Tudo do Básico", "Conteúdo", "Relatórios"],
  completo: ["Tudo do Intermediário", "Market Radar", "Empresas", "Oportunidades", "Bloco de mercado no Dashboard"],
};

const CYCLES: { value: Cycle; label: string }[] = [
  { value: "monthly", label: "Mensal" },
  { value: "yearly", label: "Anual" },
];

function Price({ plan, cycle }: { plan: Plan; cycle: Cycle }) {
  if (!isPaidPlan(plan)) return <p className="text-2xl font-semibold text-slate-900">Grátis</p>;
  return (
    <p className="text-2xl font-semibold text-slate-900">
      {formatBRL(PRICES[plan][cycle])}
      <span className="text-sm font-normal text-slate-500">{cycle === "monthly" ? " /mês" : " /ano"}</span>
    </p>
  );
}

export function PlanCards({ currentPlan, canSubscribe }: { currentPlan: Plan; canSubscribe: boolean }) {
  const [cycle, setCycle] = useState<Cycle>("monthly");
  const [chosen, setChosen] = useState<PaidPlan | null>(null);

  return (
    <div className="space-y-4">
      <div role="group" aria-label="Ciclo de cobrança" className="inline-flex rounded-xl border border-slate-200 bg-white p-1">
        {CYCLES.map((c) => (
          <button
            key={c.value}
            type="button"
            aria-pressed={cycle === c.value}
            onClick={() => setCycle(c.value)}
            className={cn(
              "rounded-lg px-4 py-1.5 text-sm",
              cycle === c.value ? "bg-blue-600 text-white" : "text-slate-600 hover:bg-slate-50",
            )}
          >
            {c.label}
          </button>
        ))}
      </div>
      {cycle === "yearly" && <p className="text-sm text-slate-600">No anual, 2 meses saem de graça.</p>}

      <ul className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {PLANS.map((plan) => {
          const current = plan === currentPlan;
          return (
            <li
              key={plan}
              className={cn(
                "flex flex-col gap-3 rounded-2xl border bg-white p-5 shadow-sm",
                current ? "border-blue-500 ring-1 ring-blue-500" : "border-slate-100",
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <h2 className="font-semibold text-slate-900">{PLAN_LABELS[plan]}</h2>
                {current && <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">Plano atual</span>}
              </div>
              <Price plan={plan} cycle={cycle} />
              <ul className="flex-1 space-y-1.5 text-sm text-slate-600">
                {INCLUDES[plan].map((item) => (
                  <li key={item} className="flex gap-2">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" aria-hidden="true" />
                    {item}
                  </li>
                ))}
              </ul>
              {canSubscribe && isPaidPlan(plan) && (
                <button
                  type="button"
                  onClick={() => setChosen(plan)}
                  aria-label={`Assinar o plano ${PLAN_LABELS[plan]}`}
                  className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700"
                >
                  Assinar
                </button>
              )}
            </li>
          );
        })}
      </ul>

      {canSubscribe && chosen && (
        <CheckoutForm key={`${chosen}-${cycle}`} plan={chosen} cycle={cycle} onCancel={() => setChosen(null)} />
      )}
    </div>
  );
}
