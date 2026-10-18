"use client";

import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { GrowthPoint } from "@/lib/types";

export function GrowthChart({ data }: { data: GrowthPoint[] }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 lg:col-span-2">
      <h3 className="font-medium text-slate-900">Crescimento de Seguidores</h3>
      {data.length < 2 ? (
        <p className="mt-4 text-sm text-slate-400">
          Histórico em construção: o gráfico aparece a partir do segundo dia de coleta diária.
        </p>
      ) : (
      <div className="h-56 mt-4">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
            <defs>
              <linearGradient id="growthFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3B82F6" stopOpacity={0.25} />
                <stop offset="100%" stopColor="#3B82F6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} stroke="#F1F5F9" />
            <XAxis dataKey="date" tick={{ fontSize: 12, fill: "#94A3B8" }} axisLine={false} tickLine={false} />
            <YAxis
              tick={{ fontSize: 12, fill: "#94A3B8" }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => `${Math.round(v / 1000)}k`}
            />
            <Tooltip
              formatter={(value) => Number(value).toLocaleString("pt-BR")}
              contentStyle={{ borderRadius: 12, border: "1px solid #E2E8F0", fontSize: 12 }}
            />
            <Area type="monotone" dataKey="value" stroke="#3B82F6" strokeWidth={2.5} fill="url(#growthFill)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      )}
    </div>
  );
}
