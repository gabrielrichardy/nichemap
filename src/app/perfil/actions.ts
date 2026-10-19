"use server";

import { redirect } from "next/navigation";
import { lockProfile } from "@/lib/accounts";
import { lockMessage, lookupProfile, type ProfilePreview } from "@/lib/onboarding";
import { getViewer } from "@/lib/viewer";

export interface PreviewState {
  preview?: ProfilePreview;
  error?: string;
}

export interface ConfirmState {
  error?: string;
}

async function signedIn() {
  const viewer = await getViewer();
  if (!viewer) redirect("/entrar");
  return viewer;
}

export async function previewProfile(_: PreviewState, formData: FormData): Promise<PreviewState> {
  await signedIn();
  const result = await lookupProfile(String(formData.get("username") ?? ""));
  return result.ok ? { preview: result.profile } : { error: result.message };
}

// Looks the profile up again so a stale or edited form cannot lock an invalid @.
export async function confirmProfile(_: ConfirmState, formData: FormData): Promise<ConfirmState> {
  const viewer = await signedIn();
  const lookup = await lookupProfile(String(formData.get("username") ?? ""));
  if (!lookup.ok) return { error: lookup.message };
  const result = await lockProfile(viewer.userId, lookup.profile.username, formData.get("terms") === "on");
  if (!result.ok) return { error: lockMessage(result) };
  redirect("/");
}
