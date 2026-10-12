import { NextRequest, NextResponse } from 'next/server';
import { decodeCsvBuffer, parseCsv, parseXlsx, buildImportPreview } from '@/lib/utils/csvImport';
import { getClassById, getClassesBySeason, getCurrentSeason } from '@/lib/students/studentManager';
import { getDb } from '@/lib/db';

const MAX_IMPORT_SIZE = 5 * 1024 * 1024; // 5 MB

/**
 * POST — Step 1 of the import: parse + validate, return a preview.
 * Nothing is written to the database.
 * multipart: file (csv/xlsx), optional `encoding` (utf-8 | windows-1256 | auto)
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const classe = getClassById(id);
    if (!classe) return NextResponse.json({ error: 'Classe introuvable' }, { status: 404 });

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const encoding = (formData.get('encoding') as string || 'auto') as 'auto' | 'utf-8' | 'windows-1256';

    if (!file) return NextResponse.json({ error: 'Aucun fichier fourni' }, { status: 400 });
    if (file.size > MAX_IMPORT_SIZE) {
      return NextResponse.json({ error: 'Fichier trop volumineux (max 5 Mo)' }, { status: 400 });
    }

    const ext = (file.name.split('.').pop() || '').toLowerCase();
    if (!['csv', 'xlsx', 'xls'].includes(ext)) {
      return NextResponse.json({ error: 'Format non supporté. Formats acceptés : CSV, XLSX' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    let matrix: string[][];
    if (ext === 'csv') {
      matrix = parseCsv(decodeCsvBuffer(buffer, encoding));
    } else {
      matrix = parseXlsx(buffer);
    }

    // CNEs already in the database → doublon_base flags
    const db = getDb();
    const cneRows = db.prepare('SELECT cne_massar FROM students WHERE cne_massar != \'\'').all() as { cne_massar: string }[];
    const existingCnes = new Set(cneRows.map((r) => r.cne_massar));

    // Classes of the current season — used to detect missing classes in the file
    const season = getCurrentSeason();
    const seasonClasses = getClassesBySeason(season.id);
    const knownClassNames = new Set(seasonClasses.map((c) => c.name.trim().toLowerCase()));

    const preview = buildImportPreview(matrix, {
      fixedClasse: classe.name,
      fixedNiveau: classe.niveau,
      existingCnes,
    });

    const classesManquantes = preview.classesManquantes.filter((c) => !knownClassNames.has(c.trim().toLowerCase()));

    return NextResponse.json({
      fileName: file.name,
      classe: { id: classe.id, name: classe.name, niveau: classe.niveau },
      ...preview,
      classesManquantes,
    });
  } catch (error) {
    console.error('POST /api/classes/[id]/import failed:', error);
    return NextResponse.json({ error: 'Échec de la lecture du fichier. Vérifiez le format et l\'encodage.' }, { status: 500 });
  }
}
