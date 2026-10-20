import "server-only";
import { canAccess, canSeeCompetitors } from "./access";
import { getDashboardData, INVALID_TARGET_MESSAGE, type DashboardFailure, type DashboardOptions } from "./instagram";
import type { DashboardData } from "./types";
import { targetFor, type Viewer } from "./viewer";

export type PageSearchParams = Promise<{ target?: string | string[] }>;

export type DashboardResult =
  | { target: string; data: DashboardData; error?: undefined }
  | { target: string; data?: undefined; error: string };

export const UNAVAILABLE_MESSAGE = "Dados indisponíveis no momento. Tente novamente mais tarde.";

export const NOT_BUSINESS_MESSAGE =
  "Não conseguimos ler seu perfil como conta profissional e a fonte não oficial está desativada para sua conta. Para continuar, mude sua conta do Instagram para profissional (comercial ou criador).";

export function failureMessage({ failure }: DashboardFailure): string {
  return failure === "not_business" ? NOT_BUSINESS_MESSAGE : UNAVAILABLE_MESSAGE;
}

// Gating is applied to the data itself, not only to pages: the API returns the same object.
// Customers never get sample data presented as their profile; admins keep the fallback.
export function dashboardOptionsFor(viewer: Viewer): Required<DashboardOptions> {
  return {
    includeCompetitors: canSeeCompetitors(viewer),
    includeContent: canAccess(viewer, "/conteudo"),
    mockOnFailure: viewer.isAdmin,
    allowUnofficial: viewer.isAdmin || viewer.unofficialSource,
  };
}

async function firstParam(searchParams: PageSearchParams): Promise<string | undefined> {
  const { target: raw } = await searchParams;
  return Array.isArray(raw) ? raw[0] : raw;
}

// Server-side data for section pages: same rules as /api/instagram.
export async function loadDashboard(searchParams: PageSearchParams, viewer: Viewer): Promise<DashboardResult> {
  const param = await firstParam(searchParams);
  const target = targetFor(viewer, param);
  if (!target) return { target: param ?? "", error: INVALID_TARGET_MESSAGE };
  const data = await getDashboardData(target, dashboardOptionsFor(viewer));
  return "failure" in data ? { target, error: failureMessage(data) } : { target, data };
}

// Profile shown in the header for pages that do not load Instagram data.
export async function readTarget(searchParams: PageSearchParams, viewer: Viewer): Promise<string> {
  const param = await firstParam(searchParams);
  return targetFor(viewer, param) ?? param ?? "";
}
