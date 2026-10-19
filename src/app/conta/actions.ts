"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { deleteAccount } from "@/lib/accounts";
import { getAuth } from "@/lib/auth";
import { cancelSubscription, changePlan } from "@/lib/billing";
import { logger } from "@/lib/logger";
import { getViewer, requireViewer } from "@/lib/viewer";

export type BillingActionState = { error?: string };

const planSchema = z.enum(["intermediario", "completo"]);

// Both act on the session user only; the form carries nothing but the plan.
const THROWN_ERROR = "Não foi possível alterar a assinatura. Tente de novo em alguns minutos.";

function logThrown(userId: string, action: string, error: unknown) {
  logger.error({ userId, action, error: (error as Error).message }, "Billing action failed");
}

export async function changeMyPlan(formData: FormData): Promise<BillingActionState> {
  const viewer = await requireViewer("/conta");
  const plan = planSchema.parse(formData.get("plan"));
  let ok: boolean;
  try {
    ({ ok } = await changePlan(viewer.userId, plan));
  } catch (error) {
    logThrown(viewer.userId, "changeMyPlan", error);
    return { error: THROWN_ERROR };
  }
  revalidatePath("/conta");
  return ok ? {} : { error: "Não foi possível mudar o plano. Tente de novo em alguns minutos." };
}

export async function cancelMySubscription(): Promise<BillingActionState> {
  const viewer = await requireViewer("/conta");
  let ok: boolean;
  try {
    ({ ok } = await cancelSubscription(viewer.userId));
  } catch (error) {
    logThrown(viewer.userId, "cancelMySubscription", error);
    return { error: THROWN_ERROR };
  }
  revalidatePath("/conta");
  return ok ? {} : { error: "Não foi possível cancelar a assinatura. Tente de novo em alguns minutos." };
}

// LGPD: the customer deletes their own data; sessions go with the account (cascade).
export async function deleteMyAccount(): Promise<void> {
  const viewer = await getViewer();
  if (!viewer) redirect("/entrar");
  // Delete first: if it fails the customer stays signed in and sees the error.
  await deleteAccount(viewer.userId);
  logger.info({ userId: viewer.userId }, "Account deleted by its owner");
  try {
    await getAuth()?.api.signOut({ headers: await headers() }); // clears the now-orphaned cookie
  } catch (err) {
    logger.warn({ userId: viewer.userId, error: (err as Error).message }, "Sign-out after deletion failed");
  }
  redirect("/entrar");
}
