'use client';

import { useState, useEffect } from 'react';
import { Clock, Download, Filter, CalendarDays, LayoutList, Star, ArrowLeft, ArrowRight } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { PageTransition } from '@/components/layout/PageTransition';
import { MODE_DESCRIPTIONS } from '@/lib/validators/generation';
import { useFavorites } from '@/components/layout/FavoritesProvider';

interface HistoryEntry {
  id: string;
  mode: string;
  matiere: string;
  niveau: string;
  lecon: string;
  createdAt: string;
  filesCount: number;
  tokensUsed: number;
  files: { name: string; url: string; format: string }[];
}

const FILTER_COLORS: Record<string, string> = {
  all: 'bg-navy text-parchment',
  heavy: 'bg-green/10 text-green border border-green/20',
  medium: 'bg-amber/10 text-amber border border-amber/20',
  light: 'bg-teal/10 text-teal border border-teal/20',
};

const FILTER_ACTIVE: Record<string, string> = {
  all: 'bg-navy text-parchment',
  heavy: 'bg-green text-white',
  medium: 'bg-amber text-white',
  light: 'bg-teal text-white',
};

const MONTHS = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];

export default function HistoryPage() {
  const [filter, setFilter] = useState<'all' | 'heavy' | 'medium' | 'light'>('all');
  const [view, setView] = useState<'list' | 'calendar'>('list');
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const { isFavorite, toggleFavorite } = useFavorites();

  const [calMonth, setCalMonth] = useState(new Date().getMonth());
  const [calYear, setCalYear] = useState(new Date().getFullYear());

  useEffect(() => {
    fetch('/api/history')
      .then((res) => res.json())
      .then((data) => setHistory(data.entries || []))
      .catch(() => setHistory([]));
  }, []);

  const filtered = filter === 'all' ? history : history.filter((h) => h.mode === filter);

  const generateCalendarDays = () => {
    const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
    const firstDay = new Date(calYear, calMonth, 1).getDay();
    const days: { date: number; entries: HistoryEntry[] }[] = [];

    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const entries = filtered.filter((e) => e.createdAt.startsWith(dateStr));
      days.push({ date: d, entries });
    }
    return { days, firstDay };
  };

  const toggleFav = (entry: HistoryEntry) => {
    toggleFavorite({
      id: entry.id,
      title: entry.lecon || 'Sans titre',
      subtitle: `${entry.matiere} · ${entry.niveau} · ${new Date(entry.createdAt).toLocaleDateString('fr-FR')}`,
      type: 'generation',
      date: entry.createdAt,
    });
  };

  return (
    <PageTransition>
      <div className="max-w-5xl mx-auto space-y-8">
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-teal via-teal-dark to-navy p-6 lg:p-8 text-white">
          <div className="absolute top-0 right-0 w-56 h-56 bg-teal-light/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
          <div className="relative z-10 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-11 h-11 rounded-xl bg-white/15 backdrop-blur flex items-center justify-center shrink-0">
                <Clock size={20} className="text-white" />
              </div>
              <div>
                <h1 className="font-display text-2xl lg:text-3xl font-bold tracking-tight">Historique</h1>
                <p className="text-white/60 text-sm mt-0.5">Consultez et re-téléchargez vos documents générés.</p>
              </div>
            </div>
            <div className="flex gap-1 bg-white/10 rounded-lg p-1 border border-white/15">
              <button onClick={() => setView('list')} className={`p-1.5 rounded-md transition-all ${view === 'list' ? 'bg-white/20 text-white' : 'text-white/50 hover:text-white'}`}>
                <LayoutList size={16} />
              </button>
              <button onClick={() => setView('calendar')} className={`p-1.5 rounded-md transition-all ${view === 'calendar' ? 'bg-white/20 text-white' : 'text-white/50 hover:text-white'}`}>
                <CalendarDays size={16} />
              </button>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Filter size={14} className="text-muted" />
          {(['all', 'heavy', 'medium', 'light'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                filter === f ? FILTER_ACTIVE[f] : FILTER_COLORS[f]
              }`}
            >
              {f === 'all' ? 'Tous' : MODE_DESCRIPTIONS[f]?.title}
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <div className="rounded-xl border border-border bg-white p-16 text-center">
            <div className="w-12 h-12 rounded-xl bg-parchment-dark flex items-center justify-center mx-auto mb-3">
              <Clock size={20} className="text-muted/50" />
            </div>
            <p className="text-muted font-medium">Aucune génération</p>
            <p className="text-xs text-muted/60 mt-1">Vos documents générés apparaîtront ici.</p>
          </div>
        ) : view === 'calendar' ? (
          /* ─── CALENDAR VIEW ─── */
          <div className="rounded-xl border border-border bg-white overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 bg-parchment-dark/50 border-b border-border">
              <button onClick={() => { if (calMonth === 0) { setCalMonth(11); setCalYear(calYear - 1); } else { setCalMonth(calMonth - 1); } }} className="p-1 rounded hover:bg-parchment-dark text-muted">
                <ArrowLeft size={16} />
              </button>
              <span className="font-display font-semibold text-navy">{MONTHS[calMonth]} {calYear}</span>
              <button onClick={() => { if (calMonth === 11) { setCalMonth(0); setCalYear(calYear + 1); } else { setCalMonth(calMonth + 1); } }} className="p-1 rounded hover:bg-parchment-dark text-muted">
                <ArrowRight size={16} />
              </button>
            </div>
            <div className="grid grid-cols-7">
              {['Di','Lu','Ma','Me','Je','Ve','Sa'].map((d) => (
                <div key={d} className="text-center text-[10px] font-semibold text-muted uppercase py-2 bg-parchment-dark/30 border-b border-border">{d}</div>
              ))}
            </div>
            <div className="grid grid-cols-7">
              {(() => { const { days, firstDay } = generateCalendarDays(); const pads = []; for (let i = 0; i < firstDay; i++) pads.push(<div key={`pad-${i}`} className="min-h-[80px] p-1 border-b border-r border-border/50 bg-parchment-dark/20" />); return [...pads, ...days.map((day) => (
                <div key={day.date} className="min-h-[80px] p-1 border-b border-r border-border/50 hover:bg-teal-50/30 transition-colors">
                  <span className="text-[10px] font-medium text-navy/60">{day.date}</span>
                  <div className="space-y-0.5 mt-1">
                    {day.entries.slice(0, 3).map((entry) => (
                      <div key={entry.id} className="flex items-center gap-1 px-1 py-0.5 rounded bg-teal/5 text-[9px] text-teal font-medium truncate">
                        <span className="w-1 h-1 rounded-full bg-teal shrink-0" />
                        {entry.lecon || 'Doc'}
                      </div>
                    ))}
                    {day.entries.length > 3 && (
                      <p className="text-[9px] text-muted px-1">+{day.entries.length - 3} autre(s)</p>
                    )}
                  </div>
                </div>
              ))]; })()}
            </div>
          </div>
        ) : (
          /* ─── LIST VIEW ─── */
          <div className="rounded-xl border border-border bg-white overflow-hidden">
            <div className="grid grid-cols-[1fr_100px_80px_80px_80px_40px] gap-3 px-4 py-2.5 border-b border-border text-xs font-medium text-muted bg-parchment-dark/50">
              <span>Leçon</span>
              <span>Matière</span>
              <span>Mode</span>
              <span>Fichiers</span>
              <span className="text-right">Actions</span>
              <span />
            </div>
            {filtered.map((entry) => {
              const modeInfo = MODE_DESCRIPTIONS[entry.mode as keyof typeof MODE_DESCRIPTIONS];
              const fav = isFavorite(entry.id);
              return (
                <div
                  key={entry.id}
                  className="grid grid-cols-[1fr_100px_80px_80px_80px_40px] gap-3 px-4 py-3 items-center border-b border-border/50 last:border-0 hover:bg-parchment-dark/30 transition-colors"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-navy truncate">{entry.lecon || 'Sans titre'}</p>
                    <p className="text-[11px] text-muted">
                      {new Date(entry.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  <span className="text-xs text-muted">{entry.matiere || '—'}</span>
                  <Badge variant={entry.mode === 'heavy' ? 'green' : entry.mode === 'medium' ? 'gold' : 'teal'} className="text-[10px] w-fit">
                    {modeInfo?.title || entry.mode}
                  </Badge>
                  <span className="text-xs text-muted">{entry.filesCount} file(s)</span>
                  <div className="flex items-center justify-end gap-1">
                    {entry.files?.slice(0, 2).map((file) => (
                      <a key={file.name} href={file.url} download={file.name} className="p-1.5 rounded-md hover:bg-teal-50 text-muted hover:text-teal transition-colors">
                        <Download size={13} />
                      </a>
                    ))}
                  </div>
                  <button onClick={() => toggleFav(entry)} className={`p-1.5 rounded-md transition-colors ${fav ? 'text-amber' : 'text-muted/30 hover:text-amber'}`}>
                    <Star size={12} fill={fav ? 'currentColor' : 'none'} />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </PageTransition>
  );
}
