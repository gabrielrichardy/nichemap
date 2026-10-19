import "server-only";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { canAccess, isPlan, type Plan } from "./access";
import { getAuth } from "./auth";
import { isAdminEmail } from "./env";
import { resolveTarget } from "./instagram";
import type { SectionHref } from "./nav";

export interface Viewer {
  userId: string;
  name: string;
  email: string;
  image: string | null;
  isAdmin: boolean;
  plan: Plan;
  instagramUsername: string | null;
  termsAcceptedAt: Date | null;
}

// Read on every request from the database session (no cookie cache), so plan changes,
// unlocks and deletions apply on the next page view.
export async function getViewer(): Promise<Viewer | null> {
  // Read the request first: it marks every page that checks the viewer as dynamic, so a build
  // without login variables cannot prerender a "not configured" page or redirect.
  const requestHeaders = await headers();
  const auth = getAuth();
  if (!auth) return null;
  const session = await auth.api.getSession({ headers: requestHeaders });
  if (!session) return null;
  const u = session.user as typeof session.user & {
    plan?: unknown;
    instagramUsername?: string | null;
    termsAcceptedAt?: Date | string | null;
  };
  return {
    userId: u.id,
    name: u.name,
    email: u.email,
    image: u.image ?? null,
    isAdmin: isAdminEmail(u.email),
    plan: isPlan(u.plan) ? u.plan : "basico",
    instagramUsername: u.instagramUsername ?? null,
    termsAcceptedAt: u.termsAcceptedAt ? new Date(u.termsAcceptedAt) : null,
  };
}

export async function requireViewer(href: SectionHref | "/conta"): Promise<Viewer> {
  const viewer = await getViewer();
  if (!viewer) redirect("/entrar");
  if (viewer.isAdmin) return viewer;
  if (href === "/configuracoes") notFound();
  if (!viewer.instagramUsername) redirect("/perfil");
  if (href !== "/conta" && !canAccess(viewer, href)) redirect(`/plano?secao=${href}`);
  return viewer;
}

export async function requireAdmin(): Promise<Viewer> {
  const viewer = await getViewer();
  if (!viewer?.isAdmin) notFound();
  return viewer;
}

// Customers always see their own locked profile, whatever the URL asks for.
export function targetFor(viewer: Viewer, param: string | null | undefined): string | null {
  return viewer.isAdmin ? resolveTarget(param) : viewer.instagramUsername;
}
