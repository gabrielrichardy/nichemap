export type PaidPlan = "intermediario" | "completo";
export type Cycle = "monthly" | "yearly";

// Approved by the owner (spec: Preços). Changing a price is a PR; existing subscriptions keep their price.
export const PRICES: Record<PaidPlan, Record<Cycle, number>> = {
  intermediario: { monthly: 59.9, yearly: 599 },
  completo: { monthly: 99.9, yearly: 999 },
};

export function isPaidPlan(v: unknown): v is PaidPlan {
  return v === "intermediario" || v === "completo";
}

const brl = new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function formatBRL(value: number): string {
  return `R$ ${brl.format(value)}`;
}
