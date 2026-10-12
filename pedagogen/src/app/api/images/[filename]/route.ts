import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import path, { join } from 'path';
import { existsSync } from 'fs';
import { getDb } from '@/lib/db';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  const { filename } = await params;

  if (!filename || filename.includes('..')) {
    return NextResponse.json({ error: 'Invalid path' }, { status: 400 });
  }

  // 1. Try SQLite database first (stored in DB without filesystem changes)
  try {
    const db = getDb();
    const row = db.prepare('SELECT mime_type, data FROM uploaded_images WHERE filename = ?').get(filename) as {
      mime_type: string;
      data: Buffer;
    } | undefined;

    if (row && row.data) {
      return new NextResponse(new Uint8Array(row.data), {
        headers: {
          'Content-Type': row.mime_type || 'image/png',
          'Cache-Control': 'public, max-age=86400',
        },
      });
    }
  } catch {
    // If table doesn't exist yet, continue to disk check
  }

  // 2. Fallback to disk (for any legacy uploaded files in data/images)
  const IMAGES_DIR = join(process.cwd(), 'data', 'images');
  const filePath = join(IMAGES_DIR, filename);
  const resolved = path.resolve(filePath);
  const resolvedImagesDir = path.resolve(IMAGES_DIR);

  if (!resolved.startsWith(resolvedImagesDir + path.sep)) {
    return NextResponse.json({ error: 'Access denied' }, { status: 403 });
  }

  if (existsSync(filePath)) {
    try {
      const buffer = await readFile(filePath);
      const ext = filename.split('.').pop()?.toLowerCase();
      const mimeTypes: Record<string, string> = {
        png: 'image/png',
        jpg: 'image/jpeg',
        jpeg: 'image/jpeg',
        webp: 'image/webp',
        gif: 'image/gif',
        svg: 'image/svg+xml',
      };
      const contentType = (ext && mimeTypes[ext]) || 'image/png';
      return new NextResponse(buffer, {
        headers: {
          'Content-Type': contentType,
          'Cache-Control': 'public, max-age=86400',
        },
      });
    } catch {
      return NextResponse.json({ error: 'Failed to read image' }, { status: 500 });
    }
  }

  return NextResponse.json({ error: 'Image not found' }, { status: 404 });
}
