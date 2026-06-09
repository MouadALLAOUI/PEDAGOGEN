export type GenerationMode = 'heavy' | 'medium' | 'light';

export type DocumentType =
  | 'fiche_pedagogique'
  | 'planification'
  | 'plan_gestion_classe'
  | 'evaluation'
  | 'cours_complet'
  | 'resume_eleve'
  | 'presentation_pptx'
  | 'images_illustratives';

export type OutputFormat = 'docx' | 'pptx' | 'pdf' | 'md';

export interface CourseMetadata {
  niveau: '1AC' | '2AC' | '3AC';
  matiere: string;
  unite: string;
  lecon: string;
  duree: number;
  competences: string[];
  langue: 'fr' | 'ar' | 'fr+ar';
  semestre: 1 | 2;
}

export interface GenerationRequest {
  mode: GenerationMode;
  metadata: CourseMetadata;
  documentsToGenerate?: DocumentType[];
  outputFormat: OutputFormat | OutputFormat[];
  useReferences: boolean;
}

export interface GenerationResult {
  id: string;
  createdAt: Date;
  mode: GenerationMode;
  metadata: CourseMetadata;
  files: GeneratedFile[];
  tokensUsed: number;
  durationMs: number;
}

export interface GeneratedFile {
  name: string;
  type: DocumentType;
  format: OutputFormat;
  url: string;
  sizeKb: number;
}

export const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  fiche_pedagogique: 'Fiche Pédagogique',
  planification: 'Planification',
  plan_gestion_classe: 'Plan de Gestion de Classe',
  evaluation: 'Évaluation',
  cours_complet: 'Cours Complet',
  resume_eleve: 'Résumé Élève',
  presentation_pptx: 'Présentation PPTX',
  images_illustratives: 'Images Illustratives',
};

export const MODE_LABELS: Record<GenerationMode, string> = {
  heavy: 'Mode Complet',
  medium: 'Mode Sélectif',
  light: 'Mode Rapide',
};

export const MODE_DESCRIPTIONS: Record<GenerationMode, {
  title: string;
  description: string;
  estimatedTime: string;
  tokenRange: string;
  color: string;
}> = {
  heavy: {
    title: 'Mode Complet',
    description: 'Génération intégrale : fiche, planification, cours, gestion de classe, résumé, présentation et images.',
    estimatedTime: '3-5 min',
    tokenRange: '15,000 – 30,000',
    color: '#DC2626',
  },
  medium: {
    title: 'Mode Sélectif',
    description: 'Choisissez les documents spécifiques à générer selon vos besoins.',
    estimatedTime: '1-3 min',
    tokenRange: '3,000 – 12,000',
    color: '#D97706',
  },
  light: {
    title: 'Mode Rapide',
    description: 'Un résumé Markdown structuré de votre leçon en quelques secondes.',
    estimatedTime: '< 30 sec',
    tokenRange: '500 – 2,000',
    color: '#16A34A',
  },
};
