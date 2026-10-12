
export interface GenerationProgressStep {
  type: 'progress' | 'reasoning' | 'build' | 'tokens' | 'done' | 'error' | 'review';
  step?: string;
  label?: string;
  status?: 'active' | 'done' | 'error';
  error?: string;
  count?: number;
  result?: any;
  message?: string;
  reasoning?: string;
  format?: string;
}

export interface ActiveGeneration {
  id: string;
  mode: 'light' | 'medium' | 'heavy';
  metadata: any;
  progress: GenerationProgressStep[];
  controller: AbortController;
  listeners: Set<(step: GenerationProgressStep) => void>;
  isCompleted: boolean;
  jsonResults?: Record<string, unknown>;
  messages?: any[];
  totalTokens?: number;
}

// Persistent across hot-reloads in Next.js development
const globalForGenerations = global as unknown as {
  activeGenerations: Map<string, ActiveGeneration>;
};

if (!globalForGenerations.activeGenerations) {
  globalForGenerations.activeGenerations = new Map();
}

export const activeGenerations = globalForGenerations.activeGenerations;

export function createGeneration(id: string, mode: 'light' | 'medium' | 'heavy', metadata: any): ActiveGeneration {
  const controller = new AbortController();
  const gen: ActiveGeneration = {
    id,
    mode,
    metadata,
    progress: [],
    controller,
    listeners: new Set(),
    isCompleted: false,
  };
  activeGenerations.set(id, gen);
  return gen;
}

export function getGeneration(id: string): ActiveGeneration | undefined {
  return activeGenerations.get(id);
}

export function listActiveGenerations() {
  return Array.from(activeGenerations.values())
    .filter((g) => !g.isCompleted)
    .map((g) => ({
      id: g.id,
      mode: g.mode,
      metadata: g.metadata,
      currentStep: g.progress.length > 0 ? g.progress[g.progress.length - 1] : undefined,
    }));
}

export function addProgress(id: string, step: GenerationProgressStep) {
  const gen = activeGenerations.get(id);
  if (!gen) return;
  gen.progress.push(step);
  if (step.type === 'done' || step.type === 'error') {
    gen.isCompleted = true;
  }
  for (const listener of gen.listeners) {
    try {
      listener(step);
    } catch (e) {
      console.error('Error in progress listener:', e);
    }
  }
  if (gen.isCompleted) {
    // Keep it for 10 minutes so users can see completed state if they open the page later, then clean up.
    setTimeout(() => {
      activeGenerations.delete(id);
    }, 600000);
  }
}

export function cancelGeneration(id: string): boolean {
  const gen = activeGenerations.get(id);
  if (!gen) return false;
  if (!gen.isCompleted) {
    gen.controller.abort();
    addProgress(id, { type: 'error', message: 'Génération annulée par l\'utilisateur.' });
    gen.isCompleted = true;
  }
  activeGenerations.delete(id);
  return true;
}

// ─── R6: File d'attente de générations (évite de saturer le fournisseur IA) ───

const globalForQueue = global as unknown as {
  generationQueue?: Array<{ id: string; run: () => Promise<void> }>;
  generationRunning?: number;
};

const queue = (globalForQueue.generationQueue ||= []);
let running = (globalForQueue.generationRunning ||= 0);
const syncRunning = () => { globalForQueue.generationRunning = running; };

export const MAX_CONCURRENT_GENERATIONS = 2;

/**
 * Exécute le corps d'une génération via une file (max 2 simultanées).
 * Les générations en attente voient un événement de progression "En file d'attente".
 */
export function enqueueGeneration(
  id: string,
  position: number,
  run: () => Promise<void>
): void {
  const gen = activeGenerations.get(id);
  queue.push({ id, run });

  const pump = () => {
    while (running < MAX_CONCURRENT_GENERATIONS && queue.length > 0) {
      const item = queue.shift()!;
      const g = activeGenerations.get(item.id);
      if (!g || g.isCompleted) continue; // annulée pendant l'attente
      if (position > 0) {
        addProgress(item.id, {
          type: 'progress',
          step: 'queue',
          label: `Démarrage (position ${position})...`,
          status: 'active',
        });
      }
      running++;
      syncRunning();
      item.run().finally(() => {
        running--;
        syncRunning();
        pump();
      });
    }
  };
  if (position > 0 && gen) {
    addProgress(id, {
      type: 'progress',
      step: 'queue',
      label: `En file d'attente (position ${position})...`,
      status: 'active',
    });
  }
  pump();
}

/** Position dans la file (0 = démarrage immédiat). */
export function queuePosition(): number {
  return running >= MAX_CONCURRENT_GENERATIONS ? queue.length + 1 : 0;
}
