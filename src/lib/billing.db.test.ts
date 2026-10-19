// Integration test against a real PostgreSQL. Runs only when TEST_DATABASE_URL points to a
// disposable database (never production); CI skips it. The Asaas client is mocked.
import { eq, sql } from "drizzle-orm";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { NewSubscription } from "@/db/schema";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/logger", () => ({ logger: { error: vi.fn(), warn: vi.fn() } }));
vi.mock("@/lib/asaas", async (importOriginal) => ({
  AsaasError: (await importOriginal<typeof import("@/lib/asaas")>()).AsaasError,
  getAsaasConfig: vi.fn(),
  createCustomer: vi.fn(),
  createSubscription: vi.fn(),
  updateSubscriptionValue: vi.fn(),
  deleteSubscription: vi.fn(),
  firstPaymentUrl: vi.fn(),
}));

const url = process.env.TEST_DATABASE_URL;
const NOW = new Date("2026-10-19T15:00:00Z");
const PERIOD_END = new Date("2026-11-05T15:00:00Z");
const CPF = "529.982.247-25";

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
      asaasCustomerId: "cus_old",
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

const checkoutInput = (userId: string) => ({
  userId,
  name: "Ana",
  email: `${userId}@example.com`,
  plan: "intermediario" as const,
  cycle: "monthly" as const,
  cpfCnpj: CPF,
});

