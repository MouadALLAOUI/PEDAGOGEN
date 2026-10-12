import { getDb } from '@/lib/db';
import { getStudentsByClass } from '@/lib/students/studentManager';

export const QUESTION_TYPES = ['qcm', 'vrai_faux', 'ouvert', 'appariement', 'exercice', 'tableau', 'section'] as const;
export type QuestionType = (typeof QUESTION_TYPES)[number];

export interface ExamQuestion {
  id: string;
  numero: number;
  type: QuestionType;
  enonce: string;
  bareme: number;
  options?: any;
  image_url?: string;
}

export interface ExamGuideConfig {
  visibleSections?: {
    competence?: boolean;
    bloom?: boolean;
    erreurs?: boolean;
    remediation?: boolean;
  };
  questionOverrides?: Record<number, {
    hiddenSections?: {
      competence?: boolean;
      bloom?: boolean;
      erreurs?: boolean;
      remediation?: boolean;
    };
    custom?: {
      competence?: string;
      objectif?: string;
      bloom?: string;
      baremeDetail?: string;
      erreursFrequentes?: string;
      remediation?: string;
    };
  }>;
}

export interface Exam {
  id: string;
  titre: string;
  exam_date: string;
  duree: number;
  niveau: string;
  classe_ids: string[];
  total_points: number;
  created_at: string;
  guide_config?: ExamGuideConfig | null;
  user_id?: string;
}

export interface GrilleStudent {
  id: string;
  nom: string;
  prenom: string;
  cne: string;
  classe_id: string;
  classe_nom: string;
}

export interface ExamAnalyse {
  exam: Exam;
  questions: ExamQuestion[];
  students: Array<{
    id: string;
    nom: string;
    prenom: string;
    cne: string;
    classe_nom: string;
    total: number | null;
    norm20: number | null;
    notes: Record<number, number | null>;
    profil: 'en_difficulte' | 'dans_la_moyenne' | 'en_avance' | 'non_note';
  }>;
  moyenne20: number | null;
  tauxReussite: number | null;
  histogram: { bucket: string; count: number }[];
  questionStats: Array<{
    numero: number;
    type: string;
    enonce: string;
    bareme: number;
    moyenne: number | null;
    tauxEchec: number | null;
  }>;
  profils: { en_difficulte: number; dans_la_moyenne: number; en_avance: number; non_note: number };
}

function parseClasseIds(raw: string): string[] {
  try { return JSON.parse(raw) || []; } catch { return []; }
}

function rowToExam(r: any): Exam {
  let guideConfig: ExamGuideConfig | null = null;
  if (r.guide_config) {
    try {
      guideConfig = typeof r.guide_config === 'string' ? JSON.parse(r.guide_config) : r.guide_config;
    } catch {
      guideConfig = null;
    }
  }
  return { ...r, classe_ids: parseClasseIds(r.classe_ids), guide_config: guideConfig };
}

export function listExams(userId: string = 'default'): Exam[] {
  const db = getDb();
  const rows = db.prepare('SELECT * FROM exams WHERE user_id = ? ORDER BY exam_date DESC, created_at DESC').all(userId) as any[];
  return rows.map(rowToExam);
}

export function getExam(id: string): Exam | null {
  const db = getDb();
  const row = db.prepare('SELECT * FROM exams WHERE id = ?').get(id) as any;
  return row ? rowToExam(row) : null;
}

export function getExamQuestions(examId: string): ExamQuestion[] {
  const db = getDb();
  const rows = db.prepare('SELECT * FROM exam_questions WHERE exam_id = ? ORDER BY numero').all(examId) as any[];
  return rows.map((r) => {
    let options: any = [];
    try { options = typeof r.options === 'string' ? JSON.parse(r.options || '[]') : (r.options || []); } catch { options = []; }
    return {
      id: r.id,
      numero: r.numero,
      type: r.type,
      enonce: r.enonce,
      bareme: r.bareme,
      options,
      image_url: r.image_url || '',
    };
  });
}

