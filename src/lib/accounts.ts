import "server-only";
import { and, desc, eq, inArray, isNotNull, isNull, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { subscription, user } from "@/db/schema";
import { isPlan, PLANS, type Plan } from "./access";
import { isPaidPlan, PRICES, type Cycle } from "./billing-plans";
import { isPlanLockedBy, type BillingStatus } from "./billing-rules";
import { lockSubscription } from "./billing";

export type LockResult = { ok: true } | { ok: false; reason: "in_use" | "already_locked" | "terms_required" };

export type ManualPlanResult = { ok: true } | { ok: false; reason: "subscription" };

export interface AccountRow {
  id: string;
  name: string;
  email: string;
  instagramUsername: string | null;
  plan: Plan;
  complimentary: boolean;
  createdAt: Date;
  lastSeenAt: Date | null;
  billingStatus: BillingStatus | null;
  cycle: Cycle | null;
  periodEnd: Date | null;
  asaasCustomerId: string | null;
}

export interface AccountStats {
  total: number;
  byPlan: Record<Plan, number>;
  newLast7: number;
  newLast30: number;
  // Paying subscriptions (active or overdue) of accounts that are not complimentary.
  activeSubscriptions: number;
  complimentary: number;
  // Monthly equivalent of the paying subscriptions (yearly ÷ 12). An estimate, not a ledger.
  estimatedMonthlyRevenue: number;
}

// Drizzle wraps pg errors, so the SQLSTATE may sit on the error or on its cause.
export function isUniqueViolation(error: unknown): boolean {
  const code = (e: unknown) => (typeof e === "object" && e !== null ? (e as { code?: unknown }).code : undefined);
  return code(error) === "23505" || (error instanceof Error && code(error.cause) === "23505");
}

// `username` must already be normalized by resolveTarget(). Only an account without a
// profile can lock one, and the unique index settles two accounts racing for the same @.
export async function lockProfile(userId: string, username: string, acceptedTerms: boolean): Promise<LockResult> {
  if (!acceptedTerms) return { ok: false, reason: "terms_required" };
  const db = getDb();
  try {
    const rows = await db
      .update(user)
      .set({ instagramUsername: username, termsAcceptedAt: new Date() })
      .where(and(eq(user.id, userId), isNull(user.instagramUsername)))
      .returning({ id: user.id });
    return rows.length ? { ok: true } : { ok: false, reason: "already_locked" };
  } catch (err) {
    if (isUniqueViolation(err)) return { ok: false, reason: "in_use" };
    throw err;
  }
}

export async function isUsernameTaken(username: string): Promise<boolean> {
  const rows = await getDb().select({ id: user.id }).from(user).where(eq(user.instagramUsername, username)).limit(1);
  return rows.length > 0;
}

export async function unlockProfile(userId: string): Promise<void> {
  const db = getDb();
  await db.update(user).set({ instagramUsername: null }).where(eq(user.id, userId));
}

// Admin override, for complimentary accounts and Pix payers outside the site. Refused while the
// account has a subscription still open at Asaas or a paid period running, so a webhook and a
// manual change never undo each other. The lock check and the write share one transaction.
export async function setManualPlan(userId: string, plan: Plan, complimentary: boolean): Promise<ManualPlanResult> {
  if (!isPlan(plan)) throw new Error("Plano inválido.");
  // Cortesia only makes sense on a paid plan; Básico always clears it.
  const keepComplimentary = plan !== "basico" && complimentary;
  return getDb().transaction(async (tx): Promise<ManualPlanResult> => {
    const row = await lockSubscription(tx, userId);
    if (isPlanLockedBy((row?.status ?? null) as BillingStatus | null)) return { ok: false, reason: "subscription" };
    await tx.update(user).set({ plan, complimentary: keepComplimentary }).where(eq(user.id, userId));
    return { ok: true };
  });
}

// Sessions and linked Google accounts go with it (ON DELETE CASCADE); the @ becomes free.
export async function deleteAccount(userId: string): Promise<void> {
  const db = getDb();
  await db.delete(user).where(eq(user.id, userId));
}

export async function listAccounts(): Promise<AccountRow[]> {
  const rows = await getDb()
    .select({
      id: user.id,
      name: user.name,
      email: user.email,
      instagramUsername: user.instagramUsername,
      plan: user.plan,
      complimentary: user.complimentary,
      createdAt: user.createdAt,
      lastSeenAt: user.lastSeenAt,
      billingStatus: subscription.status,
      cycle: subscription.cycle,
      periodEnd: subscription.periodEnd,
      asaasCustomerId: subscription.asaasCustomerId,
    })
    .from(user)
    .leftJoin(subscription, eq(subscription.userId, user.id))
    .orderBy(desc(user.createdAt));
  return rows.map((r) => ({
    ...r,
    plan: isPlan(r.plan) ? r.plan : "basico",
    billingStatus: r.billingStatus as BillingStatus | null,
    cycle: r.cycle as Cycle | null,
  }));
}

export async function getAccountStats(now = new Date()): Promise<AccountStats> {
  const day = 86_400_000;
  const since7 = new Date(now.getTime() - 7 * day);
  const since30 = new Date(now.getTime() - 30 * day);
  const db = getDb();
  const rows = await db
    .select({
      plan: user.plan,
      total: sql<number>`count(*)::int`,
      new7: sql<number>`count(*) filter (where ${user.createdAt} >= ${since7})::int`,
      new30: sql<number>`count(*) filter (where ${user.createdAt} >= ${since30})::int`,
      complimentary: sql<number>`count(*) filter (where ${user.complimentary})::int`,
    })
    .from(user)
    .groupBy(user.plan);
  // Estimate inputs: paying subscriptions only; cortesias never count toward revenue.
  const paying = await db
    .select({ plan: subscription.plan, cycle: subscription.cycle })
    .from(subscription)
    .innerJoin(user, eq(user.id, subscription.userId))
    .where(and(inArray(subscription.status, ["active", "overdue"]), eq(user.complimentary, false)));

  const byPlan = Object.fromEntries(PLANS.map((p) => [p, 0])) as Record<Plan, number>;
  let total = 0;
  let newLast7 = 0;
  let newLast30 = 0;
  let complimentary = 0;
  for (const r of rows) {
    byPlan[isPlan(r.plan) ? r.plan : "basico"] += r.total;
    total += r.total;
    newLast7 += r.new7;
    newLast30 += r.new30;
    complimentary += r.complimentary;
  }
  let estimatedMonthlyRevenue = 0;
  for (const s of paying) {
    if (!isPaidPlan(s.plan)) continue;
    estimatedMonthlyRevenue += s.cycle === "yearly" ? PRICES[s.plan].yearly / 12 : PRICES[s.plan].monthly;
  }
  return {
    total,
    byPlan,
    newLast7,
    newLast30,
    activeSubscriptions: paying.length,
    complimentary,
    estimatedMonthlyRevenue,
  };
}

// Profiles customers locked: tracked by the daily snapshot job.
export async function listLockedUsernames(): Promise<string[]> {
  const rows = await getDb()
    .select({ username: user.instagramUsername })
    .from(user)
    .where(isNotNull(user.instagramUsername));
  return rows.flatMap((r) => (r.username ? [r.username] : []));
}
