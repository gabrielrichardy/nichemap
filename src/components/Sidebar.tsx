"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Boxes,
  LayoutDashboard,
  Search,
  Clapperboard,
  Radar,
  Building2,
  Heart,
  FileBarChart2,
  Settings,
  type LucideIcon,
} from "lucide-react";
import { MAIN_SECTIONS, SECONDARY_SECTIONS, type SectionHref, withTarget } from "@/lib/nav";

const ICONS: Record<SectionHref, LucideIcon> = {
  "/": LayoutDashboard,
  "/scanner": Search,
  "/conteudo": Clapperboard,
  "/mercado": Radar,
  "/empresas": Building2,
  "/oportunidades": Heart,
  "/relatorios": FileBarChart2,
  "/configuracoes": Settings,
};

function NavLink({ href, label, target, active }: { href: SectionHref; label: string; target: string; active: boolean }) {
  const Icon = ICONS[href];
  return (
    <Link
      href={withTarget(href, target)}
      aria-current={active ? "page" : undefined}
      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors ${
        active ? "bg-white/10 text-white font-medium" : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
      }`}
    >
      <Icon className="w-[18px] h-[18px]" aria-hidden="true" />
      {label}
    </Link>
  );
}

export function Sidebar({ target }: { target: string }) {
  const pathname = usePathname();
  const all = [...MAIN_SECTIONS, ...SECONDARY_SECTIONS];

  return (
    <>
      <aside className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 bg-[#0B1220] text-slate-300 print:hidden">
        <div className="flex items-center gap-2 px-6 h-20">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-violet-500 flex items-center justify-center">
            <Boxes className="w-5 h-5 text-white" aria-hidden="true" />
          </div>
          <span className="text-white font-semibold leading-tight text-[15px]">Nichemap</span>
        </div>

        <nav aria-label="Seções" className="flex-1 px-3 mt-2 space-y-1">
          {MAIN_SECTIONS.map((s) => (
            <NavLink key={s.href} {...s} target={target} active={pathname === s.href} />
          ))}
        </nav>

        <nav aria-label="Ferramentas" className="px-3 pb-5 space-y-1 border-t border-white/5 pt-3">
          {SECONDARY_SECTIONS.map((s) => (
            <NavLink key={s.href} {...s} target={target} active={pathname === s.href} />
          ))}
        </nav>
      </aside>

      {/* Below md the sidebar is hidden: same sections as a horizontally scrolling menu. */}
      <nav aria-label="Seções" className="md:hidden bg-[#0B1220] print:hidden">
        <div className="flex items-center gap-2 px-4 pt-3 text-white font-semibold text-sm">
          <Boxes className="w-4 h-4 text-violet-400" aria-hidden="true" />
          Nichemap
        </div>
        <ul className="flex gap-1 overflow-x-auto px-2 py-2">
          {all.map((s) => {
            const active = pathname === s.href;
            return (
              <li key={s.href} className="shrink-0">
                <Link
                  href={withTarget(s.href, target)}
                  aria-current={active ? "page" : undefined}
                  className={`block px-3 py-2 rounded-lg text-xs whitespace-nowrap ${
                    active ? "bg-white/15 text-white font-medium" : "text-slate-300"
                  }`}
                >
                  {s.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
}
