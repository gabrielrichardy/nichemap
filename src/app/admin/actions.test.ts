import { beforeEach, describe, expect, it, vi } from "vitest";
import { notFound } from "next/navigation";
import { setManualPlan, unlockProfile } from "@/lib/accounts";
import { requireAdmin } from "@/lib/viewer";
import { changePlan, unlockAccountProfile } from "./actions";

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({
  notFound: vi.fn(() => {
    throw new Error("NOT_FOUND");
  }),
}));
vi.mock("@/lib/accounts", () => ({ setManualPlan: vi.fn(), unlockProfile: vi.fn() }));
vi.mock("@/lib/viewer", () => ({ requireAdmin: vi.fn() }));

const form = (fields: Record<string, string>) => {
  const data = new FormData();
  for (const [k, v] of Object.entries(fields)) data.set(k, v);
  return data;
};

const asCustomer = () => vi.mocked(requireAdmin).mockImplementation(async () => notFound());
const asAdmin = () => vi.mocked(requireAdmin).mockResolvedValue({ isAdmin: true } as never);

beforeEach(() => vi.clearAllMocks());

describe("changePlan", () => {
  it("is a 404 for non-admins and changes nothing", async () => {
    asCustomer();
    await expect(changePlan(form({ userId: "u1", plan: "completo" }))).rejects.toThrow("NOT_FOUND");
    expect(setManualPlan).not.toHaveBeenCalled();
  });

  it("rejects an unknown plan", async () => {
    asAdmin();
    await expect(changePlan(form({ userId: "u1", plan: "premium" }))).rejects.toThrow();
    expect(setManualPlan).not.toHaveBeenCalled();
  });

  it("sets a valid plan without cortesia by default", async () => {
    asAdmin();
    await changePlan(form({ userId: "u1", plan: "completo" }));
    expect(setManualPlan).toHaveBeenCalledWith("u1", "completo", false);
  });

  it("passes the cortesia checkbox through", async () => {
    asAdmin();
    await changePlan(form({ userId: "u1", plan: "intermediario", complimentary: "on" }));
    expect(setManualPlan).toHaveBeenCalledWith("u1", "intermediario", true);
  });
});

describe("unlockAccountProfile", () => {
  it("is a 404 for non-admins", async () => {
    asCustomer();
    await expect(unlockAccountProfile(form({ userId: "u1" }))).rejects.toThrow("NOT_FOUND");
    expect(unlockProfile).not.toHaveBeenCalled();
  });

  it("unlocks for admins", async () => {
    asAdmin();
    await unlockAccountProfile(form({ userId: "u1" }));
    expect(unlockProfile).toHaveBeenCalledWith("u1");
  });

  it("rejects an empty user id", async () => {
    asAdmin();
    await expect(unlockAccountProfile(form({ userId: "" }))).rejects.toThrow();
    expect(unlockProfile).not.toHaveBeenCalled();
  });
});
