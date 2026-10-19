import { describe, expect, it } from "vitest";
import { canAccess, canSeeCompetitors, isPlan, type Plan } from "./access";
import type { SectionHref } from "./nav";

const client = (plan: Plan) => ({ plan, isAdmin: false });

// Expected access per section for customers (spec: tabela de planos).
const TABLE: Record<SectionHref, [basico: boolean, intermediario: boolean, completo: boolean]> = {
  "/": [true, true, true],
  "/scanner": [true, true, true],
  "/conteudo": [false, true, true],
  "/relatorios": [false, true, true],
  "/mercado": [false, false, true],
  "/empresas": [false, false, true],
  "/oportunidades": [false, false, true],
  "/configuracoes": [false, false, false],
};

describe("canAccess", () => {
  for (const [href, expected] of Object.entries(TABLE) as [SectionHref, boolean[]][]) {
    it(`gates ${href} by plan`, () => {
      expect([canAccess(client("basico"), href), canAccess(client("intermediario"), href), canAccess(client("completo"), href)]).toEqual(
        expected,
      );
    });
  }

  it("lets admins into every section regardless of plan", () => {
    const admin = { plan: "basico" as const, isAdmin: true };
    expect(canAccess(admin, "/mercado")).toBe(true);
    expect(canAccess(admin, "/configuracoes")).toBe(true);
  });
});

describe("canSeeCompetitors", () => {
  it("is only true for the complete plan or admins", () => {
    expect(canSeeCompetitors(client("intermediario"))).toBe(false);
    expect(canSeeCompetitors(client("completo"))).toBe(true);
    expect(canSeeCompetitors({ plan: "basico", isAdmin: true })).toBe(true);
  });
});

describe("isPlan", () => {
  it("accepts only the three plans", () => {
    expect(isPlan("basico")).toBe(true);
    expect(isPlan("completo")).toBe(true);
    expect(isPlan("premium")).toBe(false);
    expect(isPlan(undefined)).toBe(false);
  });
});
