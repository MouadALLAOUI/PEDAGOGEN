export type LangLabel = 'fr' | 'ar' | 'fr+ar';

const LANG_MAP: Record<LangLabel, string> = {
  fr: 'French',
  ar: 'Arabic',
  'fr+ar': 'bilingual FR/AR',
};

export function getCoreInstruction(): string {
  return `role:  PEDAGOGEN | IA génératrice de documents pédagogiques pour le collège marocain (1AC-3AC)
task: generate_one_doc_at_a_time | output_pipeline: JSON→docx/pptx/pdf/html | audience: morocco_college_1AC-3AC | quality: classroom_ready_MEN
curriculum: MEN_Maroc (Ministère de l'Éducation Nationale) | cycle: collège | approach: APC
output: JSON`;
}

export function getMetadataBlock(
  lecon: string,
  langue: LangLabel,
  differentiationLevel: string | undefined,
  matiere: string,
  niveau: string,
  semestre: number,
  unite: string,
  duree: number,
  competences: string[],
  methode?: string,
  ton?: string,
  niveauxBloom?: string[],
  profilEleves?: string,
): string {
  const lines: string[] = [
    `lesson: ${lecon} | lang: ${LANG_MAP[langue]}`,
    `subject: ${matiere} | level: ${niveau} | sem: ${semestre}`,
    `unit: ${unite} | duration: ${duree}min`,
    `skills: ${competences.join(', ')}`,
  ];
  if (methode) lines.push(`method: ${methode}`);
  if (ton) lines.push(`tone: ${ton}`);
  if (niveauxBloom?.length) lines.push(`bloom: ${niveauxBloom.join(', ')}`);
  if (differentiationLevel) lines.push(`differ: ${differentiationLevel}`);
  if (profilEleves?.trim()) lines.push(`profile: ${profilEleves.trim()}`);
  return lines.join('\n');
}

export function getOutputRule(): string {
  return `rule: respond_only_with_valid_JSON_matching_schema | no_extra_text | no_explanation`;
}

export function getTeacherInstructionBlock(
  includePrompt?: string,
  excludePrompt?: string,
  customGlobal?: string,
  customContext?: string,
): string {
  const blocks: string[] = [];
  if (customGlobal?.trim()) blocks.push(`teacher_global: ${customGlobal.trim()}`);
  if (customContext?.trim()) blocks.push(`teacher_context: ${customContext.trim()}`);
  if (includePrompt?.trim()) blocks.push(`must_include: ${includePrompt.trim()}`);
  if (excludePrompt?.trim()) blocks.push(`must_exclude: ${excludePrompt.trim()}`);
  return blocks.join('\n');
}
