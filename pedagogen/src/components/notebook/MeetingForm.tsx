'use client';

import { useState } from 'react';
import {
  Calendar,
  MapPin,
  Users,
  FileText,
  Save,
  Loader2,
  GraduationCap,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { AttachmentUploader } from './AttachmentUploader';
import {
  MEETING_KINDS,
  type NotebookEntry,
  type NotebookAttachment,
  type Statut,
} from '@/types/notebook';
import type { CollegeClass } from '@/types/student';

const MEETING_STATUSES: Array<{ value: Statut; label: string }> = [
  { value: 'planifiee', label: 'Planifiée' },
  { value: 'tenue', label: 'Tenue' },
  { value: 'reportee', label: 'Reportée' },
  { value: 'annulee', label: 'Annulée' },
];

export interface MeetingFormProps {
  initial?: Partial<NotebookEntry>;
  classes: CollegeClass[];
  onSubmit: (data: {
    entry_type: 'MEETING';
    classe_id: string | null;
    date: string;
    heure_debut: string;
    heure_fin: string;
    titre: string;
    resume: string;
    statut: Statut;
    meta: {
      meeting_kind: string;
      custom_kind?: string;
      location?: string;
      participants?: string;
      agenda?: string;
      decisions?: string;
    };
    attachment_ids: string[];
  }) => Promise<void>;
  onCancel?: () => void;
  saving?: boolean;
}

export function MeetingForm({
  initial,
  classes,
  onSubmit,
  onCancel,
  saving = false,
}: MeetingFormProps) {
  const [titre, setTitre] = useState(initial?.titre || '');
  const [meetingKind, setMeetingKind] = useState(
    initial?.meta?.meeting_kind || MEETING_KINDS[0]
  );
  const [customKind, setCustomKind] = useState(initial?.meta?.custom_kind || '');
  const [date, setDate] = useState(
    initial?.date || new Date().toISOString().slice(0, 10)
  );
  const [heureDebut, setHeureDebut] = useState(initial?.heure_debut || '14:00');
  const [heureFin, setHeureFin] = useState(initial?.heure_fin || '15:30');
  const [classeId, setClasseId] = useState<string>(initial?.classe_id || '');
  const [location, setLocation] = useState(initial?.meta?.location || '');
  const [participants, setParticipants] = useState(initial?.meta?.participants || '');
  const [agenda, setAgenda] = useState(initial?.meta?.agenda || '');
  const [decisions, setDecisions] = useState(initial?.meta?.decisions || '');
  const [statut, setStatut] = useState<Statut>(
    (initial?.statut as Statut) || 'planifiee'
  );
  const [attachments, setAttachments] = useState<NotebookAttachment[]>(
    initial?.attachments || []
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!titre.trim()) {
      toast.error('Le titre de la réunion est obligatoire');
      return;
    }
    if (!date) {
      toast.error('La date est obligatoire');
      return;
    }
    if (!heureDebut || !heureFin) {
      toast.error("L'heure de début et l'heure de fin sont obligatoires");
      return;
    }

    // Build summary from agenda + decisions for search & compact view
    const summaryParts: string[] = [];
    if (agenda.trim()) summaryParts.push(`Ordre du jour : ${agenda.trim()}`);
    if (decisions.trim()) summaryParts.push(`Compte rendu : ${decisions.trim()}`);
    const resume = summaryParts.join('\n\n') || titre.trim();

    try {
      await onSubmit({
        entry_type: 'MEETING',
        classe_id: classeId || null,
        date,
        heure_debut: heureDebut,
        heure_fin: heureFin,
        titre: titre.trim(),
        resume,
        statut,
        meta: {
          meeting_kind: meetingKind === 'Autre' && customKind.trim() ? customKind.trim() : meetingKind,
          custom_kind: customKind.trim() || undefined,
          location: location.trim() || undefined,
          participants: participants.trim() || undefined,
          agenda: agenda.trim() || undefined,
          decisions: decisions.trim() || undefined,
        },
        attachment_ids: attachments.map((a) => a.id),
      });
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Échec de l'enregistrement");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Type de réunion et Titre */}
      <div className="space-y-4 p-4 rounded-xl border border-border/80 bg-white">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-navy mb-1">
              Catégorie de la réunion *
            </label>
            <select
              value={meetingKind}
              onChange={(e) => setMeetingKind(e.target.value)}
              className="w-full rounded-lg border border-border bg-white px-3 py-2 text-xs text-navy focus:outline-none focus:ring-2 focus:ring-teal/30 focus:border-teal"
            >
              {MEETING_KINDS.map((k) => (
                <option key={k} value={k}>
                  {k}
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
              {MEETING_STATUSES.map((st) => (
                <option key={st.value} value={st.value}>
                  {st.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {meetingKind === 'Autre' && (
          <div>
            <label className="block text-xs font-medium text-navy mb-1">
              Précisez la catégorie *
            </label>
            <Input
              value={customKind}
              onChange={(e) => setCustomKind(e.target.value)}
              placeholder="Ex: Commission de discipline, Comité de suivi..."
              className="text-xs"
              required
            />
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold text-navy mb-1">
            Titre de la réunion *
          </label>
          <Input
            value={titre}
            onChange={(e) => setTitre(e.target.value)}
            placeholder="Ex: Conseil de classe du 1er semestre - Bilan des résultats"
            className="text-sm font-medium"
            dir="auto"
            required
          />
        </div>
      </div>

      {/* Date, Horaires & Lieu */}
      <div className="p-4 rounded-xl border border-border/80 bg-white space-y-3">
        <span className="text-xs font-semibold text-navy flex items-center gap-1.5">
          <Calendar size={14} className="text-teal" /> Date, Horaires & Emplacement
        </span>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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
            <label className="block text-[11px] text-muted mb-0.5">Heure début *</label>
            <Input
              type="time"
              value={heureDebut}
              onChange={(e) => setHeureDebut(e.target.value)}
              className="text-xs"
              required
            />
          </div>

          <div>
            <label className="block text-[11px] text-muted mb-0.5">Heure fin *</label>
            <Input
              type="time"
              value={heureFin}
              onChange={(e) => setHeureFin(e.target.value)}
              className="text-xs"
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          <div>
            <label className="block text-[11px] text-muted mb-0.5 flex items-center gap-1">
              <MapPin size={12} className="text-teal" /> Salle / Lieu (optionnel)
            </label>
            <Input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Ex: Salle des professeurs, Bibliothèque..."
              className="text-xs"
            />
          </div>

          <div>
            <label className="block text-[11px] text-muted mb-0.5 flex items-center gap-1">
              <GraduationCap size={12} className="text-teal" /> Classe liée (optionnel)
            </label>
            <select
              value={classeId}
              onChange={(e) => setClasseId(e.target.value)}
              className="w-full rounded-lg border border-border bg-white px-3 py-2 text-xs text-navy focus:outline-none focus:ring-2 focus:ring-teal/30 focus:border-teal"
            >
              <option value="">— Non rattachée à une classe —</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.niveau})
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-[11px] text-muted mb-0.5 flex items-center gap-1">
            <Users size={12} className="text-teal" /> Participants convoqués (optionnel)
          </label>
          <Input
            value={participants}
            onChange={(e) => setParticipants(e.target.value)}
            placeholder="Ex: Direction, professeurs principaux, délégués élèves..."
            className="text-xs"
            dir="auto"
          />
        </div>
      </div>

      {/* Ordre du jour & Décisions prises */}
      <div className="p-4 rounded-xl border border-border/80 bg-white space-y-3">
        <span className="text-xs font-semibold text-navy flex items-center gap-1.5">
          <FileText size={14} className="text-teal" /> Ordre du jour & Compte rendu
        </span>

        <div>
          <label className="block text-[11px] font-medium text-navy mb-1">
            Ordre du jour (Agenda)
          </label>
          <textarea
            value={agenda}
            onChange={(e) => setAgenda(e.target.value)}
            placeholder="Points à aborder durant la séance..."
            rows={3}
            dir="auto"
            className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-white text-navy focus:outline-none focus:ring-1 focus:ring-teal resize-y"
          />
        </div>

        <div>
          <label className="block text-[11px] font-medium text-navy mb-1">
            Décisions prises & Compte rendu
          </label>
          <textarea
            value={decisions}
            onChange={(e) => setDecisions(e.target.value)}
            placeholder="Conclusions, décisions du conseil, actions à entreprendre..."
            rows={4}
            dir="auto"
            className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-white text-navy focus:outline-none focus:ring-1 focus:ring-teal resize-y"
          />
        </div>
      </div>

      {/* Pièces jointes */}
      <div className="p-4 rounded-xl border border-border/80 bg-white space-y-2">
        <span className="text-xs font-semibold text-navy">
          Pièces jointes & Documents (PV, Feuilles de présence, Convocations)
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
          {initial?.id ? 'Enregistrer les modifications' : 'Créer la réunion'}
        </Button>
      </div>
    </form>
  );
}
