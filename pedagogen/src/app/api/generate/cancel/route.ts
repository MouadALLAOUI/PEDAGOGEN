import { NextRequest, NextResponse } from 'next/server';
import { cancelGeneration } from '@/lib/agents/generationManager';

export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'Missing generation ID' }, { status: 400 });
    }
    
    const cancelled = cancelGeneration(id);
    if (!cancelled) {
      return NextResponse.json({ error: 'Generation not found or already completed' }, { status: 404 });
    }
    
    return NextResponse.json({ success: true, message: 'Generation stop requested' });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to cancel generation' }, { status: 500 });
  }
}
