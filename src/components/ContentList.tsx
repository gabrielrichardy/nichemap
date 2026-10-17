import { ExternalLink, Heart, MessageCircle } from "lucide-react";
import type { ContentItem } from "@/lib/types";

export function ContentList({ items }: { items: ContentItem[] }) {
  if (items.length === 0) {
    return <p className="text-sm text-slate-400">Nenhuma publicação encontrada.</p>;
  }
  return (
    <ul className="bg-white rounded-2xl border border-slate-100 shadow-sm divide-y divide-slate-50">
      {items.map((item) => (
        <li key={item.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 p-4">
          <div className="min-w-0 flex-1 basis-60">
            <p className="text-xs text-slate-400">
              {item.type} · {item.date}
            </p>
            <p className="text-sm font-medium text-slate-800 truncate">{item.title}</p>
          </div>
          <span className="flex items-center gap-1 text-xs text-slate-500">
            <Heart className="w-3.5 h-3.5" aria-hidden="true" /> {item.likes.toLocaleString("pt-BR")}
            <span className="sr-only">curtidas</span>
          </span>
          <span className="flex items-center gap-1 text-xs text-slate-500">
            <MessageCircle className="w-3.5 h-3.5" aria-hidden="true" /> {item.comments.toLocaleString("pt-BR")}
            <span className="sr-only">comentários</span>
          </span>
          <span className="text-[11px] font-medium px-2 py-1 rounded-full bg-slate-100 text-slate-600">
            {item.multiplier}x a média
          </span>
          {item.permalink && (
            <a
              href={item.permalink}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs text-blue-600 hover:underline"
            >
              Abrir <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
              <span className="sr-only">publicação no Instagram (nova aba)</span>
            </a>
          )}
        </li>
      ))}
    </ul>
  );
}
