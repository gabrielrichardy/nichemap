import { beforeEach, describe, expect, it, vi } from "vitest";
import { revalidatePath } from "next/cache";
import { deleteAccount } from "@/lib/accounts";
import { getAuth } from "@/lib/auth";
import { cancelSubscription, changePlan } from "@/lib/billing";
import { getViewer, requireViewer } from "@/lib/viewer";
import { cancelMySubscription, changeMyPlan, deleteMyAccount } from "./actions";

vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({ headers: vi.fn(async () => new Headers()) }));
vi.mock("next/navigation", () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`REDIRECT ${url}`);
  }),
}));
vi.mock("@/lib/logger", () => ({ logger: { info: vi.fn(), warn: vi.fn() } }));
vi.mock("@/lib/accounts", () => ({ deleteAccount: vi.fn() }));
vi.mock("@/lib/auth", () => ({ getAuth: vi.fn() }));
vi.mock("@/lib/viewer", () => ({ getViewer: vi.fn(), requireViewer: vi.fn() }));
vi.mock("@/lib/billing", () => ({ cancelSubscription: vi.fn(), changePlan: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const signOut = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getViewer).mockResolvedValue({ userId: "u1" } as never);
  vi.mocked(requireViewer).mockResolvedValue({ userId: "u1" } as never);
  vi.mocked(getAuth).mockReturnValue({ api: { signOut } } as never);
});

describe("deleteMyAccount", () => {
  it("keeps the customer signed in and reports the failure when the deletion fails", async () => {
    vi.mocked(deleteAccount).mockRejectedValueOnce(new Error("db down"));
    await expect(deleteMyAccount()).rejects.toThrow("db down");
    expect(signOut).not.toHaveBeenCalled();
  });

  it("deletes the account, then clears the session and goes to /entrar", async () => {
    await expect(deleteMyAccount()).rejects.toThrow("REDIRECT /entrar");
    expect(deleteAccount).toHaveBeenCalledWith("u1");
    expect(signOut).toHaveBeenCalled();
  });
});

const form = (fields: Record<string, string>) => {
  const data = new FormData();
  for (const [k, v] of Object.entries(fields)) data.set(k, v);
  return data;
};

describe("changeMyPlan", () => {
  it("rejects an unknown plan without calling changePlan", async () => {
    await expect(changeMyPlan(form({ plan: "basico" }))).rejects.toThrow();
    expect(changePlan).not.toHaveBeenCalled();
  });

  it("changes the session user's plan and refreshes /conta", async () => {
    vi.mocked(changePlan).mockResolvedValue({ ok: true });
    await expect(changeMyPlan(form({ plan: "completo", userId: "other" }))).resolves.toEqual({});
    expect(changePlan).toHaveBeenCalledWith("u1", "completo");
    expect(revalidatePath).toHaveBeenCalledWith("/conta");
  });

  it("reports a failed change", async () => {
    vi.mocked(changePlan).mockResolvedValue({ ok: false });
    await expect(changeMyPlan(form({ plan: "completo" }))).resolves.toEqual({
      error: "Não foi possível mudar o plano. Tente de novo em alguns minutos.",
    });
  });
});

describe("cancelMySubscription", () => {
  it("uses the session user, not form data", async () => {
    vi.mocked(cancelSubscription).mockResolvedValue({ ok: true });
    const cancel = cancelMySubscription as unknown as (data: FormData) => Promise<unknown>;
    await expect(cancel(form({ userId: "other" }))).resolves.toEqual({});
    expect(cancelSubscription).toHaveBeenCalledWith("u1");
    expect(revalidatePath).toHaveBeenCalledWith("/conta");
  });

  it("reports a failed cancellation", async () => {
    vi.mocked(cancelSubscription).mockResolvedValue({ ok: false });
    await expect(cancelMySubscription()).resolves.toEqual({
      error: "Não foi possível cancelar a assinatura. Tente de novo em alguns minutos.",
    });
  });
});
