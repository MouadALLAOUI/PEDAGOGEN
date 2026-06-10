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
  referenceContents?: string,
  includePrompt?: string,
  excludePrompt?: string,
  useLocalModel?: boolean,
  localModelName?: string,
  localModelUrl?: string,
  localApiType?: 'openai' | 'custom',
  signal?: AbortSignal,
  customPrompts?: Record<string, string>,
  debugMode?: boolean
) {
  let systemPrompt = buildSystemPrompt(metadata, metadata.langue, useReferences, referenceContents, includePrompt, excludePrompt);

  if (customPrompts && Object.keys(customPrompts).length > 0) {
    let customPromptInstructions = "\n\n[CUSTOM DOCUMENT GUIDELINES FROM TEACHER]";
    for (const [docType, promptText] of Object.entries(customPrompts)) {
      if (promptText && promptText.trim()) {
        customPromptInstructions += `\n- For document "${docType}", follow these specific instructions: "${promptText.trim()}"`;
      }
    }
    systemPrompt += customPromptInstructions;
  }

  const toolNames = documentsToGenerate
    .map((doc) => DOC_TOOL_MAP[doc])
    .filter((name) => name && pedagogicalTools.some((t) => t.function.name === name));

  const selectedTools = pedagogicalTools.filter((t) => toolNames.includes(t.function.name));

  const modelToUse = documentsToGenerate.includes('cours_complet') ? 'deepseek-ai/DeepSeek-R1' : 'openai/gpt-oss-120b:fastest';
  const result = await callHuggingFace(
    systemPrompt,
    `Generate the following documents for this lesson: ${documentsToGenerate.join(', ')}. Use the appropriate tools for each document.`,
    selectedTools.length > 0 ? selectedTools : pedagogicalTools,
    12000,
    modelToUse,
    { useLocalModel, localModelName, localModelUrl, localApiType, signal, debugMode }
  );

  return result;
}
