import "server-only";
import { and, desc, eq, isNotNull, isNull, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { user } from "@/db/schema";
import { isPlan, PLANS, type Plan } from "./access";

export type LockResult = { ok: true } | { ok: false; reason: "already_locked" | "terms_required" };

export interface AccountRow {
  id: string;
  name: string;
  email: string;
  instagramUsername: string | null;
  plan: Plan;
  createdAt: Date;
  lastSeenAt: Date | null;
}

export interface AccountStats {
  total: number;
  byPlan: Record<Plan, number>;
  newLast7: number;
  newLast30: number;
}

// `username` must already be normalized by resolveTarget(). Only an account without a
// profile can lock one; several accounts may share the same @.
export async function lockProfile(userId: string, username: string, acceptedTerms: boolean): Promise<LockResult> {
  if (!acceptedTerms) return { ok: false, reason: "terms_required" };
  const db = getDb();
  const rows = await db
    .update(user)
    .set({ instagramUsername: username, termsAcceptedAt: new Date() })
    .where(and(eq(user.id, userId), isNull(user.instagramUsername)))
    .returning({ id: user.id });
  return rows.length ? { ok: true } : { ok: false, reason: "already_locked" };
}

export async function unlockProfile(userId: string): Promise<void> {
  const db = getDb();
  await db.update(user).set({ instagramUsername: null }).where(eq(user.id, userId));
}

export async function setPlan(userId: string, plan: Plan): Promise<void> {
  if (!isPlan(plan)) throw new Error("Plano inválido.");
  const db = getDb();
  await db.update(user).set({ plan }).where(eq(user.id, userId));
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
      createdAt: user.createdAt,
      lastSeenAt: user.lastSeenAt,
    })
    .from(user)
    .orderBy(desc(user.createdAt));
  return rows.map((r) => ({ ...r, plan: isPlan(r.plan) ? r.plan : "basico" }));
}

export async function getAccountStats(now = new Date()): Promise<AccountStats> {
  const day = 86_400_000;
  const since7 = new Date(now.getTime() - 7 * day);
  const since30 = new Date(now.getTime() - 30 * day);
  const rows = await getDb()
    .select({
      plan: user.plan,
      total: sql<number>`count(*)::int`,
      new7: sql<number>`count(*) filter (where ${user.createdAt} >= ${since7})::int`,
      new30: sql<number>`count(*) filter (where ${user.createdAt} >= ${since30})::int`,
    })
    .from(user)
    .groupBy(user.plan);
  const byPlan = Object.fromEntries(PLANS.map((p) => [p, 0])) as Record<Plan, number>;
  let total = 0;
  let newLast7 = 0;
  let newLast30 = 0;
  for (const r of rows) {
    byPlan[isPlan(r.plan) ? r.plan : "basico"] += r.total;
    total += r.total;
    newLast7 += r.new7;
    newLast30 += r.new30;
  }
  return { total, byPlan, newLast7, newLast30 };
}

// Profiles customers locked, once each even when shared: tracked by the daily snapshot job.
export async function listLockedUsernames(): Promise<string[]> {
  const rows = await getDb()
    .selectDistinct({ username: user.instagramUsername })
    .from(user)
    .where(isNotNull(user.instagramUsername));
  return rows.flatMap((r) => (r.username ? [r.username] : []));
}
