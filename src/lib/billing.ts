import "server-only";
import { eq } from "drizzle-orm";
import { cache } from "react";
import { getDb } from "@/db";
import { subscription, user, type Subscription } from "@/db/schema";
import { PLAN_LABELS } from "./access";
import {
  AsaasError,
  createCustomer,
  createSubscription,
  deleteSubscription,
  firstPaymentUrl,
  getAsaasConfig,
  updateSubscriptionValue,
} from "./asaas";
import { PRICES, type Cycle, type PaidPlan } from "./billing-plans";
import {
  applyBillingEvent,
  effectivePlan,
  type BillingOutcome,
  type BillingState,
  type BillingStatus,
} from "./billing-rules";
import { normalizeCpfCnpj } from "./cpf-cnpj";
import { isDatabaseConfigured } from "./env";
import { dayInBrazil } from "./growth";
import { logger } from "./logger";

export type CheckoutResult =
  | { ok: true; url: string }
  | { ok: false; reason: "unavailable" | "invalid_document" | "already_subscribed" | "complimentary" | "provider_error" };

export interface BillingSummary {
  status: BillingStatus;
  plan: PaidPlan;
  cycle: Cycle;
  periodEnd: Date | null;
  overdueSince: Date | null;
  scheduledPlan: PaidPlan | null;
  invoiceUrl: string | null;
}

type Db = ReturnType<typeof getDb>;
export type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];

const ACCOUNT_PAGE = "/conta";
const PLAN_RANK: Record<PaidPlan, number> = { intermediario: 1, completo: 2 };

// Locks the account, then its subscription row, until the transaction ends. Every billing
// path locks in this order (user, then subscription) so concurrent paths cannot deadlock.
export async function lockSubscription(tx: Tx, userId: string): Promise<Subscription | undefined> {
  await tx.select({ id: user.id }).from(user).where(eq(user.id, userId)).for("update");
  const [row] = await tx.select().from(subscription).where(eq(subscription.userId, userId)).for("update");
  return row;
}

// Columns are written only by this module, from BillingState values.
export function toBillingState(row: Subscription): BillingState {
  return {
    status: row.status as BillingStatus,
    plan: row.plan as PaidPlan,
    cycle: row.cycle as Cycle,
    periodEnd: row.periodEnd,
    overdueSince: row.overdueSince,
    scheduledPlan: row.scheduledPlan as PaidPlan | null,
    createdAt: row.createdAt,
  };
}

// The only writer of user.plan for subscribers: row and plan change in the same transaction.
export async function saveOutcome(tx: Tx, userId: string, outcome: BillingOutcome): Promise<void> {
  const { status, plan, cycle, periodEnd, overdueSince, scheduledPlan } = outcome.state;
  await tx
    .update(subscription)
    .set({ status, plan, cycle, periodEnd, overdueSince, scheduledPlan })
    .where(eq(subscription.userId, userId));
  await tx.update(user).set({ plan: effectivePlan(outcome.state) }).where(eq(user.id, userId));
}

function logAsaasFailure(error: unknown, userId: string, message: string) {
  logger.error({ userId, status: error instanceof AsaasError ? error.status : undefined }, message);
}

// Returns false when Asaas could not remove the subscription.
async function tryDeleteRemote(subscriptionId: string, userId: string): Promise<boolean> {
  try {
    await deleteSubscription(subscriptionId);
    return true;
  } catch (error) {
    logAsaasFailure(error, userId, "Asaas subscription delete failed");
    return false;
  }
}

// A subscription created at Asaas but never recorded here would bill the customer: remove it.
async function discardRemote(subscriptionId: string, userId: string) {
  if (!(await tryDeleteRemote(subscriptionId, userId))) {
    logger.error({ userId, subscriptionId }, "Unrecorded Asaas subscription left open; delete it in the Asaas panel");
  }
}

interface RemoteInput {
  userId: string;
  plan: PaidPlan;
  cycle: Cycle;
  nextDueDate: Date;
  customerId?: string;
  customer?: { name: string; email: string; cpfCnpj: string; mobilePhone?: string };
  withInvoice: boolean;
}

interface Remote {
  customerId: string;
  subscriptionId: string;
  invoiceUrl: string | null;
}

