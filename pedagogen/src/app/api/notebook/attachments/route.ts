import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import { createAttachment, linkAttachmentToEntry } from '@/lib/notebook/notebookManager';

const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25 MB

function sanitizeFilename(name: string): string {
  return name.replace(/[/\\?%*:|"<>]/g, '_').trim() || 'fichier';
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const entryId = formData.get('entry_id') as string | null;
    const userId = request.headers.get('x-user-id') || 'default';

    const rawFiles = formData.getAll('files').concat(formData.getAll('file')) as File[];
    const validFiles = rawFiles.filter((f): f is File => f instanceof File && f.size > 0);

    if (validFiles.length === 0) {
      return NextResponse.json({ error: 'Aucun fichier fourni' }, { status: 400 });
    }

    const attachmentsDir = join(process.cwd(), 'data', 'attachments');
    if (!existsSync(attachmentsDir)) {
      await mkdir(attachmentsDir, { recursive: true });
    }

    const savedAttachments = [];

    for (const file of validFiles) {
      if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json(
          { error: `Le fichier "${file.name}" dépasse la limite maximale de 25 Mo` },
          { status: 400 }
        );
      }

      const cleanName = sanitizeFilename(file.name);
      const storagePath = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}_${cleanName}`;
      const filePath = join(attachmentsDir, storagePath);

      const buffer = Buffer.from(await file.arrayBuffer());
      await writeFile(filePath, buffer);

      const att = createAttachment({
        original_name: file.name,
        mime_type: file.type || 'application/octet-stream',
        size: file.size,
        storage_path: storagePath,
        user_id: userId,
      });

      if (entryId) {
        linkAttachmentToEntry(entryId, att.id);
      }

      savedAttachments.push(att);
    }

    return NextResponse.json({
      success: true,
      attachment: savedAttachments[0],
      attachments: savedAttachments,
    });
  } catch (error) {
    console.error('POST /api/notebook/attachments error:', error);
    return NextResponse.json(
      { error: 'Erreur lors du téléversement de la pièce jointe' },
      { status: 500 }
    );
  }
}
