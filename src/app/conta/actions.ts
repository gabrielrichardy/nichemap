"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { deleteAccount } from "@/lib/accounts";
import { getAuth } from "@/lib/auth";
import { logger } from "@/lib/logger";
import { getViewer } from "@/lib/viewer";

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
