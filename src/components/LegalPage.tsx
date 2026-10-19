import type { ReactNode } from "react";
import Link from "next/link";

// Frame for /privacidade and /termos: public, with the pending-legal-review notice.
export function LegalPage({ title, updated, children }: { title: string; updated: string; children: ReactNode }) {
  return (
    <main className="max-w-2xl mx-auto px-4 py-10 space-y-6 text-sm text-slate-700 leading-relaxed">
      <Link href="/entrar" className="text-blue-600 underline">
        Voltar
      </Link>
      <p role="note" className="rounded-xl bg-amber-50 border border-amber-200 text-amber-800 px-4 py-2 font-medium">
        Rascunho: precisa de revisão jurídica
      </p>
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">{title}</h1>
        <p className="text-slate-400 mt-1">Última atualização: {updated}</p>
      </div>
      <div className="space-y-5 [&_h2]:text-base [&_h2]:font-semibold [&_h2]:text-slate-900 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1">
        {children}
      </div>
    </main>
  );
}
