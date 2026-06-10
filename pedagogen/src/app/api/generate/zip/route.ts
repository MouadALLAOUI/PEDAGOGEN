import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { bundleToZip } from '@/lib/builders/zipBuilder';
import { saveGeneratedFile } from '@/lib/utils/generatedStorage';
import type { GeneratedFile } from '@/types/generation';

export async function POST(request: NextRequest) {
  try {
    const { generationId } = await request.json();

    if (!generationId) {
      return NextResponse.json({ error: 'Missing generationId' }, { status: 400 });
    }

    const db = getDb();

    // Query all generated files for this generationId
    const rows = db.prepare(`
      SELECT name, doc_type, format, url, size_kb
      FROM generated_files
      WHERE generation_id = ?
    `).all(generationId) as any[];

    if (!rows || rows.length === 0) {
      return NextResponse.json({ error: 'No files found for this generation' }, { status: 404 });
    }

    const files: GeneratedFile[] = rows.map((r) => ({
      name: r.name,
      type: r.doc_type,
      format: r.format,
      url: r.url,
      sizeKb: r.size_kb,
    }));

    // Query generation details to name the zip properly
    const gen = db.prepare(`
      SELECT matiere, niveau
      FROM generations
      WHERE id = ?
    `).get(generationId) as any;

    const matiere = gen?.matiere || 'Package';
    const niveau = gen?.niveau || '';
    const zipName = `PEDAGOGEN_${matiere.replace(/\s+/g, '_')}_${niveau.replace(/\s+/g, '_')}.zip`;

    const zipBuffer = await bundleToZip(files);
    const zipFile = await saveGeneratedFile(
      zipBuffer,
      zipName,
      'zip',
      'fiche_pedagogique',
      generationId
    );

    // Update generation row
    db.prepare('UPDATE generations SET zip_url = ? WHERE id = ?').run(zipFile.url, generationId);

    return NextResponse.json({ zipUrl: zipFile.url });
  } catch (error) {
    console.error('ZIP generation failed:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'ZIP generation failed' },
      { status: 500 }
    );
  }
}
