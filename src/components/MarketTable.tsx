"use client";

import Link from "next/link";
import { TrendingUp } from "lucide-react";
import { MarketProfile } from "@/lib/types";
import { SampleBadge } from "./SampleBadge";

export function MarketTable({
  market,
  moreHref,
  sample,
}: {
  market: MarketProfile[];
  moreHref?: string;
  sample?: boolean;
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="font-medium text-slate-900">Mercado</h3>
          <SampleBadge show={sample} />
        </div>
        {moreHref && (
          <Link href={moreHref} className="text-xs text-blue-600 font-medium hover:underline">
            Ver todos
          </Link>
        )}
      </div>
      <table className="w-full mt-3 text-sm">
        <thead>
          <tr className="text-left text-xs text-slate-400">
            <th className="font-normal pb-2">Perfil</th>
            <th className="font-normal pb-2">Seguidores</th>
            <th className="font-normal pb-2">Crescimento</th>
          </tr>
        </thead>
        <tbody>
          {market.map((m) => (
            <tr key={m.name} className="border-t border-slate-50">
              <td className="py-2.5 flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-400 to-violet-400 shrink-0" />
                {m.name}
              </td>
              <td className="py-2.5 text-slate-700">{(m.followers / 1000).toFixed(1)}k</td>
              <td className="py-2.5">
                {m.growthPct === null ? (
                  <span className="text-slate-400" title="Sem histórico de coleta ainda">—</span>
                ) : (
                  <span className="flex items-center gap-1 text-emerald-600 font-medium">
                    <TrendingUp className="w-3.5 h-3.5" aria-hidden="true" />
                    {m.growthPct > 0 ? "+" : ""}
                    {m.growthPct}%
                  </span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
