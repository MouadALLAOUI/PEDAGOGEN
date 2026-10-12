import { getDb } from '@/lib/db';
import crypto from 'crypto';
import type {
  AcademicSeason,
  CollegeClass,
  Student,
  StudentAttendance,
  StudentGrade,
  StudentObservation,
  StudentAiInsight,
  StudentProfile360,
  SessionFeedback,
  StudentPedagogicalPatterns,
  ComprehensionDimension,
  StudentQuizResult,
} from '@/types/student';

// ─── SEASONS ───

export function getSeasons(userId: string = 'default'): AcademicSeason[] {
  const db = getDb();
  const rows = db
    .prepare("SELECT * FROM academic_seasons WHERE user_id = ? OR user_id = 'default' ORDER BY code DESC")
    .all(userId) as any[];

  return rows.map((r) => ({
    ...r,
    is_current: Boolean(r.is_current),
  }));
}

export function getCurrentSeason(userId: string = 'default'): AcademicSeason {
  const db = getDb();
  let row = db
    .prepare("SELECT * FROM academic_seasons WHERE (user_id = ? OR user_id = 'default') AND is_current = 1 ORDER BY CASE WHEN user_id = ? THEN 0 ELSE 1 END LIMIT 1")
    .get(userId, userId) as any;

  if (!row) {
    row = db.prepare("SELECT * FROM academic_seasons WHERE code = '2026/2027' LIMIT 1").get() as any;
  }

  if (!row) {
    // Create fallback 2026/2027
    const id = 'season-2026-2027';
    db.prepare(`
      INSERT INTO academic_seasons (id, user_id, code, label, is_current, start_date, end_date)
      VALUES (?, ?, ?, ?, 1, '2026-09-01', '2027-06-30')
    `).run(id, userId, '2026/2027', 'Année Scolaire 2026/2027');

    return {
      id,
      user_id: userId,
      code: '2026/2027',
      label: 'Année Scolaire 2026/2027',
      is_current: true,
      start_date: '2026-09-01',
      end_date: '2027-06-30',
    };
  }

  return {
    ...row,
    is_current: Boolean(row.is_current),
  };
}

export function createSeason(
  data: { code: string; label: string; is_current?: boolean; start_date?: string; end_date?: string },
  userId: string = 'default'
): AcademicSeason {
  const db = getDb();
  const id = `season_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;

  if (data.is_current) {
    db.prepare('UPDATE academic_seasons SET is_current = 0 WHERE user_id = ? OR user_id = ?').run(userId, 'default');
  }

  db.prepare(`
    INSERT INTO academic_seasons (id, user_id, code, label, is_current, start_date, end_date)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    userId,
    data.code,
    data.label,
    data.is_current ? 1 : 0,
    data.start_date || null,
    data.end_date || null
  );

  return {
    id,
    user_id: userId,
    code: data.code,
    label: data.label,
    is_current: Boolean(data.is_current),
    start_date: data.start_date,
    end_date: data.end_date,
  };
}

export function setCurrentSeason(id: string, userId: string = 'default'): void {
  const db = getDb();
  db.prepare('UPDATE academic_seasons SET is_current = 0 WHERE user_id = ? OR user_id = ?').run(userId, 'default');
  db.prepare('UPDATE academic_seasons SET is_current = 1 WHERE id = ?').run(id);
}

// ─── CLASSES ───

export function getClassesBySeason(seasonId: string, userId: string = 'default'): CollegeClass[] {
  const db = getDb();
  const rows = db
    .prepare(`
      SELECT c.*, 
        s.code as season_code,
        (SELECT COUNT(*) FROM class_enrollments ce WHERE ce.class_id = c.id) as student_count
      FROM classes c
      LEFT JOIN academic_seasons s ON c.season_id = s.id
      WHERE c.season_id = ? AND (c.user_id = ? OR c.user_id = 'default')
      ORDER BY c.niveau ASC, c.name ASC
    `)
    .all(seasonId, userId) as any[];

  return rows.map(r => ({
    ...r,
    student_count: Number(r.student_count || 0),
  }));
}

export function getClassById(id: string): CollegeClass | null {
  const db = getDb();
  const row = db
    .prepare(`
      SELECT c.*, 
        s.code as season_code,
        (SELECT COUNT(*) FROM class_enrollments ce WHERE ce.class_id = c.id) as student_count
      FROM classes c
      LEFT JOIN academic_seasons s ON c.season_id = s.id
      WHERE c.id = ?
    `)
    .get(id) as any;

  if (!row) return null;
  return {
    ...row,
    student_count: Number(row.student_count || 0),
  };
}

