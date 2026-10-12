import Database from 'better-sqlite3';
import { join } from 'path';
import { existsSync, mkdirSync, statSync, readdirSync, unlinkSync, writeFileSync, readFileSync } from 'fs';
import { tmpdir } from 'os';
import { getDb, closeDb, DB_DIR, DB_PATH } from './index';

export const BACKUPS_DIR = join(DB_DIR, 'backups');
if (!existsSync(BACKUPS_DIR)) mkdirSync(BACKUPS_DIR, { recursive: true });

export interface DatabaseStats {
  sizeBytes: number;
  sizeFormatted: string;
  lastModified: string;
  counts: {
    classes: number;
    students: number;
    exams: number;
    notebookEntries: number;
    generations: number;
    skills: number;
    settings: number;
  };
  backups: {
    filename: string;
    sizeFormatted: string;
    createdAt: string;
  }[];
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Ko';
  const k = 1024;
  const sizes = ['Octets', 'Ko', 'Mo', 'Go'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export function getDatabaseStats(): DatabaseStats {
  const db = getDb();
  let totalSize = 0;
  let lastModified = new Date().toISOString();

  if (existsSync(DB_PATH)) {
    const stat = statSync(DB_PATH);
    totalSize += stat.size;
    lastModified = stat.mtime.toISOString();
  }

  const walPath = `${DB_PATH}-wal`;
  if (existsSync(walPath)) {
    totalSize += statSync(walPath).size;
  }

  const countTable = (table: string): number => {
    try {
      const res = db.prepare(`SELECT count(*) as c FROM ${table}`).get() as { c: number };
      return res?.c ?? 0;
    } catch {
      return 0;
    }
  };

  const counts = {
    classes: countTable('classes'),
    students: countTable('students'),
    exams: countTable('exams'),
    notebookEntries: countTable('notebook_entries'),
    generations: countTable('generations'),
    skills: countTable('skills'),
    settings: countTable('settings'),
  };

  const backupsList: DatabaseStats['backups'] = [];
  try {
    const files = readdirSync(BACKUPS_DIR);
    for (const f of files) {
      if (f.endsWith('.sqlite') || f.endsWith('.db') || f.endsWith('.json')) {
        const full = join(BACKUPS_DIR, f);
        const st = statSync(full);
        backupsList.push({
          filename: f,
          sizeFormatted: formatBytes(st.size),
          createdAt: st.mtime.toISOString(),
        });
      }
    }
    backupsList.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch (err) {
    console.warn('Failed to read backups directory:', err);
  }

  return {
    sizeBytes: totalSize,
    sizeFormatted: formatBytes(totalSize),
    lastModified,
    counts,
    backups: backupsList.slice(0, 5), // Keep top 5 latest
  };
}

export async function exportDatabaseSqlite(): Promise<Buffer> {
  const db = getDb();
  const tempPath = join(tmpdir(), `pedagogen-export-${Date.now()}-${Math.random().toString(36).substring(7)}.sqlite`);

  try {
    await db.backup(tempPath);
    const buffer = readFileSync(tempPath);
    return buffer;
  } finally {
    if (existsSync(tempPath)) {
      try {
        unlinkSync(tempPath);
      } catch {
        // ignore cleanup error
      }
    }
  }
}

export function exportDatabaseJson(): string {
  const db = getDb();
  const tables = [
    'users',
    'settings',
    'academic_seasons',
    'classes',
    'students',
    'class_enrollments',
    'student_attendance',
    'student_grades',
    'student_observations',
    'session_feedbacks',
    'exams',
    'exam_questions',
    'exam_grades',
    'exam_student_answers',
    'notebook_entries',
    'notebook_entry_documents',
    'question_bank',
    'generation_presets',
    'skills',
    'custom_prompts',
  ];

  const exportData: Record<string, any[]> = {};
  for (const t of tables) {
    try {
      const rows = db.prepare(`SELECT * FROM ${t}`).all();
      exportData[t] = rows;
    } catch {
      exportData[t] = [];
    }
  }

  return JSON.stringify(
    {
      version: '1.0.0',
      exported_at: new Date().toISOString(),
      app: 'PEDAGOGEN',
      tables: exportData,
    },
    null,
    2
  );
}

export async function importDatabase(
  buffer: Buffer,
  filename: string
): Promise<{ success: boolean; format: 'sqlite' | 'json'; counts: Record<string, number>; message: string }> {
  // Check if SQLite 3 binary (starts with "SQLite format 3\0")
  const isSqlite = buffer.length >= 16 && buffer.toString('utf8', 0, 15) === 'SQLite format 3';
  const isJson = filename.toLowerCase().endsWith('.json') || (!isSqlite && buffer.toString('utf8', 0, 10).trim().startsWith('{'));

  if (!isSqlite && !isJson) {
    throw new Error("Format de fichier invalide. Veuillez fournir un fichier SQLite (.sqlite, .db) ou JSON (.json) valide.");
  }

  // 1. Create a safety backup of the current database before touching anything
  const currentDb = getDb();
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const safetyBackupPath = join(BACKUPS_DIR, `pre_import_${timestamp}.sqlite`);
  try {
    await currentDb.backup(safetyBackupPath);
  } catch (err) {
    console.warn('Safety backup warning:', err);
  }

  if (isSqlite) {
    // 2. Write uploaded buffer to a temporary file for verification
    const tempTestPath = join(tmpdir(), `pedagogen-import-test-${Date.now()}.sqlite`);
    writeFileSync(tempTestPath, buffer);

    let restoredCounts: Record<string, number> = {};
    try {
      const testDb = new Database(tempTestPath, { readonly: true });
      const check = testDb.pragma('quick_check') as { quick_check: string }[];
      if (!check || check[0]?.quick_check !== 'ok') {
        throw new Error("Le fichier SQLite est corrompu ou illisible.");
      }

      // Check key tables
      const getCount = (tbl: string) => {
        try {
          return (testDb.prepare(`SELECT count(*) as c FROM ${tbl}`).get() as any)?.c || 0;
        } catch {
          return 0;
        }
      };

      restoredCounts = {
        classes: getCount('classes'),
        students: getCount('students'),
        exams: getCount('exams'),
        notebook_entries: getCount('notebook_entries'),
        generations: getCount('generations'),
      };

      testDb.close();
    } catch (err) {
      if (existsSync(tempTestPath)) unlinkSync(tempTestPath);
      throw err;
    }

    // 3. Close the active database connection
    closeDb();

    // 4. Overwrite pedagogen.db
    writeFileSync(DB_PATH, buffer);

    // 5. Clean up any leftover WAL/SHM files so the new DB loads cleanly
    const walPath = `${DB_PATH}-wal`;
    const shmPath = `${DB_PATH}-shm`;
    if (existsSync(walPath)) {
      try { unlinkSync(walPath); } catch {}
    }
    if (existsSync(shmPath)) {
      try { unlinkSync(shmPath); } catch {}
    }

    // Clean temp test file
    if (existsSync(tempTestPath)) {
      try { unlinkSync(tempTestPath); } catch {}
    }

    // 6. Re-open DB (which automatically runs initSchema and pragmas)
    const newDb = getDb();
    newDb.pragma('quick_check');

    return {
      success: true,
      format: 'sqlite',
      counts: restoredCounts,
      message: `Base de données restaurée avec succès (${restoredCounts.students || 0} élèves, ${restoredCounts.classes || 0} classes, ${restoredCounts.notebook_entries || 0} séances).`,
    };
  } else {
    // JSON import branch
    let parsed: any;
    try {
      parsed = JSON.parse(buffer.toString('utf8'));
    } catch {
      throw new Error("Format JSON invalide.");
    }

    if (!parsed || typeof parsed !== 'object' || !parsed.tables) {
      throw new Error("Structure JSON invalide : la clé 'tables' est requise.");
    }

    const db = getDb();
    const importedCounts: Record<string, number> = {};

    const importTx = db.transaction(() => {
      for (const [table, rows] of Object.entries(parsed.tables)) {
        if (!Array.isArray(rows) || rows.length === 0) continue;
        
        // Verify table exists in current database
        const exists = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name = ?").get(table);
        if (!exists) continue;

        let inserted = 0;
        for (const row of rows) {
          if (!row || typeof row !== 'object') continue;
          const cols = Object.keys(row);
          if (cols.length === 0) continue;

          const placeholders = cols.map(() => '?').join(', ');
          const values = cols.map((c) => row[c]);
          const sql = `INSERT OR REPLACE INTO ${table} (${cols.join(', ')}) VALUES (${placeholders})`;
          try {
            db.prepare(sql).run(...values);
            inserted++;
          } catch {
            // Ignore row error (e.g. unknown column from older/newer schema)
          }
        }
        importedCounts[table] = inserted;
      }
    });

    importTx();

    return {
      success: true,
      format: 'json',
      counts: importedCounts,
      message: `Données JSON importées avec succès.`,
    };
  }
}
