import { callHuggingFace, pedagogicalTools, buildSystemPrompt } from './agentTools';
import type { CourseMetadata, DocumentType } from '@/types/generation';

const DOC_TOOL_MAP: Record<DocumentType, string> = {
  fiche_pedagogique: 'generate_fiche_pedagogique',
  planification: 'generate_planification',
  plan_gestion_classe: 'generate_gestion_classe',
  evaluation: 'generate_fiche_pedagogique',
  cours_complet: 'generate_cours_complet',
  resume_eleve: 'generate_resume_eleve',
  presentation_pptx: 'generate_pptx_outline',
  images_illustratives: 'generate_fiche_pedagogique',
};

export async function runMediumAgent(
  metadata: CourseMetadata,
  documentsToGenerate: DocumentType[],
  useReferences: boolean,
  referenceContents?: string
) {
  const systemPrompt = buildSystemPrompt(metadata, metadata.langue, useReferences, referenceContents);

  const toolNames = documentsToGenerate
    .map((doc) => DOC_TOOL_MAP[doc])
    .filter((name) => name && pedagogicalTools.some((t) => t.function.name === name));

  const selectedTools = pedagogicalTools.filter((t) => toolNames.includes(t.function.name));

  const result = await callHuggingFace(
    systemPrompt,
    `Generate the following documents for this lesson: ${documentsToGenerate.join(', ')}. Use the appropriate tools for each document.`,
    selectedTools.length > 0 ? selectedTools : pedagogicalTools,
    12000
  );

  return result;
}
