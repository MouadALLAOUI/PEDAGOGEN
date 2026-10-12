'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  BookOpen,
  Loader2,
  Plus,
  CalendarDays,
  LayoutList,
  FileDown,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { PageTransition } from '@/components/layout/PageTransition';
import { Button } from '@/components/ui/Button';
import { EntryCard } from '@/components/notebook/EntryCard';
import { QuickEditSheet } from '@/components/notebook/QuickEditSheet';
import { DuplicateModal } from '@/components/notebook/DuplicateModal';
import type { NotebookEntry, Statut } from '@/types/notebook';
import type { CollegeClass } from '@/types/student';

export default function NotebookClassePage() {
  const { classeId } = useParams<{ classeId: string }>();
  const router = useRouter();
  const [classe, setClasse] = useState<CollegeClass | null>(null);
  const [allClasses, setAllClasses] = useState<CollegeClass[]>([]);
  const [entries, setEntries] = useState<NotebookEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'timeline' | 'calendar'>('timeline');
  const [calMonth, setCalMonth] = useState(() => {
    const d = new Date();
    return { y: d.getFullYear(), m: d.getMonth() };
  });

  // Quick edit and duplicate states
  const [editingEntry, setEditingEntry] = useState<NotebookEntry | null>(null);
  const [duplicatingEntry, setDuplicatingEntry] = useState<NotebookEntry | null>(null);

  const loadData = () => {
    if (!classeId) return;
    Promise.all([
      fetch(`/api/classes/${classeId}`).then((r) => r.json()),
      fetch(`/api/students/classes`).then((r) => r.json()),
      fetch(`/api/notebook?classeId=${classeId}`).then((r) => r.json()),
    ])
      .then(([classeData, classesData, nbData]) => {
        if (classeData.classe) setClasse(classeData.classe);
        if (classesData.classes) setAllClasses(classesData.classes);
        setEntries(nbData.entries || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, [classeId]);

  // Inline status update with undo toast
  const handleStatusChange = async (
    id: string,
    nextStatus: Statut,
    prevStatus: Statut
  ) => {
    // 1. Optimistic update
    setEntries((prev) =>
      prev.map((e) => (e.id === id ? { ...e, statut: nextStatus } : e))
    );

    // 2. Undo toast
    const toastId = toast(
      (t) => (
        <div className="flex items-center justify-between gap-3 text-xs">
          <span>
            Statut modifié en <strong>{nextStatus}</strong>
          </span>
          <button
            type="button"
            onClick={async () => {
              toast.dismiss(t.id);
              // Rollback in state
              setEntries((prev) =>
                prev.map((e) => (e.id === id ? { ...e, statut: prevStatus } : e))
              );
              // Rollback on server
              try {
                await fetch(`/api/notebook/${id}`, {
                  method: 'PUT',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ statut: prevStatus }),
                });
                toast.success('Modification annulée', { duration: 2500 });
              } catch {
                toast.error('Impossible de restaurer le statut');
              }
            }}
            className="px-2.5 py-1 rounded bg-navy text-white text-[11px] font-semibold hover:bg-teal transition-colors cursor-pointer"
          >
            Annuler
          </button>
        </div>
      ),
      { duration: 5000 }
    );

    // 3. Server call
    try {
      const res = await fetch(`/api/notebook/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ statut: nextStatus }),
      });
      if (!res.ok) throw new Error('Erreur');
    } catch {
      toast.dismiss(toastId);
      setEntries((prev) =>
        prev.map((e) => (e.id === id ? { ...e, statut: prevStatus } : e))
      );
      toast.error('Erreur lors du changement de statut');
    }
  };

  // Delete handler
  const handleDeleteEntry = async (id: string, titre: string) => {
    const ok = window.confirm(`Supprimer définitivement l'entrée "${titre}" ?`);
    if (!ok) return;

    try {
      const res = await fetch(`/api/notebook/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Erreur');
      setEntries((prev) => prev.filter((e) => e.id !== id));
      toast.success('Entrée supprimée');
    } catch {
      toast.error('Impossible de supprimer cette entrée');
    }
  };

  // Duplicate handler
  const handleDuplicate = async (
    id: string,
    newDate: string,
    newClasseId?: string
  ) => {
    try {
      const res = await fetch('/api/notebook/duplicate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id,
          sourceId: id,
          newDate,
          newClasseId,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erreur');
      toast.success('Entrée dupliquée avec succès');
      setDuplicatingEntry(null);
      loadData();
    } catch (err: any) {
      toast.error(err.message || 'Erreur lors de la duplication');
      throw err;
    }
  };

  // Timeline: group by month
  const grouped = entries.reduce<Record<string, NotebookEntry[]>>((acc, e) => {
    const month = e.date.slice(0, 7);
    (acc[month] = acc[month] || []).push(e);
    return acc;
  }, {});

  const monthLabel = (key: string) => {
    const [y, m] = key.split('-').map(Number);
    return new Date(y!, (m ?? 1) - 1, 1).toLocaleDateString('fr-FR', {
      month: 'long',
      year: 'numeric',
    });
  };

  return (
    <PageTransition>
      <div className="max-w-4xl mx-auto space-y-8 pb-16">
        {/* Header */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-teal via-teal-dark to-navy p-6 lg:p-8 text-white">
          <div className="absolute top-0 right-0 w-56 h-56 bg-teal-light/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
          <div className="relative z-10">
            <button
              onClick={() => router.push('/notebook')}
              className="flex items-center gap-1.5 text-white/60 text-xs mb-3 hover:text-white transition-colors cursor-pointer"
            >
              <ArrowLeft size={13} />
              <span>Toutes les entrées</span>
            </button>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-11 h-11 rounded-xl bg-white/15 backdrop-blur flex items-center justify-center shrink-0">
                  <BookOpen size={20} />
                </div>
                <div>
                  <h1 className="font-display text-2xl lg:text-3xl font-bold tracking-tight">
                    Carnet — {classe?.name || '...'}
                  </h1>
                  <p className="text-white/60 text-sm mt-0.5">
                    {entries.length} entrée(s) documentée(s)
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2.5">
                <div className="flex gap-1 p-1 bg-white/10 rounded-lg">
                  <button
                    onClick={() => setView('timeline')}
                    className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                      view === 'timeline'
                        ? 'bg-white text-teal'
                        : 'text-white/70 hover:text-white'
                    }`}
                  >
                    <LayoutList size={12} className="inline mr-1" />
                    Timeline
                  </button>
                  <button
                    onClick={() => setView('calendar')}
                    className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                      view === 'calendar'
                        ? 'bg-white text-teal'
                        : 'text-white/70 hover:text-white'
                    }`}
                  >
                    <CalendarDays size={12} className="inline mr-1" />
                    Calendrier
                  </button>
                </div>
                <a
                  href={`/api/notebook/export?classeId=${classeId}`}
                  className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-white/15 text-white text-xs font-medium hover:bg-white/25 transition-colors"
                  title="Exporter le carnet (PDF archivage)"
                >
                  <FileDown size={13} />
                  <span>Export PDF</span>
                </a>
                <Button onClick={() => router.push(`/notebook/${classeId}/new`)}>
                  <Plus size={16} />
                  <span>Nouvelle Entrée</span>
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* View Content */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={24} className="animate-spin text-teal" />
          </div>
        ) : entries.length === 0 ? (
          <div className="rounded-xl border border-border bg-white p-16 text-center">
            <BookOpen size={24} className="text-muted/50 mx-auto mb-3" />
            <p className="text-sm text-muted font-medium">
              Aucune entrée pour cette classe
            </p>
            <p className="text-xs text-muted/60 mt-1">
              Documentez votre première séance ou réunion.
            </p>
            <Button
              size="sm"
              className="mt-5"
              onClick={() => router.push(`/notebook/${classeId}/new`)}
            >
              <Plus size={13} className="mr-1.5" />
              Nouvelle Entrée
            </Button>
          </div>
        ) : view === 'calendar' ? (
          <CalendarView
            entries={entries}
            month={calMonth}
            onMonthChange={setCalMonth}
            onEdit={(e) => setEditingEntry(e)}
          />
        ) : (
          <div className="space-y-8">
            {Object.entries(grouped).map(([month, list]) => (
              <div key={month}>
                <h2 className="text-xs font-semibold text-muted uppercase tracking-wide mb-3">
                  {monthLabel(month)}
                </h2>
                <div className="relative pl-6 border-l-2 border-teal/20 space-y-3">
                  {list.map((e) => (
                    <div key={e.id} className="relative">
                      <span className="absolute -left-[29px] top-4 w-3 h-3 rounded-full bg-teal border-2 border-white shadow" />
                      <EntryCard
                        entry={e}
                        onEdit={(entry) => setEditingEntry(entry)}
                        onDuplicate={(entry) => setDuplicatingEntry(entry)}
                        onDelete={handleDeleteEntry}
                        onStatusChange={handleStatusChange}
                      />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Quick Edit Side Sheet */}
        <QuickEditSheet
          open={Boolean(editingEntry)}
          onClose={() => setEditingEntry(null)}
          entry={editingEntry}
          classes={allClasses.length > 0 ? allClasses : classe ? [classe] : []}
          onSaved={(updated) => {
            setEntries((prev) =>
              prev.map((e) => (e.id === updated.id ? updated : e))
            );
          }}
        />

        {/* Duplicate Modal */}
        <DuplicateModal
          open={Boolean(duplicatingEntry)}
          onClose={() => setDuplicatingEntry(null)}
          entry={duplicatingEntry}
          classes={allClasses.length > 0 ? allClasses : classe ? [classe] : []}
          onDuplicate={handleDuplicate}
        />
      </div>
    </PageTransition>
  );
}

// ─── Vue calendrier mensuelle ───
const MONTH_NAMES = [
  'Janvier',
  'Février',
  'Mars',
  'Avril',
  'Mai',
  'Juin',
  'Juillet',
  'Août',
  'Septembre',
  'Octobre',
  'Novembre',
  'Décembre',
];
const DAY_NAMES = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
const STATUT_DOT: Record<string, string> = {
  realisee: 'bg-green',
  tenue: 'bg-green',
  planifiee: 'bg-teal',
  reportee: 'bg-amber-500',
  absence: 'bg-red-500',
  annulee: 'bg-red-500',
};

function CalendarView({
  entries,
  month,
  onMonthChange,
  onEdit,
}: {
  entries: NotebookEntry[];
  month: { y: number; m: number };
  onMonthChange: (m: { y: number; m: number }) => void;
  onEdit: (e: NotebookEntry) => void;
}) {
  const byDate = new Map<string, NotebookEntry[]>();
  for (const e of entries) {
    const list = byDate.get(e.date) || [];
    list.push(e);
    byDate.set(e.date, list);
  }

  const first = new Date(month.y, month.m, 1);
  const daysInMonth = new Date(month.y, month.m + 1, 0).getDate();
  const startOffset = (first.getDay() + 6) % 7; // lundi = 0
  const cells: Array<number | null> = [
    ...Array(startOffset).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const shift = (delta: number) => {
    const d = new Date(month.y, month.m + delta, 1);
    onMonthChange({ y: d.getFullYear(), m: d.getMonth() });
  };

  return (
    <div className="rounded-xl border border-border bg-white p-4">
      <div className="flex items-center justify-between mb-3">
        <button
          onClick={() => shift(-1)}
          className="px-3 py-1 rounded-md text-sm text-muted hover:bg-parchment-dark/40 cursor-pointer"
          aria-label="Mois précédent"
        >
          ←
        </button>
        <span className="font-display font-semibold text-navy text-sm">
          {MONTH_NAMES[month.m]} {month.y}
        </span>
        <button
          onClick={() => shift(1)}
          className="px-3 py-1 rounded-md text-sm text-muted hover:bg-parchment-dark/40 cursor-pointer"
          aria-label="Mois suivant"
        >
          →
        </button>
      </div>
      <div className="grid grid-cols-7 gap-1">
        {DAY_NAMES.map((d) => (
          <div
            key={d}
            className="text-[10px] font-medium text-muted text-center py-1"
          >
            {d}
          </div>
        ))}
        {cells.map((day, i) => {
          if (!day) {
            return (
              <div
                key={`empty-${i}`}
                className="h-20 border border-border/30 rounded-md bg-parchment-dark/10"
              />
            );
          }
          const iso = `${month.y}-${String(month.m + 1).padStart(2, '0')}-${String(
            day
          ).padStart(2, '0')}`;
          const dayEntries = byDate.get(iso) || [];
          return (
            <div
              key={day}
              className="h-20 border border-border/50 rounded-md p-1.5 flex flex-col justify-between hover:bg-parchment-dark/20 transition-colors"
            >
              <span className="text-[11px] font-mono font-medium text-navy">
                {day}
              </span>
              <div className="space-y-1 overflow-y-auto">
                {dayEntries.slice(0, 2).map((e) => (
                  <button
                    key={e.id}
                    onClick={() => onEdit(e)}
                    className="w-full text-left truncate text-[10px] font-medium px-1 py-0.5 rounded bg-teal/10 text-teal hover:bg-teal/20 transition-colors flex items-center gap-1 cursor-pointer"
                    title={e.titre}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                        STATUT_DOT[e.statut] || 'bg-teal'
                      }`}
                    />
                    <span className="truncate">{e.titre}</span>
                  </button>
                ))}
                {dayEntries.length > 2 && (
                  <span className="text-[9px] text-muted block text-center font-medium">
                    +{dayEntries.length - 2} de plus
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