export function createExam(
  data: {
    titre: string;
    exam_date: string;
    duree?: number;
    niveau?: string;
    classe_ids?: string[];
    questions?: Array<{ numero?: number; type?: QuestionType; enonce?: string; bareme: number; options?: any; image_url?: string }>;
  },
  userId: string = 'default'
): Exam {
  const db = getDb();
  const id = `exam_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const totalPoints = (data.questions || []).reduce((s, q) => s + (Number(q.bareme) || 0), 0);

  const insert = db.transaction(() => {
    db.prepare(`
      INSERT INTO exams (id, user_id, titre, exam_date, duree, niveau, classe_ids, total_points)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id, userId, data.titre.trim(), data.exam_date,
      data.duree || 60, data.niveau || '1AC',
      JSON.stringify(data.classe_ids || []), totalPoints
    );
    (data.questions || []).forEach((q, i) => {
      db.prepare(`
        INSERT INTO exam_questions (id, exam_id, numero, type, enonce, bareme, options, image_url)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        `eq_${Date.now()}_${i}_${Math.random().toString(36).slice(2, 6)}`,
        id,
        q.numero ?? i + 1,
        q.type || 'ouvert',
        q.enonce || '',
        q.bareme,
        JSON.stringify(q.options || []),
        q.image_url || ''
      );
    });
  });
  insert();
  return getExam(id)!;
}

export function updateExam(
  id: string,
  data: Partial<{
    titre: string;
    exam_date: string;
    duree: number;
    niveau: string;
    classe_ids: string[];
    guide_config: ExamGuideConfig | string;
    questions: Array<{ numero?: number; type?: QuestionType; enonce?: string; bareme: number; options?: any[]; image_url?: string }>;
  }>,
  userId?: string
): Exam | null {
  const db = getDb();
  const existing = getExam(id);
  if (!existing) return null;
  if (userId && existing.user_id && existing.user_id !== 'default' && existing.user_id !== userId) {
    return null;
  }

  const run = db.transaction(() => {
    const fields: string[] = [];
    const values: unknown[] = [];
    if (data.titre !== undefined) { fields.push('titre = ?'); values.push(data.titre.trim()); }
    if (data.exam_date !== undefined) { fields.push('exam_date = ?'); values.push(data.exam_date); }
    if (data.duree !== undefined) { fields.push('duree = ?'); values.push(data.duree); }
    if (data.niveau !== undefined) { fields.push('niveau = ?'); values.push(data.niveau); }
    if (data.classe_ids !== undefined) { fields.push('classe_ids = ?'); values.push(JSON.stringify(data.classe_ids)); }
    if (data.guide_config !== undefined) {
      fields.push('guide_config = ?');
      values.push(typeof data.guide_config === 'string' ? data.guide_config : JSON.stringify(data.guide_config));
    }
    if (data.questions !== undefined) {
      fields.push('total_points = ?');
      values.push(data.questions.reduce((s, q) => s + (Number(q.bareme) || 0), 0));
      db.prepare('DELETE FROM exam_questions WHERE exam_id = ?').run(id);
      data.questions.forEach((q, i) => {
        db.prepare(`
          INSERT INTO exam_questions (id, exam_id, numero, type, enonce, bareme, options, image_url)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          `eq_${Date.now()}_${i}_${Math.random().toString(36).slice(2, 6)}`,
          id,
          q.numero ?? i + 1,
          q.type || 'ouvert',
          q.enonce || '',
          q.bareme,
          JSON.stringify(q.options || []),
          q.image_url || ''
        );
      });
    }
    if (fields.length > 0) {
      fields.push('updated_at = datetime(\'now\')');
      values.push(id);
      let sql = `UPDATE exams SET ${fields.join(', ')} WHERE id = ?`;
      if (userId) {
        sql += " AND (user_id = ? OR user_id = 'default')";
        values.push(userId);
      }
      db.prepare(sql).run(...values);
    }
  });
  run();
  return getExam(id);
}

export function deleteExam(id: string, userId?: string): boolean {
  const db = getDb();
  let sql = 'DELETE FROM exams WHERE id = ?';
  const values = [id];
  if (userId) {
    sql += " AND (user_id = ? OR user_id = 'default')";
    values.push(userId);
  }
  const res = db.prepare(sql).run(...values);
  return res.changes > 0;
}

/** Students enrolled in any of the exam's classes (deduplicated). */
export function getExamStudents(exam: Exam): GrilleStudent[] {
  const db = getDb();
  const byId = new Map<string, GrilleStudent>();
  for (const classeId of exam.classe_ids) {
    const cls = db.prepare('SELECT name FROM classes WHERE id = ?').get(classeId) as { name: string } | undefined;
    for (const s of getStudentsByClass(classeId)) {
      if (!byId.has(s.id)) {
        byId.set(s.id, {
          id: s.id,
          nom: (s as any).last_name || '',
          prenom: (s as any).first_name || '',
          cne: (s as any).cne_massar || '',
          classe_id: classeId,
          classe_nom: cls?.name || '',
        });
      }
    }
  }
  return [...byId.values()].sort((a, b) => a.nom.localeCompare(b.nom, 'fr') || a.prenom.localeCompare(b.prenom, 'fr'));
}

