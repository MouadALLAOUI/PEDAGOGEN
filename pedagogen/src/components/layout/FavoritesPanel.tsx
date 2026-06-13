'use client';

import Link from 'next/link';
import { Star, FileText, Trash2 } from 'lucide-react';
import { useFavorites } from '@/components/layout/FavoritesProvider';

export function FavoritesPanel() {
  const { favorites, removeFavorite, count } = useFavorites();

  if (count === 0) return null;

  const recent = favorites.slice(0, 5);

  return (
    <div className="rounded-xl border border-amber/20 bg-amber/5 p-4">
      <div className="flex items-center gap-2 mb-3">
        <Star size={14} className="text-amber" />
        <h3 className="text-xs font-bold uppercase tracking-wider text-amber">Favoris</h3>
        <span className="text-[10px] text-muted ml-auto">{count} élément(s)</span>
      </div>
      <div className="space-y-1.5">
        {recent.map((item) => (
          <div key={item.id} className="flex items-center gap-2 group">
            <div className="w-6 h-6 rounded-md bg-amber/10 flex items-center justify-center shrink-0">
              <FileText size={11} className="text-amber" />
            </div>
            <div className="flex-1 min-w-0">
              <Link
                href={item.type === 'generation' ? `/generate/status?id=${item.id}` : `/history`}
                className="text-xs font-medium text-navy truncate block hover:text-teal transition-colors"
              >
                {item.title}
              </Link>
              <p className="text-[10px] text-muted truncate">{item.subtitle}</p>
            </div>
            <button
              onClick={() => removeFavorite(item.id)}
              className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-red/10 text-muted hover:text-red transition-all"
            >
              <Trash2 size={11} />
            </button>
          </div>
        ))}
      </div>
      {favorites.length > 5 && (
        <Link href="/history" className="block text-[10px] text-teal mt-2 hover:underline text-center">
          Voir tous les favoris →
        </Link>
      )}
    </div>
  );
}
