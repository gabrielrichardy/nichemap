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
  await getAuth()?.api.signOut({ headers: await headers() }); // clears the session cookie
  await deleteAccount(viewer.userId);
  logger.info({ userId: viewer.userId }, "Account deleted by its owner");
  redirect("/entrar");
}
