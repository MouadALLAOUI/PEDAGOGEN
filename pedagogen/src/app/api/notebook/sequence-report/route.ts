import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { verifyToken } from '@/lib/db/auth';
import { getCurrentSchoolYear } from '@/lib/utils/ministerialHeader';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const classeId = searchParams.get('classeId');
    const query = searchParams.get('query') || '';
    const dateDebut = searchParams.get('dateDebut');
    const dateFin = searchParams.get('dateFin');

    if (!classeId) {
      return NextResponse.json({ error: 'classeId requis' }, { status: 400 });
    }

    const token = request.cookies.get('auth-token')?.value;
    let userId = 'default';
    if (token) {
      const payload = await verifyToken(token);
      if (payload?.sub) userId = String(payload.sub);
    }

    const db = getDb();

    // 1. Get class details
    const classe = db.prepare('SELECT * FROM classes WHERE id = ?').get(classeId) as any;
    if (!classe) {
      return NextResponse.json({ error: 'Classe non trouvée' }, { status: 404 });
    }

    // 2. Teacher profile
    const userProfile = db.prepare('SELECT * FROM user_profile WHERE user_id = ?').get(userId) as any;

    // 3. Get notebook sessions for this class and optional date/query filter
    let sql = `
      SELECT e.*, x.titre as exam_titre, x.total_points as exam_points
      FROM notebook_entries e
      LEFT JOIN exams x ON e.exam_id = x.id
      WHERE e.classe_id = ?
    `;
    const params: any[] = [classeId];

    if (query.trim()) {
      sql += ` AND (e.titre LIKE ? OR e.resume LIKE ? OR e.tags LIKE ?)`;
      const pattern = `%${query.trim()}%`;
      params.push(pattern, pattern, pattern);
    }
    if (dateDebut) {
      sql += ` AND e.date >= ?`;
      params.push(dateDebut);
    }
    if (dateFin) {
      sql += ` AND e.date <= ?`;
      params.push(dateFin);
    }

    sql += ` ORDER BY e.date ASC, e.heure_debut ASC`;

    const sessions = db.prepare(sql).all(...params) as any[];

    // 4. Calculate session metrics
    const totalSessions = sessions.length;
    const completedSessions = sessions.filter((s) => s.statut === 'realisee').length;
    const plannedSessions = sessions.filter((s) => s.statut === 'planifiee').length;
    const reportedSessions = sessions.filter((s) => s.statut === 'reportee' || s.statut === 'absence').length;

    // Total hours
    let totalMinutes = 0;
    for (const s of sessions) {
      if (s.statut === 'realisee') {
        let mins = 60;
        if (s.heure_debut && s.heure_fin) {
          const parts1 = s.heure_debut.split(':');
          const parts2 = s.heure_fin.split(':');
          const h1 = Number(parts1[0]);
          const m1 = Number(parts1[1]) || 0;
          const h2 = Number(parts2[0]);
          const m2 = Number(parts2[1]) || 0;
          if (!Number.isNaN(h1) && !Number.isNaN(h2)) {
            const diff = (h2 * 60 + m2) - (h1 * 60 + m1);
            if (diff > 0) mins = diff;
          }
        }
        totalMinutes += mins;
      }
    }
    const totalHours = Math.round((totalMinutes / 60) * 10) / 10;

    // 5. Linked exams & grade averages
    const linkedExamIds = Array.from(new Set(sessions.map((s) => s.exam_id).filter(Boolean)));
    const examReports: any[] = [];

    for (const exId of linkedExamIds) {
      const exam = db.prepare('SELECT * FROM exams WHERE id = ?').get(exId) as any;
      if (!exam) continue;

      // Student grades for this exam
      const grades = db.prepare(`
        SELECT student_id, score, max_score
        FROM student_grades
        WHERE exam_id = ? AND class_id = ?
      `).all(exId, classeId) as any[];

      // Or fallback to quiz answers
      const quizAnswers = db.prepare(`
        SELECT student_id, score_percentage, answers
        FROM exam_student_answers
        WHERE exam_id = ?
      `).all(exId) as any[];

      let avg = 0;
      let count = 0;
      let countPassing = 0;

      if (grades.length > 0) {
        count = grades.length;
        const sum = grades.reduce((acc, g) => {
          const norm = (Number(g.score) / Number(g.max_score || 20)) * 20;
          if (norm >= 10) countPassing++;
          return acc + norm;
        }, 0);
        avg = Math.round((sum / count) * 10) / 10;
      } else if (quizAnswers.length > 0) {
        count = quizAnswers.length;
        const sum = quizAnswers.reduce((acc, q) => {
          const norm = (Number(q.score_percentage || 0) / 100) * 20;
          if (norm >= 10) countPassing++;
          return acc + norm;
        }, 0);
        avg = Math.round((sum / count) * 10) / 10;
      }

      examReports.push({
        id: exam.id,
        titre: exam.titre,
        date: exam.exam_date,
        totalPoints: exam.total_points,
        gradedCount: count,
        classAverage: count > 0 ? avg : null,
        successRate: count > 0 ? Math.round((countPassing / count) * 100) : null,
      });
    }

    // 6. Syllabus coverage approximation
    const coverageRate = totalSessions > 0
      ? Math.min(100, Math.round((completedSessions / Math.max(1, totalSessions)) * 100))
      : 0;

    return NextResponse.json({
      classe: {
        id: classe.id,
        nom: classe.name,
        niveau: classe.niveau,
      },
      enseignant: {
        nom: userProfile?.full_name || 'Professeur',
        etablissement: userProfile?.etablissement || 'Collège d\'Enseignement Secondaire',
        aref: userProfile?.aref || 'AREF Rabat-Salé-Kénitra',
        direction: userProfile?.direction_provinciale || 'Direction Provinciale',
        matiere: userProfile?.matiere || 'Informatique & Technologies',
        anneeScolaire: getCurrentSchoolYear(),
      },
      stats: {
        totalSessions,
        completedSessions,
        plannedSessions,
        reportedSessions,
        totalHours,
        coverageRate,
      },
      sessions: sessions.map((s) => ({
        id: s.id,
        date: s.date,
        heure_debut: s.heure_debut,
        heure_fin: s.heure_fin,
        titre: s.titre,
        resume: s.resume,
        statut: s.statut,
        tags: s.tags ? (typeof s.tags === 'string' ? JSON.parse(s.tags) : s.tags) : [],
        examTitre: s.exam_titre,
      })),
      exams: examReports,
    });
  } catch (error) {
    console.error('GET /api/notebook/sequence-report failed:', error);
    return NextResponse.json({ error: 'Erreur lors du calcul du bilan de séquence' }, { status: 500 });
  }
}
