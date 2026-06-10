import { readFile } from 'fs/promises';
import { join } from 'path';

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

export function filterCurriculumContent(content: string, niveau?: string): string {
  if (!niveau) return content;
  
  // Determine level: 1, 2, or 3 from strings like "1AC", "2AC", "3AC", "1ère année", etc.
  let level = 0;
  if (niveau.includes('1')) level = 1;
  else if (niveau.includes('2')) level = 2;
  else if (niveau.includes('3')) level = 3;
  
  if (level === 0) return content;
  
  const lines = content.split('\n');
  const filteredLines: string[] = [];
  
  filteredLines.push(`# Programme Informatique Collège Maroc (Niveau: ${level}AC)`);
  filteredLines.push("");
  
  // Competencies for the selected grade level
  const targetCompetencies = new Set<string>();
  if (level === 1) {
    ['C0', 'C11', 'C21', 'C22', 'C31'].forEach(c => targetCompetencies.add(c));
  } else if (level === 2) {
    ['C0', 'C12', 'C13', 'C31', 'C32'].forEach(c => targetCompetencies.add(c));
  } else if (level === 3) {
    ['C0', 'C11', 'C13', 'C23', 'C33'].forEach(c => targetCompetencies.add(c));
  }
  
  let currentSection = '';
  let includeCurrentSection = false;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    
    if (trimmed.startsWith('#')) {
      if (trimmed.startsWith('##### Niveau :')) {
        currentSection = 'niveau';
        includeCurrentSection = trimmed.includes(`Niveau : ${level}`);
        if (includeCurrentSection) {
          filteredLines.push("");
          filteredLines.push(line);
        }
        continue;
      }
      
      if (trimmed.startsWith('##### TABLEAU')) {
        currentSection = 'tableau';
        includeCurrentSection = true;
        filteredLines.push("");
        filteredLines.push(line);
        continue;
      }
      
      if (trimmed.startsWith('##### Compétence')) {
        currentSection = 'suggestions';
        includeCurrentSection = false;
        for (const comp of targetCompetencies) {
          if (trimmed.includes(comp)) {
            includeCurrentSection = true;
            break;
          }
        }
        if (includeCurrentSection) {
          filteredLines.push("");
          filteredLines.push(line);
        }
        continue;
      }
      
      if (trimmed.startsWith('#### 7.3. Suggestions et orientations pédagogiques d\'ordre général')) {
        currentSection = 'general_suggestions';
        includeCurrentSection = true;
        filteredLines.push("");
        filteredLines.push(line);
        continue;
      }
      
      // Stop or ignore large background explanations
      if (trimmed.startsWith('## المدخل العام') || 
          trimmed.startsWith('## INTRODUCTION') || 
          trimmed.startsWith('### 1. Le cycle collégial') || 
          trimmed.startsWith('### 3. Considérations pédagogiques') ||
          trimmed.startsWith('### 6. L\'évaluation') ||
          trimmed.startsWith('## Bibliographie')) {
        currentSection = 'ignored';
        includeCurrentSection = false;
        continue;
      }
    }
    
    if (includeCurrentSection) {
      if (currentSection === 'tableau') {
        const isHeaderRow = trimmed.startsWith('|') && (trimmed.includes('COMPÉTENCES') || trimmed.includes('---'));
        if (isHeaderRow) {
          filteredLines.push(line);
        } else if (trimmed.startsWith('|')) {
          let match = false;
          for (const comp of targetCompetencies) {
            if (trimmed.includes(`**${comp}:**`)) {
              match = true;
              break;
            }
          }
          if (match) {
            filteredLines.push(line);
          }
        } else {
          filteredLines.push(line);
        }
      } else {
        filteredLines.push(line);
      }
    }
  }
  
  return filteredLines.join('\n');
}

export async function getBuiltinReferences(matiere: string, niveau?: string): Promise<string[]> {
  const refs = BUILTIN_REFS.filter(
    (r) => r.matiere.toLowerCase() === matiere.toLowerCase()
  );

  const contents: string[] = [];
  const dir = join(process.cwd(), 'src', 'lib', 'references');

  for (const ref of refs) {
    try {
      let content = await readFile(join(dir, ref.fileName), 'utf-8');
      if (content.trim()) {
        if (ref.fileName === 'curr_informatiques_college.md') {
          content = filterCurriculumContent(content, niveau);
        }
        contents.push(`[${ref.name}]\n${content}`);
      }
    } catch {
      // Built-in ref missing — not critical
    }
  }

  return contents;
}
