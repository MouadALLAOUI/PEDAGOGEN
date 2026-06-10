import type { CourseMetadata } from '@/types/generation';

export function buildMarkdown(
  metadata: CourseMetadata,
  content: Record<string, unknown>,
  title: string
): string {
  const lines: string[] = [];

  lines.push(`# ${title}`);
  lines.push('');

  lines.push('## Informations du Cours');
  lines.push('');
  lines.push(`- **Niveau:** ${metadata.niveau}`);
  lines.push(`- **Matière:** ${metadata.matiere}`);
  lines.push(`- **Unité:** ${metadata.unite}`);
  lines.push(`- **Leçon:** ${metadata.lecon}`);
  lines.push(`- **Durée:** ${metadata.duree} minutes`);
  lines.push(`- **Semestre:** ${metadata.semestre}`);
  lines.push('');
  lines.push('---');
  lines.push('');

  for (const [key, value] of Object.entries(content)) {
    lines.push(`## ${key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}`);
    lines.push('');
    if (typeof value === 'string') {
      lines.push(value);
    } else if (Array.isArray(value)) {
      lines.push(value.map(item => `- ${item}`).join('\n'));
    } else if (value && typeof value === 'object') {
      for (const [subKey, subVal] of Object.entries(value)) {
        lines.push(`### ${subKey.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}`);
        lines.push('');
        if (typeof subVal === 'string') {
          lines.push(subVal);
        } else if (Array.isArray(subVal)) {
          lines.push(subVal.map(item => `- ${item}`).join('\n'));
        } else {
          lines.push(JSON.stringify(subVal, null, 2));
        }
        lines.push('');
      }
    } else {
      lines.push(String(value));
    }
    lines.push('');
  }

  return lines.join('\n');
}

export function buildMarkdownFromText(markdown: string): string {
  return markdown;
}
