import { NextResponse } from 'next/server';
import { getIndexStatus } from '@/lib/search/vectorStore';

export async function GET() {
  try {
    const status = await getIndexStatus();
    return NextResponse.json({ status });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to get index status' }, { status: 500 });
  }
}
