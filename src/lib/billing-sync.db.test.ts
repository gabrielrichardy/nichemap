// Integration test against a real PostgreSQL. Runs only when TEST_DATABASE_URL points to a
// disposable database (never production); CI skips it. The Asaas client is mocked.
import { eq, sql } from "drizzle-orm";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { NewSubscription } from "@/db/schema";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/logger", () => ({ logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() } }));
vi.mock("@/lib/asaas", async (importOriginal) => ({
  AsaasError: (await importOriginal<typeof import("@/lib/asaas")>()).AsaasError,
  getAsaasConfig: vi.fn(),
  getPayment: vi.fn(),
  getSubscription: vi.fn(),
  deleteSubscription: vi.fn(),
}));

const url = process.env.TEST_DATABASE_URL;
const NOW = new Date("2026-10-19T15:00:00Z");
const PERIOD_END = new Date("2026-11-05T15:00:00Z");
const DAY = 24 * 60 * 60 * 1000;

async function db() {
  return (await import("@/db")).getDb();
}

async function asaas() {
  return vi.mocked(await import("@/lib/asaas"));
}

async function createUser(id: string, values: { plan?: string; complimentary?: boolean } = {}) {
  const { user } = await import("@/db/schema");
  await (await db()).insert(user).values({ id, name: id, email: `${id}@example.com`, ...values });
}

async function readUser(id: string) {
  const { user } = await import("@/db/schema");
  const [row] = await (await db()).select().from(user).where(eq(user.id, id));
  return row;
}

async function insertSubscription(userId: string, values: Partial<NewSubscription>) {
  const { subscription } = await import("@/db/schema");
  await (await db())
    .insert(subscription)
    .values({
      userId,
      asaasCustomerId: "cus_1",
      asaasSubscriptionId: `sub_${userId}`,
      plan: "completo",
      cycle: "monthly",
      status: "active",
      periodEnd: PERIOD_END,
      ...values,
    });
}

async function readSubscription(userId: string) {
  const { subscription } = await import("@/db/schema");
  const [row] = await (await db()).select().from(subscription).where(eq(subscription.userId, userId));
  return row;
}

async function readEvent(id: string) {
  const { billingEvent } = await import("@/db/schema");
  const [row] = await (await db()).select().from(billingEvent).where(eq(billingEvent.id, id));
  return row;
}

const payment = (status: string, subscription: string | null = "sub_a") => ({
  id: "pay_1",
  subscription,
  status,
  dueDate: "2026-10-19",
  invoiceUrl: "https://pay.example/pay_1",
});

const paymentEvent = (event: string, id = "evt_1") => ({ id, event, payment: { id: "pay_1" } });

