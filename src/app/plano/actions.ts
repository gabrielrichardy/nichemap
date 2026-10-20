"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { startCheckout, type CheckoutResult } from "@/lib/billing";
import { logger } from "@/lib/logger";
import { requireViewer } from "@/lib/viewer";

export type SubscribeState = { error?: string };

const planSchema = z.enum(["intermediario", "completo"]);
const cycleSchema = z.enum(["monthly", "yearly"]);

const ERRORS: Record<Extract<CheckoutResult, { ok: false }>["reason"], string> = {
  invalid_document: "CPF ou CNPJ inválido.",
  unavailable: "Assinaturas indisponíveis no momento.",
  provider_error: "Não foi possível falar com o sistema de pagamento. Tente de novo em alguns minutos.",
  already_subscribed: "Você já tem uma assinatura. Veja em Minha conta.",
  complimentary: "Sua conta é cortesia e não precisa de assinatura.",
};

const PROVIDER_ERROR = ERRORS.provider_error;

const text = (value: FormDataEntryValue | null) => (typeof value === "string" ? value.trim() : "");

// Plan and cycle come from our own buttons: anything else is tampering and fails loudly.
export async function subscribe(_prev: SubscribeState, formData: FormData): Promise<SubscribeState> {
  const viewer = await requireViewer("/conta");
  const plan = planSchema.parse(formData.get("plan"));
  const cycle = cycleSchema.parse(formData.get("cycle"));
  const mobile = text(formData.get("mobilePhone")).replace(/\D/g, "");
  if (mobile && !/^\d{10,11}$/.test(mobile)) {
    return { error: "Celular inválido. Use DDD e número, como (11) 98765-4321." };
  }

  let result: CheckoutResult;
  try {
    result = await startCheckout({
      userId: viewer.userId,
      name: viewer.name,
      email: viewer.email,
      plan,
      cycle,
      cpfCnpj: text(formData.get("cpfCnpj")),
      mobilePhone: mobile || undefined,
    });
  } catch (error) {
    logger.error({ userId: viewer.userId, action: "subscribe", error: (error as Error).message }, "Checkout failed");
    return { error: PROVIDER_ERROR };
  }
  if (!result.ok) return { error: ERRORS[result.reason] };
  redirect(result.url);
}