export function getGrades(examId: string): Map<string, number | null> {
  const db = getDb();
  const rows = db.prepare('SELECT student_id, question_numero, note FROM exam_grades WHERE exam_id = ?').all(examId) as any[];
  const map = new Map<string, number | null>();
  for (const r of rows) map.set(`${r.student_id}:${r.question_numero}`, r.note);
  return map;
}

/** Upsert grades; note === null removes the entry (non noté / absent). */
export function saveGrades(
  examId: string,
  grades: Array<{ studentId: string; numero: number; note: number | null }>
): void {
  const db = getDb();
  const deleteStmt = db.prepare('DELETE FROM exam_grades WHERE exam_id = ? AND student_id = ? AND question_numero = ?');
  const insertStmt = db.prepare(`
    INSERT INTO exam_grades (id, exam_id, student_id, question_numero, note)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(exam_id, student_id, question_numero) DO UPDATE SET note = excluded.note
  `);

  const run = db.transaction(() => {
    for (const g of grades) {
      if (g.note === null || g.note === undefined || Number.isNaN(g.note)) {
        deleteStmt.run(examId, g.studentId, g.numero);
      } else {
        insertStmt.run(`g_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`, examId, g.studentId, g.numero, g.note);
      }
    }
  });
  run();
}

/** Synchronise les notes totales de l'examen dans student_grades pour chaque élève */
export function syncExamGradesToStudentProfiles(examId: string): void {
  const db = getDb();
  const exam = getExam(examId);
  if (!exam) return;
  const examStudents = getExamStudents(exam);
  const byStudent = new Map<string, number>();

  const rows = db.prepare('SELECT student_id, SUM(note) as total FROM exam_grades WHERE exam_id = ? AND note IS NOT NULL GROUP BY student_id').all(examId) as any[];
  for (const r of rows) byStudent.set(r.student_id, Number(r.total || 0));

  const totalPoints = exam.total_points || 20;

  for (const s of examStudents) {
    if (!byStudent.has(s.id)) continue;
    const total = byStudent.get(s.id)!;
    const date = exam.exam_date || new Date().toISOString().split('T')[0];
    const comment = `Évaluation : ${exam.titre} (Score: ${total}/${totalPoints})`;

    const existing = db.prepare('SELECT id FROM student_grades WHERE student_id = ? AND title = ?').get(s.id, exam.titre) as any;
    if (existing) {
      db.prepare(`
        UPDATE student_grades
        SET score = ?, max_score = ?, date = ?, comment = ?
        WHERE id = ?
      `).run(total, totalPoints, date, comment, existing.id);
    } else {
      const gid = `grade_exam_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      db.prepare(`
        INSERT INTO student_grades (id, class_id, student_id, title, eval_type, score, max_score, coeff, date, comment)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(gid, s.classe_id, s.id, exam.titre, 'controle', total, totalPoints, 1, date, comment);
    }
  }
}

export interface StoredStudentAnswer {
  studentId: string;
  numero: number;
  choiceKey: string;
  choiceText: string;
  isCorrect: boolean;
  note: number;
}

export function getExamStudentAnswers(examId: string): StoredStudentAnswer[] {
  const db = getDb();
  try {
    const rows = db.prepare(`
      SELECT student_id as studentId, question_numero as numero,
             choice_key as choiceKey, choice_text as choiceText,
             is_correct as isCorrect, note
      FROM exam_student_answers
      WHERE exam_id = ?
    `).all(examId) as any[];

    return rows.map((r) => ({
      studentId: r.studentId,
      numero: r.numero,
      choiceKey: r.choiceKey || '',
      choiceText: r.choiceText || '',
      isCorrect: Boolean(r.isCorrect),
      note: Number(r.note || 0),
    }));
  } catch (err) {
    console.error('getExamStudentAnswers failed:', err);
    return [];
  }
}