// Creates the Asaas side of a checkout. Null when Asaas failed; nothing is left open there.
async function createRemote(input: RemoteInput): Promise<Remote | null> {
  let subscriptionId: string | undefined;
  try {
    const customerId =
      input.customerId ?? (await createCustomer({ ...input.customer!, externalReference: input.userId })).id;
    subscriptionId = (
      await createSubscription({
        customer: customerId,
        value: PRICES[input.plan][input.cycle],
        cycle: input.cycle === "monthly" ? "MONTHLY" : "YEARLY",
        nextDueDate: dayInBrazil(input.nextDueDate),
        description: `Nichemap — Plano ${PLAN_LABELS[input.plan]} (${input.cycle === "monthly" ? "mensal" : "anual"})`,
        externalReference: input.userId,
      })
    ).id;
    const invoiceUrl = input.withInvoice ? await firstPaymentUrl(subscriptionId) : null;
    return { customerId, subscriptionId, invoiceUrl };
  } catch (error) {
    logAsaasFailure(error, input.userId, "Asaas checkout failed");
    if (subscriptionId) await discardRemote(subscriptionId, input.userId);
    return null;
  }
}

// Runs the DB writes for a remote subscription just created; undoes the remote side if they fail.
async function recordOrDiscard(remote: Remote, userId: string, write: () => Promise<void>) {
  try {
    await write();
  } catch (error) {
    await discardRemote(remote.subscriptionId, userId);
    throw error;
  }
}

type CheckoutInput = {
  userId: string;
  name: string;
  email: string;
  plan: PaidPlan;
  cycle: Cycle;
  cpfCnpj: string;
  mobilePhone?: string;
};

const fail = (reason: Extract<CheckoutResult, { ok: false }>["reason"]): CheckoutResult => ({ ok: false, reason });

export async function startCheckout(input: CheckoutInput, now = new Date()): Promise<CheckoutResult> {
  if (!getAsaasConfig()) return fail("unavailable");
  const cpfCnpj = normalizeCpfCnpj(input.cpfCnpj);
  if (!cpfCnpj) return fail("invalid_document");

  return getDb().transaction(async (tx) => {
    // Locking the account serializes checkouts even before a subscription row exists.
    const [account] = await tx
      .select({ complimentary: user.complimentary })
      .from(user)
      .where(eq(user.id, input.userId))
      .for("update");
    if (!account) throw new Error("Account not found");
    if (account.complimentary) return fail("complimentary");

    const row = await lockSubscription(tx, input.userId);
    if (row?.status === "pending") return { ok: true, url: row.invoiceUrl ?? ACCOUNT_PAGE };
    if (row?.status === "active" || row?.status === "overdue" || row?.status === "suspended") {
      return fail("already_subscribed");
    }
    if (row?.status === "canceled" && row.periodEnd && row.periodEnd > now) {
      return resubscribe(tx, row, input);
    }
    return subscribeNew(tx, row, input, cpfCnpj, now);
  });
}

// Still inside a paid period: the new subscription bills from periodEnd and the plan
// switches on that first payment (scheduledPlan).
async function resubscribe(tx: Tx, row: Subscription, input: CheckoutInput): Promise<CheckoutResult> {
  const remote = await createRemote({
    userId: input.userId,
    plan: input.plan,
    cycle: input.cycle,
    nextDueDate: row.periodEnd!,
    customerId: row.asaasCustomerId,
    withInvoice: false,
  });
  if (!remote) return fail("provider_error");
  await recordOrDiscard(remote, input.userId, async () => {
    await tx
      .update(subscription)
      .set({ asaasSubscriptionId: remote.subscriptionId, invoiceUrl: null })
      .where(eq(subscription.userId, input.userId));
    const state = { ...toBillingState(row), status: "active" as const, cycle: input.cycle, scheduledPlan: input.plan };
    await saveOutcome(tx, input.userId, { state, cancelRemote: false });
  });
  return { ok: true, url: ACCOUNT_PAGE };
}

