export const TOOL_SCHEMAS: Record<string, string> = {
  fiche_pedagogique: `output_schema:
  titre_seance: string
  objectifs: string[]
  competences_visees: string[]
  prerequis: string[]
  deroulement:
    introduction: string
    activite_principale: string
    synthese: string
  evaluation_type: "formative" | "sommative" | "diagnostique"
  materiel: string[]
`,
  planification: `output_schema:
  semestre: 1 | 2
  sequence:
    - seance: number
      titre: string
      duree: string
      competences: string[]
`,
  cours_complet: `output_schema:
  script_enseignant: string
  activites_eleves: string[]
  plan_tableau: string
  annotations: string
`,
  plan_gestion_classe: `output_schema:
  strategie_entree: string
  organisation_espace: string
  gestion_temps: string
  differenciation: string
  remédiation: string
`,
  evaluation: `output_schema:
  titre: string
  consigne: string
  questions:
    - numero: number
      type: "qcm" | "vrai_faux" | "ouvert" | "appariement" | "exercice"
      enonce: string
      points: number
      options?: string[]
      correction?: string
  bareme:
    total_points: number
    criteres: string[]
  grille_evaluation: string[]
`,
  resume_eleve: `output_schema:
  resume: string
  points_cles: string[]
  exercices: string[]
`,
  presentation_pptx: `output_schema:
  slides:
    - title: string
      bullets: string[]
      notes: string
`,
  images_illustratives: `output: markdown
  prompt_format:
    - description: string
      prompt: string
      purpose: string
  count: 3-5
`,
};
