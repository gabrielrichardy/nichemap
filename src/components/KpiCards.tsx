"use client";

import { Users, Heart, FileText, Hexagon, TrendingUp } from "lucide-react";
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

export function KpiCards({ kpis }: { kpis: Kpis }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
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
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-violet-50">
            <Hexagon className="w-[18px] h-[18px] text-violet-500" />
          </div>
          <span className="text-sm text-slate-500">Profile Score</span>
        </div>
        <div className="mt-4 flex items-end gap-2">
          <span className="text-2xl font-semibold text-slate-900">{kpis.profileScore}</span>
          <span className="text-sm text-slate-400 mb-1">/100</span>
          <span className="ml-1 mb-1 text-[11px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 font-medium">
            {kpis.profileScoreLabel}
          </span>
        </div>
      </div>
    </div>
  );
}
