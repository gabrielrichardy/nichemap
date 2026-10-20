// Integration test against a real PostgreSQL. Runs only when TEST_DATABASE_URL points to a
// disposable database (never production); CI skips it.
import { eq, sql } from "drizzle-orm";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/logger", () => ({ logger: { error: vi.fn(), warn: vi.fn() } }));
vi.mock("@/lib/asaas", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/asaas")>()),
  deleteSubscription: vi.fn(),
}));

const url = process.env.TEST_DATABASE_URL;
const SECRET = "test-secret-".padEnd(40, "x");

async function db() {
  return (await import("@/db")).getDb();
}

async function createUser(id: string, createdAt = new Date()) {
  const { user } = await import("@/db/schema");
  await (await db()).insert(user).values({ id, name: id, email: `${id}@example.com`, createdAt });
}

async function createSubscription(userId: string, status: string, plan = "completo", cycle = "monthly") {
  const { subscription } = await import("@/db/schema");
  await (await db()).insert(subscription).values({
    userId,
    asaasCustomerId: `cus_${userId}`,
    asaasSubscriptionId: `sub_${userId}`,
    plan,
    cycle,
    status,
  });
}

async function readUser(id: string) {
  const { user } = await import("@/db/schema");
  const [row] = await (await db()).select().from(user).where(eq(user.id, id));
  return row;
}

