import { callHuggingFace, pedagogicalTools, buildSystemPrompt } from './agentTools';
import type { CourseMetadata } from '@/types/generation';

export async function runHeavyAgent(
  metadata: CourseMetadata,
  useReferences: boolean,
  referenceContents?: string,
  includePrompt?: string,
  excludePrompt?: string,
  useLocalModel?: boolean,
  localModelName?: string,
  localModelUrl?: string,
  localApiType?: 'openai' | 'custom',
  signal?: AbortSignal,
  customPrompts?: Record<string, string>,
  debugMode?: boolean,
  apiKey?: string
) {
  const systemPrompt = buildSystemPrompt(metadata, metadata.langue, useReferences, referenceContents, includePrompt, excludePrompt, customPrompts);

  const result = await callHuggingFace(
    systemPrompt,
    `Générez le dossier pédagogique complet pour cette leçon. Utilisez séquentiellement les outils appropriés pour produire la fiche pédagogique, la planification, le cours complet, le plan de gestion de classe, le résumé élève et la présentation PPTX. Commencez par la fiche pédagogique.`,
    pedagogicalTools,
    16000,
    undefined,
    { useLocalModel, localModelName, localModelUrl, localApiType, signal, debugMode, apiKey }
  );

  return result;
}
