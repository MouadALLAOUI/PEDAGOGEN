import { callHuggingFace, buildSystemPrompt } from './agentTools';
import type { CourseMetadata } from '@/types/generation';

export async function runLightAgent(
  metadata: CourseMetadata,
  useReferences: boolean,
  referenceContents?: string
) {
  const systemPrompt = buildSystemPrompt(metadata, metadata.langue, useReferences, referenceContents);

  const result = await callHuggingFace(
    systemPrompt,
    `Generate a structured Markdown lesson plan for this course. Include:
1. Objectifs pédagogiques
2. Prérequis
3. Déroulement de la séance (Introduction, Activité principale, Synthèse)
4. Évaluation rapide
5. Notes pour l'enseignant

Use clear Markdown formatting with headers, bullet points, and bold text. Return ONLY the Markdown content, no JSON wrapper.`,
    undefined,
    2000
  );

  // Extract markdown from text content
  const textBlock = result.content.find(
    (b) => typeof b === 'object' && b !== null && 'type' in b && (b as { type: string }).type === 'text'
  ) as { type: string; text: string } | undefined;
  const markdown = textBlock?.text || '';

  return {
    markdown,
    usage: result.usage,
  };
}
