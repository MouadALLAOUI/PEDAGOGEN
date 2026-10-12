'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Loader2,
  Save,
  Plus,
  X,
  FileText,
  ClipboardCheck,
  Clock,
  Users,
  Check,
  RotateCcw,
  Calendar,
  Paperclip,
  Upload,
  ExternalLink,
  Trash2,
  Image as ImageIcon,
  FileSpreadsheet,
  FileArchive,
} from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { cn } from '@/lib/utils/cn';
import type { CollegeClass } from '@/types/student';

export interface AttachmentItem {
  id: string;
  name: string;
  size: number;
  mime_type: string;
  url: string;
  created_at?: string;
}

export interface EntryFormData {
  date: string;
  heure_debut?: string;
  heure_fin?: string;
  titre: string;
  resume: string;
  statut: string;
  tags: string[];
  exam_id: string | null;
  document_ids: string[];
  attachment_ids: string[];
  attachments?: AttachmentItem[];
}

export interface ClassScheduleConfig {
  classe_id: string;
  classe_nom?: string;
  classe_niveau?: string;
  date: string;
  heure_debut?: string;
  heure_fin?: string;
}

export interface EntryFormProps {
  initial?: Partial<EntryFormData>;
  onSubmit: (data: EntryFormData, classSchedules?: ClassScheduleConfig[]) => Promise<void>;
  saving?: boolean;
  submitLabel?: string;
  availableClasses?: CollegeClass[];
  selectedClassIds?: string[];
  onSelectedClassesChange?: (ids: string[]) => void;
  allowMultiClass?: boolean;
}

interface DocumentOption {
  id: string;
  name: string;
  doc_type?: string;
}

interface ExamenOption {
  id: string;
  titre: string;
}

const STATUTS = [
  { value: 'planifiee', label: 'Planifiée' },
  { value: 'realisee', label: 'Réalisée' },
  { value: 'reportee', label: 'Reportée' },
];

export const CRENEAUX_HORAIRES = [
  { value: '', label: '— Sélectionner un horaire (optionnel) —', debut: '', fin: '' },
  // Matin (1h)
  { value: '08:00-09:00', label: '08:00 → 09:00', debut: '08:00', fin: '09:00' },
  { value: '08:30-09:30', label: '08:30 → 09:30', debut: '08:30', fin: '09:30' },
  { value: '09:00-10:00', label: '09:00 → 10:00', debut: '09:00', fin: '10:00' },
  { value: '09:30-10:30', label: '09:30 → 10:30', debut: '09:30', fin: '10:30' },
  { value: '10:00-11:00', label: '10:00 → 11:00', debut: '10:00', fin: '11:00' },
  { value: '10:30-11:30', label: '10:30 → 11:30', debut: '10:30', fin: '11:30' },
  { value: '11:00-12:00', label: '11:00 → 12:00', debut: '11:00', fin: '12:00' },
  { value: '11:30-12:30', label: '11:30 → 12:30', debut: '11:30', fin: '12:30' },
  // Après-midi (1h)
  { value: '14:00-15:00', label: '14:00 → 15:00', debut: '14:00', fin: '15:00' },
  { value: '14:30-15:30', label: '14:30 → 15:30', debut: '14:30', fin: '15:30' },
  { value: '15:00-16:00', label: '15:00 → 16:00', debut: '15:00', fin: '16:00' },
  { value: '15:30-16:30', label: '15:30 → 16:30', debut: '15:30', fin: '16:30' },
  { value: '16:00-17:00', label: '16:00 → 17:00', debut: '16:00', fin: '17:00' },
  { value: '16:30-17:30', label: '16:30 → 17:30', debut: '16:30', fin: '17:30' },
  { value: '17:00-18:00', label: '17:00 → 18:00', debut: '17:00', fin: '18:00' },
  { value: '17:30-18:30', label: '17:30 → 18:30', debut: '17:30', fin: '18:30' },
  // Blocs de 2h
  { value: '08:30-10:30', label: '08:30 → 10:30 (2h)', debut: '08:30', fin: '10:30' },
  { value: '10:30-12:30', label: '10:30 → 12:30 (2h)', debut: '10:30', fin: '12:30' },
  { value: '14:00-16:00', label: '14:00 → 16:00 (2h)', debut: '14:00', fin: '16:00' },
  { value: '14:30-16:30', label: '14:30 → 16:30 (2h)', debut: '14:30', fin: '16:30' },
  { value: '16:30-18:30', label: '16:30 → 18:30 (2h)', debut: '16:30', fin: '18:30' },
  { value: 'custom', label: 'Heure personnalisée...', debut: '', fin: '' },
];

