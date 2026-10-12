import { NextRequest, NextResponse } from 'next/server';
import {
  getExam,
  getExamQuestions,
  getExamStudents,
  getGrades,
  saveGrades,
  getExamStudentAnswers,
  saveExamStudentAnswers,
  syncExamGradesToStudentProfiles,
  updateExam,
} from '@/lib/exams/examManager';

/** GET — the grading matrix: students × questions + existing notes + answers. */
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const exam = getExam(id);
    if (!exam) return NextResponse.json({ error: 'Examen introuvable' }, { status: 404 });

    const questions = getExamQuestions(id).filter((q) => q.type !== 'section');
    const students = getExamStudents(exam);
    const grades = getGrades(id);
    const answers = getExamStudentAnswers(id);

    const notes: Record<string, number | null> = {};
    for (const [key, note] of grades) notes[key] = note;

    return NextResponse.json({ exam, questions, students, notes, answers });
  } catch (error) {
    console.error('GET /api/examens/[id]/grille failed:', error);
    return NextResponse.json({ error: 'Échec du chargement de la grille' }, { status: 500 });
  }
}

/** POST — batch save notes and/or student answers with sync to student profiles. */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const exam = getExam(id);
    if (!exam) return NextResponse.json({ error: 'Examen introuvable' }, { status: 404 });

    const body = await request.json();
    const questions = getExamQuestions(id);
    const baremes = new Map(questions.map((q) => [q.numero, q.bareme]));
    const validStudents = new Set(getExamStudents(exam).map((s) => s.id));

    let savedCount = 0;

    // 1. If detailed student answers provided
    if (Array.isArray(body.answers)) {
      const cleanAnswers = [];
      for (const a of body.answers) {
        if (!validStudents.has(a.studentId)) continue;
        const bareme = baremes.get(a.numero);
        if (bareme === undefined) continue;
        const note = Math.min(bareme, Math.max(0, Number(a.note || 0)));
        cleanAnswers.push({
          studentId: a.studentId,
          numero: a.numero,
          choiceKey: String(a.choiceKey || ''),
          choiceText: String(a.choiceText || ''),
          isCorrect: Boolean(a.isCorrect),
          note,
        });
      }
      saveExamStudentAnswers(id, cleanAnswers, body.syncToProfile !== false);
      savedCount += cleanAnswers.length;
    }

    // 2. If raw notes provided
    if (Array.isArray(body.notes)) {
      const clean = [];
      for (const n of body.notes) {
        const bareme = baremes.get(n.numero);
        if (bareme === undefined || !validStudents.has(n.studentId)) continue;
        if (n.note === null) {
          clean.push({ studentId: n.studentId, numero: n.numero, note: null });
        } else {
          const note = Number(n.note);
          if (!Number.isFinite(note) || note < 0 || note > bareme) {
            return NextResponse.json({ error: `Note invalide pour Q${n.numero} (barème : /${bareme})` }, { status: 400 });
          }
          clean.push({ studentId: n.studentId, numero: n.numero, note });
        }
      }
      saveGrades(id, clean);
      if (body.syncToProfile) {
        syncExamGradesToStudentProfiles(id);
      }
      savedCount += clean.length;
    }

    // 3. If pedagogical guide configuration provided
    if (body.guide_config !== undefined) {
      updateExam(id, { guide_config: body.guide_config });
      savedCount++;
    }

    return NextResponse.json({ saved: savedCount, success: true });
  } catch (error) {
    console.error('POST /api/examens/[id]/grille failed:', error);
    return NextResponse.json({ error: 'Échec de l\'enregistrement des notes' }, { status: 500 });
  }
}
