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
  Lock,
  UserRound,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";
import { canAccess, PLAN_LABELS, requiredPlan, type Plan } from "@/lib/access";
import { MAIN_SECTIONS, SECONDARY_SECTIONS, type SectionHref, withTarget } from "@/lib/nav";

type NavViewer = { plan: Plan; isAdmin: boolean };

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

interface Item {
  key: string;
  href: string;
  label: string;
  icon: LucideIcon;
  active: boolean;
  locked?: string; // accessible description of the plan that unlocks it
}

// Sections outside the plan stay visible with a lock and lead to /plano (upgrade path).
function buildItems(sections: readonly { href: SectionHref; label: string }[], target: string, viewer: NavViewer, pathname: string) {
  return sections
    .filter((s) => viewer.isAdmin || requiredPlan(s.href) !== "admin")
    .map((s): Item => {
      const open = canAccess(viewer, s.href);
      const plan = requiredPlan(s.href);
      return {
        key: s.href,
        href: open ? withTarget(s.href, target) : `/plano?secao=${s.href}`,
        label: s.label,
        icon: open ? ICONS[s.href] : Lock,
        active: pathname === s.href,
        locked: open || plan === "admin" ? undefined : `${s.label} (disponível no plano ${PLAN_LABELS[plan]})`,
      };
    });
}

function accountItems(viewer: NavViewer, pathname: string): Item[] {
  const items: Item[] = [{ key: "/conta", href: "/conta", label: "Minha conta", icon: UserRound, active: pathname === "/conta" }];
  if (viewer.isAdmin) items.push({ key: "/admin", href: "/admin", label: "Admin", icon: ShieldCheck, active: pathname === "/admin" });
  return items;
}

function NavLink({ item }: { item: Item }) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      aria-current={item.active ? "page" : undefined}
      aria-label={item.locked}
      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors ${
        item.active ? "bg-white/10 text-white font-medium" : item.locked ? "text-slate-500 hover:bg-white/5" : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
      }`}
    >
      <Icon className="w-[18px] h-[18px]" aria-hidden="true" />
      {item.label}
    </Link>
  );
}

export function Sidebar({ target, viewer }: { target: string; viewer: NavViewer }) {
  const pathname = usePathname();
  const main = buildItems(MAIN_SECTIONS, target, viewer, pathname);
  const secondary = [...buildItems(SECONDARY_SECTIONS, target, viewer, pathname), ...accountItems(viewer, pathname)];

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
          {main.map((item) => (
            <NavLink key={item.key} item={item} />
          ))}
        </nav>

        <nav aria-label="Ferramentas" className="px-3 pb-5 space-y-1 border-t border-white/5 pt-3">
          {secondary.map((item) => (
            <NavLink key={item.key} item={item} />
          ))}
        </nav>
      </aside>

      {/* Below md the sidebar is hidden: same items as a horizontally scrolling menu. */}
      <nav aria-label="Seções" className="md:hidden bg-[#0B1220] print:hidden">
        <div className="flex items-center gap-2 px-4 pt-3 text-white font-semibold text-sm">
          <Boxes className="w-4 h-4 text-violet-400" aria-hidden="true" />
          Nichemap
        </div>
        <ul className="flex gap-1 overflow-x-auto px-2 py-2">
          {[...main, ...secondary].map((item) => (
            <li key={item.key} className="shrink-0">
              <Link
                href={item.href}
                aria-current={item.active ? "page" : undefined}
                aria-label={item.locked}
                className={`flex items-center gap-1 px-3 py-2 rounded-lg text-xs whitespace-nowrap ${
                  item.active ? "bg-white/15 text-white font-medium" : item.locked ? "text-slate-500" : "text-slate-300"
                }`}
              >
                {item.locked && <Lock className="w-3 h-3" aria-hidden="true" />}
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </>
  );
}
