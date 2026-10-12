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
    const heading = key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
    lines.push(`## ${heading}`);

    if (key === 'schema_simplifie' && typeof value === 'string' && value.trim()) {
      lines.push('');
      lines.push('```');
      lines.push(value);
      lines.push('```');
    } else if (key === 'lexique_bilingue' && Array.isArray(value) && value.length > 0) {
      lines.push('');
      lines.push('| Terme Français | Terme Arabe (المصطلح بالعربية) | Contexte / Définition |');
      lines.push('|---|---|---|');
      for (const item of value) {
        if (item && typeof item === 'object') {
          const it = item as { terme_fr?: string; terme_ar?: string; contexte?: string };
          lines.push(`| **${it.terme_fr || ''}** | ${it.terme_ar || ''} | ${it.contexte || ''} |`);
        }
      }
    } else if (typeof value === 'string') {
      lines.push('');
      lines.push(value);
    } else if (Array.isArray(value)) {
      lines.push('');
      for (const item of value) {
        if (item && typeof item === 'object') {
          const parts = Object.entries(item).map(([sk, sv]) => {
            const sl = sk.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
            if (typeof sv === 'string') return `**${sl}:** ${sv}`;
            if (Array.isArray(sv)) return `**${sl}:** ${sv.join(', ')}`;
            return `**${sl}:** ${sv}`;
          });
          lines.push(`- ${parts.join(' | ')}`);
        } else {
          lines.push(`- ${item}`);
        }
      }
    } else if (value && typeof value === 'object') {
      lines.push('');
      for (const [subKey, subVal] of Object.entries(value)) {
        const subHeading = subKey.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
        lines.push(`### ${subHeading}`);
        lines.push('');
        if (typeof subVal === 'string') {
          lines.push(subVal);
        } else if (Array.isArray(subVal)) {
          for (const item of subVal) {
            if (item && typeof item === 'object') {
              const parts = Object.entries(item).map(([k, v]) => {
                const kl = k.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
                return `${kl}: ${v}`;
              });
              lines.push(`- ${parts.join(' | ')}`);
            } else {
              lines.push(`- ${item}`);
            }
          }
        } else {
          lines.push(JSON.stringify(subVal, null, 2));
        }
        lines.push('');
      }
    } else {
      lines.push('');
      lines.push(String(value));
    }
    lines.push('');
  }

  return lines.join('\n');
}

export function buildMarkdownFromText(markdown: string): string {
  return markdown;
}
