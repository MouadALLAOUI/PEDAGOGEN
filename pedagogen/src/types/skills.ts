import { DocumentType, OutputFormat } from './generation';

export type SkillCategory =
  | 'format'              // Règles spécifiques aux formats (DOCX, HTML, PPTX, etc.)
  | 'pedagogy'            // Démarche pédagogique, APC, Bloom, inclusion
  | 'conflict_resolution' // Gestion des lacunes de prérequis, remédiation
  | 'timing'              // Gestion du minutage strict (50-55 min)
  | 'custom';             // Directives personnalisées de l'enseignant

export type SkillScopeType =
  | 'global'   // S'applique à toute génération
  | 'subject'  // S'applique à une matière spécifique
  | 'unit'     // S'applique à une unité didactique
  | 'lesson';  // S'applique spécifiquement à une leçon

export interface Skill {
  id: string;
  user_id: string;
  name: string;
  description: string;
  category: SkillCategory;
  prompt_instruction: string;
  scope_type: SkillScopeType;
  scope_subject: string;
  scope_level: string; // '1AC' | '2AC' | '3AC' ou '' (tous)
  scope_unit: string;
  scope_lesson: string;
  target_doc_types: DocumentType[];
  target_formats: OutputFormat[];
  is_enabled: boolean;
  is_builtin: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateSkillInput {
  name: string;
  description?: string;
  category: SkillCategory;
  prompt_instruction: string;
  scope_type: SkillScopeType;
  scope_subject?: string;
  scope_level?: string;
  scope_unit?: string;
  scope_lesson?: string;
  target_doc_types?: DocumentType[];
  target_formats?: OutputFormat[];
  is_enabled?: boolean;
}

export interface UpdateSkillInput extends Partial<CreateSkillInput> {
  id: string;
}
