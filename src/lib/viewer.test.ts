import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { getAuth } from "./auth";
import { getViewer, requireAdmin, requireViewer, targetFor, type Viewer } from "./viewer";

vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({ headers: vi.fn(async () => new Headers()) }));
vi.mock("next/navigation", () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`REDIRECT ${url}`);
  }),
  notFound: vi.fn(() => {
    throw new Error("NOT_FOUND");
  }),
}));
vi.mock("./auth", () => ({ getAuth: vi.fn() }));

type SessionUser = {
  id: string;
  name: string;
  email: string;
  image?: string | null;
  plan?: string;
  instagramUsername?: string | null;
  complimentary?: boolean;
  unofficialSource?: boolean;
};

function signIn(user: SessionUser | null) {
  vi.mocked(getAuth).mockReturnValue(
    (user
      ? { api: { getSession: vi.fn(async () => ({ user, session: { id: "s" } })) } }
      : { api: { getSession: vi.fn(async () => null) } }) as never,
  );
}

const customer = (plan: string, instagramUsername: string | null = "meuperfil"): SessionUser => ({
  id: "u1",
  name: "Cliente",
  email: "cliente@example.com",
  plan,
  instagramUsername,
});

beforeEach(() => vi.stubEnv("ADMIN_EMAILS", "admin@example.com"));
afterEach(() => vi.unstubAllEnvs());

const viewer = (overrides: Partial<Viewer>): Viewer => ({
  userId: "u1",
  name: "Cliente",
  email: "cliente@example.com",
  image: null,
  isAdmin: false,
  plan: "basico",
  instagramUsername: "meuperfil",
  termsAcceptedAt: null,
  complimentary: false,
  unofficialSource: false,
  ...overrides,
});

describe("targetFor", () => {
  it("ignores the requested profile for customers", () => {
    expect(targetFor(viewer({}), "outro")).toBe("meuperfil");
  });

  it("lets admins analyse any valid profile", () => {
    expect(targetFor(viewer({ isAdmin: true }), "@Outro")).toBe("outro");
  });
});

describe("requireViewer", () => {
  it("sends visitors without a session to /entrar", async () => {
    signIn(null);
    await expect(requireViewer("/")).rejects.toThrow("REDIRECT /entrar");
  });

  it("sends customers without a locked profile to /perfil", async () => {
    signIn(customer("basico", null));
    await expect(requireViewer("/")).rejects.toThrow("REDIRECT /perfil");
  });

  it("sends customers outside their plan to /plano", async () => {
    signIn(customer("basico"));
    await expect(requireViewer("/mercado")).rejects.toThrow("REDIRECT /plano?secao=/mercado");
    expect(redirect).toHaveBeenCalledWith("/plano?secao=/mercado");
  });

  it("hides settings from customers", async () => {
    signIn(customer("completo"));
    await expect(requireViewer("/configuracoes")).rejects.toThrow("NOT_FOUND");
  });

  it("returns the viewer, defaulting an unknown plan to basico", async () => {
    signIn(customer("premium"));
    await expect(requireViewer("/")).resolves.toMatchObject({ plan: "basico", instagramUsername: "meuperfil", isAdmin: false });
  });

  it("treats ADMIN_EMAILS accounts as admins on any plan", async () => {
    signIn({ ...customer("basico", null), email: "Admin@Example.com" });
    await expect(requireViewer("/mercado")).resolves.toMatchObject({ isAdmin: true });
  });

  it("reads the complimentary flag, defaulting to false", async () => {
    signIn(customer("completo"));
    await expect(requireViewer("/conta")).resolves.toMatchObject({ complimentary: false });
    signIn({ ...customer("completo"), complimentary: true });
    await expect(requireViewer("/conta")).resolves.toMatchObject({ complimentary: true });
  });

  it("allows /conta for any signed-in customer with a profile", async () => {
    signIn(customer("basico"));
    await expect(requireViewer("/conta")).resolves.toMatchObject({ userId: "u1" });
  });
});

describe("requireAdmin", () => {
  it("is a 404 for customers and visitors", async () => {
    signIn(customer("completo"));
    await expect(requireAdmin()).rejects.toThrow("NOT_FOUND");
    signIn(null);
    await expect(requireAdmin()).rejects.toThrow("NOT_FOUND");
    expect(notFound).toHaveBeenCalledTimes(2);
  });
});

describe("getViewer", () => {
  it("reads the request even when login is not configured, so pages never prerender", async () => {
    vi.mocked(getAuth).mockReturnValue(null);
    vi.mocked(headers).mockClear();
    expect(await getViewer()).toBeNull();
    expect(headers).toHaveBeenCalled();
  });

  it("reads the unofficial source flag, defaulting to false", async () => {
    signIn({ ...customer("completo"), unofficialSource: true });
    expect((await getViewer())?.unofficialSource).toBe(true);
    signIn(customer("completo"));
    expect((await getViewer())?.unofficialSource).toBe(false);
  });
});