const QUICK_SLOTS = [
  { label: '08:30 → 09:30', debut: '08:30', fin: '09:30' },
  { label: '10:30 → 11:30', debut: '10:30', fin: '11:30' },
  { label: '14:00 → 15:00', debut: '14:00', fin: '15:00' },
  { label: '15:00 → 16:00', debut: '15:00', fin: '16:00' },
  { label: '16:00 → 17:00', debut: '16:00', fin: '17:00' },
];

function getAttachmentIcon(filename: string, mime?: string) {
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  if (['png', 'jpg', 'jpeg', 'webp', 'svg', 'gif'].includes(ext) || mime?.startsWith('image/')) {
    return <ImageIcon size={16} className="text-teal" />;
  }
  if (ext === 'pdf' || mime === 'application/pdf') {
    return <FileText size={16} className="text-red-500" />;
  }
  if (['doc', 'docx'].includes(ext)) {
    return <FileText size={16} className="text-blue-500" />;
  }
  if (['ppt', 'pptx'].includes(ext)) {
    return <FileText size={16} className="text-amber-500" />;
  }
  if (['xls', 'xlsx', 'csv'].includes(ext)) {
    return <FileSpreadsheet size={16} className="text-emerald-500" />;
  }
  if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) {
    return <FileArchive size={16} className="text-purple-500" />;
  }
  return <Paperclip size={16} className="text-navy/70" />;
}

