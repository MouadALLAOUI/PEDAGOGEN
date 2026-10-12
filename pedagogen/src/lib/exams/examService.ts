import { getDb } from '@/lib/db';
import { getExam, getExamQuestions, getExamStudents, getGrades, createExam, type Exam, type QuestionType } from './examManager';

/** Copie un examen (questions + classes) avec une nouvelle date. */
export function duplicateExam(id: string, userId: string = 'default'): Exam | null {
  const exam = getExam(id);
  if (!exam) return null;
  const questions = getExamQuestions(id);
  return createExam({
    titre: `${exam.titre} (copie)`,
    exam_date: new Date().toISOString().slice(0, 10),
    duree: exam.duree,
    niveau: exam.niveau,
    classe_ids: exam.classe_ids,
    questions: questions.map((q) => ({
      numero: q.numero,
      type: q.type as QuestionType,
      enonce: q.enonce,
      bareme: q.bareme,
      options: q.options,
      image_url: q.image_url,
    })),
  }, userId);
}

export interface ComparaisonData {
  exams: Array<{ id: string; titre: string; exam_date: string; total_points: number }>;
  students: Array<{
    id: string;
    nom: string;
    prenom: string;
    cne: string;
    notes: Array<{ examId: string; norm20: number | null }>;
    evolution: number | null;
  }>;
}

/** Progression des élèves à travers les examens d'une classe. */
export function getComparaison(classId: string): ComparaisonData {
  const db = getDb();
  const exams = db.prepare(`
    SELECT * FROM exams
    WHERE classe_ids LIKE ?
    ORDER BY exam_date ASC
  `).all(`%"${classId}"%`) as any[];

  const result: ComparaisonData = { exams: [], students: [] };
  if (exams.length === 0) return result;

  for (const e of exams) {
    result.exams.push({ id: e.id, titre: e.titre, exam_date: e.exam_date, total_points: e.total_points });
  }

  // Union des élèves de tous ces examens
  const studentMap = new Map<string, { id: string; nom: string; prenom: string; cne: string; notes: Map<string, number | null> }>();
  for (const e of exams) {
    const exam: Exam = { ...e, classe_ids: JSON.parse(e.classe_ids || '[]') };
    for (const s of getExamStudents(exam)) {
      if (!studentMap.has(s.id)) {
        studentMap.set(s.id, { id: s.id, nom: s.nom, prenom: s.prenom, cne: s.cne, notes: new Map() });
      }
    }
    const grades = getGrades(e.id);
    const questions = getExamQuestions(e.id);
    const totalPoints = e.total_points || 1;
    for (const s of studentMap.values()) {
      let total: number | null = 0;
      let has = false;
      for (const q of questions) {
        const n = grades.get(`${s.id}:${q.numero}`);
        if (n !== null && n !== undefined) { total = (total ?? 0) + n; has = true; }
      }
      const norm = has && total !== null ? Math.round(((total / totalPoints) * 20) * 100) / 100 : null;
      s.notes.set(e.id, norm);
    }
  }

  for (const s of studentMap.values()) {
    const notes = result.exams.map((e) => ({ examId: e.id, norm20: s.notes.get(e.id) ?? null }));
    const graded = notes.filter((n) => n.norm20 !== null).map((n) => n.norm20!);
    const evolution = graded.length >= 2 ? Math.round((graded[graded.length - 1]! - graded[0]!) * 100) / 100 : null;
    result.students.push({ id: s.id, nom: s.nom, prenom: s.prenom, cne: s.cne, notes, evolution });
  }
  result.students.sort((a, b) => a.nom.localeCompare(b.nom, 'fr'));
  return result;
}

// ─── Banque de questions ───

export interface BankQuestion {
  id: string;
  type: QuestionType;
  enonce: string;
  bareme: number;
  tags: string[];
  options?: any[];
  image_url?: string;
}

export function listQuestionBank(userId: string = 'default'): BankQuestion[] {
  const db = getDb();
  const rows = db.prepare('SELECT * FROM question_bank WHERE user_id = ? ORDER BY created_at DESC').all(userId) as any[];
  return rows.map((r) => {
    let tags: string[] = [];
    try { tags = JSON.parse(r.tags || '[]'); } catch { /* [] */ }
    let options: any[] = [];
    try { options = typeof r.options === 'string' ? JSON.parse(r.options || '[]') : (r.options || []); } catch { options = []; }
    return {
      id: r.id,
      type: r.type,
      enonce: r.enonce,
      bareme: r.bareme,
      tags,
      options,
      image_url: r.image_url || '',
    };
  });
}

export function addQuestionBank(
  questions: Array<{ type?: string; enonce: string; bareme: number; tags?: string[]; options?: any[]; image_url?: string }>,
  userId: string = 'default'
): number {
  const db = getDb();
  const insert = db.prepare(`
    INSERT INTO question_bank (id, user_id, type, enonce, bareme, tags, options, image_url)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const run = db.transaction(() => {
    for (const q of questions) {
      if (!q.enonce?.trim() && !q.image_url) continue;
      insert.run(
        `qb_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        userId,
        q.type || 'ouvert',
        (q.enonce || '').trim(),
        Number(q.bareme) || 1,
        JSON.stringify(q.tags || []),
        JSON.stringify(q.options || []),
        q.image_url || ''
      );
    }
  });
  run();
  return questions.filter((q) => q.enonce?.trim() || q.image_url).length;
}

export function deleteQuestionBank(id: string): boolean {
  const db = getDb();
  return db.prepare('DELETE FROM question_bank WHERE id = ?').run(id).changes > 0;
}
