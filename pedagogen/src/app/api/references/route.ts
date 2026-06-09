import { NextRequest, NextResponse } from 'next/server';
import { saveUploadedFile, listReferenceFiles, deleteReferenceFile } from '@/lib/utils/fileStorage';
import type { ReferenceCategory } from '@/types/references';

export async function GET() {
  try {
    const files = await listReferenceFiles();
    return NextResponse.json({ files });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to list files' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const category = (formData.get('category') as string) || 'custom';

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const savedFile = await saveUploadedFile(buffer, file.name, category as ReferenceCategory);

    return NextResponse.json({ file: savedFile });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to upload file' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'No id provided' }, { status: 400 });
    }

    const deleted = await deleteReferenceFile(id);
    if (!deleted) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete file' }, { status: 500 });
  }
}
