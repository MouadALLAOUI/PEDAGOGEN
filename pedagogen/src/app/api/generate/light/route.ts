import { NextRequest, NextResponse } from 'next/server';
import { runLightAgent } from '@/lib/agents/lightAgent';
import type { GenerationRequest } from '@/types/generation';

export async function POST(request: NextRequest) {
  try {
    const body: GenerationRequest = await request.json();

    if (body.mode !== 'light') {
      return NextResponse.json({ error: 'Invalid mode' }, { status: 400 });
    }

    if (!process.env.HF_TOKEN) {
      return NextResponse.json(
        { error: 'HF_TOKEN not configured' },
        { status: 500 }
      );
    }

    const startTime = Date.now();

    const result = await runLightAgent(
      body.metadata,
      body.useReferences
    );

    const durationMs = Date.now() - startTime;

    return NextResponse.json({
      result: {
        id: `light-${Date.now()}`,
        createdAt: new Date(),
        mode: 'light',
        metadata: body.metadata,
        files: [],
        tokensUsed: result.usage?.total_tokens || 0,
        durationMs,
        markdown: result.markdown,
      },
    });
  } catch (error) {
    console.error('Light agent error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Generation failed' },
      { status: 500 }
    );
  }
}
