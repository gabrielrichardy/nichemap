import { describe, expect, it } from "vitest";
import { formatBRL, isPaidPlan, PRICES } from "./billing-plans";
import { applyBillingEvent, type BillingState, type BillingStatus, effectivePlan, isPlanLockedBy } from "./billing-rules";

const now = new Date("2026-11-10T12:00:00Z");
const d = (iso: string) => new Date(iso);

function state(overrides: Partial<BillingState> = {}): BillingState {
  return {
    status: "active",
    plan: "intermediario",
    cycle: "monthly",
    periodEnd: d("2026-12-01T00:00:00Z"),
    overdueSince: null,
    scheduledPlan: null,
    createdAt: d("2026-10-01T00:00:00Z"),
    ...overrides,
  };
}

describe("billing-plans", () => {
  it("holds the approved prices", () => {
    expect(PRICES).toEqual({
      intermediario: { monthly: 59.9, yearly: 599 },
      completo: { monthly: 99.9, yearly: 999 },
    });
  });

  it("recognises paid plans only", () => {
    expect(isPaidPlan("intermediario")).toBe(true);
    expect(isPaidPlan("completo")).toBe(true);
    expect(isPaidPlan("basico")).toBe(false);
    expect(isPaidPlan(undefined)).toBe(false);
  });

  it("formats values as BRL", () => {
    expect(formatBRL(59.9)).toBe("R$ 59,90");
    expect(formatBRL(999)).toBe("R$ 999,00");
    expect(formatBRL(1199.5)).toBe("R$ 1.199,50");
  });
});

describe("paid", () => {
  it("activates a pending monthly subscription for one month from the due date", () => {
    const out = applyBillingEvent(
      state({ status: "pending", periodEnd: null }),
      { type: "paid", dueDate: d("2026-11-05T00:00:00Z") },
      now,
    );
    expect(out.state).toMatchObject({ status: "active", periodEnd: d("2026-12-05T00:00:00Z"), overdueSince: null });
    expect(out.cancelRemote).toBe(false);
  });

  it("activates a pending yearly subscription for one year from the due date", () => {
    const out = applyBillingEvent(
      state({ status: "pending", cycle: "yearly", periodEnd: null }),
      { type: "paid", dueDate: d("2026-11-05T00:00:00Z") },
      now,
    );
    expect(out.state.periodEnd).toEqual(d("2027-11-05T00:00:00Z"));
  });

  it("clamps month addition to the end of the month", () => {
    const out = applyBillingEvent(
      state({ status: "pending", periodEnd: null }),
      { type: "paid", dueDate: d("2027-01-31T00:00:00Z") },
      now,
    );
    expect(out.state.periodEnd).toEqual(d("2027-02-28T00:00:00Z"));
    const leap = applyBillingEvent(
      state({ status: "pending", periodEnd: null }),
      { type: "paid", dueDate: d("2028-01-31T00:00:00Z") },
      now,
    );
    expect(leap.state.periodEnd).toEqual(d("2028-02-29T00:00:00Z"));
  });

  it("reactivates an overdue subscription from dueDate + cycle when that is later", () => {
    const out = applyBillingEvent(
      state({ status: "overdue", periodEnd: d("2026-11-01T00:00:00Z"), overdueSince: d("2026-11-01T00:00:00Z") }),
      { type: "paid", dueDate: d("2026-11-01T00:00:00Z") },
      now,
    );
    expect(out.state).toMatchObject({ status: "active", periodEnd: d("2026-12-01T00:00:00Z"), overdueSince: null });
  });

  it("reactivates a suspended subscription keeping a later current periodEnd", () => {
    const out = applyBillingEvent(
      state({ status: "suspended", periodEnd: d("2027-01-15T00:00:00Z"), overdueSince: d("2026-10-01T00:00:00Z") }),
      { type: "paid", dueDate: d("2026-10-01T00:00:00Z") },
      now,
    );
    expect(out.state).toMatchObject({ status: "active", periodEnd: d("2027-01-15T00:00:00Z"), overdueSince: null });
  });

  it("renews an active subscription from the later of periodEnd and dueDate + cycle", () => {
    const out = applyBillingEvent(
      state({ status: "active", periodEnd: d("2026-12-01T00:00:00Z") }),
      { type: "paid", dueDate: d("2026-12-01T00:00:00Z") },
      now,
    );
    expect(out.state).toMatchObject({ status: "active", periodEnd: d("2027-01-01T00:00:00Z") });
  });

  it("applies the scheduled plan and clears it", () => {
    const out = applyBillingEvent(
      state({ status: "active", plan: "completo", scheduledPlan: "intermediario" }),
      { type: "paid", dueDate: d("2026-12-01T00:00:00Z") },
      now,
    );
    expect(out.state).toMatchObject({ plan: "intermediario", scheduledPlan: null });
  });

  it("extends periodEnd but stays canceled when a late charge is paid after cancelling", () => {
    const out = applyBillingEvent(
      state({ status: "canceled", periodEnd: d("2026-11-20T00:00:00Z") }),
      { type: "paid", dueDate: d("2026-11-01T00:00:00Z") },
      now,
    );
    expect(out.state).toMatchObject({ status: "canceled", periodEnd: d("2026-12-01T00:00:00Z") });
    expect(out.cancelRemote).toBe(false);
  });

  it("changes nothing on an ended subscription", () => {
    const before = state({ status: "ended" });
    const out = applyBillingEvent(before, { type: "paid", dueDate: d("2026-11-01T00:00:00Z") }, now);
    expect(out).toEqual({ state: before, cancelRemote: false });
  });
});

