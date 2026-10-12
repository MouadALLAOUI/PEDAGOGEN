import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { verifyToken } from '@/lib/db/auth';

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('auth-token')?.value;
    if (token) {
      await verifyToken(token);
    }

    const db = getDb();
    const today = new Date().toISOString().slice(0, 10);

    // 1. Upcoming planned sessions
    const upcomingSessions = db.prepare(`
      SELECT e.id, e.classe_id, c.name as classe_nom, c.niveau as classe_niveau,
             e.date, e.heure_debut, e.heure_fin, e.titre, e.resume, e.statut, e.exam_id
      FROM notebook_entries e
      JOIN classes c ON e.classe_id = c.id
      WHERE e.date >= ? AND e.statut = 'planifiee'
      ORDER BY e.date ASC, e.heure_debut ASC
      LIMIT 5
    `).all(today) as any[];

    // 2. Exams with pending / incomplete grade grids
    const exams = db.prepare(`
      SELECT x.id, x.titre, x.exam_date, x.niveau, x.classe_ids, x.total_points,
             (SELECT COUNT(DISTINCT student_id) FROM exam_grades WHERE exam_id = x.id) as graded_students,
             (SELECT COUNT(*) FROM exam_questions WHERE exam_id = x.id) as questions_count
      FROM exams x
      ORDER BY x.exam_date DESC, x.created_at DESC
      LIMIT 10
    `).all() as any[];

    // Filter to exams that have questions but 0 or few graded students
    const pendingExams = exams.map((ex) => {
      let classIds: string[] = [];
      try { classIds = JSON.parse(ex.classe_ids || '[]'); } catch {}
      
      // Count total students in these classes
      let totalStudentsInClasses = 0;
      if (classIds.length > 0) {
        const placeholders = classIds.map(() => '?').join(',');
        const row = db.prepare(`
          SELECT COUNT(DISTINCT student_id) as cnt
          FROM class_enrollments
          WHERE class_id IN (${placeholders})
        `).get(...classIds) as any;
        totalStudentsInClasses = row?.cnt || 0;
      }

      const isCompleted = totalStudentsInClasses > 0 && ex.graded_students >= totalStudentsInClasses;
      return {
        id: ex.id,
        titre: ex.titre,
        exam_date: ex.exam_date,
        niveau: ex.niveau,
        graded_students: Number(ex.graded_students || 0),
        total_students: totalStudentsInClasses,
        questions_count: Number(ex.questions_count || 0),
        isCompleted,
      };
    }).filter((ex) => !ex.isCompleted).slice(0, 5);

    // 3. Classes performance and alert on classes below passing average (10/20)
    const classes = db.prepare(`
      SELECT c.id, c.name, c.niveau,
             (SELECT COUNT(*) FROM class_enrollments WHERE class_id = c.id) as student_count,
             (
               SELECT ROUND(AVG(score / max_score * 20), 1)
               FROM student_grades g
               WHERE g.class_id = c.id
             ) as avg_grade,
             (
               SELECT COUNT(DISTINCT s.id)
               FROM students s
               JOIN class_enrollments ce ON s.id = ce.student_id
               WHERE ce.class_id = c.id
                 AND (
                   SELECT ROUND(AVG(score / max_score * 20), 1)
                   FROM student_grades g WHERE g.student_id = s.id
                 ) < 10
             ) as students_below_10,
             (
               SELECT COUNT(*)
               FROM student_observations o
               WHERE o.class_id = c.id AND o.needs_help = 1 AND o.help_status = 'en_cours'
             ) as help_requests_count
      FROM classes c
      ORDER BY avg_grade ASC NULLS LAST, c.niveau ASC
    `).all() as any[];

    // 4. Recently generated documents
    const generations = db.prepare(`
      SELECT g.id, g.mode, g.metadata, g.tokens_used, g.created_at,
             (SELECT COUNT(*) FROM generated_files f WHERE f.generation_id = g.id) as files_count
      FROM generations g
      ORDER BY g.created_at DESC
      LIMIT 5
    `).all() as any[];

    const recentDocs = generations.map((g) => {
      let meta: Record<string, any> = {};
      try { meta = JSON.parse(g.metadata || '{}'); } catch {}
      return {
        id: g.id,
        title: meta.lecon || meta.matiere || 'Document pédagogique',
        niveau: meta.niveau || '',
        matiere: meta.matiere || '',
        mode: g.mode,
        files_count: Number(g.files_count || 0),
        created_at: g.created_at,
        tokens_used: Number(g.tokens_used || 0),
      };
    });

    // 5. Overall statistics
    const totalStudents = (db.prepare('SELECT COUNT(*) as c FROM students').get() as any)?.c || 0;
    const totalClasses = classes.length;
    const totalNotebookSessions = (db.prepare('SELECT COUNT(*) as c FROM notebook_entries').get() as any)?.c || 0;
    const totalGenerations = (db.prepare('SELECT COUNT(*) as c FROM generations').get() as any)?.c || 0;

    return NextResponse.json({
      upcomingSessions,
      pendingExams,
      classes,
      recentDocs,
      kpis: {
        totalStudents,
        totalClasses,
        totalNotebookSessions,
        totalGenerations,
        pendingExamsCount: pendingExams.length,
        upcomingSessionsCount: upcomingSessions.length,
      },
    });
  } catch (error) {
    console.error('GET /api/dashboard/stats failed:', error);
    return NextResponse.json({ error: 'Échec chargement statistiques dashboard' }, { status: 500 });
  }
}