export function createClass(
  data: {
    season_id: string;
    niveau: '1AC' | '2AC' | '3AC';
    name: string;
    matiere?: string;
    room?: string;
    description?: string;
  },
  userId: string = 'default'
): CollegeClass {
  const db = getDb();
  const id = `class_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;

  db.prepare(`
    INSERT INTO classes (id, user_id, season_id, niveau, name, matiere, room, description)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    userId,
    data.season_id,
    data.niveau,
    data.name,
    data.matiere || 'Informatique',
    data.room || '',
    data.description || ''
  );

  return getClassById(id)!;
}

export function updateClass(id: string, data: Partial<CollegeClass>, userId?: string): CollegeClass | null {
  const db = getDb();
  const fields: string[] = [];
  const values: any[] = [];

  if (data.name !== undefined) { fields.push('name = ?'); values.push(data.name); }
  if (data.niveau !== undefined) { fields.push('niveau = ?'); values.push(data.niveau); }
  if (data.matiere !== undefined) { fields.push('matiere = ?'); values.push(data.matiere); }
  if (data.room !== undefined) { fields.push('room = ?'); values.push(data.room); }
  if (data.description !== undefined) { fields.push('description = ?'); values.push(data.description); }

  if (fields.length === 0) return getClassById(id);

  values.push(id);
  let sql = `UPDATE classes SET ${fields.join(', ')} WHERE id = ?`;
  if (userId) {
    sql += " AND (user_id = ? OR user_id = 'default')";
    values.push(userId);
  }
  const info = db.prepare(sql).run(...values);
  if (info.changes === 0) return null;
  return getClassById(id);
}

export function deleteClass(id: string, userId?: string): boolean {
  const db = getDb();
  let sql = 'DELETE FROM classes WHERE id = ?';
  const values = [id];
  if (userId) {
    sql += " AND (user_id = ? OR user_id = 'default')";
    values.push(userId);
  }
  const info = db.prepare(sql).run(...values);
  return info.changes > 0;
}

// ─── STUDENTS ───

export function getStudentsByClass(classId: string): Student[] {
  const db = getDb();
  const rows = db
    .prepare(`
      SELECT s.*, 
        ce.student_number,
        c.id as class_id,
        c.name as class_name,
        c.niveau as niveau,
        (
          SELECT ROUND(AVG(score / max_score * 20), 1)
          FROM student_grades g 
          WHERE g.student_id = s.id AND g.class_id = ce.class_id
        ) as average_grade,
        (
          SELECT COUNT(*) 
          FROM student_attendance a 
          WHERE a.student_id = s.id AND a.class_id = ce.class_id AND a.type = 'absence'
        ) as absence_count,
        (
          SELECT mental_state 
          FROM student_observations o 
          WHERE o.student_id = s.id AND o.class_id = ce.class_id 
          ORDER BY o.date DESC, o.created_at DESC LIMIT 1
        ) as last_mental_state,
        (
          SELECT comprehension 
          FROM student_observations o 
          WHERE o.student_id = s.id AND o.class_id = ce.class_id 
          ORDER BY o.date DESC, o.created_at DESC LIMIT 1
        ) as last_comprehension,
        (
          SELECT COUNT(*)
          FROM student_observations o
          WHERE o.student_id = s.id AND o.class_id = ce.class_id AND o.needs_help = 1 AND o.help_status = 'en_cours'
        ) as needs_help_count
      FROM students s
      JOIN class_enrollments ce ON s.id = ce.student_id
      JOIN classes c ON ce.class_id = c.id
      WHERE ce.class_id = ?
      ORDER BY ce.student_number ASC, s.last_name ASC, s.first_name ASC
    `)
    .all(classId) as any[];

  return rows.map(r => ({
    ...r,
    average_grade: r.average_grade != null ? Number(r.average_grade) : undefined,
    absence_count: Number(r.absence_count || 0),
    needs_help_count: Number(r.needs_help_count || 0),
  }));
}

export function getStudentById(id: string): Student | null {
  const db = getDb();
  const row = db
    .prepare(`
      SELECT s.*, 
        ce.class_id,
        ce.student_number,
        c.name as class_name,
        c.niveau
      FROM students s
      LEFT JOIN class_enrollments ce ON s.id = ce.student_id
      LEFT JOIN classes c ON ce.class_id = c.id
      WHERE s.id = ?
    `)
    .get(id) as any;

  if (!row) return null;
  return row as Student;
}

