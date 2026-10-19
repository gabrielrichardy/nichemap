"use client";

import { useState, FormEvent } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AtSign, Search } from "lucide-react";

// Only admins search other profiles; customers always see their locked @.
export function Header({ target, canSearch }: { target: string; canSearch: boolean }) {
  const router = useRouter();
  const pathname = usePathname();
  const [query, setQuery] = useState(target);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const clean = query.trim().replace(/^@/, "");
    // Stay on the current section; only the analysed profile changes.
    if (clean) router.push(`${pathname}?target=${encodeURIComponent(clean)}`);
  };

  if (!canSearch) {
    return (
      <header className="flex items-center gap-2 h-20 px-4 md:px-8 print:hidden text-sm text-slate-600">
        <AtSign className="w-4 h-4 text-pink-500" aria-hidden="true" />
        <span>{target}</span>
      </header>
    );
  }

  return (
    <header className="flex items-center gap-3 h-20 px-4 md:gap-4 md:px-8 print:hidden">
      <form className="flex-1 max-w-xl relative" role="search" onSubmit={submit}>
        <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" aria-hidden="true" />
        <input
          type="search"
          aria-label="Buscar perfil do Instagram"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar perfil..."
          className="w-full pl-11 pr-4 py-3 rounded-2xl bg-white border border-slate-200 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
        />
      </form>

    </header>
  );
}
