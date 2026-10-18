"use client";

import { ThemeItem } from "@/lib/types";

export function ThemeAnalysis({ themes }: { themes: ThemeItem[] }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
      <div className="flex items-center gap-2">
        {/* Terms and hashtags found in the captions (extractThemes), not an AI model. */}
        <h3 className="font-medium text-slate-900">Temas do perfil</h3>
        <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-violet-50 text-violet-600">Beta</span>
      </div>
      <p className="text-xs text-slate-400 mt-1">Termos e hashtags mais presentes nas legendas: % das publicações que citam cada um.</p>
      {themes.length === 0 && <p className="mt-4 text-sm text-slate-400">Sem legendas suficientes para identificar temas.</p>}
      <ul className="mt-4 space-y-3">
        {themes.map((t) => (
          <li key={t.label}>
            <div className="flex items-center justify-between text-sm mb-1">
              <span className="text-slate-600">{t.label}</span>
              <span className="text-slate-800 font-medium">{t.percent}%</span>
            </div>
            <div className="h-1.5 rounded-full bg-slate-100">
              <div
                className="h-1.5 rounded-full"
                style={{ width: `${t.percent}%`, backgroundColor: t.color }}
              />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
