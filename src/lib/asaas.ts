import "server-only";
import { getAsaasConfig } from "./env";

// Asaas API v3 client (docs.asaas.com). Values are in BRL; dates are YYYY-MM-DD.
export { getAsaasConfig };

// The message carries only the method, path and status: Asaas error bodies can echo
// customer data (CPF/CNPJ, e-mail), so they never reach logs through this error.
export class AsaasError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "AsaasError";
  }
}

type Method = "GET" | "POST" | "PUT" | "DELETE";

async function request<T>(method: Method, path: string, body?: unknown): Promise<T> {
  const config = getAsaasConfig();
  if (!config) throw new Error("Asaas is not configured (ASAAS_API_KEY / ASAAS_WEBHOOK_TOKEN)");
  const res = await fetch(`${config.baseUrl}${path}`, {
    method,
    headers: {
      access_token: config.apiKey,
      "Content-Type": "application/json",
      // Required by Asaas for root accounts created since 2024-06-13.
      "User-Agent": "Nichemap",
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    cache: "no-store",
  });
  if (!res.ok) throw new AsaasError(`Asaas ${method} ${path} failed with status ${res.status}`, res.status);
  return (await res.json()) as T;
}

const id = (value: string) => encodeURIComponent(value);

export async function createCustomer(input: {
  name: string;
  email: string;
  cpfCnpj: string;
  mobilePhone?: string;
  externalReference: string;
}): Promise<{ id: string }> {
  const customer = await request<{ id: string }>("POST", "/customers", input);
  return { id: customer.id };
}

// billingType UNDEFINED: the payer picks Pix, card or boleto on the invoice page.
export async function createSubscription(input: {
  customer: string;
  value: number;
  cycle: "MONTHLY" | "YEARLY";
  nextDueDate: string;
  description: string;
  externalReference: string;
}): Promise<{ id: string }> {
  const subscription = await request<{ id: string }>("POST", "/subscriptions", {
    ...input,
    billingType: "UNDEFINED",
  });
  return { id: subscription.id };
}

// Also reprices charges already generated and still pending.
export async function updateSubscriptionValue(subscriptionId: string, value: number): Promise<void> {
  await request("PUT", `/subscriptions/${id(subscriptionId)}`, { value, updatePendingPayments: true });
}

// A subscription already removed on Asaas (404) counts as deleted.
export async function deleteSubscription(subscriptionId: string): Promise<void> {
  try {
    await request("DELETE", `/subscriptions/${id(subscriptionId)}`);
  } catch (error) {
    if (error instanceof AsaasError && error.status === 404) return;
    throw error;
  }
}

interface AsaasPayment {
  id: string;
  subscription?: string | null;
  status: string;
  dueDate: string;
  invoiceUrl: string;
}

export async function firstPaymentUrl(subscriptionId: string): Promise<string> {
  const { data } = await request<{ data: AsaasPayment[] }>("GET", `/subscriptions/${id(subscriptionId)}/payments`);
  const [first] = [...data].sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  if (!first) throw new Error(`Asaas subscription ${subscriptionId} has no payments yet`);
  return first.invoiceUrl;
}

export async function getPayment(paymentId: string): Promise<{
  id: string;
  subscription: string | null;
  status: string;
  dueDate: string;
  invoiceUrl: string;
}> {
  const payment = await request<AsaasPayment>("GET", `/payments/${id(paymentId)}`);
  return {
    id: payment.id,
    subscription: payment.subscription ?? null,
    status: payment.status,
    dueDate: payment.dueDate,
    invoiceUrl: payment.invoiceUrl,
  };
}