describe("overdue", () => {
  it("marks an active subscription overdue since the due date", () => {
    const out = applyBillingEvent(state(), { type: "overdue", dueDate: d("2026-12-01T00:00:00Z") }, now);
    expect(out.state).toMatchObject({ status: "overdue", overdueSince: d("2026-12-01T00:00:00Z") });
    expect(out.cancelRemote).toBe(false);
  });

  it.each<BillingStatus>(["pending", "overdue", "suspended", "canceled", "ended"])("changes nothing on %s", (status) => {
    const before = state({ status, overdueSince: d("2026-11-01T00:00:00Z") });
    expect(applyBillingEvent(before, { type: "overdue", dueDate: d("2026-11-05T00:00:00Z") }, now)).toEqual({
      state: before,
      cancelRemote: false,
    });
  });
});

describe("tick", () => {
  it("suspends an overdue subscription after the grace period", () => {
    const out = applyBillingEvent(state({ status: "overdue", overdueSince: d("2026-11-07T12:00:00Z") }), { type: "tick" }, now);
    expect(out).toMatchObject({ state: { status: "suspended" }, cancelRemote: false });
  });

  it("ends an overdue or suspended subscription after 30 days and cancels it remotely", () => {
    for (const status of ["overdue", "suspended"] as const) {
      const out = applyBillingEvent(state({ status, overdueSince: d("2026-10-11T12:00:00Z") }), { type: "tick" }, now);
      expect(out).toMatchObject({ state: { status: "ended" }, cancelRemote: true });
    }
  });

  it("ends a canceled subscription once the paid period is over, without remote cancel", () => {
    const out = applyBillingEvent(state({ status: "canceled", periodEnd: d("2026-11-10T12:00:00Z") }), { type: "tick" }, now);
    expect(out).toMatchObject({ state: { status: "ended" }, cancelRemote: false });
  });

  it("ends an abandoned pending subscription after 30 days and cancels it remotely", () => {
    const out = applyBillingEvent(
      state({ status: "pending", periodEnd: null, createdAt: d("2026-10-11T12:00:00Z") }),
      { type: "tick" },
      now,
    );
    expect(out).toMatchObject({ state: { status: "ended" }, cancelRemote: true });
  });

  it("changes nothing otherwise", () => {
    const cases = [
      state({ status: "overdue", overdueSince: d("2026-11-07T12:00:01Z") }),
      state({ status: "suspended", overdueSince: d("2026-10-11T12:00:01Z") }),
      state({ status: "canceled", periodEnd: d("2026-11-10T12:00:01Z") }),
      state({ status: "pending", periodEnd: null, createdAt: d("2026-10-11T12:00:01Z") }),
      state({ status: "active" }),
      state({ status: "ended" }),
    ];
    for (const before of cases) {
      expect(applyBillingEvent(before, { type: "tick" }, now)).toEqual({ state: before, cancelRemote: false });
    }
  });
});

