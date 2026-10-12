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
      let closed = false;

      const sendEvent = (event: unknown) => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
        } catch {
          // stream closed
        }
      };

      // SSE comment lines keep proxies/CDNs from idle-closing the connection
      // during silent stretches of long model calls. EventSource ignores them.
      const heartbeat = setInterval(() => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(': hb\n\n'));
        } catch {
          closed = true;
        }
      }, 15000);

      const closeStream = () => {
        if (closed) return;
        closed = true;
        clearInterval(heartbeat);
        gen.listeners.delete(listener);
        try { controller.close(); } catch { /* already closed */ }
      };

      // Listen for new events
      const listener = (step: unknown) => {
        sendEvent(step);
        if ((step as any)?.type === 'done' || (step as any)?.type === 'error') {
          closeStream();
        }
      };

      // Send existing progress
      for (const step of gen.progress) {
        sendEvent(step);
      }

      if (gen.isCompleted) {
        closeStream();
        return;
      }

      gen.listeners.add(listener);

      // Cleanup on client disconnect
      (controller as any).__cleanup = closeStream;
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
