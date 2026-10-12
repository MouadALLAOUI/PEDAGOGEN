export type NiveauCollege = '1AC' | '2AC' | '3AC';

export type TarlStatus = 'standard' | 'soutien_prioritaire' | 'consolidation' | 'depassement';

export type AttendanceType = 'presence' | 'absence' | 'retard';

export type EvaluationType = 'controle' | 'devoir' | 'activite_pratique' | 'oral';

// ── 5 DIMENSIONS PÉDAGOGIQUES D'OBSERVATION (MEN / APC) ──

// A. Participation
export type ParticipationDimension = 'tres_active' | 'active' | 'moyenne' | 'faible' | 'aucune';

// B. Compréhension
export type ComprehensionDimension =
  | 'maitrise'
  | 'comprend_avec_aide'
  | 'comprehension_partielle'
  | 'difficulte_importante'
  | 'non_observee';

// C. Comportement en situation d'apprentissage (multi-sélectionnable)
export type ComportementApprentissage =
  | 'concentre'
  | 'distrait'
  | 'agite'
  | 'en_retrait'
  | 'interrompt'
  | 'coopere'
  | 'aide_camarades';

// D. Difficulté rencontrée
export type DifficultesRencontrees =
  | 'notion'
  | 'consigne'
  | 'methode'
  | 'lecture'
  | 'manipulation'
  | 'organisation'
  | 'participation'
  | 'aucune';

// E. Action pédagogique immédiate réalisée par l'enseignant
export type ActionPedagogique =
  | 'reformulation'
  | 'exemple_supplementaire'
  | 'aide_individuelle'
  | 'travail_binome'
  | 'etayage'
  | 'exercice_simplifie'
  | 'defi_supplementaire'
  | 'aucune';

// Cause pédagogique possible (réflexion didactique de l'enseignant)
export type CausePedagogique =
  | 'prerequis_non_maitrise'
  | 'consigne_peu_claire'
  | 'activite_trop_difficile'
  | 'temps_insuffisant'
  | 'manque_pratique'
  | 'difficulte_individuelle'
  | 'a_determiner';

// Actions concrètes à mener lors de la prochaine séance
export type ProchaineSeanceAction =
  | 'reprendre_notion'
  | 'exemple_supplementaire'
  | 'activite_remediation'
  | 'former_binomes'
  | 'consolidation'
  | 'continuer_normalement';

// Rétrocompatibilité
export type MentalState =
  | 'concentre'
  | 'calme'
  | 'agite'
  | 'fatigue'
  | 'anxieux'
  | 'isole'
  | 'perturbateur';

export type ParticipationLevel = 'active' | 'moyenne' | 'faible' | 'passive';

export type HelpUrgency = 'faible' | 'moyen' | 'urgent';

export type HelpStatus = 'en_cours' | 'resolu' | 'a_renforcer';

export interface AcademicSeason {
  id: string;
  user_id: string;
  code: string; // e.g. "2026/2027"
  label: string; // e.g. "Année Scolaire 2026/2027"
  is_current: boolean | number;
  start_date?: string;
  end_date?: string;
  created_at?: string;
}

export interface CollegeClass {
  id: string;
  user_id: string;
  season_id: string;
  niveau: NiveauCollege;
  name: string; // e.g. "Classe 3"
  matiere: string;
  room?: string;
  description?: string;
  created_at?: string;
  student_count?: number;
  season_code?: string;
}

export interface Student {
  id: string;
  user_id: string;
  cne_massar: string;
  first_name: string;
  last_name: string;
  gender: 'M' | 'F';
  birth_date?: string;
  avatar_url?: string;
  tarl_status: TarlStatus;
  special_needs?: string;
  guardian_name?: string;
  guardian_phone?: string;
  created_at?: string;
  // When joined with enrollment:
  class_id?: string;
  class_name?: string;
  niveau?: NiveauCollege;
  student_number?: number;
  average_grade?: number;
  absence_count?: number;
  last_mental_state?: MentalState;
  last_comprehension?: ComprehensionDimension;
  needs_help_count?: number;
}

export interface StudentAttendance {
  id: string;
  class_id: string;
  student_id: string;
  date: string; // YYYY-MM-DD
  session_title?: string;
  type: AttendanceType;
  is_justified: boolean | number;
  notes?: string;
  created_at?: string;
  student_name?: string;
}

export interface StudentGrade {
  id: string;
  class_id: string;
  student_id: string;
  title: string;
  eval_type: EvaluationType;
  score: number;
  max_score: number;
  coeff: number;
  date: string;
  comment?: string;
  created_at?: string;
  student_name?: string;
}

