import type { Metadata } from "next";
import { Lock } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { PlanCards } from "@/components/PlanCards";
import { PLAN_LABELS, requiredPlan } from "@/lib/access";
import { getSupportLink } from "@/lib/env";
import { MAIN_SECTIONS, SECONDARY_SECTIONS } from "@/lib/nav";
import { requireViewer } from "@/lib/viewer";

export const metadata: Metadata = { title: "Planos · Nichemap" };


export default async function PlanoPage({ searchParams }: { searchParams: Promise<{ secao?: string | string[] }> }) {
  const viewer = await requireViewer("/conta");
  const { secao } = await searchParams;
  // Only known sections are named; anything else gets the generic message.
  const section = [...MAIN_SECTIONS, ...SECONDARY_SECTIONS].find((s) => s.href === (Array.isArray(secao) ? secao[0] : secao));
  const required = section ? requiredPlan(section.href) : null;
  const whatsapp = getSupportLink();

  return (
    <AppShell target={viewer.instagramUsername ?? ""} viewer={viewer}>
      <div className="space-y-4 pb-10 max-w-5xl">
        <h1 className="text-xl font-semibold text-slate-900">Planos</h1>
        {secao && (
          <p className="flex items-center gap-2 text-sm text-slate-700">
            <Lock className="w-4 h-4 shrink-0 text-slate-400" aria-hidden="true" />
            {section && required && required !== "admin"
              ? `${section.label} está no plano ${PLAN_LABELS[required]}.`
              : "Este recurso não está no seu plano."}
          </p>
        )}
        <p className="text-sm text-slate-600">
          {viewer.complimentary ? (
            <strong>Plano {PLAN_LABELS[viewer.plan]} — cortesia</strong>
          ) : (
            <>
              Seu plano atual: <strong>{PLAN_LABELS[viewer.plan]}</strong>.
            </>
          )}
        </p>
        <PlanCards currentPlan={viewer.plan} canSubscribe={!viewer.isAdmin && !viewer.complimentary} />
        {whatsapp && (
          <a href={whatsapp} target="_blank" rel="noopener noreferrer" className="inline-block text-sm text-blue-600 underline">
            Dúvidas sobre os planos? Fale com o suporte no WhatsApp
          </a>
        )}
      </div>
    </AppShell>
  );
}
