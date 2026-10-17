"use client";

import { useEffect, useState } from "react";
import { DashboardData } from "@/lib/types";
import { ProfileHeader } from "./ProfileHeader";
import { KpiCards } from "./KpiCards";
import { GrowthChart } from "./GrowthChart";
import { ContentTypeDonut } from "./ContentTypeDonut";
import { ThemeAnalysis } from "./ThemeAnalysis";
import { MarketTable } from "./MarketTable";
import { TopContent } from "./TopContent";
import { RelevantPeople } from "./RelevantPeople";
import { Opportunities } from "./Opportunities";
import { AlertCircle, Loader2, Radio } from "lucide-react";

export function DashboardClient({ target }: { target: string }) {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/instagram?target=${encodeURIComponent(target)}`)
      .then(async (res) => {
        const json = await res.json();
        // A 400 body is { error }, not DashboardData: rendering it would crash the page.
        if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
        return json;
      })
      .then((json) => {
        if (!cancelled) setData(json);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      });
    return () => {
      cancelled = true;
    };
  }, [target]);

  if (error) {
    return (
      <div className="flex items-center gap-2 text-rose-500 text-sm">
        <AlertCircle className="w-4 h-4" /> Erro ao carregar dados: {error}
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex items-center gap-2 text-slate-400 text-sm">
        <Loader2 className="w-4 h-4 animate-spin" /> Carregando dados do perfil...
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-10">
      {data.note && (
        <div
          className={`flex items-center gap-2 text-xs rounded-xl px-4 py-2.5 ${
            data.source === "live" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
          }`}
        >
          <Radio className="w-3.5 h-3.5" />
          <span>
            {data.source === "live" ? "Dados reais do Instagram" : "Dados de exemplo"} — {data.note}
          </span>
        </div>
      )}

      <ProfileHeader name={data.profile.name} username={data.profile.username} bio={data.profile.bio} />

      <KpiCards kpis={data.kpis} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
        <div className="lg:col-span-2 grid grid-cols-1 gap-4">
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
            <div className="sm:col-span-2">
              <GrowthChart data={data.growth} />
            </div>
            <div className="col-span-2 sm:col-span-3">
              <ContentTypeDonut data={data.contentTypes} total={data.kpis.publicacoes} />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <ThemeAnalysis themes={data.themes} />
            <MarketTable market={data.market} />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4">
          <TopContent items={data.topContent} />
          <RelevantPeople people={data.people} />
        </div>
      </div>

      <Opportunities items={data.opportunities} />
    </div>
  );
}
