export type ReferenceCategory =
  | 'fiche_structure'
  | 'curriculum'
  | 'livre_blanc'
  | 'instructions_ministerielle'
  | 'custom';

export const REFERENCE_CATEGORY_LABELS: Record<ReferenceCategory, string> = {
  fiche_structure: 'Structure Fiche',
  curriculum: 'Programme Scolaire',
  livre_blanc: 'Livre Blanc',
  instructions_ministerielle: 'Instructions Ministérielles',
  custom: 'Personnalisé',
};

export interface ReferenceFile {
  id: string;
  name: string;
  category: ReferenceCategory;
  size: number;
  uploadedAt: Date;
  url: string;
}
