import { z } from "zod/v4";

export const generationModeSchema = z.enum(["heavy", "medium", "light"]);
export const documentTypeSchema = z.enum([
  "fiche_pedagogique",
  "planification",
  "plan_gestion_classe",
  "evaluation",
  "cours_complet",
  "resume_eleve",
  "presentation_pptx",
  "images_illustratives",
]);
export const outputFormatSchema = z.enum(["docx", "pptx", "pdf", "md", "zip", "png", "html"]);
export const langueSchema = z.enum(["fr", "ar", "fr+ar"]);
export const niveauSchema = z.enum(["1AC", "2AC", "3AC"]);
export const semestreSchema = z.union([z.literal(1), z.literal(2)]);

export const courseMetadataSchema = z.object({
  niveau: niveauSchema,
  matiere: z.string().min(1),
  unite: z.string().min(1),
  lecon: z.string().min(1),
  duree: z.number().min(5).max(120),
  competences: z.array(z.string()),
  langue: langueSchema,
  semestre: semestreSchema,
  profilEleves: z.string().optional(),
  methodePedagogique: z.string().optional(),
  ton: z.string().optional(),
  niveauxBloom: z.array(z.string()).optional(),
  differentiationLevel: z.enum(['soutien', 'standard', 'defi']).optional(),
});

export const generationRequestSchema = z.object({
  mode: generationModeSchema,
  metadata: courseMetadataSchema,
  documentsToGenerate: z.array(documentTypeSchema).optional(),
  outputFormat: z.union([outputFormatSchema, z.array(outputFormatSchema)]),
  useReferences: z.boolean(),
  includePrompt: z.string().optional(),
  excludePrompt: z.string().optional(),
  debugMode: z.boolean().optional(),
});

export type GenerationModeInput = z.infer<typeof generationModeSchema>;
export type DocumentTypeInput = z.infer<typeof documentTypeSchema>;
export type OutputFormatInput = z.infer<typeof outputFormatSchema>;
export type CourseMetadataInput = z.infer<typeof courseMetadataSchema>;
export type GenerationRequestInput = z.infer<typeof generationRequestSchema>;

export const DOCUMENT_TYPE_LABELS: Record<string, string> = {
  fiche_pedagogique: "Fiche Pédagogique",
  planification: "Planification",
  plan_gestion_classe: "Plan de Gestion de Classe",
  evaluation: "Évaluation",
  cours_complet: "Cours Complet",
  resume_eleve: "Résumé Élève",
  presentation_pptx: "Présentation PPTX",
  images_illustratives: "Images Illustratives",
};

export const MODE_DESCRIPTIONS: Record<string, {
  title: string;
  description: string;
  estimatedTime: string;
  tokenRange: string;
  color: string;
}> = {
  heavy: {
    title: "Mode Complet",
    description: "Génération intégrale : fiche, planification, cours, gestion de classe, résumé, présentation et images.",
    estimatedTime: "3-5 min",
    tokenRange: "15,000 – 30,000",
    color: "#DC2626",
  },
  medium: {
    title: "Mode Sélectif",
    description: "Choisissez les documents spécifiques à générer selon vos besoins.",
    estimatedTime: "1-3 min",
    tokenRange: "3,000 – 12,000",
    color: "#D97706",
  },
  light: {
    title: "Mode Rapide",
    description: "Un résumé Markdown structuré de votre leçon en quelques secondes.",
    estimatedTime: "< 30 sec",
    tokenRange: "500 – 2,000",
    color: "#16A34A",
  },
};

export const BEST_FORMATS: Record<string, string> = {
  fiche_pedagogique: "docx",
  planification: "pdf",
  plan_gestion_classe: "pdf",
  evaluation: "docx",
  cours_complet: "pdf",
  resume_eleve: "pdf",
  presentation_pptx: "pptx",
  images_illustratives: "md",
};
