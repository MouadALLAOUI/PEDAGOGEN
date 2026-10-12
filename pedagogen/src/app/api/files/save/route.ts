import { NextRequest, NextResponse } from 'next/server';
import { writeFile, stat } from 'fs/promises';
import { join } from 'path';
import path from 'path';
import { existsSync } from 'fs';
import { getDb } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { fileId, content } = body;

    if (!fileId || typeof content !== 'string') {
      return NextResponse.json({ error: 'fileId et content requis' }, { status: 400 });
    }

    const db = getDb();
    const file = db.prepare(
      'SELECT storage_path, format, name FROM generated_files WHERE id = ?'
    ).get(fileId) as any;

    if (!file) {
      return NextResponse.json({ error: 'Fichier non trouve' }, { status: 404 });
    }

    const GENERATED_DIR = join(process.cwd(), 'data', 'generated');
    const filePath = join(GENERATED_DIR, file.storage_path);
    const resolvedPath = path.resolve(filePath);
    const resolvedBase = path.resolve(GENERATED_DIR);

    if (!resolvedPath.startsWith(resolvedBase + path.sep)) {
      return NextResponse.json({ error: 'Acces non autorise' }, { status: 403 });
    }

    if (!existsSync(resolvedPath)) {
      return NextResponse.json({ error: 'Fichier introuvable sur le disque' }, { status: 404 });
    }

    // Write content to disk
    await writeFile(resolvedPath, content, 'utf-8');

    // Update size in DB
    const fileStat = await stat(resolvedPath);
    const sizeKb = Math.round(fileStat.size / 1024);
    db.prepare('UPDATE generated_files SET size_kb = ? WHERE id = ?').run(sizeKb, fileId);

    return NextResponse.json({ ok: true, sizeKb });
  } catch (error) {
    console.error('Erreur sauvegarde fichier:', error);
    return NextResponse.json({ error: 'Erreur lors de la sauvegarde du fichier' }, { status: 500 });
  }
}
