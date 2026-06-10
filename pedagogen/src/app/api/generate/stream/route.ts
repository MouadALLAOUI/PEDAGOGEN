import { NextRequest } from 'next/server';
import { getGeneration, GenerationProgressStep } from '@/lib/agents/generationManager';

function sseEvent(event: any): string {
  return `data: ${JSON.stringify(event)}\n\n`;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return new Response('Missing generation ID', { status: 400 });
  }

  const gen = getGeneration(id);
  if (!gen) {
    // If not found in active list, check if it's already in history/database or just return 404
    return new Response('Generation not found', { status: 404 });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      // 1. Flush existing progress steps
      for (const step of gen.progress) {
        controller.enqueue(encoder.encode(sseEvent(step)));
      }

      // If already completed, close immediately
      if (gen.isCompleted) {
        controller.close();
        return;
      }

      // 2. Add listener for future events
      const listener = (step: GenerationProgressStep) => {
        try {
          controller.enqueue(encoder.encode(sseEvent(step)));
          if (step.type === 'done' || step.type === 'error') {
            gen.listeners.delete(listener);
            controller.close();
          }
        } catch (e) {
          gen.listeners.delete(listener);
        }
      };

      gen.listeners.add(listener);

      // Clean up listener when connection is aborted by client
      request.signal.addEventListener('abort', () => {
        gen.listeners.delete(listener);
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}