export interface StudentObservation {
  id: string;
  class_id: string;
  student_id?: string;
  date: string;
  observation_type?: 'individuelle' | 'collective';
  // 5 Dimensions Pédagogiques
  participation?: ParticipationDimension;
  comprehension?: ComprehensionDimension;
  comportements?: ComportementApprentissage[];
  difficulte?: DifficultesRencontrees;
  action_pedagogique?: ActionPedagogique;
  // Contexte d'apprentissage
  notion?: string;
  matiere?: string;
  niveau?: string;
  unite?: string;
  lecon?: string;
  // Réflexion didactique
  cause_possible?: CausePedagogique;
  prochaine_seance?: ProchaineSeanceAction[];
  observation_text?: string;
  // Rétrocompatibilité
  mental_state?: MentalState;
  participation_level?: ParticipationLevel;
  needs_help?: boolean | number;
  help_topic?: string;
  help_urgency?: HelpUrgency;
  help_status?: HelpStatus;
  created_at?: string;
  student_name?: string;
}

// Bilan Rapide de Séance (30-60 secondes post-cours)
export interface SessionFeedback {
  id: string;
  class_id: string;
  date: string;
  matiere: string;
  niveau: string;
  unite: string;
  lecon: string;
  objectif_atteint: 'oui' | 'partiellement' | 'non';
  participation_globale: 'bonne' | 'moyenne' | 'faible';
  comprehension_globale: 'bonne' | 'heterogene' | 'faible';
  difficulte_principale: string;
  eleves_a_revoir: string[];
  a_reprendre: string;
  note_libre: string;
  created_at?: string;
  class_name?: string;
}

export interface StudentAiInsight {
  id: string;
  student_id?: string;
  class_id?: string;
  analysis_type: 'individual' | 'class_wide';
  summary: string;
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
  raw_ai_text?: string;
  created_at?: string;
}

export interface StudentPedagogicalPatterns {
  participationScore: number; // 0-100
  comprehensionScore: number; // 0-100
  frequentDifficulties: { label: string; count: number }[];
  effectiveActions: { label: string; count: number }[];
  lessEffectiveActions: { label: string; count: number }[];
  positiveBehaviors: string[];
  notionsObserved: { notion: string; comprehension: ComprehensionDimension; count: number }[];
}

export interface StudentQuizAnswerItem {
  question_numero: number;
  enonce: string;
  bareme: number;
  question_type: string;
  choice_key: string;
  choice_text: string;
  is_correct: boolean;
  note: number;
  expected_answer?: string;
}

export interface StudentQuizResult {
  exam_id: string;
  exam_titre: string;
  exam_date: string;
  total_score: number;
  total_points: number;
  answers: StudentQuizAnswerItem[];
}

export interface StudentProfile360 {
  student: Student;
  class_info?: CollegeClass;
  season?: AcademicSeason;
  attendance: StudentAttendance[];
  grades: StudentGrade[];
  observations: StudentObservation[];
  insights: StudentAiInsight[];
  pedagogicalPatterns?: StudentPedagogicalPatterns;
  quizResults?: StudentQuizResult[];
  stats: {
    averageGrade: number;
    totalEvaluations: number;
    totalAbsences: number;
    totalRetards: number;
    unjustifiedAbsences: number;
    predominantMood?: MentalState;
    predominantComprehension?: ComprehensionDimension;
    activeHelpRequests: number;
  };
}

// ── CONFIGURATIONS & LABELS FRANÇAIS POUR L'INTERFACE ──

export const PARTICIPATION_CONFIG: Record<
  ParticipationDimension,
  { label: string; badgeClass: string; color: string }
> = {
  tres_active: {
    label: 'Très active (moteur du groupe)',
    badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    color: '#059669',
  },
  active: {
    label: 'Active (participe spontanément)',
    badgeClass: 'bg-teal-100 text-teal-800 border-teal-300',
    color: '#0D9488',
  },
  moyenne: {
    label: 'Moyenne (répond aux sollicitations)',
    badgeClass: 'bg-blue-100 text-blue-800 border-blue-300',
    color: '#3B82F6',
  },
  faible: {
    label: 'Faible (hésitant, distrait)',
    badgeClass: 'bg-amber-100 text-amber-800 border-amber-300',
    color: '#D97706',
  },
  aucune: {
    label: 'Aucune (en retrait complet)',
    badgeClass: 'bg-rose-100 text-rose-800 border-rose-300',
    color: '#E11D48',
  },
};

export const COMPREHENSION_CONFIG: Record<
  ComprehensionDimension,
  { label: string; emoji: string; badgeClass: string; color: string }
