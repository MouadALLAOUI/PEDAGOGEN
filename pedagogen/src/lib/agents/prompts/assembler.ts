import type { CourseMetadata } from '@/types/generation';
import { getCoreInstruction, getMetadataBlock, getOutputRule, getTeacherInstructionBlock } from './core';
import { TOOL_SCHEMAS } from './schemas';

export interface AssemblyInput {
  metadata: CourseMetadata;
  documentsToGenerate?: string[];
  includePrompt?: string;
  excludePrompt?: string;
  customGlobal?: string;
  customContext?: string;
  referenceContents?: string;
}

export function assembleSystemPrompt(input: AssemblyInput): string {
  const { metadata, documentsToGenerate, includePrompt, excludePrompt, customGlobal, customContext, referenceContents } = input;
  const blocks: string[] = [];

  blocks.push(getCoreInstruction());
  blocks.push('---');
  blocks.push(getMetadataBlock(
    metadata.lecon,
    metadata.langue as 'fr' | 'ar' | 'fr+ar',
    metadata.differentiationLevel,
    metadata.matiere, metadata.niveau,
    metadata.semestre, metadata.unite, metadata.duree,
    metadata.competences, metadata.methodePedagogique,
    metadata.ton, metadata.niveauxBloom,
    metadata.profilEleves,
  ));
  blocks.push('---');
  blocks.push(getOutputRule());

  const teacherBlock = getTeacherInstructionBlock(includePrompt, excludePrompt, customGlobal, customContext);
  if (teacherBlock) {
    blocks.push('---');
    blocks.push(teacherBlock);
  }

  if (referenceContents?.trim()) {
    blocks.push('---');
    blocks.push(`refs:\n${referenceContents}`);
  }

  if (documentsToGenerate?.length) {
    blocks.push('---');
    blocks.push('docs_to_generate:');
    for (const docType of documentsToGenerate) {
      const schema = TOOL_SCHEMAS[docType];
      if (schema) {
        blocks.push(`  ${docType}:`);
        for (const line of schema.trim().split('\n')) {
          blocks.push(`    ${line}`);
        }
      }
    }
  }

  return blocks.join('\n');
}

export function assembleUserMessage(
  docType: string,
  metadata: CourseMetadata,
  prevContext?: string,
): string {
  const lines: string[] = [];
  if (prevContext) {
    lines.push(`context: ${prevContext}`);
    lines.push('---');
  }
  lines.push(`generate: ${docType}`);
  lines.push(`subject: ${metadata.matiere} | lesson: ${metadata.lecon}`);
  return lines.join('\n');
}