function formatFileSize(bytes: number): string {
  if (!bytes || bytes === 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}

/**
 * Formulaire d'entrée du carnet de bord, partagé entre /notebook/[classeId]/new
 * et /notebook/[classeId]/[entryId] (édition).
 */
export function EntryForm({
  initial,
  onSubmit,
  saving,
  submitLabel = 'Enregistrer',
  availableClasses = [],
  selectedClassIds = [],
  onSelectedClassesChange,
  allowMultiClass = false,
}: EntryFormProps) {
  const router = useRouter();
  const [form, setForm] = useState<EntryFormData>({
    date: new Date().toISOString().slice(0, 10),
    heure_debut: '',
    heure_fin: '',
    titre: '',
    resume: '',
    statut: 'planifiee',
    tags: [],
    exam_id: null,
    document_ids: [],
    attachment_ids: initial?.attachment_ids || initial?.attachments?.map((a) => a.id) || [],
    attachments: initial?.attachments || [],
    ...initial,
  });
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const [tagInput, setTagInput] = useState('');
  const [examens, setExamens] = useState<ExamenOption[]>([]);
  const [documents, setDocuments] = useState<DocumentOption[]>([]);
  const [showDocPicker, setShowDocPicker] = useState(false);
  const [customSchedules, setCustomSchedules] = useState<
    Record<string, { date?: string; heure_debut?: string; heure_fin?: string }>
  >({});
  const isEditing = Boolean(initial?.titre);
  const NOTEBOOK_DRAFT_KEY = 'pedagogen_notebook_new_draft';
  const [draftLoaded, setDraftLoaded] = useState(false);

  const isMultiClass = Boolean(allowMultiClass && availableClasses && availableClasses.length > 0);
  const activeClassIds = selectedClassIds;
  const uniqueNiveaux = Array.from(new Set(availableClasses.map((c) => c.niveau))).sort();

  // Restauration du brouillon (en mode création uniquement)
  useEffect(() => {
    if (isEditing) {
      setDraftLoaded(true);
      return;
    }
    try {
      const raw = localStorage.getItem(NOTEBOOK_DRAFT_KEY);
      if (raw) {
        const draft = JSON.parse(raw);
        if (draft.form) {
          setForm((prev) => ({ ...prev, ...draft.form }));
        }
        if (draft.customSchedules) {
          setCustomSchedules(draft.customSchedules);
        }
        if (
          Array.isArray(draft.selectedClassIds) &&
          draft.selectedClassIds.length > 0 &&
          onSelectedClassesChange
        ) {
          onSelectedClassesChange(draft.selectedClassIds);
        }
        toast.success('Brouillon du carnet restauré', { icon: '📝' });
      }
    } catch {
      /* ignore */
    } finally {
      setDraftLoaded(true);
    }
  }, [isEditing]);

  // Sauvegarde automatique du brouillon
  useEffect(() => {
    if (isEditing || !draftLoaded) return;
    try {
      const hasContent = Boolean(
        form.titre.trim() || form.resume.trim() || form.tags.length > 0
      );
      if (hasContent) {
        localStorage.setItem(
          NOTEBOOK_DRAFT_KEY,
          JSON.stringify({
            form,
            customSchedules,
            selectedClassIds,
            updatedAt: Date.now(),
          })
        );
      }
    } catch {
      /* ignore */
    }
  }, [form, customSchedules, selectedClassIds, isEditing, draftLoaded]);

  const handleClearDraft = () => {
    if (window.confirm('Voulez-vous réinitialiser le formulaire du carnet de bord ?')) {
      try {
        localStorage.removeItem(NOTEBOOK_DRAFT_KEY);
      } catch {
        /* ignore */
      }
      setForm({
        date: new Date().toISOString().slice(0, 10),
        heure_debut: '',
        heure_fin: '',
        titre: '',
        resume: '',
        statut: 'planifiee',
        tags: [],
        exam_id: null,
        document_ids: [],
        attachment_ids: [],
        attachments: [],
      });
      setCustomSchedules({});
      toast.success('Brouillon effacé');
    }
  };

  const onDrop = async (acceptedFiles: File[]) => {
    if (!acceptedFiles || acceptedFiles.length === 0) return;
    setUploadingFiles(true);
    let successCount = 0;
    try {
      for (const file of acceptedFiles) {
        if (file.size > 25 * 1024 * 1024) {
          toast.error(`"${file.name}" dépasse 25 Mo`);
          continue;
        }
        const formData = new FormData();
        formData.append('file', file);
        const res = await fetch('/api/notebook/attachments', {
          method: 'POST',
          body: formData,
        });
        const data = await res.json();
        if (!res.ok) {
          toast.error(data.error || `Erreur d'envoi pour ${file.name}`);
          continue;
        }
        const newAtt: AttachmentItem = {
          id: data.attachment.id,
          name: data.attachment.name,
          size: data.attachment.size,
          mime_type: data.attachment.mime_type,
          url: data.attachment.url,
          created_at: data.attachment.created_at,
        };
        setForm((prev) => ({
          ...prev,
          attachment_ids: [...(prev.attachment_ids || []), newAtt.id],
          attachments: [...(prev.attachments || []), newAtt],
        }));
        successCount++;
      }
      if (successCount > 0) {
        toast.success(
          successCount === 1
            ? 'Pièce jointe ajoutée avec succès'
            : `${successCount} pièces jointes ajoutées`
        );
      }
    } catch (err) {
      console.error('Upload failed:', err);
      toast.error('Échec du téléversement du fichier');
    } finally {
      setUploadingFiles(false);
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    maxSize: 25 * 1024 * 1024,
  });

  const handleRemoveAttachment = (attId: string, attName: string) => {
    setForm((prev) => ({
      ...prev,
      attachment_ids: (prev.attachment_ids || []).filter((id) => id !== attId),
      attachments: (prev.attachments || []).filter((a) => a.id !== attId),
    }));
    toast.success(`"${attName}" retiré`);
  };

  useEffect(() => {
    fetch('/api/examens')
      .then((r) => r.json())
      .then((data) => setExamens(data.examens || []))
      .catch(() => {});
    fetch('/api/generated')
      .then((r) => r.json())
      .then((data) => setDocuments(data.files || []))
      .catch(() => {});
  }, []);

  const addTag = () => {
    const t = tagInput.trim();
    if (!t) return;
    if (!form.tags.includes(t)) setForm({ ...form, tags: [...form.tags, t] });
    setTagInput('');
  };

  const toggleDoc = (docId: string) => {
    setForm((prev) => ({
      ...prev,
      document_ids: prev.document_ids.includes(docId)
        ? prev.document_ids.filter((x) => x !== docId)
        : [...prev.document_ids, docId],
    }));
  };

  const selectedDocs = documents.filter((d) => form.document_ids.includes(d.id));
  const linkedExam = examens.find((x) => x.id === form.exam_id);

  const currentSlotValue = form.heure_debut && form.heure_fin
    ? (CRENEAUX_HORAIRES.find((c) => c.debut === form.heure_debut && c.fin === form.heure_fin)?.value || 'custom')
    : (form.heure_debut || form.heure_fin ? 'custom' : '');

  const handleSlotSelect = (val: string) => {
    if (!val) {
      setForm((prev) => ({ ...prev, heure_debut: '', heure_fin: '' }));
      return;
    }
    const match = CRENEAUX_HORAIRES.find((c) => c.value === val);
    if (match && match.value !== 'custom') {
      setForm((prev) => ({ ...prev, heure_debut: match.debut, heure_fin: match.fin }));
    }
  };

  const handleSubmitForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (isMultiClass && activeClassIds.length === 0) {
      toast.error('Veuillez sélectionner au moins une classe');
      return;
    }
    const schedules: ClassScheduleConfig[] = isMultiClass && activeClassIds.length > 0
      ? activeClassIds.map((cid) => {
          const cObj = availableClasses.find((c) => c.id === cid);
          return {
            classe_id: cid,
            classe_nom: cObj?.name,
            classe_niveau: cObj?.niveau,
            date: customSchedules[cid]?.date || form.date,
            heure_debut: customSchedules[cid]?.heure_debut !== undefined ? customSchedules[cid]?.heure_debut : (form.heure_debut || ''),
            heure_fin: customSchedules[cid]?.heure_fin !== undefined ? customSchedules[cid]?.heure_fin : (form.heure_fin || ''),
          };
        })
      : [];

    onSubmit(form, schedules.length > 0 ? schedules : undefined)
      .then(() => {
        try {
          localStorage.removeItem(NOTEBOOK_DRAFT_KEY);
        } catch {
          /* ignore */
        }
      })
      .catch((err: unknown) =>
        toast.error(err instanceof Error ? err.message : 'Échec de l\'enregistrement')
      );
  };

  return (
    <form onSubmit={handleSubmitForm} className="space-y-6">
      {/* Sélecteur multi-classes */}
      {isMultiClass && (
        <Card className="border-teal/30 bg-white">
          <CardContent className="p-5 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-teal/10 text-teal flex items-center justify-center shrink-0">
                  <Users size={16} />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-navy">
                    Classes concernées ({activeClassIds.length}/{availableClasses.length})
                  </h3>
                  <p className="text-xs text-muted">
                    Sélectionnez toutes les classes qui partagent cette même séance
                  </p>
                </div>
              </div>

              {/* Raccourcis de sélection */}
              <div className="flex flex-wrap items-center gap-1.5 text-xs">
                <button
                  type="button"
                  onClick={() => onSelectedClassesChange?.(availableClasses.map((c) => c.id))}
                  className="px-2 py-1 rounded bg-teal-50 text-teal text-[11px] font-medium hover:bg-teal-100 transition-colors cursor-pointer"
                >
                  Tout sélectionner
                </button>
                {uniqueNiveaux.map((niv) => (
                  <button
                    key={niv}
                    type="button"
                    onClick={() =>
                      onSelectedClassesChange?.(
                        availableClasses.filter((c) => c.niveau === niv).map((c) => c.id)
                      )
                    }
                    className="px-2 py-1 rounded bg-parchment-dark text-navy text-[11px] font-medium hover:bg-parchment-dark/80 transition-colors cursor-pointer"
                  >
                    Tous les {niv}
                  </button>
                ))}
                {activeClassIds.length > 0 && (
                  <button
                    type="button"
                    onClick={() => onSelectedClassesChange?.([])}
                    className="px-2 py-1 rounded text-muted hover:text-red text-[11px] transition-colors cursor-pointer"
                  >
                    Effacer
                  </button>
                )}
              </div>
            </div>

            {/* Grille de classes */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 pt-1">
              {availableClasses.map((c) => {
                const isSelected = activeClassIds.includes(c.id);
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => {
                      if (isSelected) {
                        onSelectedClassesChange?.(activeClassIds.filter((id) => id !== c.id));
                      } else {
                        onSelectedClassesChange?.([...activeClassIds, c.id]);
                      }
                    }}
                    className={cn(
                      'flex items-center gap-2.5 p-2.5 rounded-lg border text-left transition-all cursor-pointer text-xs',
                      isSelected
                        ? 'border-teal bg-teal-50/60 text-navy font-medium shadow-xs'
                        : 'border-border bg-white text-muted hover:border-teal/40 hover:bg-parchment/50'
                    )}
                  >
                    <div
                      className={cn(
                        'w-4 h-4 rounded flex items-center justify-center shrink-0 text-white transition-colors',
                        isSelected ? 'bg-teal' : 'border border-border bg-white'
                      )}
                    >
                      {isSelected && <Check size={12} strokeWidth={3} />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-semibold text-navy">{c.name}</div>
                      <div className="text-[10px] text-muted flex items-center gap-1">
                        <span className="font-mono bg-parchment-dark px-1 rounded text-[9px] text-navy font-medium">
                          {c.niveau}
                        </span>
                        {c.student_count !== undefined && (
                          <span>{c.student_count} él.</span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>

        <CardContent className="p-6 pt-6 space-y-5">
          {/* Date & Horaire */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
            <div className="md:col-span-4">
              <Input
                label="Date *"
                type="date"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                required
              />
            </div>
            <div className="md:col-span-4">
              <Select
                label="Horaire de la séance"
                value={currentSlotValue}
                onChange={(e) => handleSlotSelect(e.target.value)}
                options={CRENEAUX_HORAIRES.map((c) => ({ value: c.value, label: c.label }))}
              />
            </div>
            <div className="md:col-span-2">
              <Input
                label="Début"
                type="time"
                value={form.heure_debut || ''}
                onChange={(e) => setForm({ ...form, heure_debut: e.target.value })}
              />
            </div>
            <div className="md:col-span-2">
              <Input
                label="Fin"
                type="time"
                value={form.heure_fin || ''}
                onChange={(e) => setForm({ ...form, heure_fin: e.target.value })}
              />
            </div>
          </div>

          {/* Raccourcis créneaux rapides */}
          <div className="flex flex-wrap items-center gap-1.5 -mt-2">
            <span className="text-[11px] text-muted flex items-center gap-1 mr-1">
              <Clock size={11} /> Créneaux fréquents :
            </span>
            {QUICK_SLOTS.map((qs) => {
              const isSelected = form.heure_debut === qs.debut && form.heure_fin === qs.fin;
              return (
                <button
                  key={qs.label}
                  type="button"
                  onClick={() => setForm((prev) => ({ ...prev, heure_debut: qs.debut, heure_fin: qs.fin }))}
                  className={cn(
                    'text-[11px] px-2.5 py-0.5 rounded-md border transition-all cursor-pointer',
                    isSelected
                      ? 'bg-teal text-white border-teal font-medium shadow-xs'
                      : 'bg-parchment-dark/40 text-navy/70 border-border hover:bg-teal-50 hover:text-teal hover:border-teal/40'
                  )}
                >
                  {qs.label}
                </button>
              );
            })}
            {(form.heure_debut || form.heure_fin) && (
              <button
                type="button"
                onClick={() => setForm((prev) => ({ ...prev, heure_debut: '', heure_fin: '' }))}
                className="text-[11px] text-muted hover:text-red px-1.5 py-0.5 ml-1 transition-colors cursor-pointer"
                title="Effacer l'horaire"
              >
                ✕ Effacer
              </button>
            )}
          </div>

          {/* Personnalisation date/horaire par classe si multi-classes */}
          {isMultiClass && activeClassIds.length > 1 && (
            <div className="pt-3 border-t border-border/70 space-y-2.5">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                <div className="flex items-center gap-2">
                  <Calendar size={14} className="text-teal" />
                  <span className="text-xs font-semibold text-navy">
                    Dates et horaires par classe ({activeClassIds.length} classes sélectionnées)
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-muted hidden md:inline">
                    Par défaut identique à ci-dessus. Modifiez ici si nécessaire.
                  </span>
                  {Object.keys(customSchedules).length > 0 && (
                    <button
                      type="button"
                      onClick={() => setCustomSchedules({})}
                      className="text-[11px] text-teal hover:underline flex items-center gap-1 cursor-pointer font-medium"
                      title="Réinitialiser toutes les dates sur la date principale"
                    >
                      <RotateCcw size={11} /> Harmoniser tout
                    </button>
                  )}
                </div>
              </div>

              <div className="space-y-1.5 bg-parchment/60 p-3 rounded-xl border border-border/80 max-h-[300px] overflow-y-auto">
                {activeClassIds.map((cid) => {
                  const cObj = availableClasses.find((c) => c.id === cid);
                  const custom = customSchedules[cid];
                  const curDate = custom?.date ?? form.date;
                  const curDebut = custom?.heure_debut !== undefined ? custom.heure_debut : form.heure_debut;
                  const curFin = custom?.heure_fin !== undefined ? custom.heure_fin : form.heure_fin;
                  const curSlot = curDebut && curFin
                    ? (CRENEAUX_HORAIRES.find((c) => c.debut === curDebut && c.fin === curFin)?.value || 'custom')
                    : (curDebut || curFin ? 'custom' : '');

                  const isCustomized = Boolean(custom?.date || custom?.heure_debut !== undefined || custom?.heure_fin !== undefined);

                  return (
                    <div
                      key={cid}
                      className={cn(
                        'flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 rounded-lg border transition-all text-xs',
                        isCustomized
                          ? 'border-teal/40 bg-teal-50/20'
                          : 'border-border/80 bg-white'
                      )}
                    >
                      <div className="flex items-center gap-2 min-w-[130px]">
                        <span className="font-mono bg-teal-50 text-teal text-[10px] font-semibold px-1.5 py-0.5 rounded">
                          {cObj?.niveau || '—'}
                        </span>
                        <span className="font-semibold text-navy truncate">
                          {cObj?.name || cid}
                        </span>
                        {isCustomized && (
                          <span className="text-[10px] bg-teal/10 text-teal-dark px-1.5 py-0.2 rounded font-medium">
                            personnalisé
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-2 flex-1 sm:justify-end">
                        <input
                          type="date"
                          value={curDate}
                          onChange={(e) =>
                            setCustomSchedules((prev) => ({
                              ...prev,
                              [cid]: { ...prev[cid], date: e.target.value },
                            }))
                          }
                          className="text-xs px-2 py-1 rounded border border-border bg-white text-navy focus:outline-none focus:ring-1 focus:ring-teal"
                        />
                        <select
                          value={curSlot}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (!val) {
                              setCustomSchedules((prev) => ({
                                ...prev,
                                [cid]: { ...prev[cid], heure_debut: '', heure_fin: '' },
                              }));
                            } else {
                              const match = CRENEAUX_HORAIRES.find((c) => c.value === val);
                              if (match && match.value !== 'custom') {
                                setCustomSchedules((prev) => ({
                                  ...prev,
                                  [cid]: { ...prev[cid], heure_debut: match.debut, heure_fin: match.fin },
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
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Titre & Statut */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <Input
                label="Titre de la séance *"
                value={form.titre}
                onChange={(e) => setForm({ ...form, titre: e.target.value })}
                placeholder="ex : Introduction au modèle client-serveur"
                required
              />
            </div>
            <div>
              <Select
                label="Statut"
                value={form.statut}
                onChange={(e) => setForm({ ...form, statut: e.target.value })}
                options={STATUTS}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-navy mb-1.5">Résumé (Markdown)</label>
            <textarea
              value={form.resume}
              onChange={(e) => setForm({ ...form, resume: e.target.value })}
              rows={8}
              placeholder={'## Points abordés\n- ...\n\n## À retenir\n- ...'}
              className="w-full min-h-[160px] resize-y rounded-lg border border-border bg-white px-3 py-2 text-sm text-navy focus:outline-none focus:ring-2 focus:ring-teal/30 focus:border-teal font-mono"
            />
            <p className="text-xs text-muted mt-1">Format Markdown — titres, listes, **gras**…</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-navy mb-1.5">Tags</label>
            <div className="flex flex-wrap items-center gap-2 mb-2">
              {form.tags.map((t) => (
                <span key={t} className="inline-flex items-center gap-1 bg-teal-50 text-teal-dark rounded-full px-2.5 py-0.5 text-xs font-medium">
                  {t}
                  <button type="button" onClick={() => setForm({ ...form, tags: form.tags.filter((x) => x !== t) })} className="hover:text-red">
                    <X size={11} />
                  </button>
                </span>
              ))}
              {form.tags.length === 0 && <span className="text-xs text-muted">Aucun tag — ex : Réseau, Unité 2, APC</span>}
            </div>
            <div className="flex gap-2">
              <input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') { e.preventDefault(); addTag(); }
                }}
                placeholder="Ajouter un tag puis Entrée"
                className="flex-1 rounded-lg border border-border bg-white px-3 py-2 text-sm text-navy focus:outline-none focus:ring-2 focus:ring-teal/30 focus:border-teal"
              />
              <Button type="button" variant="secondary" size="sm" onClick={addTag}><Plus size={13} />Tag</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6 pt-6 space-y-5">
          <h3 className="font-display text-lg font-semibold text-navy">Liens</h3>

          {/* Examen lié */}
          <Select
            label="Examen lié (optionnel)"
            value={form.exam_id || ''}
            onChange={(e) => setForm({ ...form, exam_id: e.target.value || null })}
            options={[
              { value: '', label: '— Aucun —' },
              ...examens.map((x) => ({ value: x.id, label: x.titre })),
            ]}
          />
          {linkedExam && (
            <p className="text-xs text-muted flex items-center gap-1.5 -mt-2">
              <ClipboardCheck size={12} />Séance liée à « {linkedExam.titre} »
            </p>
          )}

          {/* Documents PEDAGOGEN liés */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-navy">Documents PEDAGOGEN liés ({form.document_ids.length})</label>
              <Button type="button" variant="secondary" size="sm" onClick={() => setShowDocPicker((v) => !v)}>
                <FileText size={13} />{showDocPicker ? 'Fermer' : 'Choisir des documents'}
              </Button>
            </div>
            {selectedDocs.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-2">
                {selectedDocs.map((d) => (
                  <span key={d.id} className="inline-flex items-center gap-1 bg-parchment-dark text-navy rounded-full px-2.5 py-0.5 text-xs font-medium">
                    {d.name}
                    <button type="button" onClick={() => toggleDoc(d.id)} className="hover:text-red"><X size={11} /></button>
                  </span>
                ))}
              </div>
            )}
            {showDocPicker && (
              <div className="max-h-56 overflow-y-auto rounded-lg border border-border divide-y divide-border/50">
                {documents.length === 0 ? (
                  <p className="text-xs text-muted p-3">Aucun document généré — générez des documents dans l'onglet « Générer ».</p>
                ) : (
                  documents.map((d) => (
                    <button
                      key={d.id}
                      type="button"
                      onClick={() => toggleDoc(d.id)}
                      className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between transition-colors ${
                        form.document_ids.includes(d.id) ? 'bg-teal-50 text-teal-dark font-medium' : 'hover:bg-parchment-dark/40 text-navy'
                      }`}
                    >
                      <span className="truncate">{d.name}</span>
                      {form.document_ids.includes(d.id) && <span>✓</span>}
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Pièces jointes depuis votre ordinateur (Local attachments) */}
          <div className="pt-4 border-t border-border/70 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Paperclip size={16} className="text-teal" />
                <label className="text-sm font-medium text-navy">
                  Pièces jointes locales ({form.attachments?.length || 0})
                </label>
              </div>
              <span className="text-[11px] text-muted">
                Fichiers locaux (max 25 Mo)
              </span>
            </div>

            {/* Zone de téléversement (Dropzone) */}
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-all ${
                isDragActive
                  ? 'border-teal bg-teal-50/50 scale-[0.99]'
                  : 'border-border/80 bg-parchment-dark/20 hover:border-teal/50 hover:bg-parchment-dark/40'
              } ${uploadingFiles ? 'pointer-events-none opacity-60' : ''}`}
            >
              <input {...getInputProps()} />
              <div className="flex flex-col items-center justify-center gap-1.5">
                <div className="w-10 h-10 rounded-xl bg-teal/10 flex items-center justify-center text-teal mb-0.5">
                  {uploadingFiles ? (
                    <Loader2 size={20} className="animate-spin" />
                  ) : (
                    <Upload size={20} />
                  )}
                </div>
                <p className="text-xs font-semibold text-navy">
                  {uploadingFiles
                    ? 'Téléversement en cours...'
                    : isDragActive
                    ? 'Déposez les fichiers ici'
                    : 'Glissez-déposez des fichiers ici ou parcourez vos dossiers'}
                </p>
                <p className="text-[11px] text-muted">
                  PDF, Word (DOCX), PowerPoint (PPTX), Images (PNG, JPG), Excel, etc.
                </p>
              </div>
            </div>

            {/* Liste des pièces jointes */}
            {form.attachments && form.attachments.length > 0 && (
              <div className="space-y-2 pt-1">
                {form.attachments.map((att) => (
                  <div
                    key={att.id}
                    className="flex items-center justify-between gap-3 p-2.5 rounded-xl border border-border bg-white hover:bg-parchment-dark/20 transition-colors shadow-2xs"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-parchment-dark/60 flex items-center justify-center shrink-0">
                        {getAttachmentIcon(att.name, att.mime_type)}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-navy truncate" title={att.name}>
                          {att.name}
                        </p>
                        <p className="text-[10px] text-muted font-mono">
                          {formatFileSize(att.size)}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <a
                        href={att.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium text-teal hover:bg-teal-50 transition-colors"
                        title="Ouvrir le fichier dans un nouvel onglet"
                      >
                        <ExternalLink size={12} />
                        <span className="hidden sm:inline">Ouvrir</span>
                      </a>
                      <button
                        type="button"
                        onClick={() => handleRemoveAttachment(att.id, att.name)}
                        className="p-1 rounded-md text-muted hover:text-red hover:bg-red/10 transition-colors cursor-pointer"
                        title="Retirer la pièce jointe"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        {!isEditing ? (
          <div className="flex items-center gap-1.5 text-xs text-muted">
            <span className="w-1.5 h-1.5 rounded-full bg-teal shrink-0 animate-pulse" />
            <span>Brouillon auto-sauvegardé</span>
            <span className="text-muted/40">•</span>
            <button
              type="button"
              onClick={handleClearDraft}
              className="text-muted hover:text-red underline cursor-pointer"
              title="Effacer le brouillon et recommencer à zéro"
            >
              Effacer
            </button>
          </div>
        ) : (
          <div />
        )}

        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={() => router.back()}>Annuler</Button>
          <Button type="submit" disabled={saving}>
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            {isMultiClass && activeClassIds.length > 1
              ? `Créer pour les ${activeClassIds.length} classes`
              : submitLabel}
          </Button>
        </div>
      </div>
    </form>
  );
}
