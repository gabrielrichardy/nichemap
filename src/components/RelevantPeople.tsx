"use client";

import { Person } from "@/lib/types";

import Link from "next/link";
import { SampleBadge } from "./SampleBadge";

export function RelevantPeople({
  people,
  moreHref,
  sample,
}: {
  people: Person[];
  moreHref?: string;
  sample?: boolean;
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="font-medium text-slate-900">Pessoas Relevantes</h3>
          <SampleBadge show={sample} />
        </div>
        {moreHref && (
          <Link href={moreHref} className="text-xs text-blue-600 font-medium hover:underline">
            Ver todos
          </Link>
        )}
      </div>
      <ul className="mt-3 space-y-3">
        {people.map((p) => (
          <li key={p.name} className="flex items-center gap-3">
            <span className="w-9 h-9 rounded-full bg-gradient-to-br from-slate-300 to-slate-400 shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-slate-800 truncate">{p.name}</p>
              <p className="text-xs text-slate-400 truncate">{p.role}</p>
            </div>
            <span className="text-xs font-medium text-slate-600">{p.score}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
