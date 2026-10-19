"use client";

import { Users, Heart, FileText, Hexagon, TrendingUp, ChevronDown } from "lucide-react";
import { Kpis } from "@/lib/types";

function Kpi({
  icon: Icon,
  iconBg,
  iconColor,
  label,
  value,
  growthPct,
  growthLabel,
  suffix,
}: {
  icon: typeof Users;
  iconBg: string;
  iconColor: string;
  label: string;
  value: string;
  growthPct: number;
  growthLabel?: string;
  suffix?: string;
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${iconBg}`}>
          <Icon className={`w-[18px] h-[18px] ${iconColor}`} />
        </div>
        <span className="text-sm text-slate-500">{label}</span>
      </div>
      <div className="mt-4 flex items-end gap-2">
        <span className="text-2xl font-semibold text-slate-900">{value}</span>
        {suffix && <span className="text-sm text-slate-400 mb-1">{suffix}</span>}
      </div>
      {growthPct !== 0 && (
        <div className="mt-2 flex items-center gap-1 text-xs">
          <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
          <span className="text-emerald-600 font-medium">
            {growthPct > 0 ? "+" : ""}
            {growthPct}%
          </span>
          {growthLabel && <span className="text-slate-400">{growthLabel}</span>}
        </div>
      )}
    </div>
  );
}

const LABEL_STYLES: Record<string, string> = {
  Ótimo: "bg-emerald-50 text-emerald-600",
  Bom: "bg-sky-50 text-sky-600",
  Regular: "bg-amber-50 text-amber-600",
  Atenção: "bg-rose-50 text-rose-600",
};

export function KpiCards({ kpis }: { kpis: Kpis }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 items-start">
      <Kpi
        icon={Users}
        iconBg="bg-emerald-50"
        iconColor="text-emerald-500"
        label="Seguidores"
        value={kpis.seguidores.toLocaleString("pt-BR")}
        growthPct={kpis.seguidoresGrowthPct}
        growthLabel={kpis.growthLabel}
      />
      <Kpi
        icon={Heart}
        iconBg="bg-blue-50"
        iconColor="text-blue-500"
        label="Engajamento médio"
        value={`${kpis.engajamentoPct}%`}
        growthPct={kpis.engajamentoGrowthPct}
        growthLabel={kpis.growthLabel}
      />
      <Kpi
        icon={FileText}
        iconBg="bg-sky-50"
        iconColor="text-sky-500"
        label="Publicações"
        value={String(kpis.publicacoes)}
        growthPct={kpis.publicacoesGrowthPct}
        growthLabel={kpis.growthLabel}
      />
      <details className="group bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
        <summary className="cursor-pointer list-none [&::-webkit-details-marker]:hidden rounded-lg focus-visible:outline-2 focus-visible:outline-violet-400">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-violet-50">
              <Hexagon className="w-[18px] h-[18px] text-violet-500" />
            </div>
            <span className="text-sm text-slate-500">Profile Score</span>
            <ChevronDown className="ml-auto w-4 h-4 text-slate-400 transition-transform group-open:rotate-180" aria-hidden />
          </div>
          <div className="mt-4 flex items-end gap-2">
            <span className="text-2xl font-semibold text-slate-900">{kpis.profileScore}</span>
            <span className="text-sm text-slate-400 mb-1">/100</span>
            <span className={`ml-1 mb-1 text-[11px] px-2 py-0.5 rounded-full font-medium ${LABEL_STYLES[kpis.profileScoreLabel] ?? LABEL_STYLES.Bom}`}>
              {kpis.profileScoreLabel}
            </span>
          </div>
          <span className="mt-2 block text-xs text-violet-600 group-open:hidden">Ver o que melhorar</span>
        </summary>
        <ul className="mt-4 space-y-3 border-t border-slate-100 pt-4">
          {kpis.profileScoreBreakdown.map((c) => (
            <li key={c.label} className="text-xs">
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium text-slate-700">{c.label}</span>
                <span className="text-slate-500">
                  {c.points}/{c.max}
                </span>
              </div>
              <div className="mt-1 h-1.5 rounded-full bg-slate-100" aria-hidden>
                <div className="h-full rounded-full bg-violet-400" style={{ width: `${(c.points / c.max) * 100}%` }} />
              </div>
              <p className="mt-1 text-slate-400">{c.detail}</p>
              {c.tip && <p className="mt-1 text-slate-600">{c.tip}</p>}
            </li>
          ))}
        </ul>
      </details>
    </div>
  );
}
