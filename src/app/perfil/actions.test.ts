import { beforeEach, describe, expect, it, vi } from "vitest";
import { lockProfile } from "@/lib/accounts";
import { lookupProfile } from "@/lib/onboarding";
import { getViewer } from "@/lib/viewer";
import { confirmProfile, previewProfile } from "./actions";

vi.mock("server-only", () => ({}));
vi.mock("next/navigation", () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`REDIRECT ${url}`);
  }),
}));
vi.mock("@/lib/accounts", () => ({ lockProfile: vi.fn() }));
vi.mock("@/lib/onboarding", () => ({ lookupProfile: vi.fn(), lockMessage: vi.fn() }));
vi.mock("@/lib/viewer", () => ({ getViewer: vi.fn() }));

const form = (username: string) => {
  const data = new FormData();
  data.set("username", username);
  data.set("terms", "on");
  return data;
};

beforeEach(() => vi.clearAllMocks());

describe("profile actions", () => {
  it("stop looking profiles up once the account has a locked profile", async () => {
    vi.mocked(getViewer).mockResolvedValue({ isAdmin: false, instagramUsername: "meuperfil", userId: "u1" } as never);
    await expect(previewProfile({}, form("outro"))).rejects.toThrow("REDIRECT /");
    await expect(confirmProfile({}, form("outro"))).rejects.toThrow("REDIRECT /");
    expect(lookupProfile).not.toHaveBeenCalled();
    expect(lockProfile).not.toHaveBeenCalled();
  });

  it("are not available to admins", async () => {
    vi.mocked(getViewer).mockResolvedValue({ isAdmin: true, instagramUsername: null, userId: "a" } as never);
    await expect(previewProfile({}, form("outro"))).rejects.toThrow("REDIRECT /");
    expect(lookupProfile).not.toHaveBeenCalled();
  });

  it("pass the account's unofficial source permission to the lookup", async () => {
    vi.mocked(getViewer).mockResolvedValue({
      isAdmin: false,
      instagramUsername: null,
      userId: "u1",
      unofficialSource: true,
    } as never);
    vi.mocked(lookupProfile).mockResolvedValue({ ok: false, message: "x" });
    await previewProfile({}, form("pessoal"));
    await confirmProfile({}, form("pessoal"));
    expect(lookupProfile).toHaveBeenNthCalledWith(1, "pessoal", { allowUnofficial: true });
    expect(lookupProfile).toHaveBeenNthCalledWith(2, "pessoal", { allowUnofficial: true });
  });

  it("send visitors without a session to /entrar", async () => {
    vi.mocked(getViewer).mockResolvedValue(null);
    await expect(previewProfile({}, form("outro"))).rejects.toThrow("REDIRECT /entrar");
  });
});
