import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { bundleToZip } from '@/lib/builders/zipBuilder';
import { saveGeneratedFile } from '@/lib/utils/generatedStorage';
import type { GeneratedFile } from '@/types/generation';

export async function POST(request: NextRequest) {
  try {
    const { ids } = await request.json();

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: 'Missing or invalid ids' }, { status: 400 });
    }

    const db = getDb();
    const placeholders = ids.map(() => '?').join(',');
    const rows = db.prepare(`
      SELECT name, doc_type, format, url, size_kb
      FROM generated_files
      WHERE id IN (${placeholders})
    `).all(...ids) as any[];

    if (!rows || rows.length === 0) {
      return NextResponse.json({ error: 'No files found' }, { status: 404 });
    }

    const files: GeneratedFile[] = rows.map((r) => ({
      name: r.name,
      type: r.doc_type,
      format: r.format,
      url: r.url,
      sizeKb: r.size_kb,
    }));

    const zipName = `PEDAGOGEN_selection_${Date.now()}.zip`;
    const zipBuffer = await bundleToZip(files);
    const zipFile = await saveGeneratedFile(zipBuffer, zipName, 'zip', 'fiche_pedagogique');

    return NextResponse.json({ zipUrl: zipFile.url });
  } catch (error) {
    console.error('Batch ZIP failed:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Batch ZIP failed' },
      { status: 500 }
    );
  }
}