async function subscribeNew(
  tx: Tx,
  row: Subscription | undefined,
  input: CheckoutInput,
  cpfCnpj: string,
  now: Date,
): Promise<CheckoutResult> {
  const { userId, plan, cycle } = input;
  const remote = await createRemote({
    userId,
    plan,
    cycle,
    nextDueDate: now,
    customerId: row?.asaasCustomerId,
    customer: { name: input.name, email: input.email, cpfCnpj, mobilePhone: input.mobilePhone },
    withInvoice: true,
  });
  if (!remote) return fail("provider_error");
  // createdAt restarts so the abandoned-checkout deadline counts from this checkout.
  const values = {
    asaasCustomerId: remote.customerId,
    asaasSubscriptionId: remote.subscriptionId,
    plan,
    cycle,
    status: "pending",
    periodEnd: null,
    overdueSince: null,
    scheduledPlan: null,
    invoiceUrl: remote.invoiceUrl,
    createdAt: now,
  };
  await recordOrDiscard(remote, userId, async () => {
    await tx
      .insert(subscription)
      .values({ userId, ...values })
      .onConflictDoUpdate({ target: subscription.userId, set: values });
    // A cancellation whose paid time ran out (not yet ticked to ended) still holds the old plan.
    if (row?.status === "canceled") {
      const state: BillingState = { ...toBillingState(row), ...values, status: "pending" };
      await saveOutcome(tx, userId, { state, cancelRemote: false });
    }
  });
  return { ok: true, url: remote.invoiceUrl ?? ACCOUNT_PAGE };
}

// Only while active. Monthly upgrades apply now (no proration); downgrades and yearly
// upgrades wait for the renewal. Asaas bills the new value from the next charge.
export async function changePlan(userId: string, plan: PaidPlan): Promise<{ ok: boolean }> {
  return getDb().transaction(async (tx) => {
    const row = await lockSubscription(tx, userId);
    if (!row || row.status !== "active") return { ok: false };
    const state = toBillingState(row);
    if (plan === (state.scheduledPlan ?? state.plan)) return { ok: true };
    try {
      await updateSubscriptionValue(row.asaasSubscriptionId, PRICES[plan][state.cycle]);
    } catch (error) {
      logAsaasFailure(error, userId, "Asaas subscription value update failed");
      return { ok: false };
    }
    const upgradeNow = state.cycle === "monthly" && PLAN_RANK[plan] > PLAN_RANK[state.plan];
    const next: BillingState =
      upgradeNow || plan === state.plan ? { ...state, plan, scheduledPlan: null } : { ...state, scheduledPlan: plan };
    await saveOutcome(tx, userId, { state: next, cancelRemote: false });
    return { ok: true };
  });
}

// Keeps the plan until the paid period ends. Nothing is written if Asaas could not cancel.
export async function cancelSubscription(userId: string, now = new Date()): Promise<{ ok: boolean }> {
  return getDb().transaction(async (tx) => {
    const row = await lockSubscription(tx, userId);
    if (!row) return { ok: false };
    const outcome = applyBillingEvent(toBillingState(row), { type: "customer_cancel" }, now);
    if (outcome.state.status === row.status) return { ok: true };
    if (outcome.cancelRemote && !(await tryDeleteRemote(row.asaasSubscriptionId, userId))) return { ok: false };
    await saveOutcome(tx, userId, outcome);
    return { ok: true };
  });
}

// Also checks the deadlines (tick) on page load. If Asaas fails to cancel a subscription
// the tick ends, the page shows the current state and the next tick retries.
export async function getBillingSummary(userId: string, now = new Date()): Promise<BillingSummary | null> {
  return getDb().transaction(async (tx) => {
    const row = await lockSubscription(tx, userId);
    if (!row) return null;
    let state = toBillingState(row);
    const outcome = applyBillingEvent(state, { type: "tick" }, now);
    if (outcome.state.status !== state.status) {
      if (!outcome.cancelRemote || (await tryDeleteRemote(row.asaasSubscriptionId, userId))) {
        await saveOutcome(tx, userId, outcome);
        state = outcome.state;
      }
    }
    const { status, plan, cycle, periodEnd, overdueSince, scheduledPlan } = state;
    return { status, plan, cycle, periodEnd, overdueSince, scheduledPlan, invoiceUrl: row.invoiceUrl };
  });
}

// One lookup per request, shared by the banner and the page.
const summaryForRequest = cache((userId: string) => getBillingSummary(userId));

// For pages: null for admins, without billing set up, or when the lookup fails (logged),
// so a billing problem never breaks the page around it.
export async function getViewerBilling(viewer: { userId: string; isAdmin: boolean }): Promise<BillingSummary | null> {
  if (viewer.isAdmin || !isDatabaseConfigured()) return null;
  try {
    if (!getAsaasConfig()) return null;
    return await summaryForRequest(viewer.userId);
  } catch (error) {
    logger.error({ userId: viewer.userId, error: (error as Error).message }, "Billing summary failed");
    return null;
  }
}
