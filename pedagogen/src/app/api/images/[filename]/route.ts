import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  const { filename } = await params;

  if (!filename || filename.includes('..')) {
    return NextResponse.json({ error: 'Invalid path' }, { status: 400 });
  }

  const IMAGES_DIR = join(process.cwd(), 'data', 'images');
  const filePath = join(IMAGES_DIR, filename);

  if (!existsSync(filePath)) {
    return NextResponse.json({ error: 'Image not found' }, { status: 404 });
  }

  try {
    const buffer = await readFile(filePath);
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=86400',
      },
    });
  } catch {
    return NextResponse.json({ error: 'Failed to read image' }, { status: 500 });
  }
}