export function saveExamStudentAnswers(
  examId: string,
  answers: StoredStudentAnswer[],
  syncToStudentProfiles: boolean = true
): void {
  const db = getDb();
  const run = db.transaction(() => {
    for (const a of answers) {
      const aid = `ans_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      db.prepare(`
        INSERT INTO exam_student_answers (id, exam_id, student_id, question_numero, choice_key, choice_text, is_correct, note, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
        ON CONFLICT(exam_id, student_id, question_numero) DO UPDATE SET
          choice_key = excluded.choice_key,
          choice_text = excluded.choice_text,
          is_correct = excluded.is_correct,
          note = excluded.note,
          updated_at = datetime('now')
      `).run(
        aid, examId, a.studentId, a.numero,
        a.choiceKey || '', a.choiceText || '',
        a.isCorrect ? 1 : 0, a.note
      );

      db.prepare(`
        INSERT INTO exam_grades (id, exam_id, student_id, question_numero, note)
        VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(exam_id, student_id, question_numero) DO UPDATE SET note = excluded.note
      `).run(`g_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`, examId, a.studentId, a.numero, a.note);
    }

    if (syncToStudentProfiles) {
      syncExamGradesToStudentProfiles(examId);
    }
  });
  run();
}

/** Color thresholds (spec) on the /20 normalized scale. */
export function noteColor(norm20: number | null): 'rouge' | 'orange' | 'vert' | null {
  if (norm20 === null || norm20 === undefined) return null;
  if (norm20 < 5) return 'rouge';
  if (norm20 < 10) return 'orange';
  return 'vert';
}

export function computeAnalyse(examId: string): ExamAnalyse | null {
  const exam = getExam(examId);
  if (!exam) return null;
  const questions = getExamQuestions(examId);
  const students = getExamStudents(exam);
  const grades = getGrades(examId);
  const totalPoints = exam.total_points || 1;

  const analyse: ExamAnalyse = {
    exam, questions,
    students: [],
    moyenne20: null, tauxReussite: null,
    histogram: [
      { bucket: '0–5', count: 0 },
      { bucket: '5–10', count: 0 },
      { bucket: '10–15', count: 0 },
      { bucket: '15–20', count: 0 },
    ],
    questionStats: [],
    profils: { en_difficulte: 0, dans_la_moyenne: 0, en_avance: 0, non_note: 0 },
  };

  let sum20 = 0;
  let gradedCount = 0;
  let passedCount = 0;

  for (const s of students) {
    const notes: Record<number, number | null> = {};
    let total: number | null = 0;
    let hasNote = false;
    for (const q of questions) {
      const note = grades.has(`${s.id}:${q.numero}`) ? grades.get(`${s.id}:${q.numero}`)! : null;
      notes[q.numero] = note;
      if (note !== null) {
        hasNote = true;
        total = (total ?? 0) + note;
      }
    }
    if (!hasNote) total = null;
    const norm20 = total === null ? null : Math.min(20, (total / totalPoints) * 20);
    const profil: ExamAnalyse['students'][number]['profil'] =
      norm20 === null ? 'non_note'
        : norm20 < 10 ? 'en_difficulte'
        : norm20 < 15 ? 'dans_la_moyenne'
        : 'en_avance';

    analyse.students.push({ id: s.id, nom: s.nom, prenom: s.prenom, cne: s.cne, classe_nom: s.classe_nom, total, norm20, notes, profil });

    if (norm20 !== null) {
      gradedCount++;
      sum20 += norm20;
      if (norm20 >= 10) passedCount++;
      if (norm20 < 5) analyse.histogram[0]!.count++;
      else if (norm20 < 10) analyse.histogram[1]!.count++;
      else if (norm20 < 15) analyse.histogram[2]!.count++;
      else analyse.histogram[3]!.count++;
      analyse.profils[profil]++;
    } else {
      analyse.profils.non_note++;
    }
  }

  if (gradedCount > 0) {
    analyse.moyenne20 = Math.round((sum20 / gradedCount) * 100) / 100;
    analyse.tauxReussite = Math.round((passedCount / gradedCount) * 10000) / 100;
  }

  for (const q of questions) {
    if (q.type === 'section') continue;
    let sum = 0;
    let n = 0;
    let failed = 0;
    for (const s of analyse.students) {
      const note = s.notes[q.numero];
      if (note !== null && note !== undefined) {
        sum += note;
        n++;
        if (note < q.bareme / 2) failed++;
      }
    }
    analyse.questionStats.push({
      numero: q.numero, type: q.type, enonce: q.enonce, bareme: q.bareme,
      moyenne: n > 0 ? Math.round((sum / n) * 100) / 100 : null,
      tauxEchec: n > 0 ? Math.round((failed / n) * 10000) / 100 : null,
    });
  }

  return analyse;
}
