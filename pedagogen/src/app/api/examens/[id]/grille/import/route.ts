import { NextRequest, NextResponse } from 'next/server';
import { getExam, getExamQuestions, getExamStudents } from '@/lib/exams/examManager';
import { decodeCsvBuffer, parseCsv } from '@/lib/utils/csvImport';

/**
 * POST — Import des notes par CSV (correction papier → saisie).
 * multipart: file (csv ; ou , — colonnes: CNE puis Q1, Q2...), match par CNE
 * (repli : nom + prénom). Retourne un aperçu ; rien n'est enregistré.
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const exam = getExam(id);
    if (!exam) return NextResponse.json({ error: 'Examen introuvable' }, { status: 404 });
    const questions = getExamQuestions(id);

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    if (!file) return NextResponse.json({ error: 'Aucun fichier fourni' }, { status: 400 });

    const matrix = parseCsv(decodeCsvBuffer(Buffer.from(await file.arrayBuffer())));
    if (matrix.length < 2) {
      return NextResponse.json({ error: 'Fichier vide ou sans données' }, { status: 400 });
    }

    const header = matrix[0]!.map((h) => h.trim().toLowerCase());
    const cneCol = header.indexOf('cne');
    const nomCol = header.indexOf('nom');
    const prenomCol = header.indexOf('prenom');
    if (cneCol === -1 && (nomCol === -1 || prenomCol === -1)) {
      return NextResponse.json({ error: 'Colonnes requises : CNE (ou nom + prenom)' }, { status: 400 });
    }
    // Colonnes questions : Q1, Q2... (flexible : q1, question 1)
    const qCols = new Map<number, number>(); // csv col -> numero
    for (const q of questions) {
      const idx = header.findIndex((h) => h === `q${q.numero}` || h === `question ${q.numero}` || h === `q${q.numero}(/${q.bareme})`);
      if (idx !== -1) qCols.set(idx, q.numero);
    }
    if (qCols.size === 0) {
      return NextResponse.json({ error: `Aucune colonne question trouvée (attendu : Q1..Q${questions.length})` }, { status: 400 });
    }

    const students = getExamStudents(exam);
    const byCne = new Map(students.filter((s) => s.cne).map((s) => [s.cne.toLowerCase(), s]));
    const byName = new Map(students.map((s) => [`${s.nom} ${s.prenom}`.toLowerCase().replace(/\s+/g, ' '), s]));

    const matched: Array<{ studentId: string; nom: string; prenom: string; notes: Record<number, number | null> }> = [];
    const unmatched: Array<{ ligne: number; identifiant: string; raison: string }> = [];

    for (let r = 1; r < matrix.length; r++) {
      const raw = matrix[r]!;
      if (!raw.some((c) => c.trim())) continue;
      const cne = cneCol >= 0 ? (raw[cneCol] || '').trim() : '';
      const nom = nomCol >= 0 ? (raw[nomCol] || '').trim() : '';
      const prenom = prenomCol >= 0 ? (raw[prenomCol] || '').trim() : '';

      let student = cne ? byCne.get(cne.toLowerCase()) : undefined;
      if (!student && nom && prenom) student = byName.get(`${nom} ${prenom}`.toLowerCase().replace(/\s+/g, ' '));

      if (!student) {
        unmatched.push({ ligne: r + 1, identifiant: cne || `${nom} ${prenom}`, raison: 'Élève introuvable dans les classes de cet examen' });
        continue;
      }

      const notes: Record<number, number | null> = {};
      for (const [col, numero] of qCols) {
        const v = (raw[col] || '').trim().replace(',', '.');
        const q = questions.find((qq) => qq.numero === numero)!;
        if (!v) { notes[numero] = null; continue; }
        const num = parseFloat(v);
        notes[numero] = Number.isFinite(num) ? Math.min(Math.max(num, 0), q.bareme) : null;
      }
      matched.push({ studentId: student.id, nom: student.nom, prenom: student.prenom, notes });
    }

    return NextResponse.json({
      fileName: file.name,
      matched,
      unmatched,
      questions: questions.map((q) => ({ numero: q.numero, bareme: q.bareme })),
      total: matrix.length - 1,
    });
  } catch (error) {
    console.error('POST /api/examens/[id]/grille/import failed:', error);
    return NextResponse.json({ error: 'Échec de la lecture du fichier' }, { status: 500 });
  }
}