describe.skipIf(!url)("accounts (PostgreSQL)", () => {
  beforeAll(async () => {
    vi.stubEnv("DATABASE_URL", url!);
    vi.stubEnv("GOOGLE_CLIENT_ID", "test-client");
    vi.stubEnv("GOOGLE_CLIENT_SECRET", "test-secret");
    vi.stubEnv("BETTER_AUTH_SECRET", SECRET);
    vi.stubEnv("BETTER_AUTH_URL", "http://localhost:3000");
    await migrate(await db(), { migrationsFolder: "drizzle" });
  });

  beforeEach(async () => {
    vi.clearAllMocks();
    await (await db()).execute(sql`truncate table "user" cascade`);
  });

  afterAll(async () => {
    const { closeDatabase } = await import("@/db");
    await closeDatabase();
    vi.unstubAllEnvs();
  });

  it("lets several accounts lock the same profile and tracks it once", async () => {
    const { listLockedUsernames, lockProfile } = await import("./accounts");
    await createUser("a");
    await createUser("b");
    const results = await Promise.all([lockProfile("a", "biodev", true), lockProfile("b", "biodev", true)]);
    expect(results).toEqual([{ ok: true }, { ok: true }]);
    expect(await listLockedUsernames()).toEqual(["biodev"]);
  });

  it("stores the normalized username once and requires the terms", async () => {
    const { lockProfile } = await import("./accounts");
    const { resolveTarget } = await import("./instagram");
    await createUser("a");
    expect(await lockProfile("a", resolveTarget("@BioDev")!, false)).toEqual({ ok: false, reason: "terms_required" });
    expect(await lockProfile("a", resolveTarget("@BioDev")!, true)).toEqual({ ok: true });
    expect(await lockProfile("a", "outro", true)).toEqual({ ok: false, reason: "already_locked" });
    const row = await readUser("a");
    expect(row.instagramUsername).toBe("biodev");
    expect(row.termsAcceptedAt).toBeInstanceOf(Date);
  });

  it("rejects plan and profile changes sent through Better Auth's update-user", async () => {
    const { getAuth } = await import("./auth");
    const { serializeSignedCookie } = await import("better-call");
    await createUser("a");
    const auth = getAuth()!;
    const { token } = await (await auth.$context).internalAdapter.createSession("a");
    const cookie = (await serializeSignedCookie("better-auth.session_token", token, SECRET)).split(";")[0];

    // Control: the same session may change an allowed field, so the rejection below is about the fields.
    await auth.api.updateUser({ body: { name: "Novo nome" }, headers: new Headers({ cookie }) });
    await expect(
      auth.api.updateUser({ body: { plan: "completo", instagramUsername: "x", complimentary: true } as never, headers: new Headers({ cookie }) }),
    ).rejects.toThrow(/not allowed/);
    const row = await readUser("a");
    expect(row.name).toBe("Novo nome");
    expect(row.plan).toBe("basico");
    expect(row.instagramUsername).toBeNull();
    expect(row.complimentary).toBe(false);
  });

  it("deletes sessions with the account and frees its profile", async () => {
    const { deleteAccount, listLockedUsernames, lockProfile } = await import("./accounts");
    const { getAuth } = await import("./auth");
    const { session } = await import("@/db/schema");
    await createUser("a");
    await lockProfile("a", "biodev", true);
    await (await getAuth()!.$context).internalAdapter.createSession("a");

    await deleteAccount("a");
    expect(await listLockedUsernames()).toEqual([]);
    expect(await (await db()).select().from(session).where(eq(session.userId, "a"))).toHaveLength(0);
  });

  it("deleteAccount cancels the Asaas subscription first", async () => {
    const { deleteAccount } = await import("./accounts");
    const asaas = await import("@/lib/asaas");
    await createUser("a");
    await createSubscription("a", "active");
    // The account must still exist while Asaas is called: the cancel comes before the delete.
    let userExistedDuringCancel = false;
    vi.mocked(asaas.deleteSubscription).mockImplementationOnce(async (subscriptionId) => {
      expect(subscriptionId).toBe("sub_a");
      userExistedDuringCancel = (await readUser("a")) !== undefined;
    });

    await deleteAccount("a");
    expect(asaas.deleteSubscription).toHaveBeenCalledWith("sub_a");
    expect(userExistedDuringCancel).toBe(true);
    expect(await readUser("a")).toBeUndefined();
  });

  it("deleteAccount keeps the user when Asaas fails", async () => {
    const { deleteAccount } = await import("./accounts");
    const asaas = await import("@/lib/asaas");
    const { subscription } = await import("@/db/schema");
    await createUser("a");
    await createSubscription("a", "active");
    vi.mocked(asaas.deleteSubscription).mockRejectedValueOnce(new asaas.AsaasError("Asaas DELETE failed", 500));

    await expect(deleteAccount("a")).rejects.toThrow("Asaas DELETE failed");
    expect(await readUser("a")).toBeDefined();
    expect(await (await db()).select().from(subscription).where(eq(subscription.userId, "a"))).toHaveLength(1);
  });

  it("deleteAccount skips Asaas once the subscription has ended", async () => {
    const { deleteAccount } = await import("./accounts");
    const asaas = await import("@/lib/asaas");
    await createUser("a");
    await createSubscription("a", "ended");

    await deleteAccount("a");
    expect(asaas.deleteSubscription).not.toHaveBeenCalled();
    expect(await readUser("a")).toBeUndefined();
  });

  it("counts accounts by plan and signup window", async () => {
    const { getAccountStats, setManualPlan } = await import("./accounts");
    const now = new Date("2026-10-18T12:00:00Z");
    await createUser("new", new Date("2026-10-15T12:00:00Z"));
    await createUser("month", new Date("2026-10-01T12:00:00Z"));
    await createUser("old", new Date("2026-08-01T12:00:00Z"));
    await setManualPlan("old", "completo", false);

    expect(await getAccountStats(now)).toEqual({
      total: 3,
      byPlan: { basico: 2, intermediario: 0, completo: 1 },
      newLast7: 1,
      newLast30: 2,
      activeSubscriptions: 0,
      complimentary: 0,
      estimatedMonthlyRevenue: 0,
    });
  });

  it("stats count cortesias apart and divide yearly by 12", async () => {
    const { getAccountStats, setManualPlan } = await import("./accounts");
    const { user } = await import("@/db/schema");
    await createUser("yearly");
    await createSubscription("yearly", "active", "intermediario", "yearly");
    await createUser("monthly");
    await createSubscription("monthly", "overdue", "completo", "monthly");
    await createUser("suspended");
    await createSubscription("suspended", "suspended", "completo", "monthly");
    await createUser("gift");
    expect(await setManualPlan("gift", "completo", true)).toEqual({ ok: true });
    // A cortesia with a paying subscription (unreachable through the lock, but excluded anyway).
    await createUser("giftsub");
    await createSubscription("giftsub", "active", "completo", "yearly");
    await (await db()).update(user).set({ complimentary: true }).where(eq(user.id, "giftsub"));

    const stats = await getAccountStats();
    expect(stats.activeSubscriptions).toBe(2);
    expect(stats.complimentary).toBe(2);
    expect(stats.estimatedMonthlyRevenue).toBeCloseTo(599 / 12 + 99.9, 6);
  });

  it("lists each account with its billing state, or nulls without a subscription", async () => {
    const { listAccounts } = await import("./accounts");
    await createUser("a");
    await createSubscription("a", "active", "intermediario", "yearly");
    await createUser("b");

    const rows = await listAccounts();
    expect(rows.find((r) => r.id === "a")).toMatchObject({
      billingStatus: "active",
      cycle: "yearly",
      asaasCustomerId: "cus_a",
      complimentary: false,
    });
    expect(rows.find((r) => r.id === "b")).toMatchObject({ billingStatus: null, cycle: null, asaasCustomerId: null });
  });

  it("setManualPlan refuses while a subscription is active, pending, overdue, suspended or canceled", async () => {
    const { setManualPlan } = await import("./accounts");
    for (const status of ["pending", "active", "overdue", "suspended", "canceled"]) {
      await createUser(status);
      await createSubscription(status, status);
      expect(await setManualPlan(status, "completo", true)).toEqual({ ok: false, reason: "subscription" });
      const row = await readUser(status);
      expect(row.plan).toBe("basico");
      expect(row.complimentary).toBe(false);
    }
  });

  it("setManualPlan allows the change once the subscription has ended", async () => {
    const { setManualPlan } = await import("./accounts");
    await createUser("ended");
    await createSubscription("ended", "ended");
    expect(await setManualPlan("ended", "completo", false)).toEqual({ ok: true });
    expect((await readUser("ended")).plan).toBe("completo");
  });

  it("setManualPlan with basico clears complimentary", async () => {
    const { setManualPlan } = await import("./accounts");
    await createUser("a");
    expect(await setManualPlan("a", "completo", true)).toEqual({ ok: true });
    expect(await readUser("a")).toMatchObject({ plan: "completo", complimentary: true });
    expect(await setManualPlan("a", "basico", true)).toEqual({ ok: true });
    expect(await readUser("a")).toMatchObject({ plan: "basico", complimentary: false });
  });
});
