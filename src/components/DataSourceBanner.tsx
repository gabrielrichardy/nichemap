import { Radio } from "lucide-react";
import type { DashboardData } from "@/lib/types";

const STYLES: Record<DashboardData["source"], string> = {
  live: "bg-emerald-50 text-emerald-700",
  unofficial: "bg-orange-50 text-orange-800",
  mock: "bg-amber-50 text-amber-700",
};

export function sourceLabel(source: DashboardData["source"]): string {
  if (source === "live") return "Dados reais do Instagram";
  if (source === "unofficial") return "Fonte não oficial — pode falhar ou ficar desatualizada";
  return "Dados de exemplo";
}

export function DataSourceBanner({ data }: { data: Pick<DashboardData, "source" | "note"> }) {
  if (!data.note) return null;
  return (
    <div role="status" className={`flex items-center gap-2 text-xs rounded-xl px-4 py-2.5 ${STYLES[data.source]}`}>
      <Radio className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
      <span>
        {sourceLabel(data.source)} — {data.note}
      </span>
    </div>
  );
}
