import type { CourseMetadata } from '@/types/generation';
import type { Skill } from '@/types/skills';
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
  activeSkills?: Skill[];
}

export function assembleSystemPrompt(input: AssemblyInput): string {
  const { metadata, documentsToGenerate, includePrompt, excludePrompt, customGlobal, customContext, referenceContents, activeSkills } = input;
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

  // Injection of Active Skills (Directives Spécialisées & Pédagogiques)
  if (activeSkills && activeSkills.length > 0) {
    const skillLines: string[] = ['<active_skills description="Directives et compétences modulaires prioritaires définies pour cette génération">'];
    for (const skill of activeSkills) {
      skillLines.push(`### SKILL: ${skill.name} [Catégorie: ${skill.category.toUpperCase()}] (Portée: ${skill.scope_type.toUpperCase()}${skill.scope_lesson ? ` - Leçon: ${skill.scope_lesson}` : skill.scope_subject ? ` - Matière: ${skill.scope_subject}` : ''})`);
      if (skill.description) {
        skillLines.push(`> Description: ${skill.description}`);
      }
      skillLines.push(skill.prompt_instruction.trim());
      skillLines.push('');
    }
    skillLines.push('</active_skills>');
    blocks.push('---');
    blocks.push(skillLines.join('\n'));
  }

  const teacherBlock = getTeacherInstructionBlock(includePrompt, excludePrompt, customGlobal, customContext);
  if (teacherBlock) {
    blocks.push('---');
    blocks.push(teacherBlock);
  }

  if (referenceContents?.trim()) {
    blocks.push('---');
    blocks.push(`<reference_documents data_only="true">\n${referenceContents.trim()}\n</reference_documents>`);
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
