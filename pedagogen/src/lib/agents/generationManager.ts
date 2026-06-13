
export interface GenerationProgressStep {
  type: 'progress' | 'reasoning' | 'build' | 'tokens' | 'done' | 'error';
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
