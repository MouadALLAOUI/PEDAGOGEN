'use client';

import { useState } from 'react';
import {
  Calendar,
  FileText,
  Save,
  Loader2,
  AlertTriangle,
  Building2,
  GraduationCap,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { AttachmentUploader } from './AttachmentUploader';
import {
  PUBLICATION_KINDS,
  type NotebookEntry,
  type NotebookAttachment,
  type Statut,
} from '@/types/notebook';
import type { CollegeClass } from '@/types/student';

export interface PublicationFormProps {
  initial?: Partial<NotebookEntry>;
  classes: CollegeClass[];
  onSubmit: (data: {
    entry_type: 'PUBLICATION';
    classe_id: string | null;
    date: string;
    heure_debut: string;
    heure_fin: string;
    titre: string;
    resume: string;
    statut: Statut;
    meta: {
      publication_kind: string;
      custom_kind?: string;
      reference_number?: string;
      source?: string;
      action_required?: boolean;
      deadline?: string;
      target_audience?: string;
    };
    attachment_ids: string[];
  }) => Promise<void>;
  onCancel?: () => void;
  saving?: boolean;
}

export function PublicationForm({
  initial,
  classes,
  onSubmit,
  onCancel,
  saving = false,
}: PublicationFormProps) {
  const [titre, setTitre] = useState(initial?.titre || '');
  const [publicationKind, setPublicationKind] = useState(
    initial?.meta?.publication_kind || PUBLICATION_KINDS[0]!.value
  );
  const [customKind, setCustomKind] = useState(initial?.meta?.custom_kind || '');
  const [date, setDate] = useState(
    initial?.date || new Date().toISOString().slice(0, 10)
  );
  const [referenceNumber, setReferenceNumber] = useState(
    initial?.meta?.reference_number || ''
  );
  const [source, setSource] = useState(initial?.meta?.source || '');
  const [resume, setResume] = useState(initial?.resume || '');
  const [actionRequired, setActionRequired] = useState(
    Boolean(initial?.meta?.action_required)
  );
  const [deadline, setDeadline] = useState(initial?.meta?.deadline || '');
  const [classeId, setClasseId] = useState<string>(initial?.classe_id || '');
  const [targetAudience, setTargetAudience] = useState(
    initial?.meta?.target_audience || 'Toutes les classes'
  );
  const [statut, setStatut] = useState<Statut>(
    (initial?.statut as Statut) || 'realisee'
  );
  const [attachments, setAttachments] = useState<NotebookAttachment[]>(
    initial?.attachments || []
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!titre.trim()) {
      toast.error('Le titre de la publication est obligatoire');
      return;
    }
    if (!date) {
      toast.error('La date de publication/réception est obligatoire');
      return;
    }

    try {
      await onSubmit({
        entry_type: 'PUBLICATION',
        classe_id: classeId || null,
        date,
        heure_debut: '',
        heure_fin: '',
        titre: titre.trim(),
        resume: resume.trim(),
        statut,
        meta: {
          publication_kind: publicationKind,
          custom_kind: publicationKind === 'autre' && customKind.trim() ? customKind.trim() : undefined,
          reference_number: referenceNumber.trim() || undefined,
          source: source.trim() || undefined,
          action_required: actionRequired,
          deadline: actionRequired && deadline ? deadline : undefined,
          target_audience: targetAudience.trim() || undefined,
        },
        attachment_ids: attachments.map((a) => a.id),
      });
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Échec de l'enregistrement");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Type et Titre */}
      <div className="space-y-4 p-4 rounded-xl border border-border/80 bg-white">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-navy mb-1">
              Type de publication / نوع الوثيقة *
            </label>
            <select
              value={publicationKind}
              onChange={(e) => setPublicationKind(e.target.value)}
              className="w-full rounded-lg border border-border bg-white px-3 py-2 text-xs text-navy focus:outline-none focus:ring-2 focus:ring-teal/30 focus:border-teal"
            >
              {PUBLICATION_KINDS.map((k) => (
                <option key={k.value} value={k.value}>
                  {k.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-navy mb-1">
              Statut
            </label>
            <select
              value={statut}
              onChange={(e) => setStatut(e.target.value as Statut)}
              className="w-full rounded-lg border border-border bg-white px-3 py-2 text-xs text-navy focus:outline-none focus:ring-2 focus:ring-teal/30 focus:border-teal"
            >
              <option value="realisee">Diffusée / Traitée</option>
              <option value="planifiee">En attente / À traiter</option>
              <option value="reportee">Reportée</option>
              <option value="annulee">Classée / Archivée</option>
            </select>
          </div>
        </div>

        {publicationKind === 'autre' && (
          <div>
            <label className="block text-xs font-medium text-navy mb-1">
              Précisez le type de document *
            </label>
            <Input
              value={customKind}
              onChange={(e) => setCustomKind(e.target.value)}
              placeholder="Ex: Avis officiel, Communiqué spécial..."
              className="text-xs"
              dir="auto"
              required
            />
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold text-navy mb-1">
            Titre ou objet du document / عنوان الوثيقة *
          </label>
          <Input
            value={titre}
            onChange={(e) => setTitre(e.target.value)}
            placeholder="Ex: مذكرة وزارية حول المراقبة المستمرة / Note de service n°45"
            className="text-sm font-medium"
            dir="auto"
            required
          />
        </div>
      </div>

      {/* Date, Réf & Émetteur */}
      <div className="p-4 rounded-xl border border-border/80 bg-white space-y-3">
        <span className="text-xs font-semibold text-navy flex items-center gap-1.5">
          <Calendar size={14} className="text-teal" /> Date, Références & Émetteur
        </span>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-[11px] text-muted mb-0.5">
              Date de publication / réception *
            </label>
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="text-xs"
              required
            />
          </div>

          <div>
            <label className="block text-[11px] text-muted mb-0.5">
              N° de référence / Réf. (optionnel)
            </label>
            <Input
              value={referenceNumber}
              onChange={(e) => setReferenceNumber(e.target.value)}
              placeholder="Ex: 24/098 ou مذكرة رقم 12"
              className="text-xs font-mono"
              dir="auto"
            />
          </div>

          <div>
            <label className="block text-[11px] text-muted mb-0.5 flex items-center gap-1">
              <Building2 size={12} className="text-teal" /> Émetteur / Source
            </label>
            <Input
              value={source}
              onChange={(e) => setSource(e.target.value)}
              placeholder="Ex: Direction provinciale, AREF, MEN..."
              className="text-xs"
              dir="auto"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          <div>
            <label className="block text-[11px] text-muted mb-0.5 flex items-center gap-1">
              <GraduationCap size={12} className="text-teal" /> Classe spécifique (optionnel)
            </label>
            <select
              value={classeId}
              onChange={(e) => setClasseId(e.target.value)}
              className="w-full rounded-lg border border-border bg-white px-3 py-2 text-xs text-navy focus:outline-none focus:ring-2 focus:ring-teal/30 focus:border-teal"
            >
              <option value="">— Toutes les classes / Général —</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.niveau})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] text-muted mb-0.5">
              Public cible / Destinataires
            </label>
            <Input
              value={targetAudience}
              onChange={(e) => setTargetAudience(e.target.value)}
              placeholder="Ex: Tous les élèves de 3AC, Parents, Professeurs..."
              className="text-xs"
              dir="auto"
            />
          </div>
        </div>
      </div>

      {/* Contenu / Résumé */}
      <div className="p-4 rounded-xl border border-border/80 bg-white space-y-3">
        <span className="text-xs font-semibold text-navy flex items-center gap-1.5">
          <FileText size={14} className="text-teal" /> Contenu, texte ou résumé / نص الإعلان أو المذكرة
        </span>

        <div>
          <textarea
            value={resume}
            onChange={(e) => setResume(e.target.value)}
            placeholder="Texte de l'annonce, synthèse de la circulaire ou directives administratives..."
            rows={5}
            dir="auto"
            className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-white text-navy focus:outline-none focus:ring-1 focus:ring-teal resize-y"
          />
        </div>

        {/* Action Requise Checkbox & Deadline */}
        <div className="pt-2 border-t border-border/80 space-y-3">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={actionRequired}
              onChange={(e) => setActionRequired(e.target.checked)}
              className="rounded border-border text-teal focus:ring-teal"
            />
            <span className="text-xs font-semibold text-navy flex items-center gap-1.5">
              <AlertTriangle size={14} className="text-amber-500" />
              Action requise / إشعار يتطلب إجراء
            </span>
          </label>

          {actionRequired && (
            <div className="pl-6 pt-1 max-w-xs">
              <label className="block text-[11px] font-medium text-amber-900 mb-1">
                Date limite d'exécution (Deadline)
              </label>
              <Input
                type="date"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                className="text-xs border-amber-300 bg-amber-50/50"
              />
            </div>
          )}
        </div>
      </div>

      {/* Scans & Pièces jointes */}
      <div className="p-4 rounded-xl border border-border/80 bg-white space-y-2">
        <span className="text-xs font-semibold text-navy">
          Documents joints, scans ou PDF officiels
        </span>
        <AttachmentUploader
          attachments={attachments}
          onChange={setAttachments}
          disabled={saving}
        />
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
        {onCancel && (
          <Button type="button" variant="ghost" onClick={onCancel} disabled={saving}>
            Annuler
          </Button>
        )}
        <Button type="submit" variant="primary" disabled={saving} className="gap-2 shadow-sm">
          {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
          {initial?.id ? 'Enregistrer les modifications' : 'Enregistrer la publication'}
        </Button>
      </div>
    </form>
  );
}
