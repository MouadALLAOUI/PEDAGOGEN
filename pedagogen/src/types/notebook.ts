export const STATUTS = [
  'planifiee',
  'realisee',
  'reportee',
  'absence',
  'tenue',
  'annulee',
] as const;
export type Statut = (typeof STATUTS)[number];

export type EntryType = 'SESSION' | 'MEETING' | 'PUBLICATION';

export const ENTRY_TYPES: Array<{
  value: EntryType;
  label: string;
  icon: string;
}> = [
  { value: 'SESSION', label: 'Séance', icon: 'GraduationCap' },
  { value: 'MEETING', label: 'Réunion', icon: 'Users' },
  { value: 'PUBLICATION', label: 'Publication', icon: 'FileText' },
];

export const MEETING_KINDS = [
  'Conseil de classe',
  "Conseil d'administration",
  'Conseil pédagogique',
  'Réunion de département',
  'Réunion parents',
  'Autre',
] as const;

export const PUBLICATION_KINDS = [
  { value: 'annonce', label: 'إعلان / Annonce' },
  { value: 'note_administrative', label: 'نشرة إدارية / Note administrative' },
  { value: 'bulletin_alerte', label: "نشرة إنذارية / Bulletin d'alerte" },
  { value: 'circulaire', label: 'مذكرة / Circulaire' },
  { value: 'convocation', label: 'استدعاء / Convocation' },
  { value: 'autre', label: 'Autre / آخر' },
] as const;

export interface MeetingMeta {
  meeting_kind?: string;
  custom_kind?: string;
  location?: string;
  participants?: string;
  concerned_class_ids?: string[];
  agenda?: string;
  decisions?: string;
}

export interface PublicationMeta {
  publication_kind?: string;
  custom_kind?: string;
  reference_number?: string;
  source?: string;
  action_required?: boolean;
  deadline?: string;
  target_audience?: string;
  target_class_ids?: string[];
}

export type EntryMeta = MeetingMeta & PublicationMeta;

export interface NotebookAttachment {
  id: string;
  name: string;
  size: number;
  mime_type: string;
  url: string;
  created_at: string;
}

export interface NotebookEntry {
  id: string;
  user_id?: string;
  entry_type: EntryType;
  classe_id?: string | null;
  date: string;
  heure_debut?: string;
  heure_fin?: string;
  titre: string;
  resume: string;
  statut: Statut;
  tags: string[];
  exam_id: string | null;
  group_id?: string | null;
  meta: EntryMeta;
  created_at: string;
  updated_at: string;
  classe_nom?: string;
  classe_niveau?: string;
  exam_titre?: string | null;
  documents?: string[];
  attachments?: NotebookAttachment[];
}
