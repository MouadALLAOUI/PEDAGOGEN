'use client';

import { useEffect, useState } from 'react';
import { X, GraduationCap, Users, FileText, Loader2, Save } from 'lucide-react';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { MeetingForm } from './MeetingForm';
import { PublicationForm } from './PublicationForm';
import { AttachmentUploader } from './AttachmentUploader';
import { CRENEAUX_HORAIRES } from './EntryForm';
import type { NotebookEntry, Statut, NotebookAttachment } from '@/types/notebook';
import type { CollegeClass } from '@/types/student';

interface QuickEditSheetProps {
  open: boolean;
  onClose: () => void;
  entry: NotebookEntry | null;
  classes: CollegeClass[];
  onSaved: (updatedEntry: NotebookEntry) => void;
}

export function QuickEditSheet({
  open,
  onClose,
  entry,
  classes,
  onSaved,
}: QuickEditSheetProps) {
  const [saving, setSaving] = useState(false);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  if (!open || !entry) return null;

  const handleUpdate = async (payload: Record<string, any>) => {
    setSaving(true);
    try {
      const res = await fetch(`/api/notebook/${entry.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Erreur lors de la mise à jour');
      }
      toast.success('Modifications enregistrées !');
      onSaved(data.entry);
      onClose();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Échec de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-navy/40 backdrop-blur-xs transition-opacity animate-in fade-in duration-200 cursor-pointer"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer Container */}
      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-xl bg-slate-50 shadow-2xl flex flex-col h-full border-l border-border animate-in slide-in-from-right duration-200">
          {/* Header */}
          <div className="p-4 sm:p-5 bg-white border-b border-border flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2.5">
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                  entry.entry_type === 'MEETING'
                    ? 'bg-indigo-50 text-indigo-700'
                    : entry.entry_type === 'PUBLICATION'
                    ? 'bg-amber-50 text-amber-700'
                    : 'bg-teal/10 text-teal'
                }`}
              >
                {entry.entry_type === 'MEETING' ? (
                  <Users size={18} />
                ) : entry.entry_type === 'PUBLICATION' ? (
                  <FileText size={18} />
                ) : (
                  <GraduationCap size={18} />
                )}
              </div>
              <div>
                <h2 className="text-sm font-bold text-navy">
                  Modification rapide —{' '}
                  {entry.entry_type === 'MEETING'
                    ? 'Réunion'
                    : entry.entry_type === 'PUBLICATION'
                    ? 'Publication'
                    : 'Séance de cours'}
                </h2>
                <p className="text-[11px] text-muted">
                  Modifiez les informations sans quitter la vue carnet
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-muted hover:text-navy hover:bg-slate-100 transition-colors cursor-pointer"
              aria-label="Fermer le tiroir"
            >
              <X size={18} />
            </button>
          </div>

          {/* Body Forms */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
            {entry.entry_type === 'MEETING' ? (
              <MeetingForm
                initial={entry}
                classes={classes}
                onSubmit={handleUpdate}
                onCancel={onClose}
                saving={saving}
              />
            ) : entry.entry_type === 'PUBLICATION' ? (
              <PublicationForm
                initial={entry}
                classes={classes}
                onSubmit={handleUpdate}
                onCancel={onClose}
                saving={saving}
              />
            ) : (
              <SessionQuickEditForm
                entry={entry}
                classes={classes}
                onSubmit={handleUpdate}
                onCancel={onClose}
                saving={saving}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/** Formulaire dédié d'édition rapide pour les séances */
function SessionQuickEditForm({
  entry,
  classes,
  onSubmit,
  onCancel,
  saving,
}: {
  entry: NotebookEntry;
  classes: CollegeClass[];
  onSubmit: (data: any) => Promise<void>;
  onCancel: () => void;
  saving: boolean;
}) {
  const [titre, setTitre] = useState(entry.titre || '');
  const [classeId, setClasseId] = useState(entry.classe_id || '');
  const [date, setDate] = useState(entry.date || '');
  const [heureDebut, setHeureDebut] = useState(entry.heure_debut || '');
  const [heureFin, setHeureFin] = useState(entry.heure_fin || '');
  const [statut, setStatut] = useState<Statut>(entry.statut || 'planifiee');
  const [resume, setResume] = useState(entry.resume || '');
  const [tags, setTags] = useState<string[]>(entry.tags || []);
  const [tagInput, setTagInput] = useState('');
  const [attachments, setAttachments] = useState<NotebookAttachment[]>(
    entry.attachments || []
  );

  const handleSlotSelect = (val: string) => {
    if (!val) {
      setHeureDebut('');
      setHeureFin('');
      return;
    }
    const match = CRENEAUX_HORAIRES.find((c) => c.value === val);
    if (match && match.value !== 'custom') {
      setHeureDebut(match.debut);
      setHeureFin(match.fin);
    }
  };

  const handleAddTag = () => {
    const t = tagInput.trim();
    if (!t) return;
    if (!tags.includes(t)) setTags([...tags, t]);
    setTagInput('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!titre.trim()) {
      toast.error('Le titre est obligatoire');
      return;
    }
    if (!classeId) {
      toast.error('La classe est obligatoire');
      return;
    }
    if (!date) {
      toast.error('La date est obligatoire');
      return;
    }

    onSubmit({
      entry_type: 'SESSION',
      classe_id: classeId,
      date,
      heure_debut: heureDebut,
      heure_fin: heureFin,
      titre: titre.trim(),
      resume: resume.trim(),
      statut,
      tags,
      attachment_ids: attachments.map((a) => a.id),
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="p-4 rounded-xl border border-border/80 bg-white space-y-3">
        <div>
          <label className="block text-xs font-semibold text-navy mb-1">Classe *</label>
          <select
            value={classeId}
            onChange={(e) => setClasseId(e.target.value)}
            className="w-full rounded-lg border border-border bg-white px-3 py-2 text-xs text-navy focus:outline-none focus:ring-2 focus:ring-teal/30 focus:border-teal"
            required
          >
            <option value="">Sélectionner une classe</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.niveau})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-navy mb-1">Titre de la séance *</label>
          <Input
            value={titre}
            onChange={(e) => setTitre(e.target.value)}
            placeholder="Ex: TP 2 - Algorithmique et variables"
            className="text-xs"
            dir="auto"
            required
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] text-muted mb-0.5">Date *</label>
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="text-xs"
              required
            />
          </div>
          <div>
            <label className="block text-[11px] text-muted mb-0.5">Statut</label>
            <select
              value={statut}
              onChange={(e) => setStatut(e.target.value as Statut)}
              className="w-full rounded-lg border border-border bg-white px-3 py-2 text-xs text-navy focus:outline-none focus:ring-2 focus:ring-teal/30 focus:border-teal"
            >
              <option value="planifiee">Planifiée</option>
              <option value="realisee">Réalisée</option>
              <option value="reportee">Reportée</option>
              <option value="absence">Absence / Non assurée</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-[11px] text-muted mb-0.5">Créneau horaire</label>
          <select
            value={
              CRENEAUX_HORAIRES.find(
                (c) => c.debut === heureDebut && c.fin === heureFin
              )?.value || ''
            }
            onChange={(e) => handleSlotSelect(e.target.value)}
            className="w-full rounded-lg border border-border bg-white px-3 py-2 text-xs text-navy focus:outline-none focus:ring-2 focus:ring-teal/30 focus:border-teal mb-2"
          >
            {CRENEAUX_HORAIRES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
          <div className="grid grid-cols-2 gap-2">
            <Input
              type="time"
              value={heureDebut}
              onChange={(e) => setHeureDebut(e.target.value)}
              placeholder="Début"
              className="text-xs"
            />
            <Input
              type="time"
              value={heureFin}
              onChange={(e) => setHeureFin(e.target.value)}
              placeholder="Fin"
              className="text-xs"
            />
          </div>
        </div>
      </div>

      <div className="p-4 rounded-xl border border-border/80 bg-white space-y-2">
        <label className="block text-xs font-semibold text-navy">
          Déroulement, contenu & devoirs
        </label>
        <textarea
          value={resume}
          onChange={(e) => setResume(e.target.value)}
          rows={4}
          dir="auto"
          placeholder="Activités menées, notions abordées, devoirs donnés pour la prochaine séance..."
          className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-white text-navy focus:outline-none focus:ring-1 focus:ring-teal resize-y"
        />
      </div>

      <div className="p-4 rounded-xl border border-border/80 bg-white space-y-2">
        <label className="block text-xs font-semibold text-navy">Mots-clés / Tags</label>
        <div className="flex gap-2">
          <Input
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleAddTag();
              }
            }}
            placeholder="Ex: TP, Scratch, Évaluation..."
            className="text-xs"
          />
          <Button type="button" variant="secondary" size="sm" onClick={handleAddTag}>
            Ajouter
          </Button>
        </div>
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {tags.map((t) => (
              <span
                key={t}
                className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-md bg-teal/10 text-teal"
              >
                {t}
                <button
                  type="button"
                  onClick={() => setTags(tags.filter((x) => x !== t))}
                  className="hover:text-red-500"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="p-4 rounded-xl border border-border/80 bg-white space-y-2">
        <span className="text-xs font-semibold text-navy">Pièces jointes</span>
        <AttachmentUploader
          attachments={attachments}
          onChange={setAttachments}
          disabled={saving}
        />
      </div>

      <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
        <Button type="button" variant="ghost" onClick={onCancel} disabled={saving}>
          Annuler
        </Button>
        <Button type="submit" variant="primary" disabled={saving} className="gap-2 shadow-sm">
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
          Enregistrer
        </Button>
      </div>
    </form>
  );
}
