import type { ReactNode } from "react";
import { AlertCircle } from "lucide-react";
import type { DashboardResult } from "@/lib/dashboard";
import type { DashboardData } from "@/lib/types";
import { DataSourceBanner } from "./DataSourceBanner";

// Common frame of a section page: title, invalid-profile error, data-source banner.
export function Section({
  title,
  description,
  result,
  children,
}: {
  title: string;
  description: string;
  result: DashboardResult;
  children: (data: DashboardData) => ReactNode;
}) {
  return (
    <div className="space-y-4 pb-10">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">{title}</h1>
        <p className="text-sm text-slate-500 mt-0.5">{description}</p>
      </div>
      {result.error !== undefined ? (
        <p role="alert" className="flex items-center gap-2 text-rose-600 text-sm">
          <AlertCircle className="w-4 h-4 shrink-0" aria-hidden="true" /> Erro ao carregar dados: {result.error}
        </p>
      ) : (
        <>
          <DataSourceBanner data={result.data} />
          {children(result.data)}
        </>
      )}
    </div>
  );
}
