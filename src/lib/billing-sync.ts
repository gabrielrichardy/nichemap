import "server-only";
import { timingSafeEqual } from "node:crypto";
import { eq, inArray } from "drizzle-orm";
import { getDb } from "@/db";
import { billingEvent, subscription } from "@/db/schema";
import { deleteSubscription, getAsaasConfig, getPayment } from "./asaas";
import { lockSubscription, saveOutcome, toBillingState, type Tx } from "./billing";
import { applyBillingEvent, type BillingEvent, type BillingState, type BillingStatus } from "./billing-rules";
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
const PAID_STATUSES = new Set(["CONFIRMED", "RECEIVED", "RECEIVED_IN_CASH"]);

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

// Turns the event into a rule from the re-read Asaas payment. Null: nothing to apply.
async function resolve(event: AsaasEvent): Promise<Resolved | null> {
  if (SUBSCRIPTION_REMOVED.has(event.event)) {
    return event.subscription?.id ? { asaasSubscriptionId: event.subscription.id, rule: { type: "remote_deleted" } } : null;
  }
  const kind = PAYMENT_RULES[event.event];
  if (!kind || !event.payment?.id) return null;
  const payment = await getPayment(event.payment.id);
  if (!payment.subscription) return null;
  const base = { asaasSubscriptionId: payment.subscription };
  switch (kind) {
    case "paid":
      if (!PAID_STATUSES.has(payment.status)) return null;
      return { ...base, rule: { type: "paid", dueDate: brazilDay(payment.dueDate) }, invoiceUrl: payment.invoiceUrl };
    case "overdue":
      if (payment.status !== "OVERDUE") return null;
      return { ...base, rule: { type: "overdue", dueDate: brazilDay(payment.dueDate) }, invoiceUrl: payment.invoiceUrl };
    default:
      return { ...base, rule: { type: kind } };
  }
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
  const outcome = applyBillingEvent(state, resolved.rule, now);
  if (outcome.cancelRemote) await deleteSubscription(row.asaasSubscriptionId);
  // Only real changes are saved: saveOutcome rewrites user.plan, which the owner may set by
  // hand once a subscription has ended.
  if (stateChanged(state, outcome.state)) await saveOutcome(tx, row.userId, outcome);
  if (resolved.invoiceUrl) {
    await tx.update(subscription).set({ invoiceUrl: resolved.invoiceUrl }).where(eq(subscription.userId, row.userId));
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
