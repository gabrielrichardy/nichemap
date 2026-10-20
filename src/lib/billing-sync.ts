import "server-only";
import { timingSafeEqual } from "node:crypto";
import { eq, inArray } from "drizzle-orm";
import { getDb } from "@/db";
import { billingEvent, subscription } from "@/db/schema";
import {
  AsaasError,
  deleteSubscription,
  getAsaasConfig,
  getPayment,
  getSubscription,
  listOverduePayments,
} from "./asaas";
import { lockSubscription, saveOutcome, toBillingState, type Tx } from "./billing";
import {
  applyBillingEvent,
  type BillingEvent,
  type BillingOutcome,
  type BillingState,
  type BillingStatus,
} from "./billing-rules";
import { logger } from "./logger";

// Asaas webhook payload: only the ids are used; everything else is re-read from the API.
export interface AsaasEvent {
  id: string;
  event: string;
  payment?: { id: string };
  subscription?: { id: string };
}

export type EventResult = "processed" | "duplicate" | "ignored";

// Asaas sends the token configured on the webhook in the asaas-access-token header.
export function isAuthorizedWebhook(token: string | null): boolean {
  const expected = getAsaasConfig()?.webhookToken;
  if (!expected || !token) return false;
  const a = Buffer.from(expected);
  const b = Buffer.from(token);
  return a.length === b.length && timingSafeEqual(a, b);
}

// Event names: docs.asaas.com "Eventos para cobranças" and "Eventos para assinaturas".
const PAYMENT_RULES: Record<string, "paid" | "overdue" | "refunded" | "chargeback"> = {
  PAYMENT_CONFIRMED: "paid",
  PAYMENT_RECEIVED: "paid",
  PAYMENT_OVERDUE: "overdue",
  PAYMENT_REFUNDED: "refunded",
  PAYMENT_CHARGEBACK_REQUESTED: "chargeback",
};
const SUBSCRIPTION_REMOVED = new Set(["SUBSCRIPTION_DELETED", "SUBSCRIPTION_INACTIVATED"]);
// The rule applies only while the re-read payment still has one of these statuses
// (docs.asaas.com, payment object "status").
const CONFIRMING_STATUSES: Record<"paid" | "overdue" | "refunded" | "chargeback", Set<string>> = {
  paid: new Set(["CONFIRMED", "RECEIVED", "RECEIVED_IN_CASH"]),
  overdue: new Set(["OVERDUE"]),
  refunded: new Set(["REFUNDED", "REFUND_REQUESTED", "REFUND_IN_PROGRESS"]),
  chargeback: new Set(["CHARGEBACK_REQUESTED", "CHARGEBACK_DISPUTE", "AWAITING_CHARGEBACK_REVERSAL"]),
};

// Asaas dates are calendar days in Brazil (UTC-3, no daylight saving since 2019): midnight there.
function brazilDay(day: string): Date {
  return new Date(`${day}T03:00:00Z`);
}

function stateChanged(before: BillingState, after: BillingState): boolean {
  const time = (date: Date | null) => date?.getTime() ?? null;
  return (
    before.status !== after.status ||
    before.plan !== after.plan ||
    before.scheduledPlan !== after.scheduledPlan ||
    time(before.periodEnd) !== time(after.periodEnd) ||
    time(before.overdueSince) !== time(after.overdueSince)
  );
}

interface Resolved {
  asaasSubscriptionId: string;
  rule: BillingEvent;
  invoiceUrl?: string;
}

// Null when Asaas no longer has it (404): a retry would never succeed.
async function unlessGone<T>(read: Promise<T>): Promise<T | null> {
  try {
    return await read;
  } catch (error) {
    if (error instanceof AsaasError && error.status === 404) return null;
    throw error;
  }
}

// Turns the event into a rule from the re-read Asaas payment or subscription; the payload
// itself is never trusted. Null: nothing to apply.
async function resolve(event: AsaasEvent): Promise<Resolved | null> {
  if (SUBSCRIPTION_REMOVED.has(event.event)) {
    const subscriptionId = event.subscription?.id;
    if (!subscriptionId) return null;
    // 404: Asaas no longer has the subscription, so it is gone just like deleted: true.
    const remote = await unlessGone(getSubscription(subscriptionId));
    if (remote && !remote.deleted && remote.status === "ACTIVE") return null;
    return { asaasSubscriptionId: subscriptionId, rule: { type: "remote_deleted" } };
  }
  const kind = PAYMENT_RULES[event.event];
  if (!kind || !event.payment?.id) return null;
  const payment = await unlessGone(getPayment(event.payment.id));
  if (!payment?.subscription || !CONFIRMING_STATUSES[kind].has(payment.status)) return null;
  const base = { asaasSubscriptionId: payment.subscription };
  if (kind === "paid" || kind === "overdue") {
    return { ...base, rule: { type: kind, dueDate: brazilDay(payment.dueDate) }, invoiceUrl: payment.invoiceUrl };
  }
  return { ...base, rule: { type: kind } };
}

