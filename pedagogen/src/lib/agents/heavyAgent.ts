import { callHuggingFace, pedagogicalTools, buildSystemPrompt } from './agentTools';
import type { CourseMetadata } from '@/types/generation';

export async function runHeavyAgent(
  metadata: CourseMetadata,
  useReferences: boolean,
  referenceContents?: string
) {
  const systemPrompt = buildSystemPrompt(metadata, metadata.langue, useReferences, referenceContents);

  const result = await callHuggingFace(
    systemPrompt,
    `Generate the complete pedagogical package for this lesson. Use all available tools sequentially to produce:
1. Fiche pédagogique
2. Planification
3. Cours complet
4. Plan de gestion de classe
5. Résumé élève
6. Outline PPTX

Start with the fiche pédagogique.`,
    pedagogicalTools,
    16000
  );

  return result;
}
