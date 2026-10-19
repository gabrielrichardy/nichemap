import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { handleAsaasEvent } from "@/lib/billing-sync";
import { POST } from "./route";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/logger", () => ({ logger: { error: vi.fn(), info: vi.fn() } }));
vi.mock("@/lib/billing-sync", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/billing-sync")>()),
  handleAsaasEvent: vi.fn(),
}));

const TOKEN = "w".repeat(32);
const EVENT = { id: "evt_1", event: "PAYMENT_RECEIVED", payment: { id: "pay_1", value: 59.9 } };

const call = (body: string, token: string | null = TOKEN) =>
  POST(
    new NextRequest("http://localhost/api/billing/webhook", {
      method: "POST",
      body,
      headers: token === null ? {} : { "asaas-access-token": token },
    }),
  );

beforeEach(() => {
  vi.stubEnv("ASAAS_API_KEY", "$aact_test_key");
  vi.stubEnv("ASAAS_WEBHOOK_TOKEN", TOKEN);
  vi.mocked(handleAsaasEvent).mockReset();
});

afterEach(() => vi.unstubAllEnvs());

describe("POST /api/billing/webhook", () => {
  it("401 without or with wrong asaas-access-token", async () => {
    expect((await call(JSON.stringify(EVENT), null)).status).toBe(401);
    expect((await call(JSON.stringify(EVENT), "x".repeat(32))).status).toBe(401);
    expect((await call(JSON.stringify(EVENT), "short")).status).toBe(401);
    vi.stubEnv("ASAAS_WEBHOOK_TOKEN", undefined);
    expect((await call(JSON.stringify(EVENT))).status).toBe(401);
    expect(handleAsaasEvent).not.toHaveBeenCalled();
  });

  it("400 on invalid body", async () => {
    expect((await call("{not json")).status).toBe(400);
    expect((await call(JSON.stringify({ event: "PAYMENT_RECEIVED" }))).status).toBe(400);
    expect((await call(JSON.stringify({ id: "", event: "PAYMENT_RECEIVED" }))).status).toBe(400);
    expect(handleAsaasEvent).not.toHaveBeenCalled();
  });

  it("500 when processing throws", async () => {
    vi.mocked(handleAsaasEvent).mockRejectedValue(new Error("db down"));
    expect((await call(JSON.stringify(EVENT))).status).toBe(500);
  });

  it("200 on success and on duplicate", async () => {
    vi.mocked(handleAsaasEvent).mockResolvedValueOnce("processed").mockResolvedValueOnce("duplicate");
    for (let i = 0; i < 2; i++) {
      const res = await call(JSON.stringify(EVENT));
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ received: true });
    }
    expect(handleAsaasEvent).toHaveBeenCalledWith({ id: "evt_1", event: "PAYMENT_RECEIVED", payment: { id: "pay_1" } });
  });
});
