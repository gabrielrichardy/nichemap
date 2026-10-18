import "server-only";
import { getDashboardData, INVALID_TARGET_MESSAGE, resolveTarget } from "./instagram";
import type { DashboardData } from "./types";

export type PageSearchParams = Promise<{ target?: string | string[] }>;

export type DashboardResult =
  | { target: string; data: DashboardData; error?: undefined }
  | { target: string; data?: undefined; error: string };

// Server-side data for section pages: same validation as /api/instagram.
export async function loadDashboard(searchParams: PageSearchParams): Promise<DashboardResult> {
  const { target: raw } = await searchParams;
  const param = Array.isArray(raw) ? raw[0] : raw;
  const target = resolveTarget(param);
  if (!target) {
    return { target: param ?? "", error: INVALID_TARGET_MESSAGE };
  }
  return { target, data: await getDashboardData(target) };
}

// Profile shown in the search box for pages that do not load Instagram data.
export async function readTarget(searchParams: PageSearchParams): Promise<string> {
  const { target: raw } = await searchParams;
  const param = Array.isArray(raw) ? raw[0] : raw;
  return resolveTarget(param) ?? param ?? "";
}
