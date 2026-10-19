import { beforeEach, describe, expect, it, vi } from "vitest";
import { redirect } from "next/navigation";
import { startCheckout } from "@/lib/billing";
import { logger } from "@/lib/logger";
import { requireViewer } from "@/lib/viewer";
import { subscribe } from "./actions";

vi.mock("server-only", () => ({}));
vi.mock("next/navigation", () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`REDIRECT ${url}`);
  }),
}));
vi.mock("@/lib/billing", () => ({ startCheckout: vi.fn() }));
vi.mock("@/lib/logger", () => ({ logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn() } }));
vi.mock("@/lib/viewer", () => ({ requireViewer: vi.fn() }));

const form = (fields: Record<string, string>) => {
  const data = new FormData();
  for (const [k, v] of Object.entries(fields)) data.set(k, v);
  return data;
};

const checkout = (overrides: Record<string, string> = {}) =>
  form({ plan: "intermediario", cycle: "monthly", cpfCnpj: "529.982.247-25", ...overrides });

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(requireViewer).mockResolvedValue({ userId: "u1", name: "Cliente", email: "cliente@example.com" } as never);
});

describe("subscribe", () => {
  it("rejects an unknown plan without calling startCheckout", async () => {
    await expect(subscribe({}, checkout({ plan: "premium" }))).rejects.toThrow();
    await expect(subscribe({}, checkout({ cycle: "weekly" }))).rejects.toThrow();
    expect(startCheckout).not.toHaveBeenCalled();
  });

  it('maps invalid_document to "CPF ou CNPJ inválido."', async () => {
    vi.mocked(startCheckout).mockResolvedValue({ ok: false, reason: "invalid_document" });
    await expect(subscribe({}, checkout())).resolves.toEqual({ error: "CPF ou CNPJ inválido." });
  });

  it("redirects to the returned url", async () => {
    vi.mocked(startCheckout).mockResolvedValue({ ok: true, url: "https://sandbox.asaas.com/i/abc" });
    await expect(subscribe({}, checkout({ cycle: "yearly", mobilePhone: "(11) 98765-4321" }))).rejects.toThrow(
      "REDIRECT https://sandbox.asaas.com/i/abc",
    );
    expect(redirect).toHaveBeenCalledWith("https://sandbox.asaas.com/i/abc");
    expect(startCheckout).toHaveBeenCalledWith({
      userId: "u1",
      name: "Cliente",
      email: "cliente@example.com",
      plan: "intermediario",
      cycle: "yearly",
      cpfCnpj: "529.982.247-25",
      mobilePhone: "11987654321",
    });
  });

  it("rejects a malformed mobile number next to the field", async () => {
    await expect(subscribe({}, checkout({ mobilePhone: "123" }))).resolves.toEqual({
      error: "Celular inválido. Use DDD e número, como (11) 98765-4321.",
    });
    expect(startCheckout).not.toHaveBeenCalled();
  });

  it("returns the inline provider error when startCheckout throws", async () => {
    vi.mocked(startCheckout).mockRejectedValue(new Error("Asaas 500"));
    await expect(subscribe({}, checkout())).resolves.toEqual({
      error: "Não foi possível falar com o sistema de pagamento. Tente de novo em alguns minutos.",
    });
    expect(logger.error).toHaveBeenCalledWith({ userId: "u1", action: "subscribe", error: "Asaas 500" }, "Checkout failed");
  });

  it("checks the session before anything else", async () => {
    vi.mocked(requireViewer).mockRejectedValue(new Error("REDIRECT /entrar"));
    await expect(subscribe({}, checkout())).rejects.toThrow("REDIRECT /entrar");
    expect(startCheckout).not.toHaveBeenCalled();
  });
});
