"use client";

import { Printer } from "lucide-react";

export function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="flex items-center gap-2 text-sm bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-slate-700 hover:bg-slate-50 print:hidden"
    >
      <Printer className="w-4 h-4" aria-hidden="true" />
      Imprimir / salvar PDF
    </button>
  );
}