export function createStudent(
  data: {
    first_name: string;
    last_name: string;
    cne_massar?: string;
    gender?: 'M' | 'F';
    birth_date?: string;
    tarl_status?: string;
    special_needs?: string;
    guardian_name?: string;
    guardian_phone?: string;
    class_id?: string;
    season_id?: string;
    student_number?: number;
  },
  userId: string = 'default'
): Student {
  const db = getDb();
  const id = `student_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;

  db.prepare(`
    INSERT INTO students (
      id, user_id, cne_massar, first_name, last_name, gender, birth_date,
      tarl_status, special_needs, guardian_name, guardian_phone
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    userId,
    data.cne_massar || '',
    data.first_name.trim(),
    data.last_name.trim(),
    data.gender || 'M',
    data.birth_date || '',
    data.tarl_status || 'standard',
    data.special_needs || '',
    data.guardian_name || '',
    data.guardian_phone || ''
  );

  if (data.class_id && data.season_id) {
    enrollStudent(id, data.class_id, data.season_id, data.student_number);
  }

  return getStudentById(id)!;
}

export function updateStudent(id: string, data: Partial<Student>): Student | null {
  const db = getDb();
  const fields: string[] = [];
  const values: any[] = [];

  const allowed = [
    'first_name', 'last_name', 'cne_massar', 'gender', 'birth_date',
    'avatar_url', 'tarl_status', 'special_needs', 'guardian_name', 'guardian_phone'
  ];

  for (const key of allowed) {
    if ((data as any)[key] !== undefined) {
      fields.push(`${key} = ?`);
      values.push((data as any)[key]);
    }
  }

  if (fields.length > 0) {
    values.push(id);
    db.prepare(`UPDATE students SET ${fields.join(', ')} WHERE id = ?`).run(...values);
  }

  return getStudentById(id);
}

export function deleteStudent(id: string): boolean {
  const db = getDb();
  const res = db.prepare('DELETE FROM students WHERE id = ?').run(id);
  return res.changes > 0;
}

