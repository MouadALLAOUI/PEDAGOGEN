'use client';

import { useState, useCallback, useRef } from 'react';
import type { GenerationRequest, GenerationResult } from '@/types/generation';

interface GenerationState {
  status: 'idle' | 'generating' | 'done' | 'error';
  activeStep: string;
  stepStatus: 'pending' | 'active' | 'done' | 'error' | undefined;
  stepStatuses: Record<string, { status: 'pending' | 'active' | 'done' | 'error'; label: string; error?: string }>;
  tokens: number;
  result: GenerationResult | null;
  error: string | null;
}

export function useGeneration() {
  const [state, setState] = useState<GenerationState>({
    status: 'idle',
    activeStep: 'init',
    stepStatus: undefined,
    stepStatuses: {},
    tokens: 0,
    result: null,
    error: null,
  });
  const abortRef = useRef<AbortController | null>(null);

  const generate = useCallback(async (request: GenerationRequest) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setState({
      status: 'generating',
      activeStep: 'init',
      stepStatus: 'active',
      stepStatuses: {},
      tokens: 0,
      result: null,
      error: null,
    });

    try {
      const res = await fetch('/api/generate/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
        signal: controller.signal,
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Generation failed');
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error('No response body');

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const data = line.slice(6);
          if (data === '[DONE]') continue;

          try {
            const event = JSON.parse(data);
            setState((prev) => handleEvent(prev, event));
          } catch {
            // skip
          }
        }
      }

      setState((prev) => ({ ...prev, status: 'done' }));
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return;
      setState((prev) => ({
        ...prev,
        status: 'error',
        error: err instanceof Error ? err.message : 'Unknown error',
      }));
    }
  }, []);

  const cancel = useCallback(() => {
    abortRef.current?.abort();
    setState((prev) => ({ ...prev, status: 'idle' }));
  }, []);

  const reset = useCallback(() => {
    setState({
      status: 'idle',
      activeStep: 'init',
      stepStatus: undefined,
      stepStatuses: {},
      tokens: 0,
      result: null,
      error: null,
    });
  }, []);

  return { ...state, generate, cancel, reset };
}

function handleEvent(state: GenerationState, event: Record<string, unknown>): GenerationState {
  switch (event.type) {
    case 'progress': {
      const step = String(event.step || '');
      const status = (event.status || 'active') as 'pending' | 'active' | 'done' | 'error';
      const label = String(event.label || step);
      return {
        ...state,
        activeStep: step,
        stepStatus: status,
        stepStatuses: {
          ...state.stepStatuses,
          [step]: { status, label, ...(event.error ? { error: String(event.error) } : {}) },
        },
      };
    }
    case 'tokens':
      return { ...state, tokens: Number(event.used || 0) };
    case 'file':
      return state;
    case 'result':
      return { ...state, result: event.result as GenerationResult };
    default:
      return state;
  }
}