describe("refunded / chargeback", () => {
  it.each<BillingStatus>(["pending", "active", "overdue", "suspended", "canceled"])("ends %s and cancels remotely", (status) => {
    for (const type of ["refunded", "chargeback"] as const) {
      const out = applyBillingEvent(state({ status }), { type }, now);
      expect(out).toMatchObject({ state: { status: "ended" }, cancelRemote: true });
    }
  });

  it("changes nothing on ended", () => {
    const before = state({ status: "ended" });
    for (const type of ["refunded", "chargeback"] as const) {
      expect(applyBillingEvent(before, { type }, now)).toEqual({ state: before, cancelRemote: false });
    }
  });
});

describe("remote_deleted", () => {
  it.each<BillingStatus>(["canceled", "ended"])("changes nothing on %s", (status) => {
    const before = state({ status });
    expect(applyBillingEvent(before, { type: "remote_deleted" }, now)).toEqual({ state: before, cancelRemote: false });
  });

  it.each<BillingStatus>(["active", "overdue"])("cancels %s while the paid period runs", (status) => {
    const out = applyBillingEvent(state({ status, periodEnd: d("2026-11-20T00:00:00Z") }), { type: "remote_deleted" }, now);
    expect(out).toMatchObject({ state: { status: "canceled" }, cancelRemote: false });
  });

  it("ends everything else", () => {
    const cases = [
      state({ status: "active", periodEnd: now }),
      state({ status: "overdue", periodEnd: d("2026-11-01T00:00:00Z") }),
      state({ status: "pending", periodEnd: null }),
      state({ status: "suspended", periodEnd: d("2026-11-20T00:00:00Z") }),
    ];
    for (const before of cases) {
      expect(applyBillingEvent(before, { type: "remote_deleted" }, now)).toMatchObject({
        state: { status: "ended" },
        cancelRemote: false,
      });
    }
  });
});

describe("customer_cancel", () => {
  it("ends a pending subscription and cancels it remotely", () => {
    const out = applyBillingEvent(state({ status: "pending", periodEnd: null }), { type: "customer_cancel" }, now);
    expect(out).toMatchObject({ state: { status: "ended" }, cancelRemote: true });
  });

  it.each<BillingStatus>(["active", "overdue", "suspended"])("cancels %s with paid time left, keeping access", (status) => {
    const out = applyBillingEvent(state({ status, periodEnd: d("2026-11-20T00:00:00Z") }), { type: "customer_cancel" }, now);
    expect(out).toMatchObject({ state: { status: "canceled", periodEnd: d("2026-11-20T00:00:00Z") }, cancelRemote: true });
  });

  it("ends a suspended subscription whose paid period is over", () => {
    const out = applyBillingEvent(state({ status: "suspended", periodEnd: now }), { type: "customer_cancel" }, now);
    expect(out).toMatchObject({ state: { status: "ended" }, cancelRemote: true });
  });

  it.each<BillingStatus>(["canceled", "ended"])("changes nothing on %s", (status) => {
    const before = state({ status });
    expect(applyBillingEvent(before, { type: "customer_cancel" }, now)).toEqual({ state: before, cancelRemote: false });
  });
});

describe("effectivePlan", () => {
  const expected: Record<BillingStatus, string> = {
    pending: "basico",
    active: "completo",
    overdue: "completo",
    suspended: "basico",
    canceled: "completo",
    ended: "basico",
  };
  it.each(Object.entries(expected) as [BillingStatus, string][])("on %s gives %s", (status, plan) => {
    expect(effectivePlan(state({ status, plan: "completo" }))).toBe(plan);
  });
});

describe("isPlanLockedBy", () => {
  it.each<[BillingStatus | null, boolean]>([
    ["pending", true],
    ["active", true],
    ["overdue", true],
    ["suspended", true],
    ["canceled", true],
    ["ended", false],
    [null, false],
  ])("on %s is %s", (status, locked) => {
    expect(isPlanLockedBy(status)).toBe(locked);
  });
});
