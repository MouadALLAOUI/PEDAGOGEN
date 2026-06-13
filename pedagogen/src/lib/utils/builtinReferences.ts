import { readFile } from 'fs/promises';
import { join } from 'path';
import { getDb } from '@/lib/db';

interface BuiltinRef {
  name: string;
  matiere: string;
  fileName: string;
}

const BUILTIN_REFS: BuiltinRef[] = [
  {
    name: 'Programme Informatique Collège Maroc',
    matiere: 'Informatique',
    fileName: 'curr_informatiques_college.md',
  },
];

export function compressReferenceDocument(text: string, levelStr?: string, unitStr?: string): string {
  // 3. Dynamically filter and extract ONLY the sections matching the target level (e.g. '1AC') and unit (e.g. 'Système informatique')
  let targetLevel = 0;
  if (levelStr) {
    if (levelStr.includes('1')) targetLevel = 1;
    else if (levelStr.includes('2')) targetLevel = 2;
    else if (levelStr.includes('3')) targetLevel = 3;
  }

  // Normalize unit string for relaxed matching
  const targetUnit = unitStr ? unitStr.toLowerCase().trim().replace(/[_\s-]+/g, ' ') : '';

  const lines = text.split('\n');
  const filteredLines: string[] = [];

  // Determine target competencies for the grade level to filter Tableau 1/2/3
  const targetCompetencies = new Set<string>();
  if (targetLevel === 1) {
    ['C0', 'C11', 'C21', 'C22', 'C31'].forEach(c => targetCompetencies.add(c));
  } else if (targetLevel === 2) {
    ['C0', 'C12', 'C13', 'C31', 'C32'].forEach(c => targetCompetencies.add(c));
  } else if (targetLevel === 3) {
    ['C0', 'C11', 'C13', 'C23', 'C33'].forEach(c => targetCompetencies.add(c));
  }

  let currentSection = '';
  let includeCurrentSection = true; // Default to true for intro stuff, but we will selectively ignore

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    const trimmed = line.trim();

    if (trimmed.startsWith('#')) {
      if (trimmed.startsWith('##### Niveau :')) {
        currentSection = 'niveau';
        // Check if level matches
        includeCurrentSection = targetLevel > 0 ? trimmed.includes(`Niveau : ${targetLevel}`) : true;
        if (includeCurrentSection) {
          filteredLines.push(line);
        }
        continue;
      }

      if (trimmed.startsWith('##### TABLEAU')) {
        currentSection = 'tableau';
        includeCurrentSection = true;
        filteredLines.push(line);
        continue;
      }

      if (trimmed.startsWith('##### Compétence')) {
        currentSection = 'suggestions';
        includeCurrentSection = false;
        if (targetCompetencies.size > 0) {
          for (const comp of targetCompetencies) {
            if (trimmed.includes(comp)) {
              includeCurrentSection = true;
              break;
            }
          }
        } else {
          includeCurrentSection = true;
        }
        if (includeCurrentSection) {
          filteredLines.push(line);
        }
        continue;
      }

      if (trimmed.startsWith('#### 7.3. Suggestions et orientations pédagogiques')) {
        currentSection = 'ignored';
        includeCurrentSection = false;
        continue;
      }

      // Ignore large general/conversational/filler sections entirely
      if (trimmed.startsWith('## المدخل العام') || 
          trimmed.startsWith('## INTRODUCTION') || 
          trimmed.startsWith('### 1. Le cycle collégial') || 
          trimmed.startsWith('### 3. Considérations pédagogiques') ||
          trimmed.startsWith('### 4. Considérations pédagogiques spécifiques') ||
          trimmed.startsWith('### 5. Méthodologie') ||
          trimmed.startsWith('### 6. L\'évaluation') ||
          trimmed.startsWith('## Bibliographie')) {
        currentSection = 'ignored';
        includeCurrentSection = false;
        continue;
      }
    }

    if (includeCurrentSection) {
      if (currentSection === 'niveau' && targetUnit) {
        // We are within a Niveau block (e.g. Niveau : 1), filter rows belonging to the specific Unit
        // Lines inside Niveau block look like: | **U1** | ... | Resources | ...
        const isHeader = trimmed.startsWith('|') && (trimmed.toLowerCase().includes('unité') || trimmed.includes('---'));
        if (isHeader) {
          filteredLines.push(line);
        } else if (trimmed.startsWith('|')) {
          const cells = trimmed.split('|').map(c => c.trim().toLowerCase());
          // Cell 1 is empty (split leading pipe), Cell 2 is Unité (e.g. **u1**), Cell 4 is Resources/Unit Name
          const unitText = cells[2] || '';
          const resourcesText = cells[4] || '';
          const matchesUnit = unitText.includes(targetUnit) || resourcesText.includes(targetUnit);
          if (matchesUnit) {
            filteredLines.push(line);
          }
        } else {
          filteredLines.push(line);
        }
      } else if (currentSection === 'tableau') {
        const isHeaderRow = trimmed.startsWith('|') && (trimmed.includes('COMPÉTENCES') || trimmed.includes('---'));
        if (isHeaderRow) {
          const parts = line.split('|');
          if (parts.length >= 6) {
            const newParts = [parts[0], parts[1], parts[2], parts[3], parts[4], parts[parts.length - 1]];
            filteredLines.push(newParts.join('|'));
          } else {
            filteredLines.push(line);
          }
        } else if (trimmed.startsWith('|')) {
          let match = false;
          if (targetCompetencies.size > 0) {
            for (const comp of targetCompetencies) {
              if (trimmed.includes(`**${comp}:**`)) {
                match = true;
                break;
              }
            }
          } else {
            match = true;
          }
          if (match) {
            const parts = line.split('|');
            if (parts.length >= 6) {
              const newParts = [parts[0], parts[1], parts[2], parts[3], parts[4], parts[parts.length - 1]];
              filteredLines.push(newParts.join('|'));
            } else {
              filteredLines.push(line);
            }
          }
        } else {
          filteredLines.push(line);
        }
      } else {
        filteredLines.push(line);
      }
    }
  }

  // Join back the filtered content
  let compressed = filteredLines.join('\n');

  // 1. Strips out redundant markdown table formatting boilerplate without destroying column alignment meaning
  // We replace separators like "| :--- | :--- |" or similar with simpler dividers
  compressed = compressed.replace(/\|\s*(:?-+:?\s*\|)+/g, '|');

  // 2. Removes duplicate white-spaces, double line breaks, and conversational filler words
  // Remove filler conversational phrases/sentences in French/Arabic that don't add specific curriculum detail
  const fillerPhrases = [
    /il est à noter qu'il est difficile de citer d'une façon exhaustive et précise l'ensemble des ressources/gi,
    /les ressources correspondant à chaque niveau feront l'objet de réajustements ultérieurs/gi,
    /les enseignants doivent prendre en compte les contraintes spécifiques/gi,
    /veiller à la cohérence des différentes interventions/gi,
    /على الأستاذ \(ة\) أن يستحضر/gi,
    /على الأستاذ \(ة\) ان يستحضر/gi,
    /على الأستاذ \(ة\) أن يعي/gi
  ];

  for (const filler of fillerPhrases) {
    compressed = compressed.replace(filler, '');
  }

  // Remove duplicate whitespace and convert double line breaks or multiple empty lines into single empty lines
  compressed = compressed.replace(/[ \t]+/g, ' ');
  compressed = compressed.replace(/\n\s*\n+/g, '\n\n');

  return compressed.trim();
}

export function filterCurriculumContent(content: string, niveau?: string, unit?: string): string {
  return compressReferenceDocument(content, niveau, unit);
}

export async function getBuiltinReferences(matiere: string, niveau?: string, unit?: string): Promise<string[]> {
  const db = getDb();
  const refs = BUILTIN_REFS.filter((r) => {
    if (r.matiere.toLowerCase() !== matiere.toLowerCase()) return false;
    try {
      const row = db.prepare('SELECT enabled FROM reference_files WHERE name = ? AND builtin = 1').get(r.name) as { enabled: number } | undefined;
      return row ? row.enabled === 1 : true;
    } catch {
      return true;
    }
  });

  const contents: string[] = [];
  const dir = join(process.cwd(), 'src', 'lib', 'references');

  for (const ref of refs) {
    try {
      let content = await readFile(join(dir, ref.fileName), 'utf-8');
      if (content.trim()) {
        if (ref.fileName === 'curr_informatiques_college.md') {
          content = filterCurriculumContent(content, niveau, unit);
        }
        contents.push(`[${ref.name}]\n${content}`);
      }
    } catch {
      // Built-in ref missing — not critical
    }
  }

  return contents;
}
