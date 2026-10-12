import { NextRequest, NextResponse } from 'next/server';
import { runLightAgent } from '@/lib/agents/lightAgent';
import { saveGeneratedFile, getDynamicFilename } from '@/lib/utils/generatedStorage';
import { getDb } from '@/lib/db';
import { getDbSetting } from '@/lib/db/settings';
import type { GenerationRequest } from '@/types/generation';
import { logGenerationError } from '@/lib/utils/logger';
import { createGeneration, addProgress, enqueueGeneration, queuePosition } from '@/lib/agents/generationManager';
import { verifyToken } from '@/lib/db/auth';
import { addHistoryEntry } from '@/lib/utils/historyStore';
import { generationRequestSchema } from '@/lib/validators/generation';

export const maxDuration = 900;
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.json();
    const parsed = generationRequestSchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Données invalides', details: parsed.error.format() }, { status: 400 });
    }
    const body: GenerationRequest = rawBody as GenerationRequest;

    const userIdHeader = request.headers.get('x-user-id');
    let userId = userIdHeader || undefined;
    if (!userId) {
      const token = request.cookies.get('auth-token')?.value;
      if (token) {
        const payload = await verifyToken(token);
        if (payload?.sub) userId = String(payload.sub);
      }
    }

    const dbToken = await getDbSetting('huggingface_token', userId);
    const apiKey = dbToken || process.env.HF_TOKEN;

    if (body.mode !== 'light') {
      return NextResponse.json({ error: 'Invalid mode' }, { status: 400 });
    }

    if (!body.useLocalModel && !apiKey) {
      return NextResponse.json(
        { error: 'HF_TOKEN not configured' },
        { status: 500 }
      );
    }

    const generationId = `light-${Date.now()}`;
    const gen = createGeneration(generationId, 'light', body.metadata);

    // Run generation asynchronously in the background (via concurrency queue)
    enqueueGeneration(generationId, queuePosition(), async () => {
      const signal = gen.controller.signal;
      try {
        addProgress(generationId, { type: 'progress', step: 'init', label: 'Initialisation...', status: 'active' });

        if (signal.aborted) return;

        // Load references (built-in + user-uploaded)
        let referenceContents: string | undefined;
        if (body.useReferences) {
          try {
            const contents: string[] = [];

            const { getBuiltinReferences } = await import('@/lib/utils/builtinReferences');
            const builtin = await getBuiltinReferences(body.metadata.matiere, body.metadata.niveau, body.metadata.unite);
            contents.push(...builtin);

            if (signal.aborted) return;

            const db = getDb();
            const enabledRefs = db.prepare(
              'SELECT id, name FROM reference_files WHERE enabled = 1 AND builtin = 0'
            ).all() as any[];
            const { readReferenceContent } = await import('@/lib/utils/fileStorage');
            const { compressReferenceDocument } = await import('@/lib/utils/builtinReferences');
            for (const f of enabledRefs) {
              if (signal.aborted) return;
              let content = await readReferenceContent(f.id);
              if (content) {
                content = compressReferenceDocument(content, body.metadata.niveau, body.metadata.unite);
                contents.push(`[${f.name}]\n${content}`);
              }
            }

            if (contents.length > 0) {
              referenceContents = contents.join('\n\n---\n\n');
            }
          } catch {
            // References not critical
          }
        }

        if (signal.aborted) return;
        addProgress(generationId, { type: 'progress', step: 'agent', label: 'Génération IA...', status: 'active' });

        const startTime = Date.now();
        const db = getDb();
        const rows = db.prepare('SELECT key, value FROM custom_prompts').all() as { key: string; value: string }[];
        const dbPrompts: Record<string, string> = {};
        for (const r of rows) {
          dbPrompts[r.key] = r.value;
        }
        const customPrompts = {
          ...dbPrompts,
          ...body.customPrompts,
        };

        const result = await runLightAgent(
          body.metadata,
          body.useReferences,
          referenceContents,
          body.includePrompt,
          body.excludePrompt,
          body.useLocalModel,
          body.localModelName,
          body.localModelUrl,
          body.localApiType,
          signal,
          customPrompts,
          body.debugMode,
          apiKey
        );

        if (signal.aborted) return;
        addProgress(generationId, { type: 'progress', step: 'build', label: 'Sauvegarde du fichier...', status: 'active' });

        const durationMs = Date.now() - startTime;

        // Save generated markdown as a file
        const filename = getDynamicFilename('Cours_Rapide', body.metadata, 'md');
        const buffer = Buffer.from(result.markdown || '');
        const savedFile = await saveGeneratedFile(buffer, filename, 'md', 'cours_complet');

        if (signal.aborted) return;

        const generationResult = {
          id: generationId,
          createdAt: new Date(),
          mode: 'light' as const,
          metadata: body.metadata,
          files: [savedFile],
          tokensUsed: result.usage?.total_tokens || 0,
          durationMs,
          markdown: result.markdown,
        };

        try {
          await addHistoryEntry(generationResult, userId);
        } catch (histErr) {
          console.error('Failed to save history entry server-side:', histErr);
        }

        addProgress(generationId, {
          type: 'done',
          result: generationResult,
        });
      } catch (error) {
        if (signal.aborted) return;
        console.error('Light agent error:', error);
        logGenerationError('light', 'outer_orchestrator', error);
        const msg = error instanceof Error ? error.message : 'Generation failed';
        addProgress(generationId, { type: 'error', message: msg });
      }
    });

    return NextResponse.json({ success: true, generationId });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Generation failed' },
      { status: 500 }
    );
  }
}
