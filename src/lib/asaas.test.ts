import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  AsaasError,
  createSubscription,
  deleteSubscription,
  firstPaymentUrl,
  getAsaasConfig,
  getPayment,
  getSubscription,
} from "./asaas";

vi.mock("server-only", () => ({}));

const API_KEY = "$aact_test_key";
const WEBHOOK_TOKEN = "w".repeat(32);

function stubFetch(response: Response) {
  const fetchMock = vi.fn<(url: string, init?: RequestInit) => Promise<Response>>(async () => response);
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("getAsaasConfig", () => {
  it("returns null without ASAAS_API_KEY or ASAAS_WEBHOOK_TOKEN", () => {
    vi.stubEnv("ASAAS_API_KEY", undefined);
    vi.stubEnv("ASAAS_WEBHOOK_TOKEN", WEBHOOK_TOKEN);
    expect(getAsaasConfig()).toBeNull();
    vi.stubEnv("ASAAS_API_KEY", API_KEY);
    vi.stubEnv("ASAAS_WEBHOOK_TOKEN", undefined);
    expect(getAsaasConfig()).toBeNull();
  });

  it("uses the sandbox URL by default and the production URL when ASAAS_ENV=production", () => {
    vi.stubEnv("ASAAS_API_KEY", API_KEY);
    vi.stubEnv("ASAAS_WEBHOOK_TOKEN", WEBHOOK_TOKEN);
    vi.stubEnv("ASAAS_ENV", undefined);
    expect(getAsaasConfig()).toEqual({
      apiKey: API_KEY,
      webhookToken: WEBHOOK_TOKEN,
      baseUrl: "https://api-sandbox.asaas.com/v3",
    });
    vi.stubEnv("ASAAS_ENV", "production");
    expect(getAsaasConfig()?.baseUrl).toBe("https://api.asaas.com/v3");
  });

  it('throws "Invalid or missing environment variable: ASAAS_WEBHOOK_TOKEN" for a 31-char token', () => {
    vi.stubEnv("ASAAS_API_KEY", API_KEY);
    vi.stubEnv("ASAAS_WEBHOOK_TOKEN", "w".repeat(31));
    expect(() => getAsaasConfig()).toThrow("Invalid or missing environment variable: ASAAS_WEBHOOK_TOKEN");
  });

  it("rejects an unknown ASAAS_ENV", () => {
    vi.stubEnv("ASAAS_API_KEY", API_KEY);
    vi.stubEnv("ASAAS_WEBHOOK_TOKEN", WEBHOOK_TOKEN);
    vi.stubEnv("ASAAS_ENV", "staging");
    expect(() => getAsaasConfig()).toThrow("ASAAS_ENV");
  });
});

describe("Asaas client", () => {
  beforeEach(() => {
    vi.stubEnv("ASAAS_API_KEY", API_KEY);
    vi.stubEnv("ASAAS_WEBHOOK_TOKEN", WEBHOOK_TOKEN);
    vi.stubEnv("ASAAS_ENV", undefined);
  });

  it("createSubscription posts billingType UNDEFINED with the access_token header", async () => {
    const fetchMock = stubFetch(Response.json({ id: "sub_123", object: "subscription" }));
    const input = {
      customer: "cus_1",
      value: 59.9,
      cycle: "MONTHLY" as const,
      nextDueDate: "2026-10-20",
      description: "Nichemap Intermediário (mensal)",
      externalReference: "user-1",
    };
    await expect(createSubscription(input)).resolves.toEqual({ id: "sub_123" });

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://api-sandbox.asaas.com/v3/subscriptions");
    expect(init?.method).toBe("POST");
    const headers = new Headers(init?.headers);
    expect(headers.get("access_token")).toBe(API_KEY);
    expect(headers.get("content-type")).toBe("application/json");
    expect(JSON.parse(String(init?.body))).toEqual({ ...input, billingType: "UNDEFINED" });
  });

  it("deleteSubscription treats 404 as success", async () => {
    const fetchMock = stubFetch(Response.json({ errors: [{ code: "not_found" }] }, { status: 404 }));
    await expect(deleteSubscription("sub_gone")).resolves.toBeUndefined();
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://api-sandbox.asaas.com/v3/subscriptions/sub_gone");
    expect(init?.method).toBe("DELETE");
  });

  it("non-2xx throws AsaasError with the status and without the response body in the message", async () => {
    stubFetch(
      Response.json({ errors: [{ code: "invalid_cpfCnpj", description: "secret-body-detail" }] }, { status: 400 }),
    );
    const promise = getPayment("pay_1");
    await expect(promise).rejects.toBeInstanceOf(AsaasError);
    await expect(promise).rejects.toMatchObject({ status: 400 });
    await expect(promise).rejects.not.toThrow(/secret-body-detail/);
    await expect(promise).rejects.not.toThrow(new RegExp(API_KEY.replace("$", "\\$")));
  });

  it("getPayment maps a payment without subscription to null", async () => {
    stubFetch(
      Response.json({
        id: "pay_1",
        status: "PENDING",
        dueDate: "2026-10-20",
        invoiceUrl: "https://sandbox.asaas.com/i/pay_1",
        value: 59.9,
      }),
    );
    await expect(getPayment("pay_1")).resolves.toEqual({
      id: "pay_1",
      subscription: null,
      status: "PENDING",
      dueDate: "2026-10-20",
      invoiceUrl: "https://sandbox.asaas.com/i/pay_1",
    });
  });

  it("firstPaymentUrl returns the invoiceUrl of the earliest payment", async () => {
    const fetchMock = stubFetch(
      Response.json({
        data: [
          { id: "pay_2", dueDate: "2026-11-20", invoiceUrl: "https://sandbox.asaas.com/i/pay_2" },
          { id: "pay_1", dueDate: "2026-10-20", invoiceUrl: "https://sandbox.asaas.com/i/pay_1" },
        ],
      }),
    );
    await expect(firstPaymentUrl("sub_123")).resolves.toBe("https://sandbox.asaas.com/i/pay_1");
    expect(fetchMock.mock.calls[0][0]).toBe("https://api-sandbox.asaas.com/v3/subscriptions/sub_123/payments");
  });

  it("aborts a request after 10 seconds and surfaces the timeout as an error", async () => {
    const controller = new AbortController();
    const timeout = vi.spyOn(AbortSignal, "timeout").mockReturnValue(controller.signal);
    const fetchMock = vi.fn(
      (_url: string, init?: RequestInit) =>
        new Promise<Response>((_, reject) => init?.signal?.addEventListener("abort", () => reject(init.signal!.reason))),
    );
    vi.stubGlobal("fetch", fetchMock);

    const promise = getPayment("pay_1");
    controller.abort(new DOMException("The operation was aborted due to timeout", "TimeoutError"));
    await expect(promise).rejects.toMatchObject({ name: "TimeoutError" });
    expect(timeout).toHaveBeenCalledWith(10_000);
    expect(fetchMock.mock.calls[0][1]?.signal).toBe(controller.signal);
  });

  it("getSubscription reads status and deleted", async () => {
    const fetchMock = stubFetch(Response.json({ id: "sub_1", status: "INACTIVE", deleted: true, value: 59.9 }));
    await expect(getSubscription("sub_1")).resolves.toEqual({ id: "sub_1", status: "INACTIVE", deleted: true });
    expect(fetchMock.mock.calls[0][0]).toBe("https://api-sandbox.asaas.com/v3/subscriptions/sub_1");
    expect(fetchMock.mock.calls[0][1]?.method).toBe("GET");
  });

  it("throws when Asaas is not configured", async () => {
    vi.stubEnv("ASAAS_API_KEY", undefined);
    const fetchMock = stubFetch(Response.json({}));
    await expect(getPayment("pay_1")).rejects.toThrow(/not configured/);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