> = {
  maitrise: {
    label: 'Maîtrise validée',
    emoji: '🟢',
    badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-300 font-bold',
    color: '#10B981',
  },
  comprend_avec_aide: {
    label: 'Comprend avec aide / étayage',
    emoji: '🟡',
    badgeClass: 'bg-amber-50 text-amber-800 border-amber-300',
    color: '#F59E0B',
  },
  comprehension_partielle: {
    label: 'Compréhension partielle / fragile',
    emoji: '🟠',
    badgeClass: 'bg-orange-50 text-orange-800 border-orange-300',
    color: '#F97316',
  },
  difficulte_importante: {
    label: 'Difficulté importante / blocage',
    emoji: '🔴',
    badgeClass: 'bg-rose-50 text-rose-800 border-rose-300 font-bold',
    color: '#EF4444',
  },
  non_observee: {
    label: 'Non observée lors de cette séance',
    emoji: '⚪',
    badgeClass: 'bg-slate-100 text-slate-700 border-slate-300',
    color: '#94A3B8',
  },
};

export const COMPORTEMENT_CONFIG: Record<
  ComportementApprentissage,
  { label: string; badgeClass: string }
> = {
  concentre: {
    label: 'Concentré & attentif',
    badgeClass: 'bg-teal-50 text-teal-800 border-teal-200',
  },
  distrait: {
    label: 'Distrait / Dispersion',
    badgeClass: 'bg-amber-50 text-amber-800 border-amber-200',
  },
  agite: {
    label: 'Agité en situation d’apprentissage',
    badgeClass: 'bg-orange-50 text-orange-800 border-orange-200',
  },
  en_retrait: {
    label: 'En retrait / Silencieux',
    badgeClass: 'bg-slate-100 text-slate-700 border-slate-200',
  },
  interrompt: {
    label: 'Interrompt / Précipitation',
    badgeClass: 'bg-rose-50 text-rose-800 border-rose-200',
  },
  coopere: {
    label: 'Coopère activement en groupe',
    badgeClass: 'bg-indigo-50 text-indigo-800 border-indigo-200',
  },
  aide_camarades: {
    label: 'Aide et soutient ses pairs (tuteur)',
    badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  },
};

export const DIFFICULTE_CONFIG: Record<
  DifficultesRencontrees,
  { label: string; badgeClass: string }
> = {
  notion: {
    label: 'Notion théorique / Abstraction',
    badgeClass: 'bg-purple-100 text-purple-800 border-purple-300',
  },
  consigne: {
    label: 'Compréhension de la consigne',
    badgeClass: 'bg-amber-100 text-amber-800 border-amber-300',
  },
  methode: {
    label: 'Méthode / Démarche scientifique',
    badgeClass: 'bg-blue-100 text-blue-800 border-blue-300',
  },
  lecture: {
    label: 'Lecture / Langue / Vocabulaire',
    badgeClass: 'bg-orange-100 text-orange-800 border-orange-300',
  },
  manipulation: {
    label: 'Manipulation pratique / Outil',
    badgeClass: 'bg-cyan-100 text-cyan-800 border-cyan-300',
  },
  organisation: {
    label: 'Organisation / Gestion du temps',
    badgeClass: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  },
  participation: {
    label: 'Inhibition / Manque d’engagement',
    badgeClass: 'bg-rose-100 text-rose-800 border-rose-300',
  },
  aucune: {
    label: 'Aucune difficulté majeure',
    badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-300',
  },
};

export const ACTION_PEDAGOGIQUE_CONFIG: Record<
  ActionPedagogique,
  { label: string; badgeClass: string }
> = {
  reformulation: {
    label: 'Reformulation de la consigne',
    badgeClass: 'bg-blue-50 text-blue-800 border-blue-200',
  },
  exemple_supplementaire: {
    label: 'Exemple concret supplémentaire',
    badgeClass: 'bg-teal-50 text-teal-800 border-teal-200',
  },
  aide_individuelle: {
    label: 'Aide individuelle au bureau',
    badgeClass: 'bg-amber-50 text-amber-800 border-amber-200',
  },
  travail_binome: {
    label: 'Mise au travail en binôme (tutorat)',
    badgeClass: 'bg-indigo-50 text-indigo-800 border-indigo-200',
  },
  etayage: {
    label: 'Étayage guidé pas-à-pas',
    badgeClass: 'bg-purple-50 text-purple-800 border-purple-200',
  },
  exercice_simplifie: {
    label: 'Exercice d’application simplifié',
    badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  },
  defi_supplementaire: {
    label: 'Défi / Situation-problème avancée',
    badgeClass: 'bg-amber-50 text-amber-800 border-amber-200 font-semibold',
  },
  aucune: {
    label: 'Aucune action requise',
    badgeClass: 'bg-slate-100 text-slate-700 border-slate-200',
  },
};

export const CAUSE_PEDAGOGIQUE_CONFIG: Record<
  CausePedagogique,
  { label: string }
