"use client";

import {
  Boxes,
  LayoutDashboard,
  Search,
  Clapperboard,
  Radar,
  Users,
  Building2,
  Heart,
  FileBarChart2,
  Settings,
} from "lucide-react";

const NAV_ITEMS = [
  { label: "Dashboard", icon: LayoutDashboard, active: true },
  { label: "Profile Scanner", icon: Search, active: false },
  { label: "Conteúdo", icon: Clapperboard, active: false },
  { label: "Market Radar", icon: Radar, active: false },
  { label: "Pessoas", icon: Users, active: false },
  { label: "Empresas", icon: Building2, active: false },
  { label: "Oportunidades", icon: Heart, active: false },
];

const NAV_ITEMS_SECONDARY = [
  { label: "Relatórios", icon: FileBarChart2 },
  { label: "Configurações", icon: Settings },
];

export function Sidebar() {
  return (
    <aside className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 bg-[#0B1220] text-slate-300">
      <div className="flex items-center gap-2 px-6 h-20">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-violet-500 flex items-center justify-center">
          <Boxes className="w-5 h-5 text-white" />
        </div>
        <span className="text-white font-semibold leading-tight text-[15px]">
          Nichemap
        </span>
      </div>

      <nav className="flex-1 px-3 mt-2 space-y-1">
        {NAV_ITEMS.map((item) => (
          <button
            key={item.label}
            aria-current={item.active ? "page" : undefined}
            aria-disabled={item.active ? undefined : true}
            title={item.active ? undefined : "Módulo ainda não disponível — foco de hoje é o Dashboard"}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors ${
              item.active
                ? "bg-white/10 text-white font-medium"
                : "text-slate-400 hover:text-slate-200 hover:bg-white/5 cursor-not-allowed"
            }`}
          >
            <item.icon className="w-[18px] h-[18px]" aria-hidden="true" />
            {item.label}
          </button>
        ))}
      </nav>

      <div className="px-3 pb-2 space-y-1 border-t border-white/5 pt-3">
        {NAV_ITEMS_SECONDARY.map((item) => (
          <button
            key={item.label}
            aria-disabled="true"
            title="Módulo ainda não disponível"
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-slate-400 hover:text-slate-200 hover:bg-white/5"
          >
            <item.icon className="w-[18px] h-[18px]" aria-hidden="true" />
            {item.label}
          </button>
        ))}
      </div>

      <div className="m-3 mb-5 p-4 rounded-2xl bg-white/5">
        <div className="flex items-center gap-2 text-white text-sm font-medium">
          <Boxes className="w-4 h-4 text-violet-400" />
          Plano Pro
        </div>
        <p className="text-xs text-slate-400 mt-1">Expira em 12/2025</p>
        <button className="mt-3 w-full text-xs font-medium py-2 rounded-lg bg-white/10 text-white hover:bg-white/15">
          Ver detalhes
        </button>
      </div>
    </aside>
  );
}
