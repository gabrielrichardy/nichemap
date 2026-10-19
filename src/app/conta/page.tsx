import type { Metadata } from "next";
import { AppShell } from "@/components/AppShell";
import { DeleteAccountButton } from "@/components/DeleteAccountButton";
import { SignOutButton } from "@/components/SignOutButton";
import { PLAN_LABELS } from "@/lib/access";
import { getSupportWhatsappUrl } from "@/lib/env";
import { requireViewer } from "@/lib/viewer";

export const metadata: Metadata = { title: "Minha conta · Nichemap" };

function supportUrl() {
  try {
    return getSupportWhatsappUrl();
  } catch {
    return null; // invalid number: shown as invalid in Configurações
  }
}

export default async function ContaPage() {
  const viewer = await requireViewer("/conta");
  const whatsapp = supportUrl();
  const rows: [string, string][] = [
    ["Nome", viewer.name],
    ["E-mail", viewer.email],
    ["Perfil do Instagram", viewer.instagramUsername ? `@${viewer.instagramUsername}` : "Não escolhido"],
    ["Plano", viewer.isAdmin ? "Administrador" : PLAN_LABELS[viewer.plan]],
  ];

  return (
    <AppShell target={viewer.instagramUsername ?? ""} viewer={viewer}>
      <div className="space-y-4 pb-10 max-w-xl">
        <h1 className="text-xl font-semibold text-slate-900">Minha conta</h1>
        <dl className="bg-white rounded-2xl border border-slate-100 shadow-sm divide-y divide-slate-100">
          {rows.map(([label, value]) => (
            <div key={label} className="flex flex-col sm:flex-row sm:justify-between gap-1 px-5 py-3 text-sm">
              <dt className="text-slate-500">{label}</dt>
              <dd className="text-slate-900 break-all">{value}</dd>
            </div>
          ))}
        </dl>
        {whatsapp && (
          <a href={whatsapp} target="_blank" rel="noopener noreferrer" className="inline-block text-sm text-blue-600 underline">
            Falar com o suporte no WhatsApp
          </a>
        )}
        <div className="flex flex-wrap gap-2">
          <SignOutButton />
          <DeleteAccountButton />
        </div>
      </div>
    </AppShell>
  );
}
