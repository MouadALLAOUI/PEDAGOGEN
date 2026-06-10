import { NextResponse } from 'next/server';
import { listActiveGenerations } from '@/lib/agents/generationManager';

export async function GET() {
  return NextResponse.json({
    activeGenerations: listActiveGenerations(),
  });
}
