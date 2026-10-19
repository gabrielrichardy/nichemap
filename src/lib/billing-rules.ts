import type { Plan } from "./access";
import type { Cycle, PaidPlan } from "./billing-plans";

// suspended: dropped to Básico for non-payment while the charge is still open at Asaas.
// canceled: cancelled, but paid until periodEnd.
export type BillingStatus = "pending" | "active" | "overdue" | "suspended" | "canceled" | "ended";

export interface BillingState {
  status: BillingStatus;
  plan: PaidPlan;
  cycle: Cycle;
  periodEnd: Date | null;
  overdueSince: Date | null;
  scheduledPlan: PaidPlan | null;
  createdAt: Date;
}

export type BillingEvent =
  | { type: "paid"; dueDate: Date }
  | { type: "overdue"; dueDate: Date }
  | { type: "refunded" }
  | { type: "chargeback" }
  | { type: "remote_deleted" }
  | { type: "customer_cancel" }
  | { type: "tick" };

export interface BillingOutcome {
  state: BillingState;
  cancelRemote: boolean;
}

export const GRACE_DAYS = 3;
export const CANCEL_AFTER_DAYS = 30;
export const ABANDON_AFTER_DAYS = 30;

const DAY_MS = 24 * 60 * 60 * 1000;

function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * DAY_MS);
}

// UTC month addition, clamped to the last day of the target month (Jan 31 + 1 month = Feb 28/29).
function addMonths(date: Date, months: number): Date {
  const target = new Date(date.getTime());
  target.setUTCDate(1);
  target.setUTCMonth(target.getUTCMonth() + months);
  const lastDay = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
  target.setUTCDate(Math.min(date.getUTCDate(), lastDay));
  return target;
}

function addCycle(date: Date, cycle: Cycle): Date {
  return addMonths(date, cycle === "monthly" ? 1 : 12);
}

function later(a: Date | null, b: Date): Date {
  return a && a > b ? a : b;
}

const unchanged = (state: BillingState): BillingOutcome => ({ state, cancelRemote: false });
const to = (state: BillingState, status: BillingStatus, cancelRemote: boolean): BillingOutcome => ({
  state: { ...state, status },
  cancelRemote,
});

function onPaid(state: BillingState, dueDate: Date): BillingOutcome {
  if (state.status === "ended") return unchanged(state);
  const periodEnd = later(state.periodEnd, addCycle(dueDate, state.cycle));
  // A late charge paid after cancelling must not reopen a subscription Asaas no longer bills.
  if (state.status === "canceled") return unchanged({ ...state, periodEnd, overdueSince: null });
  return unchanged({
    ...state,
    status: "active",
    periodEnd,
    overdueSince: null,
    plan: state.scheduledPlan ?? state.plan,
    scheduledPlan: null,
  });
}

function onTick(state: BillingState, now: Date): BillingOutcome {
  const { status, overdueSince, periodEnd } = state;
  if ((status === "overdue" || status === "suspended") && overdueSince) {
    if (now >= addDays(overdueSince, CANCEL_AFTER_DAYS)) return to(state, "ended", true);
    if (status === "overdue" && now >= addDays(overdueSince, GRACE_DAYS)) return to(state, "suspended", false);
  }
  if (status === "canceled" && (!periodEnd || now >= periodEnd)) return to(state, "ended", false);
  if (status === "pending" && now >= addDays(state.createdAt, ABANDON_AFTER_DAYS)) return to(state, "ended", true);
  return unchanged(state);
}

export function applyBillingEvent(state: BillingState, event: BillingEvent, now: Date): BillingOutcome {
  const { status } = state;
  const paidTimeLeft = state.periodEnd !== null && state.periodEnd > now;
  switch (event.type) {
    case "paid":
      return onPaid(state, event.dueDate);
    case "overdue":
      return status === "active" ? unchanged({ ...state, status: "overdue", overdueSince: event.dueDate }) : unchanged(state);
    case "tick":
      return onTick(state, now);
    case "refunded":
    case "chargeback":
      return status === "ended" ? unchanged(state) : to(state, "ended", true);
    case "remote_deleted":
      // canceled/ended: our own cancel echoing back from Asaas.
      if (status === "canceled" || status === "ended") return unchanged(state);
      if ((status === "active" || status === "overdue") && paidTimeLeft) return to(state, "canceled", false);
      return to(state, "ended", false);
    case "customer_cancel":
      if (status === "canceled" || status === "ended") return unchanged(state);
      if (status !== "pending" && paidTimeLeft) return to(state, "canceled", true);
      return to(state, "ended", true);
  }
}

export function effectivePlan(state: BillingState): Plan {
  return state.status === "active" || state.status === "overdue" || state.status === "canceled" ? state.plan : "basico";
}

export function isPlanLockedBy(status: BillingStatus | null): boolean {
  return status !== null && status !== "ended";
}
