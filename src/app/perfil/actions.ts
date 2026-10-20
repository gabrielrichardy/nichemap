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

// Only an account still choosing its profile may look profiles up (admins never lock one).
async function choosingViewer() {
  const viewer = await getViewer();
  if (!viewer) redirect("/entrar");
  if (viewer.isAdmin || viewer.instagramUsername) redirect("/");
  return viewer;
}

export async function previewProfile(_: PreviewState, formData: FormData): Promise<PreviewState> {
  const viewer = await choosingViewer();
  const result = await lookupProfile(String(formData.get("username") ?? ""), {
    allowUnofficial: viewer.unofficialSource,
  });
  return result.ok ? { preview: result.profile } : { error: result.message };
}

// Looks the profile up again so a stale or edited form cannot lock an invalid @.
export async function confirmProfile(_: ConfirmState, formData: FormData): Promise<ConfirmState> {
  const viewer = await choosingViewer();
  const lookup = await lookupProfile(String(formData.get("username") ?? ""), {
    allowUnofficial: viewer.unofficialSource,
  });
  if (!lookup.ok) return { error: lookup.message };
  const result = await lockProfile(viewer.userId, lookup.profile.username, formData.get("terms") === "on");
  if (!result.ok) return { error: lockMessage(result) };
  redirect("/");
}
