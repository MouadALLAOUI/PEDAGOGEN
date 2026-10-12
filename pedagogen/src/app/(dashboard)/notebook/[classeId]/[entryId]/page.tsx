'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, BookOpen, Loader2, Trash2, ExternalLink, Copy } from 'lucide-react';
import toast from 'react-hot-toast';
import { PageTransition } from '@/components/layout/PageTransition';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { EntryForm, type EntryFormData, CRENEAUX_HORAIRES } from '@/components/notebook/EntryForm';
import type { CollegeClass } from '@/types/student';

interface Entry {
  id: string;
  classe_id: string;
  date: string;
  heure_debut?: string;
  heure_fin?: string;
  titre: string;
  resume: string;
  statut: string;
  tags: string[];
  exam_id: string | null;
  documents?: string[];
  attachments?: Array<{
    id: string;
    name: string;
    size: number;
    mime_type: string;
    url: string;
    created_at?: string;
  }>;
}

export default function EditerEntreePage() {
  const { classeId, entryId } = useParams<{ classeId: string; entryId: string }>();
  const router = useRouter();
  const [entry, setEntry] = useState<Entry | null>(null);
  const [classes, setClasses] = useState<CollegeClass[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [duplicateModalOpen, setDuplicateModalOpen] = useState(false);
  const [selectedTargetClasses, setSelectedTargetClasses] = useState<string[]>([]);
  const [targetSchedules, setTargetSchedules] = useState<
    Record<string, { date?: string; heure_debut?: string; heure_fin?: string }>
  >({});
  const [duplicating, setDuplicating] = useState(false);

  useEffect(() => {
    fetch('/api/students/classes')
      .then((r) => r.json())
      .then((data) => setClasses(data.classes || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!entryId) return;
    fetch(`/api/notebook/${entryId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        setEntry(data.entry);
      })
      .catch((e) => toast.error(e.message || 'Entrée introuvable'))
      .finally(() => setLoading(false));
  }, [entryId]);

  const handleSubmit = async (data: EntryFormData) => {
    setSaving(true);
    try {
      const res = await fetch(`/api/notebook/${entryId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error || 'Échec de la mise à jour');
      toast.success('Entrée mise à jour');
      router.push(`/notebook/${classeId}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!entry || !window.confirm(`Supprimer l'entrée "${entry.titre}" ?`)) return;
    try {
      const res = await fetch(`/api/notebook/${entryId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      toast.success('Entrée supprimée');
      router.push(`/notebook/${classeId}`);
    } catch {
      toast.error('Échec de la suppression');
    }
  };

  if (loading) {
    return (
      <PageTransition>
        <div className="flex items-center justify-center py-20"><Loader2 size={24} className="animate-spin text-teal" /></div>
      </PageTransition>
    );
  }

  if (!entry) {
    return (
      <PageTransition>
        <div className="max-w-3xl mx-auto py-20 text-center">
          <p className="text-muted">Entrée introuvable.</p>
          <Link href={`/notebook/${classeId}`} className="text-teal text-sm mt-2 inline-block">← Retour au carnet</Link>
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-teal via-teal-dark to-navy p-6 lg:p-8 text-white">
          <div className="absolute top-0 right-0 w-56 h-56 bg-teal-light/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
          <div className="relative z-10">
            <button onClick={() => router.push(`/notebook/${classeId}`)} className="flex items-center gap-1.5 text-white/60 text-xs mb-3 hover:text-white transition-colors">
              <ArrowLeft size={13} />Retour au carnet
            </button>
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-11 h-11 rounded-xl bg-white/15 backdrop-blur flex items-center justify-center shrink-0">
                  <BookOpen size={20} />
                </div>
                <div>
                  <h1 className="font-display text-2xl font-bold tracking-tight">Modifier l'entrée</h1>
                  <p className="text-white/60 text-sm mt-0.5">
                    {entry.date}
                    {entry.heure_debut && (
                      <span className="ml-1.5 opacity-90">
                        ({entry.heure_debut}{entry.heure_fin ? ` → ${entry.heure_fin}` : ''})
                      </span>
                    )}
                    {' '}— {entry.titre}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {classes.filter((c) => c.id !== classeId).length > 0 && (
                  <Button
                    variant="secondary"
                    size="sm"
                    className="bg-white/20 text-white hover:bg-white/30 border-transparent"
                    onClick={() => {
                      setSelectedTargetClasses([]);
                      setTargetSchedules({});
                      setDuplicateModalOpen(true);
                    }}
                  >
                    <Copy size={14} />Dupliquer vers d'autres classes
                  </Button>
                )}
                <Button variant="ghost" size="sm" className="text-white hover:bg-white/15" onClick={handleDelete}>
                  <Trash2 size={14} />Supprimer
                </Button>
              </div>
            </div>
          </div>
        </div>

        {entry.exam_id && (
          <div className="flex items-center gap-2 text-xs bg-parchment-dark/50 rounded-lg px-4 py-3">
            <ExternalLink size={12} className="text-teal" />
            <span className="text-muted">Cette séance est liée à un examen —</span>
            <Link href={`/examens/${entry.exam_id}/analyse`} className="text-teal hover:underline">voir l'analyse</Link>
          </div>
        )}

        <EntryForm
          initial={{
            date: entry.date,
            heure_debut: entry.heure_debut || '',
            heure_fin: entry.heure_fin || '',
            titre: entry.titre,
            resume: entry.resume,
            statut: entry.statut,
            tags: entry.tags || [],
            exam_id: entry.exam_id,
            document_ids: entry.documents || [],
            attachment_ids: (entry.attachments || []).map((a) => a.id),
            attachments: entry.attachments || [],
          }}
          onSubmit={handleSubmit}
          saving={saving}
          submitLabel="Enregistrer les modifications"
        />

        {/* Modal Duplication vers d'autres classes */}
        <Modal
          open={duplicateModalOpen}
          onClose={() => setDuplicateModalOpen(false)}
          title={`Dupliquer la séance vers d'autres classes`}
        >
          <div className="space-y-4">
            <p className="text-xs text-muted">
              Copiez cette séance (« <strong>{entry.titre}</strong> ») pour vos autres classes.
              Vous pouvez ajuster les dates ci-dessous ou les modifier individuellement par la suite.
            </p>

            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-navy">
                Classes cibles ({selectedTargetClasses.length}) :
              </span>
              <div className="flex items-center gap-2 text-xs">
                <button
                  type="button"
                  onClick={() =>
                    setSelectedTargetClasses(classes.filter((c) => c.id !== classeId).map((c) => c.id))
                  }
                  className="text-[11px] text-teal hover:underline font-medium cursor-pointer"
                >
                  Tout cocher
                </button>
                <span className="text-muted/40">•</span>
                <button
                  type="button"
                  onClick={() => setSelectedTargetClasses([])}
                  className="text-[11px] text-muted hover:text-red cursor-pointer"
                >
                  Décocher
                </button>
              </div>
            </div>

            <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-1">
              {classes
                .filter((c) => c.id !== classeId)
                .map((c) => {
                  const isSelected = selectedTargetClasses.includes(c.id);
                  const sched = targetSchedules[c.id];
                  const curDate = sched?.date || entry.date;
                  const curDebut = sched?.heure_debut !== undefined ? sched.heure_debut : (entry.heure_debut || '');
                  const curFin = sched?.heure_fin !== undefined ? sched.heure_fin : (entry.heure_fin || '');
                  const curSlot = curDebut && curFin
                    ? (CRENEAUX_HORAIRES.find((s) => s.debut === curDebut && s.fin === curFin)?.value || 'custom')
                    : (curDebut || curFin ? 'custom' : '');

                  return (
                    <div
                      key={c.id}
                      className={`p-3 rounded-xl border transition-all ${
                        isSelected
                          ? 'border-teal bg-teal-50/40 shadow-xs'
                          : 'border-border/80 bg-white'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <label className="flex items-center gap-2.5 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => {
                              setSelectedTargetClasses((prev) =>
                                e.target.checked ? [...prev, c.id] : prev.filter((id) => id !== c.id)
                              );
                            }}
                            className="rounded border-border text-teal focus:ring-teal w-4 h-4 cursor-pointer"
                          />
                          <span className="text-sm font-semibold text-navy">{c.name}</span>
                          <span className="font-mono bg-parchment-dark px-1.5 py-0.5 rounded text-[10px] text-navy font-medium">
                            {c.niveau}
                          </span>
                        </label>
                      </div>

                      {isSelected && (
                        <div className="mt-2.5 pt-2.5 border-t border-border/60 flex flex-wrap items-center gap-2">
                          <span className="text-[11px] text-muted">Date & heure :</span>
                          <input
                            type="date"
                            value={curDate}
                            onChange={(e) =>
                              setTargetSchedules((prev) => ({
                                ...prev,
                                [c.id]: { ...prev[c.id], date: e.target.value },
                              }))
                            }
                            className="text-xs px-2 py-1 rounded border border-border bg-white text-navy focus:outline-none focus:ring-1 focus:ring-teal"
                          />
                          <select
                            value={curSlot}
                            onChange={(e) => {
                              const val = e.target.value;
                              if (!val) {
                                setTargetSchedules((prev) => ({
                                  ...prev,
                                  [c.id]: { ...prev[c.id], heure_debut: '', heure_fin: '' },
                                }));
                              } else {
                                const match = CRENEAUX_HORAIRES.find((ch) => ch.value === val);
                                if (match && match.value !== 'custom') {
                                  setTargetSchedules((prev) => ({
                                    ...prev,
                                    [c.id]: { ...prev[c.id], heure_debut: match.debut, heure_fin: match.fin },
                                  }));
                                }
                              }
                            }}
                            className="text-xs px-2 py-1 rounded border border-border bg-white text-navy focus:outline-none focus:ring-1 focus:ring-teal max-w-[155px]"
                          >
                            {CRENEAUX_HORAIRES.map((ch) => (
                              <option key={ch.value} value={ch.value}>
                                {ch.label}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>
                  );
                })}
            </div>

            <div className="pt-2 flex justify-end gap-2 border-t border-border">
              <Button variant="secondary" onClick={() => setDuplicateModalOpen(false)}>
                Annuler
              </Button>
              <Button
                disabled={selectedTargetClasses.length === 0 || duplicating}
                onClick={async () => {
                  if (selectedTargetClasses.length === 0 || !entry) return;
                  setDuplicating(true);
                  try {
                    const classesPayload = selectedTargetClasses.map((cid) => {
                      const sched = targetSchedules[cid];
                      return {
                        classe_id: cid,
                        date: sched?.date || entry.date,
                        heure_debut: sched?.heure_debut !== undefined ? sched.heure_debut : (entry.heure_debut || ''),
                        heure_fin: sched?.heure_fin !== undefined ? sched.heure_fin : (entry.heure_fin || ''),
                      };
                    });

                    const res = await fetch('/api/notebook', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        entry_type: 'SESSION',
                        date: entry.date,
                        titre: entry.titre,
                        resume: entry.resume,
                        statut: 'planifiee',
                        tags: entry.tags || [],
                        exam_id: entry.exam_id,
                        document_ids: entry.documents || [],
                        attachment_ids: (entry.attachments || []).map((a) => a.id),
                        classes: classesPayload,
                      }),
                    });
                    const resData = await res.json();
                    if (!res.ok) throw new Error(resData.error || 'Échec de la duplication');
                    toast.success(`Séance dupliquée vers ${selectedTargetClasses.length} classe(s) avec succès`);
                    setDuplicateModalOpen(false);
                    setSelectedTargetClasses([]);
                    setTargetSchedules({});
                  } catch (err: unknown) {
                    toast.error(err instanceof Error ? err.message : 'Erreur lors de la duplication');
                  } finally {
                    setDuplicating(false);
                  }
                }}
              >
                {duplicating ? (
                  <Loader2 size={15} className="animate-spin" />
                ) : (
                  <Copy size={15} />
                )}
                Dupliquer pour {selectedTargetClasses.length} classe{selectedTargetClasses.length > 1 ? 's' : ''}
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    </PageTransition>
  );
}
