"use client";

import Link from "next/link";
import { PlayCircle, Images, Eye, Heart, MessageCircle } from "lucide-react";
import { ContentItem } from "@/lib/types";

const MEDALS = ["🥇", "🥈", "🥉"];

export function TopContent({ items, moreHref }: { items: ContentItem[]; moreHref?: string }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
      <div className="flex items-center justify-between">
        <h3 className="font-medium text-slate-900">Conteúdos em destaque</h3>
        {moreHref && (
          <Link href={moreHref} className="text-xs text-blue-600 font-medium hover:underline">
            Ver todos
          </Link>
        )}
      </div>
      {items.length === 0 && <p className="mt-3 text-sm text-slate-400">Nenhuma publicação encontrada.</p>}
      <ul className="mt-3 space-y-3">
        {items.slice(0, 3).map((item, i) => (
          <li key={item.id} className="flex gap-3">
            <div className="w-16 h-16 rounded-xl bg-slate-100 flex items-center justify-center shrink-0 text-lg">
              {MEDALS[i] ?? (item.type === "Reel" ? <PlayCircle className="w-5 h-5 text-slate-400" /> : <Images className="w-5 h-5 text-slate-400" />)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs text-slate-400">
                {item.type} · {item.date}
              </p>
              <p className="text-sm font-medium text-slate-800 truncate">{item.title}</p>
              <div className="flex items-center gap-3 mt-1 text-xs text-slate-400">
                {item.views !== undefined && (
                  <span className="flex items-center gap-1">
                    <Eye className="w-3.5 h-3.5" aria-label="Visualizações" /> {item.views.toLocaleString("pt-BR")}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Heart className="w-3.5 h-3.5" /> {item.likes.toLocaleString("pt-BR")}
                </span>
                <span className="flex items-center gap-1">
                  <MessageCircle className="w-3.5 h-3.5" /> {item.comments.toLocaleString("pt-BR")}
                </span>
              </div>
            </div>
            <span className="shrink-0 self-start text-[11px] font-medium px-2 py-1 rounded-full bg-orange-50 text-orange-600">
              {item.multiplier}x acima da média
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
