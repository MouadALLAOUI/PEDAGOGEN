import { NextRequest, NextResponse } from 'next/server';
import { getClassById, getCurrentSeason, getStudentsByClass, createStudent } from '@/lib/students/studentManager';
import { getDb } from '@/lib/db';

/** GET: roster (same as [id] detail, lighter). POST: manual student add into this class. */
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const eleves = getStudentsByClass(id);
    return NextResponse.json({ eleves });
  } catch (error) {
    console.error('GET /api/classes/[id]/eleves failed:', error);
    return NextResponse.json({ error: 'Échec du chargement des élèves' }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const classe = getClassById(id);
    if (!classe) return NextResponse.json({ error: 'Classe introuvable' }, { status: 404 });

    const body = await request.json();
    const nom = (body.nom || '').trim();
    const prenom = (body.prenom || '').trim();
    const cne = (body.cne || '').trim();
    if (!nom || !prenom) {
      return NextResponse.json({ error: 'Nom et prénom sont requis' }, { status: 400 });
    }
    if (body.genre && !['M', 'F'].includes(body.genre)) {
      return NextResponse.json({ error: 'Genre invalide (M ou F)' }, { status: 400 });
    }

    // CNE deduplication (spec) — allow empty CNE, reject a CNE already used by another student
    if (cne) {
      const db = getDb();
      const existing = db.prepare('SELECT id FROM students WHERE cne_massar = ? AND id != ?')
        .get(cne, body.studentId || '') as { id: string } | undefined;
      if (existing) {
        return NextResponse.json({ error: `Le CNE ${cne} est déjà utilisé par un autre élève` }, { status: 409 });
      }
    }

    const season = getCurrentSeason();
    const student = createStudent({
      first_name: prenom,
      last_name: nom,
      cne_massar: cne,
      gender: body.genre || 'M',
      class_id: id,
      season_id: season.id,
    });
    return NextResponse.json({ eleve: student }, { status: 201 });
  } catch (error) {
    console.error('POST /api/classes/[id]/eleves failed:', error);
    return NextResponse.json({ error: 'Échec de l\'ajout de l\'élève' }, { status: 500 });
  }
}
