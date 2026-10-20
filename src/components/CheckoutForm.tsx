"use client";

import { useActionState, useState } from "react";
import { subscribe, type SubscribeState } from "@/app/plano/actions";
import { PLAN_LABELS } from "@/lib/access";
import { PRICES, formatBRL, type Cycle, type PaidPlan } from "@/lib/billing-plans";

// Name and e-mail come from the Google account; the payment method is chosen on Asaas's page.
export function CheckoutForm({ plan, cycle, onCancel }: { plan: PaidPlan; cycle: Cycle; onCancel: () => void }) {
  const [state, action, pending] = useActionState<SubscribeState, FormData>(subscribe, {});
  // Controlled so the typed document survives the form reset React applies after an action.
  const [cpfCnpj, setCpfCnpj] = useState("");
  const price = `${formatBRL(PRICES[plan][cycle])}${cycle === "monthly" ? " por mês" : " por ano"}`;

  return (
    <form action={action} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-4" aria-labelledby="checkout-title">
      <input type="hidden" name="plan" value={plan} />
      <input type="hidden" name="cycle" value={cycle} />
      <div>
        <h2 id="checkout-title" className="font-semibold text-slate-900">
          Assinar o plano {PLAN_LABELS[plan]}
        </h2>
        <p className="text-sm text-slate-600 mt-1">
          {price}. Na próxima tela você paga por Pix, cartão ou boleto.
        </p>
      </div>
      <div className="space-y-1">
        <label htmlFor="cpfCnpj" className="block text-sm font-medium text-slate-700">
          CPF ou CNPJ
        </label>
        <input
          id="cpfCnpj"
          name="cpfCnpj"
          required
          autoFocus
          inputMode="numeric"
          autoComplete="off"
          value={cpfCnpj}
          onChange={(e) => setCpfCnpj(e.target.value)}
          aria-invalid={state.error ? true : undefined}
          aria-describedby={state.error ? "checkout-error" : "cpf-hint"}
          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <p id="cpf-hint" className="text-xs text-slate-500">
          Exigido para a cobrança. Fica só no sistema de pagamento, não no Nichemap.
        </p>
      </div>
      <div className="space-y-1">
        <label htmlFor="mobilePhone" className="block text-sm font-medium text-slate-700">
          Celular (opcional)
        </label>
        <input
          id="mobilePhone"
          name="mobilePhone"
          type="tel"
          inputMode="tel"
          autoComplete="tel-national"
          placeholder="(11) 98765-4321"
          aria-describedby="phone-hint"
          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <p id="phone-hint" className="text-xs text-slate-500">
          Para receber os avisos de cobrança.
        </p>
      </div>
      {state.error && (
        <p id="checkout-error" role="alert" className="text-sm text-rose-600">
          {state.error}
        </p>
      )}
      <div className="flex flex-wrap gap-2 justify-end">
        <button type="button" onClick={onCancel} className="rounded-xl px-4 py-2 text-sm text-slate-600 hover:bg-slate-50">
          Voltar
        </button>
        <button
          type="submit"
          disabled={pending}
          className="rounded-xl bg-blue-600 text-white text-sm font-medium px-4 py-2 hover:bg-blue-700 disabled:opacity-60"
        >
          {pending ? "Abrindo pagamento..." : "Ir para o pagamento"}
        </button>
      </div>
    </form>
  );
}