describe.skipIf(!url)("billing (PostgreSQL)", () => {
  beforeAll(async () => {
    vi.stubEnv("DATABASE_URL", url!);
    await migrate(await db(), { migrationsFolder: "drizzle" });
  });

  beforeEach(async () => {
    await (await db()).execute(sql`truncate table "user" cascade`);
    const mock = await asaas();
    for (const fn of [
      mock.getAsaasConfig,
      mock.createCustomer,
      mock.createSubscription,
      mock.updateSubscriptionValue,
      mock.deleteSubscription,
      mock.firstPaymentUrl,
    ]) {
      fn.mockReset();
    }
    mock.getAsaasConfig.mockReturnValue({ apiKey: "k", webhookToken: "t".repeat(32), baseUrl: "https://api-sandbox.asaas.com/v3" });
    mock.createCustomer.mockResolvedValue({ id: "cus_1" });
    mock.createSubscription.mockResolvedValue({ id: "sub_1" });
    mock.firstPaymentUrl.mockResolvedValue("https://pay.example/1");
    mock.updateSubscriptionValue.mockResolvedValue();
    mock.deleteSubscription.mockResolvedValue();
  });

  afterAll(async () => {
    const { closeDatabase } = await import("@/db");
    await closeDatabase();
    vi.unstubAllEnvs();
  });

  it("first checkout creates customer and subscription and returns the invoice URL", async () => {
    const { startCheckout } = await import("./billing");
    const mock = await asaas();
    await createUser("a");

    expect(await startCheckout(checkoutInput("a"), NOW)).toEqual({ ok: true, url: "https://pay.example/1" });
    expect(mock.createCustomer).toHaveBeenCalledWith({
      name: "Ana",
      email: "a@example.com",
      cpfCnpj: "52998224725",
      externalReference: "a",
    });
    expect(mock.createSubscription).toHaveBeenCalledWith({
      customer: "cus_1",
      value: 59.9,
      cycle: "MONTHLY",
      nextDueDate: "2026-10-19",
      description: "Nichemap — Plano Intermediário (mensal)",
      externalReference: "a",
    });
    const row = await readSubscription("a");
    expect(row).toMatchObject({
      asaasCustomerId: "cus_1",
      asaasSubscriptionId: "sub_1",
      plan: "intermediario",
      cycle: "monthly",
      status: "pending",
      invoiceUrl: "https://pay.example/1",
    });
    expect((await readUser("a")).plan).toBe("basico");
  });

  it("second checkout while pending returns the same URL and creates nothing", async () => {
    const { startCheckout } = await import("./billing");
    const mock = await asaas();
    await createUser("a");
    await startCheckout(checkoutInput("a"), NOW);

    expect(await startCheckout({ ...checkoutInput("a"), plan: "completo" }, NOW)).toEqual({
      ok: true,
      url: "https://pay.example/1",
    });
    expect(mock.createCustomer).toHaveBeenCalledTimes(1);
    expect(mock.createSubscription).toHaveBeenCalledTimes(1);
  });

  it("checkout while active returns already_subscribed", async () => {
    const { startCheckout } = await import("./billing");
    const mock = await asaas();
    await createUser("a", { plan: "completo" });
    await insertSubscription("a", { status: "active" });

    expect(await startCheckout(checkoutInput("a"), NOW)).toEqual({ ok: false, reason: "already_subscribed" });
    expect(mock.createSubscription).not.toHaveBeenCalled();
  });

  it("checkout on a complimentary account returns complimentary", async () => {
    const { startCheckout } = await import("./billing");
    const mock = await asaas();
    await createUser("a", { plan: "completo", complimentary: true });

    expect(await startCheckout(checkoutInput("a"), NOW)).toEqual({ ok: false, reason: "complimentary" });
    expect(mock.createCustomer).not.toHaveBeenCalled();
  });

  it("checkout without Asaas config returns unavailable", async () => {
    const { startCheckout } = await import("./billing");
    const mock = await asaas();
    mock.getAsaasConfig.mockReturnValue(null);
    await createUser("a");

    expect(await startCheckout(checkoutInput("a"), NOW)).toEqual({ ok: false, reason: "unavailable" });
    expect(mock.createCustomer).not.toHaveBeenCalled();
  });

  it("checkout with invalid document makes no API call", async () => {
    const { startCheckout } = await import("./billing");
    const mock = await asaas();
    await createUser("a");

    expect(await startCheckout({ ...checkoutInput("a"), cpfCnpj: "111.111.111-11" }, NOW)).toEqual({
      ok: false,
      reason: "invalid_document",
    });
    expect(mock.createCustomer).not.toHaveBeenCalled();
    expect(mock.createSubscription).not.toHaveBeenCalled();
    expect(await readSubscription("a")).toBeUndefined();
  });

  it("provider error leaves no row", async () => {
    const { startCheckout } = await import("./billing");
    const mock = await asaas();
    const { AsaasError } = await import("@/lib/asaas");
    mock.createSubscription.mockRejectedValue(new AsaasError("Asaas POST /subscriptions failed with status 400", 400));
    await createUser("a");

    expect(await startCheckout(checkoutInput("a"), NOW)).toEqual({ ok: false, reason: "provider_error" });
    expect(await readSubscription("a")).toBeUndefined();
    expect(mock.deleteSubscription).not.toHaveBeenCalled();
  });

  it("a failure after the remote subscription exists deletes it and leaves no row", async () => {
    const { startCheckout } = await import("./billing");
    const mock = await asaas();
    mock.firstPaymentUrl.mockRejectedValue(new Error("Asaas subscription sub_1 has no payments yet"));
    await createUser("a");

    expect(await startCheckout(checkoutInput("a"), NOW)).toEqual({ ok: false, reason: "provider_error" });
    expect(mock.deleteSubscription).toHaveBeenCalledWith("sub_1");
    expect(await readSubscription("a")).toBeUndefined();
  });

  it("resubscribe while canceled keeps the paid plan until periodEnd and schedules the new one", async () => {
    const { startCheckout } = await import("./billing");
    const mock = await asaas();
    await createUser("a", { plan: "completo" });
    await insertSubscription("a", { status: "canceled", asaasSubscriptionId: "sub_old" });

    expect(await startCheckout({ ...checkoutInput("a"), cycle: "yearly" }, NOW)).toEqual({ ok: true, url: "/conta" });
    expect(mock.createCustomer).not.toHaveBeenCalled();
    expect(mock.createSubscription).toHaveBeenCalledWith({
      customer: "cus_old",
      value: 599,
      cycle: "YEARLY",
      nextDueDate: "2026-11-05",
      description: "Nichemap — Plano Intermediário (anual)",
      externalReference: "a",
    });
    const row = await readSubscription("a");
    expect(row).toMatchObject({
      status: "active",
      plan: "completo",
      scheduledPlan: "intermediario",
      cycle: "yearly",
      asaasSubscriptionId: "sub_1",
      periodEnd: PERIOD_END,
    });
    expect((await readUser("a")).plan).toBe("completo");
  });

  it("checkout after an expired cancellation starts a new pending subscription on the same customer", async () => {
    const { startCheckout } = await import("./billing");
    const mock = await asaas();
    await createUser("a", { plan: "completo" });
    await insertSubscription("a", { status: "canceled", periodEnd: new Date("2026-10-01T15:00:00Z") });

    expect(await startCheckout(checkoutInput("a"), NOW)).toEqual({ ok: true, url: "https://pay.example/1" });
    expect(mock.createCustomer).not.toHaveBeenCalled();
    expect(mock.createSubscription).toHaveBeenCalledWith(expect.objectContaining({ customer: "cus_old" }));
    const row = await readSubscription("a");
    expect(row).toMatchObject({ status: "pending", plan: "intermediario", periodEnd: null, asaasSubscriptionId: "sub_1" });
    expect(row.createdAt).toEqual(NOW);
    expect((await readUser("a")).plan).toBe("basico");
  });

  it("monthly upgrade changes user.plan immediately", async () => {
    const { changePlan } = await import("./billing");
    const mock = await asaas();
    await createUser("a", { plan: "intermediario" });
    await insertSubscription("a", { plan: "intermediario" });

    expect(await changePlan("a", "completo")).toEqual({ ok: true });
    expect(mock.updateSubscriptionValue).toHaveBeenCalledWith("sub_a", 99.9);
    expect(await readSubscription("a")).toMatchObject({ plan: "completo", scheduledPlan: null });
    expect((await readUser("a")).plan).toBe("completo");
  });

  it("downgrade is scheduled and user.plan is unchanged", async () => {
    const { changePlan } = await import("./billing");
    const mock = await asaas();
    await createUser("a", { plan: "completo" });
    await insertSubscription("a", { plan: "completo" });

    expect(await changePlan("a", "intermediario")).toEqual({ ok: true });
    expect(mock.updateSubscriptionValue).toHaveBeenCalledWith("sub_a", 59.9);
    expect(await readSubscription("a")).toMatchObject({ plan: "completo", scheduledPlan: "intermediario" });
    expect((await readUser("a")).plan).toBe("completo");
  });

  it("yearly upgrade is scheduled and plan change needs an active subscription", async () => {
    const { changePlan } = await import("./billing");
    const mock = await asaas();
    await createUser("a", { plan: "intermediario" });
    await insertSubscription("a", { plan: "intermediario", cycle: "yearly" });
    await createUser("b");
    await insertSubscription("b", { plan: "intermediario", status: "pending", periodEnd: null });

    expect(await changePlan("a", "completo")).toEqual({ ok: true });
    expect(mock.updateSubscriptionValue).toHaveBeenCalledWith("sub_a", 999);
    expect(await readSubscription("a")).toMatchObject({ plan: "intermediario", scheduledPlan: "completo" });
    expect((await readUser("a")).plan).toBe("intermediario");

    expect(await changePlan("b", "completo")).toEqual({ ok: false });
    expect(mock.updateSubscriptionValue).toHaveBeenCalledTimes(1);
  });

  it("cancel keeps the plan until periodEnd and calls deleteSubscription", async () => {
    const { cancelSubscription } = await import("./billing");
    const mock = await asaas();
    await createUser("a", { plan: "completo" });
    await insertSubscription("a", {});

    expect(await cancelSubscription("a", NOW)).toEqual({ ok: true });
    expect(mock.deleteSubscription).toHaveBeenCalledWith("sub_a");
    expect(await readSubscription("a")).toMatchObject({ status: "canceled", periodEnd: PERIOD_END });
    expect((await readUser("a")).plan).toBe("completo");
  });

  it("cancel with Asaas failing changes nothing", async () => {
    const { cancelSubscription } = await import("./billing");
    const mock = await asaas();
    const { AsaasError } = await import("@/lib/asaas");
    mock.deleteSubscription.mockRejectedValue(new AsaasError("Asaas DELETE failed with status 500", 500));
    await createUser("a", { plan: "completo" });
    await insertSubscription("a", {});

    expect(await cancelSubscription("a", NOW)).toEqual({ ok: false });
    expect(await readSubscription("a")).toMatchObject({ status: "active" });
    expect((await readUser("a")).plan).toBe("completo");
  });

  it("summary ends a cancellation past periodEnd and drops the plan", async () => {
    const { getBillingSummary } = await import("./billing");
    await createUser("a", { plan: "completo" });
    await insertSubscription("a", { status: "canceled", periodEnd: new Date("2026-10-01T15:00:00Z"), invoiceUrl: "u" });

    expect(await getBillingSummary("a", NOW)).toMatchObject({ status: "ended", plan: "completo", invoiceUrl: "u" });
    expect(await readSubscription("a")).toMatchObject({ status: "ended" });
    expect((await readUser("a")).plan).toBe("basico");
    expect(await getBillingSummary("nobody", NOW)).toBeNull();
  });

  it("summary keeps the un-ticked state when the remote cancel fails", async () => {
    const { getBillingSummary } = await import("./billing");
    const mock = await asaas();
    mock.deleteSubscription.mockRejectedValue(new Error("network down"));
    await createUser("a");
    await insertSubscription("a", {
      status: "suspended",
      plan: "intermediario",
      overdueSince: new Date("2026-09-01T15:00:00Z"),
    });

    expect(await getBillingSummary("a", NOW)).toMatchObject({ status: "suspended" });
    expect(mock.deleteSubscription).toHaveBeenCalledWith("sub_a");
    expect(await readSubscription("a")).toMatchObject({ status: "suspended" });
  });
});
