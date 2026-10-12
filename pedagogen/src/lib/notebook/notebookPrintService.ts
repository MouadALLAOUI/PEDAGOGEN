import { getDb } from '@/lib/db';
import { listEntries, type NotebookEntry } from './notebookManager';
import { getUserFromDb } from '@/lib/db/auth';

export interface PrintParams {
  classes?: string[]; // array of class IDs (empty or undefined = all)
  from?: string;
  to?: string;
  status?: string[]; // e.g. ['planifiee', 'realisee', 'absence', 'reportee', 'tenue', 'annulee']
  types?: string[]; // e.g. ['SESSION', 'MEETING', 'PUBLICATION']
  layout?: 'class' | 'chrono';
  detail?: 'compact' | 'detailed';
  recap?: boolean;
  signatures?: boolean;
  header?: boolean;
  // Overrides from URL or dialog if profile was incomplete
  teacherName?: string;
  school?: string;
  academicYear?: string;
  subject?: string;
  level?: string;
}

export interface PrintNotebookData {
  user: {
    id: string;
    full_name: string;
    matiere: string;
    etablissement: string;
    aref: string;
    direction_provinciale: string;
  } | null;
  classes: Array<{ id: string; name: string; niveau: string }>;
  entries: NotebookEntry[];
  examAverages: Map<string, number | null>;
  meta: {
    academicYear: string;
    dateMin: string;
    dateMax: string;
    totalEntries: number;
  };
}

/**
 * Computes the Moroccan academic year string (e.g. "2025 - 2026") from a reference date.
 */
export function getDefaultAcademicYear(refDateStr?: string): string {
  const d = refDateStr ? new Date(refDateStr) : new Date();
  const year = isNaN(d.getFullYear()) ? new Date().getFullYear() : d.getFullYear();
  const month = isNaN(d.getMonth()) ? new Date().getMonth() : d.getMonth(); // 0-indexed (0=Jan, 8=Sept)
  // If month is >= August (index 7), we are in year / (year + 1)
  if (month >= 7) {
    return `${year} - ${year + 1}`;
  }
  return `${year - 1} - ${year}`;
}

/**
 * Fetches all data needed to render the printed cahier de textes.
 */
export async function getPrintNotebookData(
  userId: string,
  params: PrintParams = {}
): Promise<PrintNotebookData> {
  const db = getDb();

  // 1. User profile
  const user = getUserFromDb(userId);

  // 2. Classes
  const classRows = db.prepare('SELECT id, name, niveau FROM classes ORDER BY niveau ASC, name ASC').all() as any[];
  const classes = classRows.map((c) => ({
    id: String(c.id),
    name: String(c.name),
    niveau: String(c.niveau),
  }));

  // Filter classes if specified
  const targetClassIds = params.classes && params.classes.length > 0 && !params.classes.includes('all')
    ? params.classes
    : classes.map((c) => c.id);

  // 3. Fetch entries
  let allEntries: NotebookEntry[] = [];
  if (targetClassIds.length > 0) {
    const baseEntries = listEntries({
      from: params.from || undefined,
      to: params.to || undefined,
    });

    const allowedTypes = params.types && params.types.length > 0
      ? new Set(params.types)
      : new Set(['SESSION', 'MEETING', 'PUBLICATION']);

    const allowedStatuses = params.status && params.status.length > 0
      ? new Set(params.status)
      : new Set(['planifiee', 'realisee', 'absence', 'reportee', 'tenue', 'annulee']);

    const targetClassSet = new Set(targetClassIds);

    allEntries = baseEntries.filter((e) => {
      if (!allowedTypes.has(e.entry_type)) return false;
      // If entry is linked to a class, must be in selected classes
      if (e.classe_id && !targetClassSet.has(e.classe_id)) return false;
      if (!allowedStatuses.has(e.statut)) return false;
      return true;
    });
  }

  // 4. Calculate Exam Averages per class
  // key: `${classId}:${examId}` -> average note normalized to 20
  const examAverages = new Map<string, number | null>();
  try {
    const examAvgRows = db.prepare(`
      SELECT
        ce.class_id,
        student_sum.exam_id,
        x.total_points,
        AVG(student_sum.total_note) as raw_avg
      FROM (
        SELECT student_id, exam_id, SUM(note) as total_note
        FROM exam_grades
        WHERE note IS NOT NULL
        GROUP BY student_id, exam_id
      ) student_sum
      JOIN class_enrollments ce ON ce.student_id = student_sum.student_id
      JOIN exams x ON x.id = student_sum.exam_id
      GROUP BY ce.class_id, student_sum.exam_id
    `).all() as any[];

    for (const r of examAvgRows) {
      const totalPoints = Number(r.total_points) || 20;
      const rawAvg = Number(r.raw_avg);
      if (!isNaN(rawAvg)) {
        const norm20 = totalPoints > 0 ? (rawAvg / totalPoints) * 20 : rawAvg;
        const rounded = Math.round(norm20 * 10) / 10;
        examAverages.set(`${r.class_id}:${r.exam_id}`, rounded);
      }
    }
  } catch (err) {
    console.error('Failed to compute exam averages for print:', err);
  }

  // 5. Compute metadata (academic year, date range)
  const dates = allEntries.map((e) => e.date).filter(Boolean).sort();
  const dateMin = dates.length > 0 ? dates[0]! : '';
  const dateMax = dates.length > 0 ? dates[dates.length - 1]! : '';
  const academicYear = params.academicYear || getDefaultAcademicYear(dateMin || undefined);

  return {
    user: user ? {
      id: user.id,
      full_name: user.full_name || '',
      matiere: user.matiere || '',
      etablissement: user.etablissement || '',
      aref: user.aref || '',
      direction_provinciale: user.direction_provinciale || '',
    } : null,
    classes: classes.filter((c) => targetClassIds.includes(c.id)),
    entries: allEntries,
    examAverages,
    meta: {
      academicYear,
      dateMin,
      dateMax,
      totalEntries: allEntries.length,
    },
  };
}