// The open charge the account page links to: an overdue charge, or the payment that
// brought the account back to active. A late payment of an older charge keeps the link.
function newInvoiceUrl(resolved: Resolved, before: BillingState, after: BillingState): string | undefined {
  if (resolved.rule.type === "overdue") return resolved.invoiceUrl;
  if (resolved.rule.type === "paid" && before.status !== "active" && after.status === "active") return resolved.invoiceUrl;
  return undefined;
}

// A payment that would bring an unpaid account back to active only does so when no other
// charge of the subscription is still overdue at Asaas; otherwise the account stays unpaid,
// overdue since the oldest open charge, and links to that charge.
async function applyChecked(
  resolved: Resolved,
  state: BillingState,
  now: Date,
): Promise<{ outcome: BillingOutcome; invoiceUrl?: string }> {
  const { rule } = resolved;
  const outcome = applyBillingEvent(state, rule, now);
  const reactivates = (state.status === "overdue" || state.status === "suspended") && outcome.state.status === "active";
  if (rule.type === "paid" && reactivates) {
    const [oldest] = await listOverduePayments(resolved.asaasSubscriptionId);
    if (oldest) {
      return {
        outcome: applyBillingEvent(state, { ...rule, openSince: brazilDay(oldest.dueDate) }, now),
        invoiceUrl: oldest.invoiceUrl,
      };
    }
  }
  return { outcome, invoiceUrl: newInvoiceUrl(resolved, state, outcome.state) };
}

// Applies a resolved event to the account it belongs to. False when no row matches.
async function apply(tx: Tx, resolved: Resolved, now: Date): Promise<boolean> {
  const [match] = await tx
    .select({ userId: subscription.userId })
    .from(subscription)
    .where(eq(subscription.asaasSubscriptionId, resolved.asaasSubscriptionId));
  if (!match) return false;
  const row = await lockSubscription(tx, match.userId);
  // Re-checked under the lock: a checkout may have replaced the subscription meanwhile.
  if (!row || row.asaasSubscriptionId !== resolved.asaasSubscriptionId) return false;

  const state = toBillingState(row);
  const { outcome, invoiceUrl } = await applyChecked(resolved, state, now);
  if (outcome.cancelRemote) await deleteSubscription(row.asaasSubscriptionId);
  // Only real changes are saved: saveOutcome rewrites user.plan, which the owner may set by
  // hand once a subscription has ended.
  if (stateChanged(state, outcome.state)) await saveOutcome(tx, row.userId, outcome);
  if (invoiceUrl) {
    await tx.update(subscription).set({ invoiceUrl }).where(eq(subscription.userId, row.userId));
  }
  return true;
}

// Idempotent per Asaas event id. Throwing rolls everything back and leaves the event
// unprocessed, so the Asaas resend runs it again.
export async function handleAsaasEvent(event: AsaasEvent, now = new Date()): Promise<EventResult> {
  return getDb().transaction(async (tx) => {
    await tx.insert(billingEvent).values({ id: event.id, type: event.event }).onConflictDoNothing();
    // The row lock also serializes two deliveries of the same event arriving at once.
    const [stored] = await tx.select().from(billingEvent).where(eq(billingEvent.id, event.id)).for("update");
    if (stored.processedAt) return "duplicate";

    const resolved = await resolve(event);
    const applied = resolved ? await apply(tx, resolved, now) : false;
    await tx.update(billingEvent).set({ processedAt: now }).where(eq(billingEvent.id, event.id));
    return applied ? "processed" : "ignored";
  });
}

const TICKED: BillingStatus[] = ["pending", "overdue", "suspended", "canceled"];

// Daily deadlines (grace period, end of paid time, 30 days overdue, abandoned checkout).
// Each account runs in its own transaction; one failure does not stop the others.
export async function runBillingTick(now = new Date()): Promise<{ changed: number; failed: number }> {
  const rows = await getDb()
    .select({ userId: subscription.userId })
    .from(subscription)
    .where(inArray(subscription.status, TICKED));
  let changed = 0;
  let failed = 0;
  for (const { userId } of rows) {
    try {
      const didChange = await getDb().transaction(async (tx) => {
        const row = await lockSubscription(tx, userId);
        if (!row) return false;
        const state = toBillingState(row);
        const outcome = applyBillingEvent(state, { type: "tick" }, now);
        if (!stateChanged(state, outcome.state)) return false;
        if (outcome.cancelRemote) await deleteSubscription(row.asaasSubscriptionId);
        await saveOutcome(tx, userId, outcome);
        return true;
      });
      if (didChange) changed++;
    } catch (error) {
      failed++;
      logger.error({ userId, error: (error as Error).message }, "Billing tick failed for account");
    }
  }
  return { changed, failed };
}
