import { NextRequest, NextResponse } from 'next/server';
import { listCachedImages } from '@/lib/utils/imageCache';
import { getDb } from '@/lib/db';

export async function GET() {
  try {
    const images = listCachedImages();
    return NextResponse.json({ images });
  } catch {
    return NextResponse.json({ images: [] });
  }
}

export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get('content-type') || '';
    const db = getDb();

    // Ensure SQLite storage table exists
    db.exec(`
      CREATE TABLE IF NOT EXISTS uploaded_images (
        id TEXT PRIMARY KEY,
        filename TEXT UNIQUE,
        mime_type TEXT NOT NULL,
        data BLOB NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
    `);

    let buffer: Buffer;
    let mime: string = 'image/png';
    let cleanExt: string = 'png';

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      const file = formData.get('file') as File | null;
      if (!file) return NextResponse.json({ error: 'Aucun fichier sélectionné' }, { status: 400 });

      buffer = Buffer.from(await file.arrayBuffer());
      const ext = file.name.split('.').pop()?.toLowerCase() || 'png';
      cleanExt = ['png', 'jpg', 'jpeg', 'webp', 'gif', 'svg'].includes(ext) ? ext : 'png';
      mime = file.type || `image/${cleanExt === 'jpg' ? 'jpeg' : cleanExt}`;
    } else {
      const body = await request.json();
      if (!body.dataUrl) {
        return NextResponse.json({ error: 'Format non supporté' }, { status: 400 });
      }
      const matches = body.dataUrl.match(/^data:image\/([A-Za-z+]+);base64,(.+)$/);
      const ext = matches ? (matches[1] === 'jpeg' ? 'jpg' : matches[1]) : 'png';
      cleanExt = ['png', 'jpg', 'webp', 'gif', 'svg'].includes(ext) ? ext : 'png';
      mime = `image/${cleanExt === 'jpg' ? 'jpeg' : cleanExt}`;
      const base64Data = matches ? matches[2] : body.dataUrl;
      buffer = Buffer.from(base64Data, 'base64');
    }

    const filename = `exam-img-${Date.now()}-${Math.random().toString(36).slice(2, 7)}.${cleanExt}`;
    db.prepare(`
      INSERT OR REPLACE INTO uploaded_images (id, filename, mime_type, data)
      VALUES (?, ?, ?, ?)
    `).run(filename, filename, mime, buffer);

    return NextResponse.json({ url: `/api/images/${filename}` });
  } catch (err: unknown) {
    console.error('POST /api/images failed:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Échec de l\'upload de l\'image' },
      { status: 500 }
    );
  }
}
