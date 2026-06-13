import { NextRequest } from 'next/server';
import { getGeneration } from '@/lib/agents/generationManager';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const gen = getGeneration(id);

  if (!gen) {
    return new Response(
      JSON.stringify({ error: 'Generation not found' }),
      { status: 404, headers: { 'Content-Type': 'application/json' } },
    );
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      const sendEvent = (event: unknown) => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
        } catch {
          // stream closed
        }
      };

      // Send existing progress
      for (const step of gen.progress) {
        sendEvent(step);
      }

      if (gen.isCompleted) {
        sendEvent({ type: 'done', message: 'Generation completed' });
        controller.close();
        return;
      }

      // Listen for new events
      const listener = (step: unknown) => {
        sendEvent(step);
        if ((step as any)?.type === 'done' || (step as any)?.type === 'error') {
          gen.listeners.delete(listener);
          controller.close();
        }
      };

      gen.listeners.add(listener);

      // Cleanup on client disconnect
      (controller as any).__cleanup = () => {
        gen.listeners.delete(listener);
      };
    },
    cancel() {
      if ((this as any).__cleanup) {
        (this as any).__cleanup();
      }
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
