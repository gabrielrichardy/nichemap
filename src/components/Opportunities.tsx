"use client";

import Link from "next/link";
import { Target, Building2, User } from "lucide-react";
import { Opportunity } from "@/lib/types";

export function Opportunities({
  items,
  moreHref,
  title = "Oportunidades em foco",
}: {
  items: Opportunity[];
  moreHref?: string;
  title?: string;
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Target className="w-4 h-4 text-blue-500" />
          <h3 className="font-medium text-slate-900">{title}</h3>
        </div>
        {moreHref && (
          <Link href={moreHref} className="text-xs text-blue-600 font-medium hover:underline">
            Ver todas
          </Link>
        )}
      </div>
      <p className="text-xs text-slate-400 mt-1">Empresas e pessoas com maior potencial para o seu negócio.</p>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-4">
        {items.map((o) => (
          <div key={o.name} className="rounded-xl border border-slate-100 p-3">
            <div className="flex items-center justify-between">
              <span className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center">
                {o.type === "Empresa" ? (
                  <Building2 className="w-4 h-4 text-slate-500" />
                ) : (
                  <User className="w-4 h-4 text-slate-500" />
                )}
              </span>
              <span className="text-xs font-semibold text-slate-700">{o.score}</span>
            </div>
            <p className="text-sm font-medium text-slate-800 mt-2 truncate">{o.name}</p>
            <p className="text-[11px] text-slate-400">{o.type}</p>
            <p className="text-[11px] text-slate-500 mt-1">{o.note}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