export function enrollStudent(
  studentId: string,
  classId: string,
  seasonId: string,
  studentNumber?: number
): void {
  const db = getDb();
  const id = `enr_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;

  let num = studentNumber;
  if (num == null) {
    const maxRow = db
      .prepare('SELECT MAX(student_number) as max_num FROM class_enrollments WHERE class_id = ?')
      .get(classId) as { max_num: number | null };
    num = (maxRow?.max_num || 0) + 1;
  }

  db.prepare(`
    INSERT INTO class_enrollments (id, class_id, student_id, season_id, student_number)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(class_id, student_id) DO UPDATE SET
      season_id = excluded.season_id,
      student_number = excluded.student_number
  `).run(id, classId, studentId, seasonId, num);
}

// ─── ATTENDANCE ───

export function getAttendanceByClassAndDate(classId: string, date: string): StudentAttendance[] {
  const db = getDb();
  const rows = db
    .prepare(`
      SELECT a.*, (s.last_name || ' ' || s.first_name) as student_name
      FROM student_attendance a
      JOIN students s ON a.student_id = s.id
      WHERE a.class_id = ? AND a.date = ?
      ORDER BY s.last_name ASC
    `)
    .all(classId, date) as any[];

  return rows.map(r => ({ ...r, is_justified: Boolean(r.is_justified) }));
}

export function getAttendanceByStudent(studentId: string): StudentAttendance[] {
  const db = getDb();
  const rows = db
    .prepare(`
      SELECT * FROM student_attendance 
      WHERE student_id = ? 
      ORDER BY date DESC, created_at DESC
    `)
    .all(studentId) as any[];

  return rows.map(r => ({ ...r, is_justified: Boolean(r.is_justified) }));
}

export function markAttendance(
  records: {
    class_id: string;
    student_id: string;
    date: string;
    session_title?: string;
    type: 'presence' | 'absence' | 'retard';
    is_justified?: boolean;
    notes?: string;
  }[]
): void {
  const db = getDb();
  const upsert = db.prepare(`
    INSERT INTO student_attendance (id, class_id, student_id, date, session_title, type, is_justified, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const deleteExisting = db.prepare(`
    DELETE FROM student_attendance WHERE class_id = ? AND student_id = ? AND date = ?
  `);

  const tx = db.transaction((recs: typeof records) => {
    for (const r of recs) {
      deleteExisting.run(r.class_id, r.student_id, r.date);
      if (r.type !== 'presence') {
        const id = `att_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
        upsert.run(
          id,
          r.class_id,
          r.student_id,
          r.date,
          r.session_title || '',
          r.type,
          r.is_justified ? 1 : 0,
          r.notes || ''
        );
      }
    }
  });

  tx(records);
}

// ─── GRADES ───

export function getGradesByClass(classId: string): StudentGrade[] {
  const db = getDb();
  const rows = db
    .prepare(`
      SELECT g.*, (s.last_name || ' ' || s.first_name) as student_name
      FROM student_grades g
      JOIN students s ON g.student_id = s.id
      WHERE g.class_id = ?
      ORDER BY g.date DESC, g.title ASC
    `)
    .all(classId) as any[];

  return rows as StudentGrade[];
}

export function getGradesByStudent(studentId: string): StudentGrade[] {
  const db = getDb();
  const rows = db
    .prepare(`
      SELECT * FROM student_grades 
      WHERE student_id = ? 
      ORDER BY date DESC
    `)
    .all(studentId) as any[];

  return rows as StudentGrade[];
}

export function saveGrade(data: {
  class_id: string;
  student_id: string;
  title: string;
  eval_type: string;
  score: number;
  max_score?: number;
  coeff?: number;
  date: string;
  comment?: string;
}): StudentGrade {
  const db = getDb();
  const id = `grd_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;

  db.prepare(`
    INSERT INTO student_grades (
      id, class_id, student_id, title, eval_type, score, max_score, coeff, date, comment
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    data.class_id,
    data.student_id,
    data.title,
    data.eval_type || 'controle',
    data.score,
    data.max_score || 20,
    data.coeff || 1,
    data.date,
    data.comment || ''
  );

  return db.prepare('SELECT * FROM student_grades WHERE id = ?').get(id) as StudentGrade;
}

export function deleteGrade(id: string): boolean {
  const db = getDb();
  const res = db.prepare('DELETE FROM student_grades WHERE id = ?').run(id);
  return res.changes > 0;
}

// ─── OBSERVATIONS & EMOTIONAL/MENTAL STATE ───

function mapObservation(r: any): StudentObservation {
  let comportements: any[] = [];
  try {
    comportements = r.comportements ? JSON.parse(r.comportements) : [];
  } catch {
    comportements = [];
  }

  let prochaine_seance: any[] = [];
  try {
    prochaine_seance = r.prochaine_seance ? JSON.parse(r.prochaine_seance) : [];
  } catch {
    prochaine_seance = [];
  }

  return {
    ...r,
    observation_type: r.observation_type || (r.student_id ? 'individuelle' : 'collective'),
    participation: r.participation || 'moyenne',
    comprehension: r.comprehension || 'maitrise',
    comportements,
    difficulte: r.difficulte || 'aucune',
    action_pedagogique: r.action_pedagogique || 'aucune',
    notion: r.notion || '',
    matiere: r.matiere || '',
    niveau: r.niveau || '',
    unite: r.unite || '',
    lecon: r.lecon || '',
    cause_possible: r.cause_possible || 'a_determiner',
    prochaine_seance,
    needs_help: Boolean(r.needs_help),
  };
}

export function getObservationsByClass(classId: string, limit: number = 60): StudentObservation[] {
  const db = getDb();
  const rows = db
    .prepare(`
      SELECT o.*, COALESCE((s.last_name || ' ' || s.first_name), 'Observation Collective (Classe entière)') as student_name
      FROM student_observations o
      LEFT JOIN students s ON o.student_id = s.id
      WHERE o.class_id = ?
      ORDER BY o.date DESC, o.created_at DESC
      LIMIT ?
    `)
    .all(classId, limit) as any[];

  return rows.map(mapObservation);
}

export function getObservationsByStudent(studentId: string): StudentObservation[] {
  const db = getDb();
  const rows = db
    .prepare(`
      SELECT * FROM student_observations 
      WHERE student_id = ? 
      ORDER BY date DESC, created_at DESC
    `)
    .all(studentId) as any[];

  return rows.map(mapObservation);
}

export function addObservation(data: {
  class_id: string;
  student_id?: string;
  date: string;
  observation_type?: 'individuelle' | 'collective';
  participation?: string;
  comprehension?: string;
  comportements?: string[];
  difficulte?: string;
  action_pedagogique?: string;
  notion?: string;
  matiere?: string;
  niveau?: string;
  unite?: string;
  lecon?: string;
  cause_possible?: string;
  prochaine_seance?: string[];
  observation_text?: string;
  mental_state?: string;
  participation_level?: string;
  needs_help?: boolean;
  help_topic?: string;
  help_urgency?: string;
  help_status?: string;
}): StudentObservation {
  const db = getDb();
  const id = `obs_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;

  db.prepare(`
    INSERT INTO student_observations (
      id, class_id, student_id, date, observation_type,
      participation, comprehension, comportements, difficulte, action_pedagogique,
      notion, matiere, niveau, unite, lecon, cause_possible, prochaine_seance,
      mental_state, participation_level, observation_text,
      needs_help, help_topic, help_urgency, help_status
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    data.class_id,
    data.student_id || null,
    data.date,
    data.observation_type || (data.student_id ? 'individuelle' : 'collective'),
    data.participation || 'moyenne',
    data.comprehension || 'maitrise',
    JSON.stringify(data.comportements || []),
    data.difficulte || 'aucune',
    data.action_pedagogique || 'aucune',
    data.notion || '',
    data.matiere || '',
    data.niveau || '',
    data.unite || '',
    data.lecon || '',
    data.cause_possible || 'a_determiner',
    JSON.stringify(data.prochaine_seance || []),
    data.mental_state || 'calme',
    data.participation_level || 'moyenne',
    data.observation_text || '',
    data.needs_help ? 1 : 0,
    data.help_topic || '',
    data.help_urgency || 'moyen',
    data.help_status || 'en_cours'
  );

  const row = db.prepare('SELECT * FROM student_observations WHERE id = ?').get(id) as any;
  return mapObservation(row);
}

export function updateHelpStatus(
  observationId: string,
  status: 'en_cours' | 'resolu' | 'a_renforcer'
): boolean {
  const db = getDb();
  const res = db.prepare('UPDATE student_observations SET help_status = ? WHERE id = ?').run(status, observationId);
  return res.changes > 0;
}

// ─── BILANS RAPIDES DE SÉANCE (30-60s) ───

export function saveSessionFeedback(data: {
  class_id: string;
  date: string;
  matiere?: string;
  niveau?: string;
  unite?: string;
  lecon?: string;
  objectif_atteint?: 'oui' | 'partiellement' | 'non';
  participation_globale?: 'bonne' | 'moyenne' | 'faible';
  comprehension_globale?: 'bonne' | 'heterogene' | 'faible';
  difficulte_principale?: string;
  eleves_a_revoir?: string[];
  a_reprendre?: string;
  note_libre?: string;
}): SessionFeedback {
  const db = getDb();
  const id = `sfb_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;

  db.prepare(`
    INSERT INTO session_feedbacks (
      id, class_id, date, matiere, niveau, unite, lecon,
      objectif_atteint, participation_globale, comprehension_globale,
      difficulte_principale, eleves_a_revoir, a_reprendre, note_libre
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    data.class_id,
    data.date,
    data.matiere || '',
    data.niveau || '',
    data.unite || '',
    data.lecon || '',
    data.objectif_atteint || 'partiellement',
    data.participation_globale || 'moyenne',
    data.comprehension_globale || 'heterogene',
    data.difficulte_principale || '',
    JSON.stringify(data.eleves_a_revoir || []),
    data.a_reprendre || '',
    data.note_libre || ''
  );

  const row = db.prepare('SELECT * FROM session_feedbacks WHERE id = ?').get(id) as any;
  return {
    ...row,
    eleves_a_revoir: JSON.parse(row.eleves_a_revoir || '[]'),
  };
}

export function getSessionFeedbacksByClass(classId: string, limit: number = 20): SessionFeedback[] {
  const db = getDb();
  const rows = db
    .prepare('SELECT * FROM session_feedbacks WHERE class_id = ? ORDER BY date DESC, created_at DESC LIMIT ?')
    .all(classId, limit) as any[];

  return rows.map((r) => ({
    ...r,
    eleves_a_revoir: JSON.parse(r.eleves_a_revoir || '[]'),
  }));
}

export function getFeedbackSummaryForLesson(matiere: string, niveau: string, lecon: string) {
  const db = getDb();
  
  const cleanMatiere = (matiere || '').trim();
  const cleanNiveau = (niveau || '').trim();
  const cleanLecon = (lecon || '').trim();

  const feedbacks = db.prepare(`
    SELECT * FROM session_feedbacks 
    WHERE (matiere LIKE ? OR ? = '')
      AND (niveau LIKE ? OR ? = '')
      AND (lecon LIKE ? OR ? LIKE ('%' || lecon || '%'))
    ORDER BY date DESC LIMIT 5
  `).all(`%${cleanMatiere}%`, cleanMatiere, `%${cleanNiveau}%`, cleanNiveau, `%${cleanLecon}%`, cleanLecon) as any[];

  const observations = db.prepare(`
    SELECT * FROM student_observations 
    WHERE (matiere LIKE ? OR ? = '')
      AND (niveau LIKE ? OR ? = '')
      AND (lecon LIKE ? OR notion LIKE ? OR ? LIKE ('%' || lecon || '%'))
    ORDER BY date DESC LIMIT 60
  `).all(`%${cleanMatiere}%`, cleanMatiere, `%${cleanNiveau}%`, cleanNiveau, `%${cleanLecon}%`, `%${cleanLecon}%`, cleanLecon) as any[];

  const totalObs = observations.length;
  let maitriseCount = 0;
  let avecAideCount = 0;
  let difficulteCount = 0;
  const diffFrequency: Record<string, number> = {};

  for (const obs of observations) {
    if (obs.comprehension === 'maitrise') maitriseCount++;
    else if (obs.comprehension === 'comprend_avec_aide') avecAideCount++;
    else if (obs.comprehension === 'difficulte_importante' || obs.comprehension === 'comprehension_partielle') difficulteCount++;

    if (obs.difficulte && obs.difficulte !== 'aucune') {
      diffFrequency[obs.difficulte] = (diffFrequency[obs.difficulte] || 0) + 1;
    }
  }

  let topDiff = 'Consignes et représentations';
  let maxCount = 0;
  for (const [diff, cnt] of Object.entries(diffFrequency)) {
    if (cnt > maxCount) {
      maxCount = cnt;
      topDiff = diff;
    }
  }

  const difficultyPct = totalObs > 0 ? Math.round((difficulteCount / totalObs) * 100) : 0;

  return {
    hasData: feedbacks.length > 0 || totalObs > 0,
    feedbacksCount: feedbacks.length,
    totalObserved: totalObs,
    difficultyPct,
    topDifficulty: topDiff,
    breakdown: {
      maitrise: maitriseCount,
      avecAide: avecAideCount,
      difficulte: difficulteCount,
    },
    latestFeedback: feedbacks.length > 0 ? {
      ...feedbacks[0],
      eleves_a_revoir: JSON.parse(feedbacks[0].eleves_a_revoir || '[]')
    } : null,
    suggestedAdaptation: `Prévoir une reformulation active de la consigne, un exemple concret dès la phase de découverte et un travail en binôme hétérogène.`,
  };
}

// ─── STATISTIQUES & PATTERNS DIDACTIQUES ───

export function getStudentPedagogicalPatterns(studentId: string): StudentPedagogicalPatterns {
  const observations = getObservationsByStudent(studentId);
  if (observations.length === 0) {
    return {
      participationScore: 70,
      comprehensionScore: 70,
      frequentDifficulties: [],
      effectiveActions: [],
      lessEffectiveActions: [],
      positiveBehaviors: ['Attentif en classe'],
      notionsObserved: [],
    };
  }

  const partMap: Record<string, number> = {
    tres_active: 100,
    active: 80,
    moyenne: 55,
    faible: 30,
    aucune: 10,
  };
  let partSum = 0;
  let compSum = 0;
  const compMap: Record<string, number> = {
    maitrise: 100,
    comprend_avec_aide: 75,
    comprehension_partielle: 45,
    difficulte_importante: 20,
    non_observee: 50,
  };

  const diffCounts: Record<string, number> = {};
  const actionEffectiveCounts: Record<string, number> = {};
  const actionLessEffectiveCounts: Record<string, number> = {};
  const behaviorCounts: Record<string, number> = {};
  const notionMap: Record<string, { notion: string; comprehension: ComprehensionDimension; count: number }> = {};

  for (const o of observations) {
    const pVal = partMap[o.participation || 'moyenne'] ?? 55;
    const cVal = compMap[o.comprehension || 'maitrise'] ?? 50;
    partSum += pVal;
    compSum += cVal;

    if (o.difficulte && o.difficulte !== 'aucune') {
      diffCounts[o.difficulte] = (diffCounts[o.difficulte] || 0) + 1;
    }

    if (o.action_pedagogique && o.action_pedagogique !== 'aucune') {
      if (o.comprehension === 'maitrise' || o.comprehension === 'comprend_avec_aide') {
        actionEffectiveCounts[o.action_pedagogique] = (actionEffectiveCounts[o.action_pedagogique] || 0) + 1;
      } else {
        actionLessEffectiveCounts[o.action_pedagogique] = (actionLessEffectiveCounts[o.action_pedagogique] || 0) + 1;
      }
    }

    if (Array.isArray(o.comportements)) {
      for (const b of o.comportements) {
        behaviorCounts[b] = (behaviorCounts[b] || 0) + 1;
      }
    }

    if (o.notion) {
      const key = `${o.notion}__${o.comprehension || 'maitrise'}`;
      if (!notionMap[key]) {
        notionMap[key] = { notion: o.notion, comprehension: (o.comprehension || 'maitrise') as ComprehensionDimension, count: 0 };
      }
      notionMap[key].count++;
    }
  }

  const participationScore = Math.round(partSum / observations.length);
  const comprehensionScore = Math.round(compSum / observations.length);

  const frequentDifficulties = Object.entries(diffCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([label, count]) => ({ label, count }));

  const effectiveActions = Object.entries(actionEffectiveCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([label, count]) => ({ label, count }));

  const lessEffectiveActions = Object.entries(actionLessEffectiveCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([label, count]) => ({ label, count }));

  const positiveBehaviors = Object.entries(behaviorCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([label]) => label);

  return {
    participationScore,
    comprehensionScore,
    frequentDifficulties,
    effectiveActions,
    lessEffectiveActions,
    positiveBehaviors,
    notionsObserved: Object.values(notionMap).slice(0, 10),
  };
}

export function getNotionsMasteryForClass(classId: string): Record<string, { maitrise: number; avec_aide: number; difficulte: number }> {
  const db = getDb();
  const rows = db.prepare(`
    SELECT notion, comprehension, count(*) as cnt 
    FROM student_observations 
    WHERE class_id = ? AND notion != ''
    GROUP BY notion, comprehension
  `).all(classId) as any[];

  const result: Record<string, { maitrise: number; avec_aide: number; difficulte: number }> = {};
  for (const r of rows) {
    if (!result[r.notion]) {
      result[r.notion] = { maitrise: 0, avec_aide: 0, difficulte: 0 };
    }
    if (r.comprehension === 'maitrise') result[r.notion]!.maitrise += r.cnt;
    else if (r.comprehension === 'comprend_avec_aide') result[r.notion]!.avec_aide += r.cnt;
    else result[r.notion]!.difficulte += r.cnt;
  }
  return result;
}

export function getStudentQuizResults(studentId: string): StudentQuizResult[] {
  const db = getDb();
  try {
    const rows = db.prepare(`
      SELECT 
        esa.exam_id,
        esa.question_numero,
        esa.choice_key,
        esa.choice_text,
        esa.is_correct,
        esa.note,
        e.titre as exam_titre,
        e.exam_date,
        e.total_points,
        eq.enonce,
        eq.bareme,
        eq.type as question_type,
        eq.options as question_options
      FROM exam_student_answers esa
      JOIN exams e ON esa.exam_id = e.id
      LEFT JOIN exam_questions eq ON esa.exam_id = eq.exam_id AND esa.question_numero = eq.numero
      WHERE esa.student_id = ?
      ORDER BY e.exam_date DESC, esa.question_numero ASC
    `).all(studentId) as any[];

    if (!rows || rows.length === 0) return [];

    const examMap = new Map<string, StudentQuizResult>();

    for (const r of rows) {
      if (!examMap.has(r.exam_id)) {
        examMap.set(r.exam_id, {
          exam_id: r.exam_id,
          exam_titre: r.exam_titre || 'Évaluation / Quiz',
          exam_date: r.exam_date || '',
          total_score: 0,
          total_points: Number(r.total_points) || 20,
          answers: [],
        });
      }

      const res = examMap.get(r.exam_id)!;
      const note = Number(r.note || 0);
      res.total_score += note;

      let expectedAnswer = '';
      try {
        const rawOpts = typeof r.question_options === 'string' ? JSON.parse(r.question_options) : r.question_options;
        if (r.question_type === 'qcm') {
          const items = Array.isArray(rawOpts) ? rawOpts : (rawOpts?.items || []);
          const correctItem = items.find((it: any) => it.isCorrect || it.correct);
          if (correctItem) {
            expectedAnswer = correctItem.text || 'Bonne réponse';
          }
        } else if (r.question_type === 'vrai_faux') {
          if (Array.isArray(rawOpts) && rawOpts[0]) {
            expectedAnswer = rawOpts[0].isVrai ? 'VRAI' : 'FAUX';
          }
        }
      } catch { /* ignore */ }

      res.answers.push({
        question_numero: r.question_numero,
        enonce: r.enonce || `Question ${r.question_numero}`,
        bareme: Number(r.bareme || 1),
        question_type: r.question_type || 'qcm',
        choice_key: r.choice_key || '',
        choice_text: r.choice_text || '',
        is_correct: Boolean(r.is_correct),
        note,
        expected_answer: expectedAnswer,
      });
    }

    for (const res of examMap.values()) {
      res.total_score = Math.round(res.total_score * 100) / 100;
    }

    return Array.from(examMap.values());
  } catch (err) {
    console.error('getStudentQuizResults error:', err);
    return [];
  }
}

// ─── PROFILE 360° & AGGREGATIONS ───

export function getStudentProfile360(studentId: string): StudentProfile360 | null {
  const student = getStudentById(studentId);
  if (!student) return null;

  let class_info: CollegeClass | undefined;
  if (student.class_id) {
    class_info = getClassById(student.class_id) || undefined;
  }

  const attendance = getAttendanceByStudent(studentId);
  const grades = getGradesByStudent(studentId);
  const observations = getObservationsByStudent(studentId);
  const insights = getAiInsights(studentId);
  const pedagogicalPatterns = getStudentPedagogicalPatterns(studentId);
  const quizResults = getStudentQuizResults(studentId);

  // Calculate statistics
  let totalScoreScaled = 0;
  let totalCoeff = 0;
  for (const g of grades) {
    const coeff = g.coeff || 1;
    totalScoreScaled += (g.score / (g.max_score || 20)) * 20 * coeff;
    totalCoeff += coeff;
  }
  const averageGrade = totalCoeff > 0 ? Number((totalScoreScaled / totalCoeff).toFixed(1)) : 0;

  const totalAbsences = attendance.filter(a => a.type === 'absence').length;
  const totalRetards = attendance.filter(a => a.type === 'retard').length;
  const unjustifiedAbsences = attendance.filter(a => a.type === 'absence' && !a.is_justified).length;

  // Predominant comprehension
  const compCounts: Record<string, number> = {};
  for (const o of observations) {
    const c = o.comprehension || 'maitrise';
    compCounts[c] = (compCounts[c] || 0) + 1;
  }
  let predominantComprehension: ComprehensionDimension = 'maitrise';
  let maxCompCount = 0;
  for (const [comp, count] of Object.entries(compCounts)) {
    if (count > maxCompCount) {
      maxCompCount = count;
      predominantComprehension = comp as ComprehensionDimension;
    }
  }

  const activeHelpRequests = observations.filter(o => o.needs_help && o.help_status === 'en_cours').length;

  return {
    student,
    class_info,
    attendance,
    grades,
    observations,
    insights,
    pedagogicalPatterns,
    quizResults,
    stats: {
      averageGrade,
      totalEvaluations: grades.length,
      totalAbsences,
      totalRetards,
      unjustifiedAbsences,
      predominantComprehension,
      activeHelpRequests,
    },
  };
}

// ─── AI INSIGHTS ───

export function saveAiInsight(data: {
  student_id?: string;
  class_id?: string;
  analysis_type: 'individual' | 'class_wide';
  summary: string;
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
  raw_ai_text?: string;
}): StudentAiInsight {
  const db = getDb();
  const id = `ins_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;

  db.prepare(`
    INSERT INTO student_ai_insights (
      id, student_id, class_id, analysis_type, summary, strengths,
      weaknesses, recommendations, raw_ai_text
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    data.student_id || null,
    data.class_id || null,
    data.analysis_type,
    data.summary,
    JSON.stringify(data.strengths || []),
    JSON.stringify(data.weaknesses || []),
    JSON.stringify(data.recommendations || []),
    data.raw_ai_text || ''
  );

  return {
    id,
    student_id: data.student_id,
    class_id: data.class_id,
    analysis_type: data.analysis_type,
    summary: data.summary,
    strengths: data.strengths,
    weaknesses: data.weaknesses,
    recommendations: data.recommendations,
    raw_ai_text: data.raw_ai_text,
  };
}

export function getAiInsights(studentId?: string, classId?: string): StudentAiInsight[] {
  const db = getDb();
  let query = 'SELECT * FROM student_ai_insights WHERE 1=1';
  const params: any[] = [];

  if (studentId) {
    query += ' AND student_id = ?';
    params.push(studentId);
  }
  if (classId) {
    query += ' AND class_id = ?';
    params.push(classId);
  }

  query += ' ORDER BY created_at DESC LIMIT 10';
  const rows = db.prepare(query).all(...params) as any[];

  return rows.map(r => ({
    ...r,
    strengths: JSON.parse(r.strengths || '[]'),
    weaknesses: JSON.parse(r.weaknesses || '[]'),
    recommendations: JSON.parse(r.recommendations || '[]'),
  }));
}
