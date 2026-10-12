import { NextRequest, NextResponse } from 'next/server';
import { getClassById, getCurrentSeason, getClassesBySeason, createClass, createStudent } from '@/lib/students/studentManager';
import { getDb } from '@/lib/db';
import type { ImportRow } from '@/lib/utils/csvImport';

/**
 * POST — Step 2 of the import: persist the validated rows (preview confirmed client-side).
 * body: { rows: ImportRow[], createMissingClasses?: boolean }
 * Each row: resolve target class (row.classe if set, else this class), skip CNE duplicates,
 * create the student and enroll them in the current season.
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const classe = getClassById(id);
    if (!classe) return NextResponse.json({ error: 'Classe introuvable' }, { status: 404 });

    const body = await request.json();
    const rows: ImportRow[] = body.rows || [];
    if (!Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json({ error: 'Aucune ligne à importer' }, { status: 400 });
    }

    const season = getCurrentSeason();
    const db = getDb();

    // Class registry for per-row classe resolution
    const seasonClasses = getClassesBySeason(season.id);
    const classByName = new Map<string, { id: string; name: string; niveau: string }>();
    for (const c of seasonClasses) classByName.set(c.name.trim().toLowerCase(), { id: c.id, name: c.name, niveau: c.niveau });

    const classesCreated: string[] = [];
    const skipped: Array<{ ligne: number; raison: string }> = [];
    let created = 0;

    const checkCneStmt = db.prepare('SELECT id FROM students WHERE cne_massar = ?');

    const importTransaction = db.transaction(() => {
      for (const row of rows) {
        // Re-validate minimally (client could send anything)
        if (!row.nom || !row.prenom || !row.cne) {
          skipped.push({ ligne: row.ligne, raison: 'Champ manquant (nom, prénom ou CNE)' });
          continue;
        }
        if (!['1AC', '2AC', '3AC'].includes(row.niveau)) {
          skipped.push({ ligne: row.ligne, raison: `Niveau invalide : ${row.niveau}` });
          continue;
        }
        if (row.cne && checkCneStmt.get(row.cne)) {
          skipped.push({ ligne: row.ligne, raison: `CNE ${row.cne} déjà présent dans la base` });
          continue;
        }

        // Target class: file's classe column (matched by name, created on demand) else this class
        let targetId = classe.id;
        const rowClasse = (row.classe || '').trim();
        if (rowClasse && rowClasse.toLowerCase() !== classe.name.trim().toLowerCase()) {
          let target = classByName.get(rowClasse.toLowerCase());
          if (!target && body.createMissingClasses) {
            const niveau = ['1AC', '2AC', '3AC'].includes(row.niveau) ? row.niveau as '1AC' | '2AC' | '3AC' : classe.niveau as '1AC' | '2AC' | '3AC';
            target = createClass({ season_id: season.id, niveau, name: rowClasse });
            classByName.set(rowClasse.toLowerCase(), target);
            classesCreated.push(rowClasse);
          }
          if (!target) {
            skipped.push({ ligne: row.ligne, raison: `Classe "${rowClasse}" introuvable` });
            continue;
          }
          targetId = target.id;
        }

        createStudent({
          first_name: row.prenom,
          last_name: row.nom,
          cne_massar: row.cne,
          gender: row.genre === 'F' ? 'F' : 'M',
          class_id: targetId,
          season_id: season.id,
        });
        created++;
      }
    });

    importTransaction();

    return NextResponse.json({ created, skipped, classesCreated: [...new Set(classesCreated)] });
  } catch (error) {
    console.error('POST /api/classes/[id]/import/save failed:', error);
    return NextResponse.json({ error: 'Échec de l\'import' }, { status: 500 });
  }
}
