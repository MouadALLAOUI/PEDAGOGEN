export interface Matiere {
  id: string;
  nom: string;
  nomArabe: string;
  niveaux: ('1AC' | '2AC' | '3AC')[];
}

export interface Unite {
  id: string;
  nom: string;
  matiereId: string;
  niveau: '1AC' | '2AC' | '3AC';
  semestre: 1 | 2;
}

export const MATIERES: Matiere[] = [
  { id: 'math', nom: 'Mathématiques', nomArabe: 'الرياضيات', niveaux: ['1AC', '2AC', '3AC'] },
  { id: 'svt', nom: 'Sciences de la Vie et de la Terre', nomArabe: 'علوم الحياة والأرض', niveaux: ['1AC', '2AC', '3AC'] },
  { id: 'physique', nom: 'Physique-Chimie', nomArabe: 'الفيزياء والكيمياء', niveaux: ['1AC', '2AC', '3AC'] },
  { id: 'francais', nom: 'Français', nomArabe: 'الفرنسية', niveaux: ['1AC', '2AC', '3AC'] },
  { id: 'arabe', nom: 'Arabe', nomArabe: 'العربية', niveaux: ['1AC', '2AC', '3AC'] },
  { id: 'anglais', nom: 'Anglais', nomArabe: 'الإنجليزية', niveaux: ['1AC', '2AC', '3AC'] },
  { id: 'histoire', nom: 'Histoire-Géographie', nomArabe: 'التاريخ والجغرافيا', niveaux: ['1AC', '2AC', '3AC'] },
  { id: 'education', nom: 'Éducation Islamique', nomArabe: 'التربية الإسلامية', niveaux: ['1AC', '2AC', '3AC'] },
  { id: 'tamazight', nom: 'Tamazight', nomArabe: 'تامازيغت', niveaux: ['1AC', '2AC', '3AC'] },
  { id: 'eps', nom: 'Éducation Physique', nomArabe: 'التربية البدنية', niveaux: ['1AC', '2AC', '3AC'] },
  { id: 'tech', nom: 'Technologies', nomArabe: 'التكنولوجيا', niveaux: ['1AC', '2AC', '3AC'] },
  { id: 'arts', nom: 'Arts Plastiques', nomArabe: 'التربية التشكيلية', niveaux: ['1AC', '2AC', '3AC'] },
  { id: 'musique', nom: 'Musique', nomArabe: 'التربية Musikique', niveaux: ['1AC', '2AC', '3AC'] },
];

export const NIVEAUX = ['1AC', '2AC', '3AC'] as const;

export const LANGUES = [
  { value: 'fr', label: 'Français' },
  { value: 'ar', label: 'Arabe' },
  { value: 'fr+ar', label: 'Bilingue (FR+AR)' },
] as const;
