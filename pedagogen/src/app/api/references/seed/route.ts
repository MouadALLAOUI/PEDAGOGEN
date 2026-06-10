import { NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { saveReferenceFile } from '@/lib/utils/fileStorage';
import { getDb } from '@/lib/db';

const BUILTIN_REFS = [
  {
    name: 'Programme Informatique Collège Maroc',
    category: 'curriculum',
    fileName: 'curr_informatiques_college.md',
  },
];

export async function POST() {
  try {
    const db = getDb();
    const seeded: string[] = [];

    for (const ref of BUILTIN_REFS) {
      const existing = db.prepare(
        'SELECT id FROM reference_files WHERE name = ? LIMIT 1'
      ).get(ref.name);

      if (existing) continue;

      const filePath = join(process.cwd(), 'src', 'lib', 'references', ref.fileName);
      let content: string;
      try {
        content = await readFile(filePath, 'utf-8');
      } catch {
        continue;
      }

      const buffer = Buffer.from(content, 'utf-8');
      await saveReferenceFile(ref.name, ref.category, buffer);
      seeded.push(ref.name);
    }

    return NextResponse.json({ seeded, count: seeded.length });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Seed failed' },
      { status: 500 }
    );
  }
}
