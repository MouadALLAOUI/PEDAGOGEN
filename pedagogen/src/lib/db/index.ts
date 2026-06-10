import Database from 'better-sqlite3';
import { join } from 'path';
import { mkdirSync, existsSync, readFileSync, copyFileSync } from 'fs';

const DB_DIR = join(process.cwd(), 'data');
if (!existsSync(DB_DIR)) mkdirSync(DB_DIR, { recursive: true });

const REFERENCES_DIR = join(DB_DIR, 'references');
if (!existsSync(REFERENCES_DIR)) mkdirSync(REFERENCES_DIR, { recursive: true });

const IMAGES_DIR = join(DB_DIR, 'images');
if (!existsSync(IMAGES_DIR)) mkdirSync(IMAGES_DIR, { recursive: true });

const DB_PATH = join(DB_DIR, 'pedagogen.db');

let _db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!_db) {
    _db = new Database(DB_PATH);
    _db.pragma('journal_mode = WAL');
    _db.pragma('foreign_keys = ON');
    initSchema(_db);
    seedDefaults(_db);
    seedBuiltinReferences(_db);
  }
  return _db;
}

function initSchema(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      full_name TEXT NOT NULL DEFAULT '',
      matiere TEXT NOT NULL DEFAULT 'Informatique',
      etablissement TEXT NOT NULL DEFAULT '',
      telephone TEXT NOT NULL DEFAULT '',
      avatar_url TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS generations (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      mode TEXT NOT NULL,
      matiere TEXT NOT NULL,
      niveau TEXT NOT NULL,
      lecon TEXT NOT NULL,
      unite TEXT NOT NULL DEFAULT '',
      duree INTEGER NOT NULL DEFAULT 50,
      competences TEXT NOT NULL DEFAULT '[]',
      langue TEXT NOT NULL DEFAULT 'francais',
      semestre INTEGER NOT NULL DEFAULT 1,
      tokens_used INTEGER NOT NULL DEFAULT 0,
      duration_ms INTEGER NOT NULL DEFAULT 0,
      files_count INTEGER NOT NULL DEFAULT 0,
      zip_url TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS reference_files (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      category TEXT NOT NULL DEFAULT 'custom',
      size INTEGER NOT NULL DEFAULT 0,
      storage_path TEXT NOT NULL,
      enabled INTEGER NOT NULL DEFAULT 1,
      builtin INTEGER NOT NULL DEFAULT 0,
      uploaded_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS generated_files (
      id TEXT PRIMARY KEY,
      generation_id TEXT,
      name TEXT NOT NULL,
      doc_type TEXT NOT NULL,
      format TEXT NOT NULL,
      storage_path TEXT NOT NULL,
      url TEXT NOT NULL,
      size_kb INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (generation_id) REFERENCES generations(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS image_cache (
      id TEXT PRIMARY KEY,
      prompt_hash TEXT NOT NULL,
      prompt TEXT NOT NULL,
      storage_path TEXT NOT NULL,
      url TEXT NOT NULL,
      tokens_used INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS custom_prompts (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_image_cache_prompt ON image_cache(prompt_hash);
  `);

  // Migration: add enabled/builtin columns if missing
  const cols = db.prepare("PRAGMA table_info(reference_files)").all() as any[];
  const colNames = cols.map((c: any) => c.name);
  if (!colNames.includes('enabled')) {
    db.exec("ALTER TABLE reference_files ADD COLUMN enabled INTEGER NOT NULL DEFAULT 1");
  }
  if (!colNames.includes('builtin')) {
    db.exec("ALTER TABLE reference_files ADD COLUMN builtin INTEGER NOT NULL DEFAULT 0");
  }
  
  seedPrompts(db);
}

function seedPrompts(db: Database.Database) {
  const defaults: Record<string, string> = {
    global: 'Always ensure the content is professional, structured, and follows the Moroccan official syllabus guidelines.',
    context: 'The lessons are taught in Moroccan collège classrooms under the official national education framework.',
    fiche_pedagogique: 'Generate a detailed fiche pédagogique following official guidelines. Establish objectives, prerequisites, and session progression.',
    planification: 'Generate a structured semester planification sequence.',
    cours_complet: 'Generate a complete, rich lesson plan content for the teacher script and student exercises.',
    plan_gestion_classe: 'Generate a classroom management strategy document.',
    resume_eleve: 'Generate a student-facing summary in simple language.',
    presentation_pptx: 'Generate a PPTX outline with bullet points for slides.',
    evaluation: 'Generate an evaluation sheet/test representing the concepts.',
    images_illustratives: 'Generate image illustration prompts.',
  };

  const insert = db.prepare('INSERT OR IGNORE INTO custom_prompts (key, value) VALUES (?, ?)');
  for (const [key, value] of Object.entries(defaults)) {
    insert.run(key, value);
  }
}

function seedDefaults(db: Database.Database) {
  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get('enseignant@pedagogen.ma');
  if (existing) return;

  const bcrypt = require('bcryptjs');
  const id = crypto.randomUUID();
  const hash = bcrypt.hashSync('pedagogen2024', 10);

  db.prepare(`
    INSERT INTO users (id, email, password_hash, full_name, matiere, etablissement, telephone)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(id, 'enseignant@pedagogen.ma', hash, 'Enseignant Défaut', 'Informatique', 'Collège public', '');
}

function seedBuiltinReferences(db: Database.Database) {
  const BUILTIN_REFS = [
    {
      name: 'Programme Informatique Collège Maroc',
      category: 'curriculum',
      fileName: 'curr_informatiques_college.md',
    },
  ];

  for (const ref of BUILTIN_REFS) {
    const existing = db.prepare(
      'SELECT id FROM reference_files WHERE name = ? AND builtin = 1'
    ).get(ref.name);
    if (existing) continue;

    const srcPath = join(process.cwd(), 'src', 'lib', 'references', ref.fileName);
    if (!existsSync(srcPath)) continue;

    const storagePath = `builtin-${ref.fileName}`;
    const destPath = join(REFERENCES_DIR, storagePath);
    try {
      copyFileSync(srcPath, destPath);
    } catch {
      continue;
    }

    const stats = { size: readFileSync(srcPath).length };
    const id = crypto.randomUUID();

    db.prepare(`
      INSERT INTO reference_files (id, name, category, size, storage_path, enabled, builtin)
      VALUES (?, ?, ?, ?, ?, 1, 1)
    `).run(id, ref.name, ref.category, stats.size, storagePath);
  }
}