describe.skipIf(!url)("billing sync (PostgreSQL)", () => {
  beforeAll(async () => {
    vi.stubEnv("DATABASE_URL", url!);
    await migrate(await db(), { migrationsFolder: "drizzle" });
  });

  beforeEach(async () => {
    await (await db()).execute(sql`truncate table "user", billing_event cascade`);
    const mock = await asaas();
    for (const fn of [mock.getAsaasConfig, mock.getPayment, mock.getSubscription, mock.deleteSubscription]) {
      fn.mockReset();
    }
    mock.deleteSubscription.mockResolvedValue();
    mock.getSubscription.mockImplementation(async (id) => ({ id, status: "INACTIVE", deleted: true }));
  });

  afterAll(async () => {
    const { closeDatabase } = await import("@/db");
    await closeDatabase();
    vi.unstubAllEnvs();
  });

  it("PAYMENT_RECEIVED activates a pending subscription and sets user.plan", async () => {
    const { handleAsaasEvent } = await import("./billing-sync");
    const mock = await asaas();
    mock.getPayment.mockResolvedValue(payment("RECEIVED"));
    await createUser("a");
    await insertSubscription("a", { status: "pending", plan: "intermediario", periodEnd: null, invoiceUrl: "old" });

    expect(await handleAsaasEvent(paymentEvent("PAYMENT_RECEIVED"), NOW)).toBe("processed");
    expect(mock.getPayment).toHaveBeenCalledWith("pay_1");
    expect(await readSubscription("a")).toMatchObject({
      status: "active",
      plan: "intermediario",
      // Due 2026-10-19 (midnight in Brazil) plus one month.
      periodEnd: new Date("2026-11-19T03:00:00Z"),
      invoiceUrl: "https://pay.example/pay_1",
    });
    expect((await readUser("a")).plan).toBe("intermediario");
    expect(await readEvent("evt_1")).toMatchObject({ type: "PAYMENT_RECEIVED", processedAt: NOW });
  });

  it("the same event id twice is applied once", async () => {
    const { handleAsaasEvent } = await import("./billing-sync");
    const mock = await asaas();
    mock.getPayment.mockResolvedValue(payment("CONFIRMED"));
    await createUser("a");
    await insertSubscription("a", { status: "pending", plan: "intermediario", periodEnd: null });

    expect(await handleAsaasEvent(paymentEvent("PAYMENT_CONFIRMED"), NOW)).toBe("processed");
    expect(await handleAsaasEvent(paymentEvent("PAYMENT_CONFIRMED"), NOW)).toBe("duplicate");
    expect(mock.getPayment).toHaveBeenCalledTimes(1);
    expect((await readSubscription("a")).periodEnd).toEqual(new Date("2026-11-19T03:00:00Z"));
  });

  it("card CONFIRMED then RECEIVED for the same charge keeps the scheduled plan for the renewal", async () => {
    const { handleAsaasEvent } = await import("./billing-sync");
    const mock = await asaas();
    await createUser("a", { plan: "intermediario" });
    await insertSubscription("a", { status: "pending", plan: "intermediario", cycle: "yearly", periodEnd: null });

    mock.getPayment.mockResolvedValue(payment("CONFIRMED"));
    expect(await handleAsaasEvent(paymentEvent("PAYMENT_CONFIRMED", "evt_1"), NOW)).toBe("processed");
    const { subscription } = await import("@/db/schema");
    await (await db()).update(subscription).set({ scheduledPlan: "completo" }).where(eq(subscription.userId, "a"));

    mock.getPayment.mockResolvedValue(payment("RECEIVED"));
    expect(await handleAsaasEvent(paymentEvent("PAYMENT_RECEIVED", "evt_2"), NOW)).toBe("processed");
    expect(await readSubscription("a")).toMatchObject({
      status: "active",
      plan: "intermediario",
      scheduledPlan: "completo",
      periodEnd: new Date("2027-10-19T03:00:00Z"),
    });
    expect((await readUser("a")).plan).toBe("intermediario");
  });

  it("PAYMENT_OVERDUE whose payment now reads RECEIVED changes nothing", async () => {
    const { handleAsaasEvent } = await import("./billing-sync");
    const mock = await asaas();
    mock.getPayment.mockResolvedValue(payment("RECEIVED"));
    await createUser("a", { plan: "completo" });
    await insertSubscription("a", { invoiceUrl: "kept" });

    expect(await handleAsaasEvent(paymentEvent("PAYMENT_OVERDUE"), NOW)).toBe("ignored");
    expect(await readSubscription("a")).toMatchObject({ status: "active", overdueSince: null, invoiceUrl: "kept" });
    expect((await readUser("a")).plan).toBe("completo");
    expect((await readEvent("evt_1")).processedAt).toEqual(NOW);
  });

  it("PAYMENT_OVERDUE marks an active subscription overdue and stores the open charge URL", async () => {
    const { handleAsaasEvent } = await import("./billing-sync");
    const mock = await asaas();
    mock.getPayment.mockResolvedValue(payment("OVERDUE"));
    await createUser("a", { plan: "completo" });
    await insertSubscription("a", { invoiceUrl: "old" });

    expect(await handleAsaasEvent(paymentEvent("PAYMENT_OVERDUE"), NOW)).toBe("processed");
    expect(await readSubscription("a")).toMatchObject({
      status: "overdue",
      overdueSince: new Date("2026-10-19T03:00:00Z"),
      invoiceUrl: "https://pay.example/pay_1",
    });
    expect((await readUser("a")).plan).toBe("completo");
  });

  it("event for an unknown subscription returns ignored", async () => {
    const { handleAsaasEvent } = await import("./billing-sync");
    const mock = await asaas();
    await createUser("a", { plan: "completo" });
    await insertSubscription("a", {});

    mock.getPayment.mockResolvedValue(payment("RECEIVED", "sub_other"));
    expect(await handleAsaasEvent(paymentEvent("PAYMENT_RECEIVED", "evt_1"), NOW)).toBe("ignored");
    mock.getPayment.mockResolvedValue(payment("RECEIVED", null));
    expect(await handleAsaasEvent(paymentEvent("PAYMENT_RECEIVED", "evt_2"), NOW)).toBe("ignored");
    expect(
      await handleAsaasEvent({ id: "evt_3", event: "SUBSCRIPTION_DELETED", subscription: { id: "sub_other" } }, NOW),
    ).toBe("ignored");
    expect(await handleAsaasEvent({ id: "evt_4", event: "PAYMENT_CREATED", payment: { id: "pay_1" } }, NOW)).toBe(
      "ignored",
    );
    expect(await readSubscription("a")).toMatchObject({ status: "active", periodEnd: PERIOD_END });
    expect((await readEvent("evt_4")).processedAt).toEqual(NOW);
  });

  it("chargeback sets user.plan to basico and calls deleteSubscription", async () => {
    const { handleAsaasEvent } = await import("./billing-sync");
    const mock = await asaas();
    mock.getPayment.mockResolvedValue(payment("CHARGEBACK_REQUESTED"));
    await createUser("a", { plan: "completo" });
    await insertSubscription("a", {});

    expect(await handleAsaasEvent(paymentEvent("PAYMENT_CHARGEBACK_REQUESTED"), NOW)).toBe("processed");
    expect(mock.deleteSubscription).toHaveBeenCalledWith("sub_a");
    expect(await readSubscription("a")).toMatchObject({ status: "ended" });
    expect((await readUser("a")).plan).toBe("basico");
  });

  it("an event that failed midway is reprocessed on resend", async () => {
    const { handleAsaasEvent } = await import("./billing-sync");
    const mock = await asaas();
    mock.getPayment.mockResolvedValue(payment("REFUNDED"));
    mock.deleteSubscription.mockRejectedValueOnce(new Error("network down"));
    await createUser("a", { plan: "completo" });
    await insertSubscription("a", {});

    await expect(handleAsaasEvent(paymentEvent("PAYMENT_REFUNDED"), NOW)).rejects.toThrow("network down");
    expect((await readEvent("evt_1"))?.processedAt ?? null).toBeNull();
    expect(await readSubscription("a")).toMatchObject({ status: "active" });
    expect((await readUser("a")).plan).toBe("completo");

    expect(await handleAsaasEvent(paymentEvent("PAYMENT_REFUNDED"), NOW)).toBe("processed");
    expect(await readSubscription("a")).toMatchObject({ status: "ended" });
    expect((await readUser("a")).plan).toBe("basico");
  });

  it("SUBSCRIPTION_DELETED keeps paid time as canceled and leaves a manual plan alone after the end", async () => {
    const { handleAsaasEvent } = await import("./billing-sync");
    const mock = await asaas();
    await createUser("a", { plan: "completo" });
    await insertSubscription("a", {});
    await createUser("b", { plan: "intermediario" });
    await insertSubscription("b", { status: "ended" });

    const deleted = (id: string, sub: string) => ({ id, event: "SUBSCRIPTION_DELETED", subscription: { id: sub } });
    expect(await handleAsaasEvent(deleted("evt_1", "sub_a"), NOW)).toBe("processed");
    expect(await readSubscription("a")).toMatchObject({ status: "canceled", periodEnd: PERIOD_END });
    expect((await readUser("a")).plan).toBe("completo");

    expect(await handleAsaasEvent(deleted("evt_2", "sub_b"), NOW)).toBe("processed");
    expect((await readUser("b")).plan).toBe("intermediario");
    expect(mock.getSubscription).toHaveBeenCalledWith("sub_a");
    expect(mock.getPayment).not.toHaveBeenCalled();
    expect(mock.deleteSubscription).not.toHaveBeenCalled();
  });

  it("a subscription Asaas no longer has (404) counts as removed", async () => {
    const { handleAsaasEvent } = await import("./billing-sync");
    const { AsaasError } = await import("@/lib/asaas");
    const mock = await asaas();
    mock.getSubscription.mockRejectedValue(new AsaasError("Asaas GET /subscriptions/x failed with status 404", 404));
    await createUser("a", { plan: "completo" });
    await insertSubscription("a", {});

    const deleted = (id: string, sub: string) => ({ id, event: "SUBSCRIPTION_DELETED", subscription: { id: sub } });
    expect(await handleAsaasEvent(deleted("evt_1", "sub_a"), NOW)).toBe("processed");
    expect(await readSubscription("a")).toMatchObject({ status: "canceled", periodEnd: PERIOD_END });
    expect((await readUser("a")).plan).toBe("completo");
    expect(await handleAsaasEvent(deleted("evt_2", "sub_other"), NOW)).toBe("ignored");
    expect((await readEvent("evt_2")).processedAt).toEqual(NOW);
    expect(mock.deleteSubscription).not.toHaveBeenCalled();
  });

  it("a subscription event whose re-read subscription is still active is ignored", async () => {
    const { handleAsaasEvent } = await import("./billing-sync");
    const mock = await asaas();
    mock.getSubscription.mockResolvedValue({ id: "sub_a", status: "ACTIVE", deleted: false });
    await createUser("a", { plan: "completo" });
    await insertSubscription("a", {});

    const event = { id: "evt_1", event: "SUBSCRIPTION_INACTIVATED", subscription: { id: "sub_a" } };
    expect(await handleAsaasEvent(event, NOW)).toBe("ignored");
    expect(await readSubscription("a")).toMatchObject({ status: "active" });
    expect((await readEvent("evt_1")).processedAt).toEqual(NOW);
  });

  it("refund and chargeback events whose re-read payment no longer shows them are ignored", async () => {
    const { handleAsaasEvent } = await import("./billing-sync");
    const mock = await asaas();
    mock.getPayment.mockResolvedValue(payment("RECEIVED"));
    await createUser("a", { plan: "completo" });
    await insertSubscription("a", {});

    expect(await handleAsaasEvent(paymentEvent("PAYMENT_REFUNDED", "evt_1"), NOW)).toBe("ignored");
    expect(await handleAsaasEvent(paymentEvent("PAYMENT_CHARGEBACK_REQUESTED", "evt_2"), NOW)).toBe("ignored");
    expect(await readSubscription("a")).toMatchObject({ status: "active" });
    expect((await readUser("a")).plan).toBe("completo");
    expect(mock.deleteSubscription).not.toHaveBeenCalled();
  });

  it("a late payment of an older charge leaves an unpaid account as it is", async () => {
    const { handleAsaasEvent } = await import("./billing-sync");
    const mock = await asaas();
    const overdueSince = new Date("2026-10-05T03:00:00Z");
    mock.getPayment.mockResolvedValue({ ...payment("RECEIVED"), dueDate: "2026-09-05" });
    await createUser("a");
    await insertSubscription("a", { status: "suspended", overdueSince, invoiceUrl: "https://pay.example/p2" });

    expect(await handleAsaasEvent(paymentEvent("PAYMENT_RECEIVED"), NOW)).toBe("processed");
    expect(await readSubscription("a")).toMatchObject({
      status: "suspended",
      overdueSince,
      periodEnd: PERIOD_END,
      invoiceUrl: "https://pay.example/p2",
    });
    expect((await readUser("a")).plan).toBe("basico");
  });

  it("a payment Asaas no longer has (404) is ignored and marked processed", async () => {
    const { handleAsaasEvent } = await import("./billing-sync");
    const { AsaasError } = await import("@/lib/asaas");
    const mock = await asaas();
    mock.getPayment.mockRejectedValue(new AsaasError("Asaas GET /payments/pay_1 failed with status 404", 404));
    await createUser("a", { plan: "completo" });
    await insertSubscription("a", {});

    expect(await handleAsaasEvent(paymentEvent("PAYMENT_RECEIVED", "evt_1"), NOW)).toBe("ignored");
    expect((await readEvent("evt_1")).processedAt).toEqual(NOW);
    expect(await readSubscription("a")).toMatchObject({ status: "active" });

    mock.getPayment.mockRejectedValue(new AsaasError("Asaas GET /payments/pay_1 failed with status 500", 500));
    await expect(handleAsaasEvent(paymentEvent("PAYMENT_RECEIVED", "evt_3"), NOW)).rejects.toThrow("500");
  });

  it("tick suspends after 3 days and ends after 30 with deleteSubscription", async () => {
    const { runBillingTick } = await import("./billing-sync");
    const mock = await asaas();
    await createUser("a", { plan: "completo" });
    await insertSubscription("a", { status: "overdue", overdueSince: new Date(NOW.getTime() - 4 * DAY) });
    await createUser("b");
    await insertSubscription("b", { status: "suspended", overdueSince: new Date(NOW.getTime() - 31 * DAY) });
    await createUser("c", { plan: "completo" });
    await insertSubscription("c", { status: "overdue", overdueSince: new Date(NOW.getTime() - DAY) });

    expect(await runBillingTick(NOW)).toEqual({ changed: 2, failed: 0 });
    expect(await readSubscription("a")).toMatchObject({ status: "suspended" });
    expect((await readUser("a")).plan).toBe("basico");
    expect(await readSubscription("b")).toMatchObject({ status: "ended" });
    expect(mock.deleteSubscription).toHaveBeenCalledTimes(1);
    expect(mock.deleteSubscription).toHaveBeenCalledWith("sub_b");
    expect(await readSubscription("c")).toMatchObject({ status: "overdue" });
    expect((await readUser("c")).plan).toBe("completo");
  });

  it("tick counts a failing row and still processes the others", async () => {
    const { runBillingTick } = await import("./billing-sync");
    const mock = await asaas();
    mock.deleteSubscription.mockRejectedValueOnce(new Error("network down"));
    await createUser("a");
    await insertSubscription("a", { status: "suspended", overdueSince: new Date(NOW.getTime() - 31 * DAY) });
    await createUser("b", { plan: "completo" });
    await insertSubscription("b", { status: "canceled", periodEnd: new Date(NOW.getTime() - DAY) });

    expect(await runBillingTick(NOW)).toEqual({ changed: 1, failed: 1 });
    expect(await readSubscription("a")).toMatchObject({ status: "suspended" });
    expect(await readSubscription("b")).toMatchObject({ status: "ended" });
    expect((await readUser("b")).plan).toBe("basico");
  });

  it("tick on a complimentary user without subscription does nothing", async () => {
    const { runBillingTick } = await import("./billing-sync");
    await createUser("a", { plan: "completo", complimentary: true });

    expect(await runBillingTick(NOW)).toEqual({ changed: 0, failed: 0 });
    expect((await readUser("a")).plan).toBe("completo");
  });
});
