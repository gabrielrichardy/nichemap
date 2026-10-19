"use client";

import { useActionState, useRef } from "react";
import { cancelMySubscription, changeMyPlan, type BillingActionState } from "@/app/conta/actions";
import { PLAN_LABELS } from "@/lib/access";
import type { BillingSummary } from "@/lib/billing";
import type { PaidPlan } from "@/lib/billing-plans";

const PAID_PLANS: PaidPlan[] = ["intermediario", "completo"];

const fullDate = (date: Date) => date.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });

type Props = Pick<BillingSummary, "status" | "plan" | "scheduledPlan" | "periodEnd">;

// Plan changes (only while active) and cancellation, both for the session user.
export function SubscriptionPanel({ status, plan, scheduledPlan, periodEnd }: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [changeState, change, changing] = useActionState<BillingActionState, FormData>(
    (_prev, formData) => changeMyPlan(formData),
    {},
  );
  const [cancelState, cancel, canceling] = useActionState<BillingActionState>(() => cancelMySubscription(), {});
  const nextPlan = scheduledPlan ?? plan;
  // Active keeps the plan until the paid period ends; any other status ends it now.
  const keepsUntil = status === "active" && periodEnd ? fullDate(periodEnd) : null;

  return (
    <section aria-labelledby="subscription-title" className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-4">
      <h2 id="subscription-title" className="font-semibold text-slate-900">
        Assinatura
      </h2>
      {status === "active" && (
        <form action={change} className="space-y-2">
          <p className="text-sm text-slate-600">
            Subir de plano no mensal vale na hora. As outras mudanças valem a partir da renovação.
          </p>
          <div className="flex flex-wrap gap-2">
            {PAID_PLANS.filter((p) => p !== nextPlan).map((p) => (
              <button
                key={p}
                type="submit"
                name="plan"
                value={p}
                disabled={changing}
                className="rounded-xl border border-blue-200 px-4 py-2 text-sm text-blue-700 hover:bg-blue-50 disabled:opacity-60"
              >
                {changing ? "Mudando..." : p === plan ? `Manter o plano ${PLAN_LABELS[p]}` : `Mudar para ${PLAN_LABELS[p]}`}
              </button>
            ))}
          </div>
          {changeState.error && (
            <p role="alert" className="text-sm text-rose-600">
              {changeState.error}
            </p>
          )}
        </form>
      )}
      <button
        type="button"
        onClick={() => dialog.current?.showModal()}
        className="rounded-xl border border-rose-200 px-4 py-2 text-sm text-rose-600 hover:bg-rose-50"
      >
        Cancelar assinatura
      </button>
      <dialog
        ref={dialog}
        aria-labelledby="cancel-title"
        className="m-auto w-[calc(100%-2rem)] max-w-sm rounded-2xl p-5 backdrop:bg-slate-900/40"
      >
        <h2 id="cancel-title" className="font-semibold text-slate-900">
          Cancelar a assinatura?
        </h2>
        <p className="text-sm text-slate-600 mt-2">
          {keepsUntil
            ? `Nada mais será cobrado. Você continua com o plano ${PLAN_LABELS[plan]} até ${keepsUntil}; depois a conta volta ao Básico.`
            : "Nada mais será cobrado e a conta volta ao Básico agora."}
        </p>
        {cancelState.error && (
          <p role="alert" className="text-sm text-rose-600 mt-2">
            {cancelState.error}
          </p>
        )}
        <form action={cancel} className="flex gap-2 justify-end mt-5">
          <button type="button" onClick={() => dialog.current?.close()} className="rounded-xl px-4 py-2 text-sm text-slate-600">
            Voltar
          </button>
          <button
            type="submit"
            disabled={canceling}
            className="rounded-xl bg-rose-600 text-white text-sm font-medium px-4 py-2 disabled:opacity-60"
          >
            {canceling ? "Cancelando..." : "Cancelar assinatura"}
          </button>
        </form>
      </dialog>
    </section>
  );
}
