import { AlertTriangle } from "lucide-react";
import { PLAN_LABELS } from "@/lib/access";
import { getViewerBilling } from "@/lib/billing";
import { GRACE_DAYS } from "@/lib/billing-rules";

const DAY_MS = 24 * 60 * 60 * 1000;

const dayMonth = (date: Date) =>
  date.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit" });

// Shown on every page while a charge is overdue (grace period) or the plan is paused for it.
export async function BillingBanner({ viewer }: { viewer: { userId: string; isAdmin: boolean } }) {
  const summary = await getViewerBilling(viewer);
  if (!summary) return null;
  const plan = PLAN_LABELS[summary.plan];
  let message: string;
  if (summary.status === "overdue") {
    const deadline = summary.overdueSince ? new Date(summary.overdueSince.getTime() + GRACE_DAYS * DAY_MS) : null;
    message = deadline
      ? `Seu pagamento está pendente. Pague até ${dayMonth(deadline)} para não perder o plano ${plan}.`
      : `Seu pagamento está pendente. Pague para não perder o plano ${plan}.`;
  } else if (summary.status === "suspended") {
    message = `Seu plano ${plan} foi pausado por falta de pagamento. Pague a cobrança em aberto para voltar.`;
  } else {
    return null;
  }

  return (
    <div className="mb-4 flex flex-col gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 sm:flex-row sm:items-center sm:justify-between">
      <p className="flex items-start gap-2">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
        <span>{message}</span>
      </p>
      {summary.invoiceUrl && (
        <a
          href={summary.invoiceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 self-start rounded-xl bg-amber-700 px-4 py-2 font-medium text-white hover:bg-amber-800 sm:self-auto"
        >
          Pagar agora
        </a>
      )}
    </div>
  );
}
