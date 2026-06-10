import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET() {
  try {
    const db = getDb();
    const rows = db.prepare('SELECT key, value FROM custom_prompts').all() as { key: string; value: string }[];
    
    const prompts: Record<string, string> = {};
    for (const row of rows) {
      prompts[row.key] = row.value;
    }
    
    return NextResponse.json({ prompts });
  } catch (error) {
    console.error('Failed to load prompts:', error);
    return NextResponse.json({ error: 'Failed to load prompts' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { prompts } = body;

    if (!prompts || typeof prompts !== 'object') {
      return NextResponse.json({ error: 'Invalid prompts data' }, { status: 400 });
    }

    const db = getDb();
    
    const insertOrReplace = db.prepare(`
      INSERT OR REPLACE INTO custom_prompts (key, value)
      VALUES (?, ?)
    `);

    // Run in a transaction
    const transaction = db.transaction((promptsMap: Record<string, string>) => {
      for (const [key, value] of Object.entries(promptsMap)) {
        insertOrReplace.run(key, value);
      }
    });

    transaction(prompts);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to save prompts:', error);
    return NextResponse.json({ error: 'Failed to save prompts' }, { status: 500 });
  }
}
