import { beforeEach, describe, expect, it, vi } from "vitest";
import { revalidatePath } from "next/cache";
import { notFound } from "next/navigation";
import { setPlan, setUnofficialSource, unlockProfile } from "@/lib/accounts";
import { requireAdmin } from "@/lib/viewer";
import { changePlan, toggleUnofficialSource, unlockAccountProfile } from "./actions";

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({
  notFound: vi.fn(() => {
    throw new Error("NOT_FOUND");
  }),
}));
vi.mock("@/lib/accounts", () => ({ setPlan: vi.fn(), unlockProfile: vi.fn(), setUnofficialSource: vi.fn() }));
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
    expect(setPlan).not.toHaveBeenCalled();
  });

  it("rejects an unknown plan", async () => {
    asAdmin();
    await expect(changePlan(form({ userId: "u1", plan: "premium" }))).rejects.toThrow();
    expect(setPlan).not.toHaveBeenCalled();
  });

  it("sets a valid plan", async () => {
    asAdmin();
    await changePlan(form({ userId: "u1", plan: "completo" }));
    expect(setPlan).toHaveBeenCalledWith("u1", "completo");
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

describe("toggleUnofficialSource", () => {
  it("is a 404 for non-admins and changes nothing", async () => {
    asCustomer();
    await expect(toggleUnofficialSource(form({ userId: "u1", enabled: "true" }))).rejects.toThrow("NOT_FOUND");
    expect(setUnofficialSource).not.toHaveBeenCalled();
  });

  it("turns the source on for the account and revalidates the admin page", async () => {
    asAdmin();
    await toggleUnofficialSource(form({ userId: "u1", enabled: "true" }));
    expect(setUnofficialSource).toHaveBeenCalledWith("u1", true);
    expect(revalidatePath).toHaveBeenCalledWith("/admin");
  });

  it("turns the source off for the account", async () => {
    asAdmin();
    await toggleUnofficialSource(form({ userId: "u1", enabled: "false" }));
    expect(setUnofficialSource).toHaveBeenCalledWith("u1", false);
  });

  it("rejects any value other than true or false", async () => {
    asAdmin();
    await expect(toggleUnofficialSource(form({ userId: "u1", enabled: "maybe" }))).rejects.toThrow();
    expect(setUnofficialSource).not.toHaveBeenCalled();
  });
});
