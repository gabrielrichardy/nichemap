"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { PLANS } from "@/lib/access";
import { setManualPlan, setUnofficialSource, unlockProfile } from "@/lib/accounts";
import { requireAdmin } from "@/lib/viewer";

const userIdSchema = z.string().min(1);
const planSchema = z.enum(PLANS);
const enabledSchema = z.enum(["true", "false"]);

// Server actions are public endpoints: each one checks the admin itself. A refusal (the plan is
// controlled by a subscription) changes nothing; the revalidated table then shows the lock.
export async function changePlan(formData: FormData): Promise<void> {
  await requireAdmin();
  const userId = userIdSchema.parse(formData.get("userId"));
  const plan = planSchema.parse(formData.get("plan"));
  const complimentary = formData.get("complimentary") === "on";
  await setManualPlan(userId, plan, complimentary);
  revalidatePath("/admin");
}

export async function unlockAccountProfile(formData: FormData): Promise<void> {
  await requireAdmin();
  await unlockProfile(userIdSchema.parse(formData.get("userId")));
  revalidatePath("/admin");
}

export async function toggleUnofficialSource(formData: FormData): Promise<void> {
  await requireAdmin();
  const userId = userIdSchema.parse(formData.get("userId"));
  const enabled = enabledSchema.parse(formData.get("enabled")) === "true";
  await setUnofficialSource(userId, enabled);
  revalidatePath("/admin");
}
