'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Clock, Download, Filter, CalendarDays, LayoutList, Star, ArrowLeft, ArrowRight, ClipboardCheck, BookOpen, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Select';
import { PageTransition } from '@/components/layout/PageTransition';
import { MODE_DESCRIPTIONS } from '@/lib/validators/generation';
import { useFavorites } from '@/components/layout/FavoritesProvider';
import type { CollegeClass } from '@/types/student';

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
  const router = useRouter();
  const [filter, setFilter] = useState<'all' | 'heavy' | 'medium' | 'light'>('all');
  const [view, setView] = useState<'list' | 'calendar'>('list');
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const { isFavorite, toggleFavorite } = useFavorites();
  // Boucle fiche → évaluation / carnet
  const [nbModal, setNbModal] = useState<{ entry: HistoryEntry; classeId: string; date: string } | null>(null);
  const [nbClasses, setNbClasses] = useState<CollegeClass[]>([]);
  const [nbSaving, setNbSaving] = useState(false);

  const createExamFromLesson = (entry: HistoryEntry) => {
    try {
      localStorage.setItem('pedagogen_exam_prefill', JSON.stringify({
        titre: `Évaluation — ${entry.lecon || entry.matiere}`,
        niveau: entry.niveau || undefined,
      }));
      router.push('/examens/new');
    } catch { router.push('/examens/new'); }
  };

  const openNotebookModal = async (entry: HistoryEntry) => {
    setNbModal({ entry, classeId: '', date: new Date().toISOString().slice(0, 10) });
    try {
      const res = await fetch('/api/classes');
      const data = await res.json();
      const list: CollegeClass[] = data.classes || [];
      setNbClasses(list);
      setNbModal((m) => (m ? { ...m, classeId: list[0]?.id || '' } : m));
    } catch { /* modal shows empty */ }
  };

  const saveNotebookEntry = async () => {
    if (!nbModal?.classeId) { toast.error('Choisissez une classe'); return; }
    setNbSaving(true);
    try {
      const res = await fetch('/api/notebook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          classe_id: nbModal.classeId,
          date: nbModal.date,
          titre: nbModal.entry.lecon || 'Séance',
          resume: '',
          statut: 'realisee',
          tags: [nbModal.entry.matiere].filter(Boolean),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Échec');
      toast.success('Entrée créée dans le carnet');
      setNbModal(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Échec');
    } finally {
      setNbSaving(false);
    }
  };

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
                    <button
                      onClick={() => createExamFromLesson(entry)}
                      className="p-1.5 rounded-md hover:bg-teal-50 text-muted hover:text-teal transition-colors"
                      title="Créer l'évaluation de cette leçon"
                      aria-label="Créer l'évaluation de cette leçon"
                    >
                      <ClipboardCheck size={13} />
                    </button>
                    <button
                      onClick={() => openNotebookModal(entry)}
                      className="p-1.5 rounded-md hover:bg-teal-50 text-muted hover:text-teal transition-colors"
                      title="Ajouter au carnet de bord"
                      aria-label="Ajouter au carnet de bord"
                    >
                      <BookOpen size={13} />
                    </button>
                    {entry.files?.slice(0, 2).map((file) => (
                      <a key={file.name} href={file.url} download={file.name} className="p-1.5 rounded-md hover:bg-teal-50 text-muted hover:text-teal transition-colors" title={`Télécharger ${file.name}`} aria-label={`Télécharger ${file.name}`}>
                        <Download size={13} />
                      </a>
                    ))}
                  </div>
                  <button onClick={() => toggleFav(entry)} className={`p-1.5 rounded-md transition-colors ${fav ? 'text-amber' : 'text-muted/30 hover:text-amber'}`} aria-label="Favori">
                    <Star size={12} fill={fav ? 'currentColor' : 'none'} />
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* Modal : ajouter au carnet de bord */}
        <Modal open={!!nbModal} onClose={() => setNbModal(null)} title="Ajouter au Carnet de Bord">
          {nbModal && (
            <div className="space-y-4">
              <p className="text-sm text-navy font-medium">{nbModal.entry.lecon || 'Séance'}</p>
              <Select
                label="Classe"
                value={nbModal.classeId}
                onChange={(e) => setNbModal({ ...nbModal, classeId: e.target.value })}
                placeholder="Choisir une classe"
                options={nbClasses.map((c) => ({ value: c.id, label: `${c.name} (${c.niveau})` }))}
              />
              <input
                type="date"
                value={nbModal.date}
                onChange={(e) => setNbModal({ ...nbModal, date: e.target.value })}
                className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-navy focus:outline-none focus:ring-2 focus:ring-teal/30 focus:border-teal"
                aria-label="Date de la séance"
              />
              <div className="flex justify-end gap-2 pt-1">
                <Button variant="secondary" size="sm" onClick={() => setNbModal(null)}>Annuler</Button>
                <Button size="sm" onClick={saveNotebookEntry} disabled={nbSaving || !nbModal.classeId}>
                  {nbSaving ? <Loader2 size={13} className="animate-spin" /> : <BookOpen size={13} />}
                  Créer l'entrée
                </Button>
              </div>
            </div>
          )}
        </Modal>
      </div>
    </PageTransition>
  );
}
