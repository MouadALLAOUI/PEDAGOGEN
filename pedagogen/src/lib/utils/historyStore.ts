import type { GenerationResult } from '@/types/generation';

const STORAGE_KEY = 'pedagogen_history';
const MAX_ENTRIES = 50;

export interface HistoryEntry {
  id: string;
  mode: string;
  matiere: string;
  niveau: string;
  lecon: string;
  createdAt: string;
  filesCount: number;
  tokensUsed: number;
  files: GenerationResult['files'];
}

export function getHistory(): HistoryEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function addHistoryEntry(result: GenerationResult): void {
  if (typeof window === 'undefined') return;
  try {
    const history = getHistory();
    const entry: HistoryEntry = {
      id: result.id,
      mode: result.mode,
      matiere: result.metadata.matiere,
      niveau: result.metadata.niveau,
      lecon: result.metadata.lecon,
      createdAt: String(result.createdAt),
      filesCount: result.files.length,
      tokensUsed: result.tokensUsed,
      files: result.files,
    };
    history.unshift(entry);
    if (history.length > MAX_ENTRIES) history.pop();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
  } catch {
    // Storage full or unavailable
  }
}
