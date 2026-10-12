import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id') || 'default';
    const db = getDb();
    const rows = db.prepare(`
      SELECT key, value, user_id FROM custom_prompts 
      WHERE user_id = ? OR user_id = 'default'
      ORDER BY CASE WHEN user_id = ? THEN 1 ELSE 0 END ASC
    `).all(userId, userId) as { key: string; value: string; user_id: string }[];
    
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
    const userId = request.headers.get('x-user-id') || 'default';
    const body = await request.json();
    const { prompts } = body;

    if (!prompts || typeof prompts !== 'object') {
      return NextResponse.json({ error: 'Invalid prompts data' }, { status: 400 });
    }

    const db = getDb();
    
    const deleteExisting = db.prepare('DELETE FROM custom_prompts WHERE key = ? AND user_id = ?');
    const insertStmt = db.prepare(`
      INSERT INTO custom_prompts (key, value, user_id)
      VALUES (?, ?, ?)
    `);

    // Run in a transaction
    const transaction = db.transaction((promptsMap: Record<string, string>) => {
      for (const [key, value] of Object.entries(promptsMap)) {
        deleteExisting.run(key, userId);
        insertStmt.run(key, value, userId);
      }
    });

    transaction(prompts);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to save prompts:', error);
    return NextResponse.json({ error: 'Failed to save prompts' }, { status: 500 });
  }
}