> = {
  prerequis_non_maitrise: { label: 'Notion prérequis non maîtrisée' },
  consigne_peu_claire: { label: 'Consigne perçue comme ambiguë ou complexe' },
  activite_trop_difficile: { label: 'Activité trop dense pour le temps imparti' },
  temps_insuffisant: { label: 'Temps d’assimilation insuffisant' },
  manque_pratique: { label: 'Manque d’entraînement pratique préalable' },
  difficulte_individuelle: { label: 'Difficulté individuelle ponctuelle' },
  a_determiner: { label: 'Cause à approfondir lors de la prochaine séance' },
};

export const PROCHAINE_SEANCE_CONFIG: Record<
  ProchaineSeanceAction,
  { label: string; badgeClass: string }
> = {
  reprendre_notion: {
    label: 'Reprendre la notion dès le lancement',
    badgeClass: 'bg-rose-100 text-rose-800 border-rose-300 font-semibold',
  },
  exemple_supplementaire: {
    label: 'Fournir un exemple concret visuel',
    badgeClass: 'bg-teal-100 text-teal-800 border-teal-300',
  },
  activite_remediation: {
    label: 'Prévoir une fiche de remédiation ciblée (TaRL)',
    badgeClass: 'bg-amber-100 text-amber-800 border-amber-300 font-bold',
  },
  former_binomes: {
    label: 'Former des binômes hétérogènes (tutorat par les pairs)',
    badgeClass: 'bg-indigo-100 text-indigo-800 border-indigo-300',
  },
  consolidation: {
    label: 'Activités d’application et consolidation guidée',
    badgeClass: 'bg-blue-100 text-blue-800 border-blue-300',
  },
  continuer_normalement: {
    label: 'Poursuivre la progression normale du programme',
    badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-300',
  },
};

export const TARL_STATUS_CONFIG: Record<
  TarlStatus,
  { label: string; badgeClass: string; description: string }
> = {
  standard: {
    label: 'Niveau Standard',
    badgeClass: 'bg-slate-100 text-slate-700 border-slate-300',
    description: 'Acquis conformes aux attendus du cycle.',
  },
  soutien_prioritaire: {
    label: 'Soutien Prioritaire (TaRL A)',
    badgeClass: 'bg-rose-100 text-rose-800 border-rose-300 font-bold',
    description: 'Difficultés fondamentales nécessitant une remédiation d’urgence.',
  },
  consolidation: {
    label: 'Consolidation (TaRL B)',
    badgeClass: 'bg-amber-100 text-amber-800 border-amber-300',
    description: 'Notions fragiles à renforcer par des exercices d’application guidés.',
  },
  depassement: {
    label: 'Défi / Avancé (TaRL C)',
    badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    description: 'Excellente maîtrise, prêt pour des situations-problèmes ouvertes.',
  },
};

export const MENTAL_STATE_CONFIG: Record<
  MentalState,
  { label: string; emoji: string; color: string; badgeClass: string; description: string }
> = {
  concentre: {
    label: 'Concentré & Motivé',
    emoji: '🎯',
    color: '#0D9488',
    badgeClass: 'bg-teal-50 text-teal-800 border-teal-200',
    description: "Élève impliqué, attentif et productif dans l'activité.",
  },
  calme: {
    label: 'Calme & Réceptif',
    emoji: '😌',
    color: '#3B82F6',
    badgeClass: 'bg-blue-50 text-blue-800 border-blue-200',
    description: 'Comportement serein, écoute normale et respect des consignes.',
  },
  agite: {
    label: 'Agité & Distrait',
    emoji: '⚡',
    color: '#F59E0B',
    badgeClass: 'bg-amber-50 text-amber-800 border-amber-200',
    description: 'Difficulté à maintenir son attention, bavardages ou dispersion.',
  },
  fatigue: {
    label: 'Fatigué & Somnolent',
    emoji: '🥱',
    color: '#64748B',
    badgeClass: 'bg-slate-100 text-slate-700 border-slate-200',
    description: 'Baisse de vigilance ou manque d’énergie visible.',
  },
  anxieux: {
    label: 'Hésitant & Préoccupé',
    emoji: '😰',
    color: '#8B5CF6',
    badgeClass: 'bg-purple-50 text-purple-800 border-purple-200',
    description: 'Appréhension face à la consigne ou au passage à l’écrit.',
  },
  isole: {
    label: 'En retrait / Silencieux',
    emoji: '🤐',
    color: '#94A3B8',
    badgeClass: 'bg-gray-100 text-gray-700 border-gray-200',
    description: 'Ne participe pas spontanément, passivité observée.',
  },
  perturbateur: {
    label: 'Opposition / Conflit',
    emoji: '⚠️',
    color: '#DC2626',
    badgeClass: 'bg-rose-50 text-rose-800 border-rose-200',
    description: 'Contestation des règles d’apprentissage ou dispersion du groupe.',
  },
};
