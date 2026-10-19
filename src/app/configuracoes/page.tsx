import type { Metadata } from "next";
import { AppShell } from "@/components/AppShell";
import { readTarget, type PageSearchParams } from "@/lib/dashboard";
import { requireViewer } from "@/lib/viewer";
import { checkInstagramConnection, getIntegrationStatus, type IntegrationState } from "@/lib/settings";

export const metadata: Metadata = { title: "Configurações · Nichemap" };

const STATE_LABEL: Record<IntegrationState, { text: string; className: string }> = {
  ok: { text: "Configurado", className: "bg-emerald-50 text-emerald-700" },
  missing: { text: "Não configurado", className: "bg-slate-100 text-slate-600" },
  invalid: { text: "Valor inválido", className: "bg-rose-50 text-rose-700" },
};

export default async function ConfiguracoesPage({ searchParams }: { searchParams: PageSearchParams }) {
  const target = await readTarget(searchParams, await requireViewer("/configuracoes"));
  const { integrations, defaultTarget, graphVersion } = getIntegrationStatus();
  const connection = await checkInstagramConnection();

  return (
    <AppShell target={target}>
      <div className="space-y-4 pb-10">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Configurações</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Estado das integrações. Os valores ficam no <code>.env.local</code> ou nas variáveis da Vercel e nunca são
            mostrados aqui.
          </p>
        </div>

        <ul className="bg-white rounded-2xl border border-slate-100 shadow-sm divide-y divide-slate-50">
          {integrations.map((i) => (
            <li key={i.name} className="flex flex-wrap items-center justify-between gap-2 p-4">
              <div className="min-w-0">
                <p className="text-sm font-medium text-slate-800">{i.name}</p>
                <p className="text-xs text-slate-500">
                  <code>{i.variables}</code> — {i.help}
                </p>
                {i.name === "Instagram Graph API" && connection && (
                  <p className={`text-xs mt-1 ${connection.ok ? "text-emerald-700" : "text-rose-700"}`}>
                    {connection.ok ? "Conexão testada agora: token válido." : `Conexão testada agora: ${connection.message}`}
                  </p>
                )}
              </div>
              <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${STATE_LABEL[i.state].className}`}>
                {STATE_LABEL[i.state].text}
              </span>
            </li>
          ))}
        </ul>

        <dl className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-xs text-slate-500">Perfil padrão (INSTAGRAM_TARGET_USERNAME)</dt>
            <dd className="font-medium text-slate-800">{defaultTarget ? `@${defaultTarget}` : "Valor inválido"}</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500">Versão da Graph API</dt>
            <dd className="font-medium text-slate-800">{graphVersion}</dd>
          </div>
        </dl>
      </div>
    </AppShell>
  );
}
