import type { SectionHref } from "./nav";

// Ordered from smallest to largest: a plan includes everything of the plans before it.
export const PLANS = ["basico", "intermediario", "completo"] as const;
export type Plan = (typeof PLANS)[number];

export const PLAN_LABELS: Record<Plan, string> = {
  basico: "Básico",
  intermediario: "Intermediário",
  completo: "Completo",
};

const REQUIRED: Record<SectionHref, Plan | "admin"> = {
  "/": "basico",
  "/scanner": "basico",
  "/conteudo": "intermediario",
  "/relatorios": "intermediario",
  "/mercado": "completo",
  "/empresas": "completo",
  "/oportunidades": "completo",
  "/configuracoes": "admin",
};

export interface AccessViewer {
  plan: Plan;
  isAdmin: boolean;
}

export function isPlan(value: unknown): value is Plan {
  return typeof value === "string" && (PLANS as readonly string[]).includes(value);
}

export function requiredPlan(href: SectionHref): Plan | "admin" {
  return REQUIRED[href];
}

export function canAccess(viewer: AccessViewer, href: SectionHref): boolean {
  if (viewer.isAdmin) return true;
  const required = REQUIRED[href];
  if (required === "admin") return false;
  return PLANS.indexOf(viewer.plan) >= PLANS.indexOf(required);
}

export function canSeeCompetitors(viewer: AccessViewer): boolean {
  return canAccess(viewer, "/mercado");
}
