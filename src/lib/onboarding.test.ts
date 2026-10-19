import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fetchProfile, GraphRequestError } from "./graph";
import { lockMessage, lookupProfile } from "./onboarding";

vi.mock("server-only", () => ({}));
vi.mock("./logger", () => ({ logger: { warn: vi.fn() } }));
vi.mock("./graph", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./graph")>()),
  fetchProfile: vi.fn(),
}));

beforeEach(() => {
  vi.stubEnv("INSTAGRAM_ACCESS_TOKEN", "test-token");
  vi.stubEnv("INSTAGRAM_BUSINESS_ID", "123");
  vi.mocked(fetchProfile).mockResolvedValue({
    username: "biodev",
    name: "Bio Dev",
    profile_picture_url: "https://example.com/p.jpg",
    followers_count: 1234,
    media_count: 3,
  });
});
afterEach(() => vi.unstubAllEnvs());

describe("lookupProfile", () => {
  it("normalizes the @ and returns a preview", async () => {
    const result = await lookupProfile("@BioDev");
    expect(fetchProfile).toHaveBeenCalledWith("biodev", expect.anything(), false);
    expect(result).toEqual({
      ok: true,
      profile: { username: "biodev", name: "Bio Dev", pictureUrl: "https://example.com/p.jpg", followers: 1234 },
    });
  });

  it("falls back to the @ when the profile has no name or picture", async () => {
    vi.mocked(fetchProfile).mockResolvedValueOnce({ username: "biodev", followers_count: 1, media_count: 0 });
    const result = await lookupProfile("biodev");
    expect(result).toMatchObject({ ok: true, profile: { name: "@biodev", pictureUrl: null } });
  });

  it("rejects an invalid @ without calling the API", async () => {
    expect(await lookupProfile("a b")).toEqual({
      ok: false,
      message: "Digite um @ válido: letras, números, ponto e sublinhado.",
    });
    expect(fetchProfile).not.toHaveBeenCalled();
  });

  it("is unavailable without Instagram credentials", async () => {
    vi.stubEnv("INSTAGRAM_ACCESS_TOKEN", "");
    expect(await lookupProfile("biodev")).toEqual({ ok: false, message: "Serviço indisponível no momento. Tente mais tarde." });
  });

  it("explains personal or missing accounts", async () => {
    vi.mocked(fetchProfile).mockRejectedValueOnce(new GraphRequestError("not found", 100));
    expect(await lookupProfile("pessoal")).toEqual({
      ok: false,
      message:
        "Não encontramos esse perfil como conta comercial ou de criador. Se a conta for pessoal, mude para profissional nas configurações do Instagram e tente de novo.",
    });
  });

  it("hides other Graph errors behind a generic message", async () => {
    vi.mocked(fetchProfile).mockRejectedValueOnce(new GraphRequestError("Token do Instagram expirado ou inválido.", 190));
    expect(await lookupProfile("biodev")).toEqual({ ok: false, message: "Serviço indisponível no momento. Tente mais tarde." });
  });
});

describe("lockMessage", () => {
  it("explains each refusal", () => {
    expect(lockMessage({ ok: false, reason: "already_locked" })).toBe("Sua conta já tem um perfil escolhido.");
    expect(lockMessage({ ok: false, reason: "terms_required" })).toBe(
      "Aceite os termos e a política de privacidade para continuar.",
    );
  });
});
