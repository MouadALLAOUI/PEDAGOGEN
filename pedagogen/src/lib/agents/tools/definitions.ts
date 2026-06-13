import type { CourseMetadataInput } from "@/lib/validators/generation";
import { getCoreInstruction } from "@/lib/agents/prompts";
import { TOOL_SCHEMAS } from "@/lib/agents/prompts/schemas";

export interface ToolDefinition {
  name: string;
  description: string;
  systemPrompt: string;
  outputFormat: string;
}

const baseContext = (meta: CourseMetadataInput) =>
  `level: ${meta.niveau} | subject: ${meta.matiere}
unit: ${meta.unite} | lesson: ${meta.lecon} | duration: ${meta.duree}min
lang: ${meta.langue} | sem: ${meta.semestre}
skills: ${meta.competences.join(', ')}${meta.profilEleves ? `\nprofile: ${meta.profilEleves}` : ''}${meta.methodePedagogique ? `\nmethod: ${meta.methodePedagogique}` : ''}${meta.niveauxBloom?.length ? `\nbloom: ${meta.niveauxBloom.join(', ')}` : ''}`;

export const TOOLS: Record<string, (meta: CourseMetadataInput) => ToolDefinition> = {
  fiche_pedagogique: (meta) => ({
    name: "generate_fiche_pedagogique",
    description: "fiche_pedagogique",
    systemPrompt: `${getCoreInstruction()}
---
${baseContext(meta)}
---
${TOOL_SCHEMAS.fiche_pedagogique}`,
    outputFormat: "json",
  }),

  planification: (meta) => ({
    name: "generate_planification",
    description: "planification",
    systemPrompt: `${getCoreInstruction()}
---
${baseContext(meta)}
---
${TOOL_SCHEMAS.planification}`,
    outputFormat: "json",
  }),

  cours_complet: (meta) => ({
    name: "generate_cours_complet",
    description: "cours_complet",
    systemPrompt: `${getCoreInstruction()}
---
${baseContext(meta)}
---
${TOOL_SCHEMAS.cours_complet}`,
    outputFormat: "json",
  }),

  plan_gestion_classe: (meta) => ({
    name: "generate_gestion_classe",
    description: "plan_gestion_classe",
    systemPrompt: `${getCoreInstruction()}
---
${baseContext(meta)}
---
${TOOL_SCHEMAS.plan_gestion_classe}`,
    outputFormat: "json",
  }),

  evaluation: (meta) => ({
    name: "generate_evaluation",
    description: "evaluation",
    systemPrompt: `${getCoreInstruction()}
---
${baseContext(meta)}
---
${TOOL_SCHEMAS.evaluation}`,
    outputFormat: "json",
  }),

  resume_eleve: (meta) => ({
    name: "generate_resume_eleve",
    description: "resume_eleve",
    systemPrompt: `${getCoreInstruction()}
---
${baseContext(meta)}
---
${TOOL_SCHEMAS.resume_eleve}`,
    outputFormat: "md",
  }),

  presentation_pptx: (meta) => ({
    name: "generate_pptx_outline",
    description: "presentation_pptx",
    systemPrompt: `${getCoreInstruction()}
---
${baseContext(meta)}
---
${TOOL_SCHEMAS.presentation_pptx}`,
    outputFormat: "json",
  }),

  images_illustratives: (meta) => ({
    name: "generate_images",
    description: "images_illustratives",
    systemPrompt: `${getCoreInstruction()}
---
${baseContext(meta)}
---
${TOOL_SCHEMAS.images_illustratives}`,
    outputFormat: "md",
  }),
};
