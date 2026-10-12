'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Loader2, BookOpen, FileText, NotebookPen, History, X, GraduationCap } from 'lucide-react';
import type { SearchResult } from '@/lib/search/fts';

export function GlobalSearchModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [levelFilter, setLevelFilter] = useState<string>('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery('');
      setResults([]);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setLoading(false);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({ q: query.trim() });
        if (levelFilter) params.set('niveau', levelFilter);
        const res = await fetch(`/api/search?${params.toString()}`);
        const data = await res.json();
        setResults(data.results || []);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [query, levelFilter]);

  if (!isOpen) return null;

  const handleSelect = (href: string) => {
    onClose();
    router.push(href);
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'curriculum':
        return <GraduationCap size={16} className="text-teal" />;
      case 'notebook':
        return <NotebookPen size={16} className="text-blue" />;
      case 'file':
        return <FileText size={16} className="text-amber" />;
      default:
        return <History size={16} className="text-purple" />;
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-16 px-4 bg-navy/60 backdrop-blur-sm animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden border border-border animate-slide-up flex flex-col max-h-[80vh]">
        {/* Search Input Bar */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-slate-50">
          <Search size={18} className="text-muted shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher une leçon MEN, un document, carnet, compétence..."
            className="flex-1 bg-transparent border-0 text-sm font-medium text-navy focus:outline-none placeholder:text-muted"
          />
          {loading && <Loader2 size={16} className="animate-spin text-teal shrink-0" />}
          {query && (
            <button
              onClick={() => setQuery('')}
              className="p-1 rounded-md hover:bg-slate-200 text-muted transition-colors"
            >
              <X size={14} />
            </button>
          )}
          <button
            onClick={onClose}
            className="text-xs px-2 py-1 rounded bg-slate-200 text-muted hover:text-navy transition-colors shrink-0 font-mono"
          >
            ESC
          </button>
        </div>

        {/* Level Filters */}
        <div className="flex items-center gap-2 px-4 py-2 border-b border-border bg-white text-xs">
          <span className="text-muted font-medium">Cycle :</span>
          {(['', '1AC', '2AC', '3AC'] as const).map((lvl) => (
            <button
              key={lvl}
              onClick={() => setLevelFilter(lvl)}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                levelFilter === lvl
                  ? 'bg-teal text-white shadow-xs'
                  : 'bg-slate-100 text-muted hover:text-navy hover:bg-slate-200'
              }`}
            >
              {lvl ? lvl : 'Tous'}
            </button>
          ))}
        </div>

        {/* Results List */}
        <div className="flex-1 overflow-y-auto p-2 divide-y divide-border/40">
          {query.trim() === '' ? (
            <div className="py-12 text-center text-muted">
              <BookOpen size={32} className="mx-auto mb-2 opacity-30" />
              <p className="text-sm font-medium">Recherche Pédagogique Rapide</p>
              <p className="text-xs mt-1">Tapez le nom d'une leçon, chapitre ou compétence (1AC, 2AC, 3AC)</p>
            </div>
          ) : results.length === 0 && !loading ? (
            <div className="py-12 text-center text-muted text-sm">
              Aucun résultat pour <span className="font-semibold text-navy">"{query}"</span>
            </div>
          ) : (
            results.map((item, idx) => (
              <button
                key={`${item.ref_type}-${item.ref_id}-${idx}`}
                onClick={() => handleSelect(item.href)}
                className="w-full text-left px-3 py-2.5 rounded-xl hover:bg-slate-50 transition-colors flex items-start gap-3 group"
              >
                <div className="p-2 rounded-lg bg-slate-100 group-hover:bg-teal/10 transition-colors shrink-0 mt-0.5">
                  {getIcon(item.ref_type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-navy truncate group-hover:text-teal transition-colors">
                      {item.title}
                    </p>
                    <span className="text-[10px] font-medium uppercase px-2 py-0.5 rounded-full bg-slate-100 text-muted group-hover:bg-teal/10 group-hover:text-teal transition-colors shrink-0">
                      {item.type_label}
                    </span>
                  </div>
                  {item.subtitle && (
                    <p className="text-xs text-muted truncate mt-0.5">{item.subtitle}</p>
                  )}
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
