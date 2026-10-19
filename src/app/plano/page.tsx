import type { Metadata } from "next";
import { Lock } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { PLAN_LABELS, requiredPlan } from "@/lib/access";
import { getSupportWhatsappUrl } from "@/lib/env";
import { MAIN_SECTIONS, SECONDARY_SECTIONS } from "@/lib/nav";
import { requireViewer } from "@/lib/viewer";

export const metadata: Metadata = { title: "Planos · Nichemap" };

function supportUrl() {
  try {
    return getSupportWhatsappUrl();
  } catch {
    return null;
  }
}

export default async function PlanoPage({ searchParams }: { searchParams: Promise<{ secao?: string | string[] }> }) {
  const viewer = await requireViewer("/conta");
  const { secao } = await searchParams;
  // Only known sections are named; anything else gets the generic message.
  const section = [...MAIN_SECTIONS, ...SECONDARY_SECTIONS].find((s) => s.href === (Array.isArray(secao) ? secao[0] : secao));
  const required = section ? requiredPlan(section.href) : null;
  const whatsapp = supportUrl();

  return (
    <AppShell target={viewer.instagramUsername ?? ""} viewer={viewer}>
      <div className="max-w-xl bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-3">
        <div className="flex items-center gap-2">
          <Lock className="w-5 h-5 text-slate-400" aria-hidden="true" />
          <h1 className="text-lg font-semibold text-slate-900">
            {section && required && required !== "admin"
              ? `${section.label} está no plano ${PLAN_LABELS[required]}`
              : "Este recurso não está no seu plano"}
          </h1>
        </div>
        <p className="text-sm text-slate-600">
          Seu plano atual: <strong>{PLAN_LABELS[viewer.plan]}</strong>.
        </p>
        {whatsapp ? (
          <a
            href={whatsapp}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block rounded-xl bg-blue-600 text-white text-sm font-medium px-4 py-2.5 hover:bg-blue-700"
          >
            Quero mudar de plano
          </a>
        ) : (
          <p className="text-sm text-slate-500">Fale com o responsável pelo Nichemap para mudar de plano.</p>
        )}
      </div>
    </AppShell>
  );
}
