import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getDashboardData } from "@/lib/instagram";
import { getViewer, type Viewer } from "@/lib/viewer";
import { GET } from "./route";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/instagram", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/instagram")>()),
  getDashboardData: vi.fn(async (target: string) => ({ source: "live", profile: { username: target } })),
}));
vi.mock("@/lib/viewer", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/viewer")>()),
  getViewer: vi.fn(),
}));

const viewer = (overrides: Partial<Viewer>): Viewer => ({
  userId: "u1",
  name: "Cliente",
  email: "cliente@example.com",
  image: null,
  isAdmin: false,
  plan: "basico",
  instagramUsername: "meuperfil",
  termsAcceptedAt: new Date(),
  unofficialSource: false,
  ...overrides,
});

const call = (target: string) =>
  GET(new NextRequest(`http://localhost/api/instagram?target=${encodeURIComponent(target)}`));

beforeEach(() => vi.mocked(getDashboardData).mockClear());

describe("GET /api/instagram", () => {
  it("requires a signed-in viewer", async () => {
    vi.mocked(getViewer).mockResolvedValue(null);
    const res = await call("biodev");
    expect(res.status).toBe(401);
    expect((await res.json()).error).toBe("Faça login para continuar.");
    expect(getDashboardData).not.toHaveBeenCalled();
  });

  it("rejects customers who have not locked a profile yet", async () => {
    vi.mocked(getViewer).mockResolvedValue(viewer({ instagramUsername: null }));
    expect((await call("biodev")).status).toBe(403);
    expect(getDashboardData).not.toHaveBeenCalled();
  });

  it("always serves a customer's own profile, without competitors on the basic plan", async () => {
    vi.mocked(getViewer).mockResolvedValue(viewer({}));
    const res = await call("outro");
    expect(res.status).toBe(200);
    expect(getDashboardData).toHaveBeenCalledWith("meuperfil", {
      includeCompetitors: false,
      includeContent: false,
      mockOnFailure: false,
      allowUnofficial: false,
    });
  });

  it("includes competitors for the complete plan", async () => {
    vi.mocked(getViewer).mockResolvedValue(viewer({ plan: "completo" }));
    await call("outro");
    expect(getDashboardData).toHaveBeenCalledWith("meuperfil", {
      includeCompetitors: true,
      includeContent: true,
      mockOnFailure: false,
      allowUnofficial: false,
    });
  });

  it("lets opted-in customers use the unofficial source", async () => {
    vi.mocked(getViewer).mockResolvedValue(viewer({ unofficialSource: true }));
    await call("outro");
    expect(getDashboardData).toHaveBeenCalledWith("meuperfil", {
      includeCompetitors: false,
      includeContent: false,
      mockOnFailure: false,
      allowUnofficial: true,
    });
  });

  it("answers 503 to customers when real data is unavailable", async () => {
    vi.mocked(getViewer).mockResolvedValue(viewer({}));
    vi.mocked(getDashboardData).mockResolvedValueOnce({ failure: "unavailable" });
    const res = await call("meuperfil");
    expect(res.status).toBe(503);
    expect((await res.json()).error).toBe("Dados indisponíveis no momento. Tente novamente mais tarde.");
  });

  it("explains a disabled unofficial source with 503", async () => {
    vi.mocked(getViewer).mockResolvedValue(viewer({}));
    vi.mocked(getDashboardData).mockResolvedValueOnce({ failure: "not_business" });
    const res = await call("meuperfil");
    expect(res.status).toBe(503);
    expect((await res.json()).error).toBe(
      "Não conseguimos ler seu perfil como conta profissional e a fonte não oficial está desativada para sua conta. Para continuar, mude sua conta do Instagram para profissional (comercial ou criador).",
    );
  });

  it("lets admins query any profile, accepting a leading @", async () => {
    vi.mocked(getViewer).mockResolvedValue(viewer({ isAdmin: true, instagramUsername: null }));
    const res = await call("@biodev");
    expect(res.status).toBe(200);
    expect(getDashboardData).toHaveBeenCalledWith("biodev", {
      includeCompetitors: true,
      includeContent: true,
      mockOnFailure: true,
      allowUnofficial: true,
    });
  });

  it("rejects an invalid admin target with 400 and a pt-BR message", async () => {
    vi.mocked(getViewer).mockResolvedValue(viewer({ isAdmin: true }));
    const res = await call("x){followers_count}");
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/Perfil inválido/);
    expect(getDashboardData).not.toHaveBeenCalled();
  });
});
