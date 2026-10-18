import { NextRequest } from "next/server";
import { describe, expect, it, vi } from "vitest";
import { getDashboardData } from "@/lib/instagram";
import { GET } from "./route";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/instagram", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/instagram")>()),
  getDashboardData: vi.fn(async (target: string) => ({ source: "mock", profile: { username: target } })),
}));

const call = (target: string) =>
  GET(new NextRequest(`http://localhost/api/instagram?target=${encodeURIComponent(target)}`));

describe("GET /api/instagram", () => {
  it("accepts a leading @ and queries the bare username", async () => {
    const res = await call("@biodev");
    expect(res.status).toBe(200);
    expect(getDashboardData).toHaveBeenCalledWith("biodev");
  });

  it("rejects an invalid target with 400 and a pt-BR message", async () => {
    vi.mocked(getDashboardData).mockClear();
    const res = await call("x){followers_count}");
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/Perfil inválido/);
    expect(getDashboardData).not.toHaveBeenCalled();
  });
});
