import { Radio } from "lucide-react";
import type { DashboardData } from "@/lib/types";

export function DataSourceBanner({ data }: { data: Pick<DashboardData, "source" | "note"> }) {
  if (!data.note) return null;
  const live = data.source === "live";
  return (
    <div
      role="status"
      className={`flex items-center gap-2 text-xs rounded-xl px-4 py-2.5 ${
        live ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
      }`}
    >
      <Radio className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
      <span>
        {live ? "Dados reais do Instagram" : "Dados de exemplo"} — {data.note}
      </span>
    </div>
  );
}
