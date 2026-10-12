'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  BookOpen,
  Loader2,
  Search,
  Plus,
  Printer,
  FileText,
  CheckSquare,
  Square,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { PageTransition } from '@/components/layout/PageTransition';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { PrintDialog } from '@/components/notebook/PrintDialog';
import { SchoolCalendarWidget } from '@/components/notebook/SchoolCalendarWidget';
import { SequenceReportModal } from '@/components/notebook/SequenceReportModal';
import { EntryTypeChooserModal } from '@/components/notebook/EntryTypeChooserModal';
import { EntryCard } from '@/components/notebook/EntryCard';
import { QuickEditSheet } from '@/components/notebook/QuickEditSheet';
import { DuplicateModal } from '@/components/notebook/DuplicateModal';
import { BulkActionsBar } from '@/components/notebook/BulkActionsBar';
import { MeetingForm } from '@/components/notebook/MeetingForm';
import { PublicationForm } from '@/components/notebook/PublicationForm';
import type {
  NotebookEntry,
  Statut,
  EntryType,
} from '@/types/notebook';
import type { CollegeClass } from '@/types/student';

export default function NotebookPage() {
  const router = useRouter();
  const [entries, setEntries] = useState<NotebookEntry[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [classes, setClasses] = useState<CollegeClass[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    q: '',
    classeId: '',
    statut: '',
    tag: '',
    entryType: '',
  });

  // Modals & Sheets
  const [classModalOpen, setClassModalOpen] = useState(false);
  const [typeChooserOpen, setTypeChooserOpen] = useState(false);
  const [newMeetingModalOpen, setNewMeetingModalOpen] = useState(false);
  const [newPublicationModalOpen, setNewPublicationModalOpen] = useState(false);
  const [printDialogOpen, setPrintDialogOpen] = useState(false);
  const [sequenceReportOpen, setSequenceReportOpen] = useState(false);

  // Quick edit and duplicate
  const [editingEntry, setEditingEntry] = useState<NotebookEntry | null>(null);
  const [duplicatingEntry, setDuplicatingEntry] = useState<NotebookEntry | null>(null);

  // Multi-class session modal mode
  const [modalMode, setModalMode] = useState<'single' | 'multi'>('single');
  const [selectedModalClasses, setSelectedModalClasses] = useState<string[]>([]);

  // Bulk actions selection
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkLoading, setBulkLoading] = useState(false);

  useEffect(() => {
    fetch('/api/students/classes')
      .then((r) => r.json())
      .then((data) => setClasses(data.classes || []))
      .catch(() => {});
  }, []);

  const fetchEntries = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filters.q) params.set('q', filters.q);
    if (filters.classeId) params.set('classeId', filters.classeId);
    if (filters.statut) params.set('statut', filters.statut);
    if (filters.tag) params.set('tag', filters.tag);
    if (filters.entryType) params.set('entryType', filters.entryType);

    fetch(`/api/notebook?${params}`)
      .then((r) => r.json())
      .then((data) => {
        setEntries(data.entries || []);
        setTags(data.tags || []);
      })
      .catch(() => {
        toast.error('Erreur lors du chargement des entrées');
      })
      .finally(() => setLoading(false));
  }, [filters]);

  useEffect(() => {
    const t = setTimeout(() => {
      fetchEntries();
    }, 250);
    return () => clearTimeout(t);
  }, [fetchEntries]);

  // Handle entry creation chooser
  const handleNewEntryClick = () => {
    setTypeChooserOpen(true);
  };

  const handleTypeSelected = (type: EntryType) => {
    setTypeChooserOpen(false);
    if (type === 'SESSION') {
      if (filters.classeId) {
        router.push(`/notebook/${filters.classeId}/new`);
      } else if (classes.length === 1 && classes[0]) {
        router.push(`/notebook/${classes[0].id}/new`);
      } else {
        setSelectedModalClasses(classes.map((c) => c.id));
        setClassModalOpen(true);
      }
    } else if (type === 'MEETING') {
      setNewMeetingModalOpen(true);
    } else if (type === 'PUBLICATION') {
      setNewPublicationModalOpen(true);
    }
  };

  // Inline status update with optimistic UI & undo toast
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

    // 3. API update
    try {
      const res = await fetch(`/api/notebook/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ statut: nextStatus }),
      });
      if (!res.ok) {
        throw new Error('Échec de la mise à jour');
      }
    } catch {
      toast.dismiss(toastId);
      // Rollback
      setEntries((prev) =>
        prev.map((e) => (e.id === id ? { ...e, statut: prevStatus } : e))
      );
      toast.error('Erreur lors du changement de statut');
    }
  };

  // Single delete
  const handleDeleteEntry = async (id: string, titre: string) => {
    const ok = window.confirm(`Supprimer définitivement l'entrée "${titre}" ?`);
    if (!ok) return;

    try {
      const res = await fetch(`/api/notebook/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Erreur');
      setEntries((prev) => prev.filter((e) => e.id !== id));
      setSelectedIds((prev) => prev.filter((sid) => sid !== id));
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
      fetchEntries();
    } catch (err: any) {
      toast.error(err.message || 'Erreur lors de la duplication');
      throw err;
    }
  };

  // Bulk actions handlers
  const handleBulkToggle = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedIds.length === entries.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(entries.map((e) => e.id));
    }
  };

  const handleBulkMarkDone = async () => {
    if (selectedIds.length === 0) return;
    setBulkLoading(true);
    try {
      const res = await fetch('/api/notebook/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'status',
          ids: selectedIds,
          statut: 'realisee',
          status: 'realisee',
        }),
      });
      if (!res.ok) throw new Error('Erreur');
      setEntries((prev) =>
        prev.map((e) =>
          selectedIds.includes(e.id) ? { ...e, statut: 'realisee' } : e
        )
      );
      toast.success(`${selectedIds.length} entrées marquées comme réalisées`);
      setSelectedIds([]);
    } catch {
      toast.error('Erreur lors de la modification groupée');
    } finally {
      setBulkLoading(false);
    }
  };

  const handleBulkChangeDate = async (newDate: string) => {
    if (selectedIds.length === 0) return;
    setBulkLoading(true);
    try {
      const res = await fetch('/api/notebook/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'date',
          ids: selectedIds,
          date: newDate,
        }),
      });
      if (!res.ok) throw new Error('Erreur');
      setEntries((prev) =>
        prev.map((e) =>
          selectedIds.includes(e.id) ? { ...e, date: newDate } : e
        )
      );
      toast.success(`Date mise à jour pour ${selectedIds.length} entrées`);
      setSelectedIds([]);
    } catch {
      toast.error('Erreur lors du changement de date groupé');
    } finally {
      setBulkLoading(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    setBulkLoading(true);
    try {
      const res = await fetch('/api/notebook/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'delete',
          ids: selectedIds,
        }),
      });
      if (!res.ok) throw new Error('Erreur');
      setEntries((prev) => prev.filter((e) => !selectedIds.includes(e.id)));
      toast.success(`${selectedIds.length} entrées supprimées`);
      setSelectedIds([]);
    } catch {
      toast.error('Erreur lors de la suppression groupée');
    } finally {
      setBulkLoading(false);
    }
  };

  // Create new Meeting
  const handleCreateMeeting = async (data: any) => {
    try {
      const res = await fetch('/api/notebook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error || 'Erreur');
      toast.success('Réunion enregistrée !');
      setNewMeetingModalOpen(false);
      fetchEntries();
    } catch (err: any) {
      toast.error(err.message || "Erreur lors de l'enregistrement");
      throw err;
    }
  };

  // Create new Publication
  const handleCreatePublication = async (data: any) => {
    try {
      const res = await fetch('/api/notebook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error || 'Erreur');
      toast.success('Publication enregistrée !');
      setNewPublicationModalOpen(false);
      fetchEntries();
    } catch (err: any) {
      toast.error(err.message || "Erreur lors de l'enregistrement");
      throw err;
    }
  };

  return (
    <PageTransition>
      <div className="max-w-5xl mx-auto space-y-8 pb-16">
        {/* Header */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-teal via-teal-dark to-navy p-6 lg:p-8 text-white">
          <div className="absolute top-0 right-0 w-56 h-56 bg-teal-light/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
          <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-11 h-11 rounded-xl bg-white/15 backdrop-blur flex items-center justify-center shrink-0">
                <BookOpen size={20} />
              </div>
              <div>
                <h1 className="font-display text-2xl lg:text-3xl font-bold tracking-tight">
                  Carnet de Bord
                </h1>
                <p className="text-white/60 text-sm mt-0.5">
                  Séances, réunions et publications administratives
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2.5 shrink-0 w-full sm:w-auto justify-end">
              <button
                type="button"
                onClick={() => setSequenceReportOpen(true)}
                className="inline-flex items-center gap-2 h-10 px-3.5 rounded-lg bg-white/15 text-white text-sm font-medium hover:bg-white/25 transition-colors shadow-xs cursor-pointer backdrop-blur border border-white/20"
                title="Générer un bilan de séquence didactique pour le chef d'établissement"
              >
                <FileText size={16} />
                <span>Bilan de Séquence</span>
              </button>
              <button
                type="button"
                onClick={() => setPrintDialogOpen(true)}
                className="inline-flex items-center gap-2 h-10 px-3.5 rounded-lg bg-white/15 text-white text-sm font-medium hover:bg-white/25 transition-colors shadow-xs cursor-pointer backdrop-blur border border-white/20"
                title="Imprimer ou exporter le cahier de textes"
              >
                <Printer size={16} />
                <span>Imprimer / Exporter</span>
              </button>
              <button
                type="button"
                onClick={handleNewEntryClick}
                className="inline-flex items-center gap-2 h-10 px-5 rounded-lg bg-white text-teal text-sm font-medium hover:bg-teal-50 transition-colors shadow-sm cursor-pointer"
              >
                <Plus size={16} />
                <span>Nouvelle Entrée</span>
              </button>
            </div>
          </div>
        </div>

        {/* Moroccan School Calendar & Teaching Volume Widget */}
        <SchoolCalendarWidget
          entries={entries}
          classes={classes}
          selectedClasseId={filters.classeId}
        />

        {/* Filters */}
        <div className="space-y-3">
          <div className="relative">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted"
            />
            <input
              value={filters.q}
              onChange={(e) => setFilters({ ...filters, q: e.target.value })}
              placeholder="Recherche plein texte : titre, contenu, ordre du jour, émetteur..."
              className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-border bg-white text-navy text-sm focus:outline-none focus:ring-2 focus:ring-teal/30 focus:border-teal"
            />
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap gap-2">
              {/* Type Filter */}
              <select
                value={filters.entryType}
                onChange={(e) =>
                  setFilters({ ...filters, entryType: e.target.value })
                }
                className="px-3 py-2 rounded-lg border border-border bg-white text-xs font-semibold text-navy focus:outline-none focus:ring-2 focus:ring-teal/30"
              >
                <option value="">Tous les types</option>
                <option value="SESSION">Séances (cours)</option>
                <option value="MEETING">Réunions</option>
                <option value="PUBLICATION">Publications / Notes</option>
              </select>

              {/* Class Filter */}
              <select
                value={filters.classeId}
                onChange={(e) =>
                  setFilters({ ...filters, classeId: e.target.value })
                }
                className="px-3 py-2 rounded-lg border border-border bg-white text-xs text-navy focus:outline-none focus:ring-2 focus:ring-teal/30"
              >
                <option value="">Toutes les classes</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.niveau})
                  </option>
                ))}
              </select>

              {/* Status Filter */}
              <select
                value={filters.statut}
                onChange={(e) =>
                  setFilters({ ...filters, statut: e.target.value })
                }
                className="px-3 py-2 rounded-lg border border-border bg-white text-xs text-navy focus:outline-none focus:ring-2 focus:ring-teal/30"
              >
                <option value="">Tous les statuts</option>
                <option value="planifiee">Planifiée</option>
                <option value="realisee">Réalisée / Tenue</option>
                <option value="reportee">Reportée</option>
                <option value="absence">Absence</option>
                <option value="annulee">Annulée</option>
              </select>

              {/* Tag Filter */}
              <select
                value={filters.tag}
                onChange={(e) => setFilters({ ...filters, tag: e.target.value })}
                className="px-3 py-2 rounded-lg border border-border bg-white text-xs text-navy focus:outline-none focus:ring-2 focus:ring-teal/30"
              >
                <option value="">Tous les tags</option>
                {tags.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            {/* Select all toggle if entries exist */}
            {entries.length > 0 && (
              <button
                type="button"
                onClick={handleSelectAll}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-white text-xs text-muted hover:text-navy hover:bg-parchment-dark/50 transition-colors cursor-pointer"
              >
                {selectedIds.length === entries.length ? (
                  <>
                    <CheckSquare size={13} className="text-teal" />
                    <span>Tout désélectionner</span>
                  </>
                ) : (
                  <>
                    <Square size={13} />
                    <span>Sélectionner tout</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Timeline Entries List */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={24} className="animate-spin text-teal" />
          </div>
        ) : entries.length === 0 ? (
          <div className="rounded-xl border border-border bg-white p-16 text-center">
            <BookOpen size={24} className="text-muted/50 mx-auto mb-3" />
            <p className="text-sm text-navy font-semibold">
              Aucune entrée trouvée
            </p>
            <p className="text-xs text-muted mt-1 max-w-sm mx-auto mb-5">
              Consignez le déroulement de vos séances, vos réunions ou vos
              circulaires administratives.
            </p>
            <Button onClick={handleNewEntryClick} size="sm">
              <Plus size={14} className="mr-1.5" />
              Nouvelle entrée
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {entries.map((e) => (
              <EntryCard
                key={e.id}
                entry={e}
                selected={selectedIds.includes(e.id)}
                onSelectToggle={handleBulkToggle}
                onEdit={(entry) => setEditingEntry(entry)}
                onDuplicate={(entry) => setDuplicatingEntry(entry)}
                onDelete={(id, titre) => handleDeleteEntry(id, titre)}
                onStatusChange={handleStatusChange}
              />
            ))}
          </div>
        )}

        {/* Floating Bulk Actions Bar */}
        <BulkActionsBar
          selectedCount={selectedIds.length}
          onClear={() => setSelectedIds([])}
          onMarkDone={handleBulkMarkDone}
          onChangeDate={handleBulkChangeDate}
          onDelete={handleBulkDelete}
          loading={bulkLoading}
        />

        {/* Quick Edit Side Sheet */}
        <QuickEditSheet
          open={Boolean(editingEntry)}
          onClose={() => setEditingEntry(null)}
          entry={editingEntry}
          classes={classes}
          onSaved={(updated) => {
            setEntries((prev) =>
              prev.map((e) => (e.id === updated.id ? updated : e))
            );
          }}
        />

        {/* Duplicate Popover Modal */}
        <DuplicateModal
          open={Boolean(duplicatingEntry)}
          onClose={() => setDuplicatingEntry(null)}
          entry={duplicatingEntry}
          classes={classes}
          onDuplicate={handleDuplicate}
        />

        {/* Entry Type Chooser Modal */}
        <EntryTypeChooserModal
          open={typeChooserOpen}
          onClose={() => setTypeChooserOpen(false)}
          onSelect={handleTypeSelected}
        />

        {/* New Meeting Modal */}
        <Modal
          open={newMeetingModalOpen}
          onClose={() => setNewMeetingModalOpen(false)}
          title="Nouvelle Réunion (Conseil, Pédagogique, Parents...)"
          className="max-w-2xl"
        >
          <MeetingForm
            classes={classes}
            onSubmit={handleCreateMeeting}
            onCancel={() => setNewMeetingModalOpen(false)}
          />
        </Modal>

        {/* New Publication Modal */}
        <Modal
          open={newPublicationModalOpen}
          onClose={() => setNewPublicationModalOpen(false)}
          title="Nouvelle Publication (Annonce, Circulaire, Bulletin...)"
          className="max-w-2xl"
        >
          <PublicationForm
            classes={classes}
            onSubmit={handleCreatePublication}
            onCancel={() => setNewPublicationModalOpen(false)}
          />
        </Modal>

        {/* Modal Sélection de Classe (pour les séances) */}
        <Modal
          open={classModalOpen}
          onClose={() => setClassModalOpen(false)}
          title="Nouvelle séance de cours"
        >
          <div className="space-y-4">
            {/* Mode switch */}
            <div className="flex p-1 bg-parchment-dark/70 rounded-xl border border-border">
              <button
                type="button"
                onClick={() => setModalMode('single')}
                className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  modalMode === 'single'
                    ? 'bg-white text-navy shadow-xs'
                    : 'text-muted hover:text-navy'
                }`}
              >
                Classe unique
              </button>
              <button
                type="button"
                onClick={() => setModalMode('multi')}
                className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  modalMode === 'multi'
                    ? 'bg-teal text-white shadow-xs'
                    : 'text-muted hover:text-navy'
                }`}
              >
                Multi-classes (séance commune)
              </button>
            </div>

            {modalMode === 'single' ? (
              <>
                <p className="text-xs text-muted">
                  Sélectionnez la classe pour laquelle créer l&apos;entrée :
                </p>
                <div className="grid gap-2 max-h-[55vh] overflow-y-auto pr-1">
                  {classes.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => {
                        setClassModalOpen(false);
                        router.push(`/notebook/${c.id}/new`);
                      }}
                      className="w-full flex items-center justify-between p-3.5 rounded-xl border border-border/80 hover:border-teal hover:bg-teal-50/40 text-left transition-all group cursor-pointer"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-teal/10 text-teal flex items-center justify-center font-medium text-xs group-hover:bg-teal group-hover:text-white transition-colors">
                          <BookOpen size={18} />
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-navy group-hover:text-teal transition-colors">
                            {c.name}
                          </div>
                          <div className="text-xs text-muted flex items-center gap-2 mt-0.5">
                            <span className="font-mono bg-parchment-dark/70 px-1.5 py-0.5 rounded text-[10px] text-navy font-medium">
                              {c.niveau}
                            </span>
                            {c.season_code && <span>{c.season_code}</span>}
                            {c.student_count !== undefined && (
                              <span>
                                • {c.student_count} élève
                                {c.student_count > 1 ? 's' : ''}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted">
                    Sélectionnez les classes qui partageront cette séance :
                  </p>
                  <div className="flex items-center gap-2 text-xs">
                    <button
                      type="button"
                      onClick={() =>
                        setSelectedModalClasses(classes.map((c) => c.id))
                      }
                      className="text-[11px] text-teal hover:underline font-medium cursor-pointer"
                    >
                      Tout cocher
                    </button>
                    <span className="text-muted/40">•</span>
                    <button
                      type="button"
                      onClick={() => setSelectedModalClasses([])}
                      className="text-[11px] text-muted hover:text-red cursor-pointer"
                    >
                      Décocher
                    </button>
                  </div>
                </div>

                <div className="grid gap-2 max-h-[48vh] overflow-y-auto pr-1">
                  {classes.map((c) => {
                    const isSelected = selectedModalClasses.includes(c.id);
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => {
                          setSelectedModalClasses((prev) =>
                            isSelected
                              ? prev.filter((id) => id !== c.id)
                              : [...prev, c.id]
                          );
                        }}
                        className={`w-full flex items-center justify-between p-3 rounded-xl border text-left transition-all cursor-pointer ${
                          isSelected
                            ? 'border-teal bg-teal-50/50 shadow-xs'
                            : 'border-border/80 hover:border-teal/40 bg-white'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-5 h-5 rounded-md flex items-center justify-center transition-colors ${
                              isSelected
                                ? 'bg-teal text-white'
                                : 'border border-border bg-white text-transparent'
                            }`}
                          >
                            ✓
                          </div>
                          <div>
                            <div className="text-sm font-semibold text-navy">
                              {c.name}
                            </div>
                            <div className="text-xs text-muted flex items-center gap-2 mt-0.5">
                              <span className="font-mono bg-parchment-dark/70 px-1.5 py-0.5 rounded text-[10px] text-navy font-medium">
                                {c.niveau}
                              </span>
                              {c.student_count !== undefined && (
                                <span>
                                  • {c.student_count} élève
                                  {c.student_count > 1 ? 's' : ''}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>

                <div className="pt-2 flex justify-end gap-2 border-t border-border">
                  <Button
                    variant="secondary"
                    onClick={() => setClassModalOpen(false)}
                  >
                    Annuler
                  </Button>
                  <Button
                    disabled={selectedModalClasses.length === 0}
                    onClick={() => {
                      if (selectedModalClasses.length === 0) return;
                      setClassModalOpen(false);
                      const firstId = selectedModalClasses[0];
                      router.push(
                        `/notebook/${firstId}/new?classes=${selectedModalClasses.join(',')}`
                      );
                    }}
                  >
                    Continuer avec {selectedModalClasses.length} classe
                    {selectedModalClasses.length > 1 ? 's' : ''} →
                  </Button>
                </div>
              </>
            )}
          </div>
        </Modal>

        {/* Print & Export Dialog */}
        <PrintDialog
          open={printDialogOpen}
          onClose={() => setPrintDialogOpen(false)}
          classes={classes}
          defaultClassId={filters.classeId || undefined}
        />

        {/* Sequence Report Modal */}
        <SequenceReportModal
          open={sequenceReportOpen}
          onClose={() => setSequenceReportOpen(false)}
          classes={classes}
          initialClasseId={filters.classeId || undefined}
        />
      </div>
    </PageTransition>
  );
}
