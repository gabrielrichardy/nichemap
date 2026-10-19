import { beforeEach, describe, expect, it, vi } from "vitest";
import { deleteAccount } from "@/lib/accounts";
import { getAuth } from "@/lib/auth";
import { getViewer } from "@/lib/viewer";
import { deleteMyAccount } from "./actions";

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
vi.mock("@/lib/viewer", () => ({ getViewer: vi.fn() }));

const signOut = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getViewer).mockResolvedValue({ userId: "u1" } as never);
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
