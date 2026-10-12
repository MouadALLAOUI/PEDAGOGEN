import Database from 'better-sqlite3';
import { join } from 'path';
import { mkdirSync, existsSync, readFileSync, copyFileSync } from 'fs';
import bcrypt from 'bcryptjs';

export const DB_DIR = join(process.cwd(), 'data');
if (!existsSync(DB_DIR)) mkdirSync(DB_DIR, { recursive: true });

const REFERENCES_DIR = join(DB_DIR, 'references');
if (!existsSync(REFERENCES_DIR)) mkdirSync(REFERENCES_DIR, { recursive: true });

const IMAGES_DIR = join(DB_DIR, 'images');
if (!existsSync(IMAGES_DIR)) mkdirSync(IMAGES_DIR, { recursive: true });

export const ATTACHMENTS_DIR = join(DB_DIR, 'attachments');
if (!existsSync(ATTACHMENTS_DIR)) mkdirSync(ATTACHMENTS_DIR, { recursive: true });

export const DB_PATH = join(DB_DIR, 'pedagogen.db');

let _db: Database.Database | null = null;

export function closeDb(): void {
  if (_db) {
    try {
      _db.close();
    } catch (e) {
      console.warn('Error closing database:', e);
    }
    _db = null;
  }
}

export function getDb(): Database.Database {
  if (!_db) {
    _db = new Database(DB_PATH);
    _db.pragma('journal_mode = WAL');
    _db.pragma('foreign_keys = ON');
    // Wait up to 5s instead of failing instantly when another request holds a write lock
    _db.pragma('busy_timeout = 5000');
    initSchema(_db);
    seedDefaults(_db);
    seedDefaultSeason(_db);
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
      aref TEXT NOT NULL DEFAULT '',
      direction_provinciale TEXT NOT NULL DEFAULT '',
      avatar_url TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS generations (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      mode TEXT NOT NULL,
      matiere TEXT NOT NULL DEFAULT '',
      niveau TEXT NOT NULL DEFAULT '',
      lecon TEXT NOT NULL DEFAULT '',
      unite TEXT NOT NULL DEFAULT '',
      duree INTEGER NOT NULL DEFAULT 50,
      competences TEXT NOT NULL DEFAULT '[]',
      langue TEXT NOT NULL DEFAULT 'francais',
      semestre INTEGER NOT NULL DEFAULT 1,
      tokens_used INTEGER NOT NULL DEFAULT 0,
      duration_ms INTEGER NOT NULL DEFAULT 0,
      files_count INTEGER NOT NULL DEFAULT 0,
      zip_url TEXT,
      metadata TEXT,
      files TEXT NOT NULL DEFAULT '[]',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT NOT NULL,
      value TEXT NOT NULL,
      user_id TEXT NOT NULL DEFAULT 'default',
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      PRIMARY KEY (key, user_id)
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

    CREATE INDEX IF NOT EXISTS idx_generated_files_generation ON generated_files(generation_id);
    CREATE INDEX IF NOT EXISTS idx_generated_files_doc_type ON generated_files(doc_type);

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

    CREATE TABLE IF NOT EXISTS reference_embeddings (
      file_id TEXT NOT NULL,
      chunk_index INTEGER NOT NULL DEFAULT 0,
      chunk_text TEXT NOT NULL,
      embedding TEXT,
      PRIMARY KEY (file_id, chunk_index),
      FOREIGN KEY (file_id) REFERENCES reference_files(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS embed_index_status (
      file_id TEXT PRIMARY KEY,
      indexed_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (file_id) REFERENCES reference_files(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS skills (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL DEFAULT 'default',
      name TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      category TEXT NOT NULL DEFAULT 'pedagogy',
      prompt_instruction TEXT NOT NULL,
      scope_type TEXT NOT NULL DEFAULT 'global',
      scope_subject TEXT NOT NULL DEFAULT '',
      scope_level TEXT NOT NULL DEFAULT '',
      scope_unit TEXT NOT NULL DEFAULT '',
      scope_lesson TEXT NOT NULL DEFAULT '',
      target_doc_types TEXT NOT NULL DEFAULT '[]',
      target_formats TEXT NOT NULL DEFAULT '[]',
      is_enabled INTEGER NOT NULL DEFAULT 1,
      is_builtin INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- 1. Academic Seasons (Années Scolaires, ex: 2026/2027)
    CREATE TABLE IF NOT EXISTS academic_seasons (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL DEFAULT 'default',
      code TEXT NOT NULL,
      label TEXT NOT NULL,
      is_current INTEGER NOT NULL DEFAULT 1,
      start_date TEXT,
      end_date TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- 2. Classes (ex: "2AC - Classe 3")
    CREATE TABLE IF NOT EXISTS classes (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL DEFAULT 'default',
      season_id TEXT NOT NULL,
      niveau TEXT NOT NULL,
      name TEXT NOT NULL,
      matiere TEXT NOT NULL DEFAULT 'Informatique',
      room TEXT NOT NULL DEFAULT '',
      description TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (season_id) REFERENCES academic_seasons(id) ON DELETE CASCADE
    );

    -- 3. Students
    CREATE TABLE IF NOT EXISTS students (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL DEFAULT 'default',
      cne_massar TEXT NOT NULL DEFAULT '',
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      gender TEXT NOT NULL DEFAULT 'M',
      birth_date TEXT NOT NULL DEFAULT '',
      avatar_url TEXT,
      tarl_status TEXT NOT NULL DEFAULT 'standard',
      special_needs TEXT NOT NULL DEFAULT '',
      guardian_name TEXT NOT NULL DEFAULT '',
      guardian_phone TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- 4. Enrollments (Linking student to class & season)
    CREATE TABLE IF NOT EXISTS class_enrollments (
      id TEXT PRIMARY KEY,
      class_id TEXT NOT NULL,
      student_id TEXT NOT NULL,
      season_id TEXT NOT NULL,
      student_number INTEGER,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,
      FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
      FOREIGN KEY (season_id) REFERENCES academic_seasons(id) ON DELETE CASCADE,
      UNIQUE (class_id, student_id)
    );

    -- 5. Student Attendance & Lateness
    CREATE TABLE IF NOT EXISTS student_attendance (
      id TEXT PRIMARY KEY,
      class_id TEXT NOT NULL,
      student_id TEXT NOT NULL,
      date TEXT NOT NULL,
      session_title TEXT NOT NULL DEFAULT '',
      type TEXT NOT NULL DEFAULT 'absence',
      is_justified INTEGER NOT NULL DEFAULT 0,
      notes TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,
      FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
    );

    -- 6. Student Grades & Evaluations
    CREATE TABLE IF NOT EXISTS student_grades (
      id TEXT PRIMARY KEY,
      class_id TEXT NOT NULL,
      student_id TEXT NOT NULL,
      title TEXT NOT NULL,
      eval_type TEXT NOT NULL DEFAULT 'controle',
      score REAL NOT NULL,
      max_score REAL NOT NULL DEFAULT 20,
      coeff REAL NOT NULL DEFAULT 1,
      date TEXT NOT NULL,
      comment TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,
      FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
    );

    -- 7. Behavioral & Pedagogical observations, Learning climate, and Help Needs
    CREATE TABLE IF NOT EXISTS student_observations (
      id TEXT PRIMARY KEY,
      class_id TEXT NOT NULL,
      student_id TEXT,
      date TEXT NOT NULL,
      observation_type TEXT NOT NULL DEFAULT 'individuelle',
      participation TEXT NOT NULL DEFAULT 'moyenne',
      comprehension TEXT NOT NULL DEFAULT 'maitrise',
      comportements TEXT NOT NULL DEFAULT '[]',
      difficulte TEXT NOT NULL DEFAULT 'aucune',
      action_pedagogique TEXT NOT NULL DEFAULT 'aucune',
      notion TEXT NOT NULL DEFAULT '',
      matiere TEXT NOT NULL DEFAULT '',
      niveau TEXT NOT NULL DEFAULT '',
      unite TEXT NOT NULL DEFAULT '',
      lecon TEXT NOT NULL DEFAULT '',
      cause_possible TEXT NOT NULL DEFAULT 'a_determiner',
      prochaine_seance TEXT NOT NULL DEFAULT '[]',
      mental_state TEXT NOT NULL DEFAULT 'calme',
      participation_level TEXT NOT NULL DEFAULT 'moyenne',
      observation_text TEXT NOT NULL DEFAULT '',
      needs_help INTEGER NOT NULL DEFAULT 0,
      help_topic TEXT NOT NULL DEFAULT '',
      help_urgency TEXT NOT NULL DEFAULT 'moyen',
      help_status TEXT NOT NULL DEFAULT 'en_cours',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,
      FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
    );

    -- 8. Session Feedbacks (Bilan Rapide 30-60 secondes post-séance)
    CREATE TABLE IF NOT EXISTS session_feedbacks (
      id TEXT PRIMARY KEY,
      class_id TEXT NOT NULL,
      date TEXT NOT NULL,
      matiere TEXT NOT NULL DEFAULT '',
      niveau TEXT NOT NULL DEFAULT '',
      unite TEXT NOT NULL DEFAULT '',
      lecon TEXT NOT NULL DEFAULT '',
      objectif_atteint TEXT NOT NULL DEFAULT 'partiellement',
      participation_globale TEXT NOT NULL DEFAULT 'moyenne',
      comprehension_globale TEXT NOT NULL DEFAULT 'heterogene',
      difficulte_principale TEXT NOT NULL DEFAULT '',
      eleves_a_revoir TEXT NOT NULL DEFAULT '[]',
      a_reprendre TEXT NOT NULL DEFAULT '',
      note_libre TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE
    );

    -- 9. AI Pedagogical Insights & Didactic Advisory
    CREATE TABLE IF NOT EXISTS student_ai_insights (
      id TEXT PRIMARY KEY,
      student_id TEXT,
      class_id TEXT,
      analysis_type TEXT NOT NULL DEFAULT 'individual',
      summary TEXT NOT NULL DEFAULT '',
      strengths TEXT NOT NULL DEFAULT '[]',
      weaknesses TEXT NOT NULL DEFAULT '[]',
      recommendations TEXT NOT NULL DEFAULT '[]',
      raw_ai_text TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
      FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE
    );

    -- 10. Exams (Évaluations)
    CREATE TABLE IF NOT EXISTS exams (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL DEFAULT 'default',
      titre TEXT NOT NULL,
      exam_date TEXT NOT NULL,
      duree INTEGER NOT NULL DEFAULT 60,
      niveau TEXT NOT NULL DEFAULT '1AC',
      classe_ids TEXT NOT NULL DEFAULT '[]',
      total_points REAL NOT NULL DEFAULT 20,
      guide_config TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS exam_questions (
      id TEXT PRIMARY KEY,
      exam_id TEXT NOT NULL,
      numero INTEGER NOT NULL,
      type TEXT NOT NULL DEFAULT 'ouvert',
      enonce TEXT NOT NULL DEFAULT '',
      bareme REAL NOT NULL DEFAULT 1,
      options TEXT NOT NULL DEFAULT '[]',
      image_url TEXT NOT NULL DEFAULT '',
      FOREIGN KEY (exam_id) REFERENCES exams(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS exam_grades (
      id TEXT PRIMARY KEY,
      exam_id TEXT NOT NULL,
      student_id TEXT NOT NULL,
      question_numero INTEGER NOT NULL,
      note REAL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (exam_id) REFERENCES exams(id) ON DELETE CASCADE,
      FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
      UNIQUE (exam_id, student_id, question_numero)
    );

    CREATE TABLE IF NOT EXISTS exam_student_answers (
      id TEXT PRIMARY KEY,
      exam_id TEXT NOT NULL,
      student_id TEXT NOT NULL,
      question_numero INTEGER NOT NULL,
      choice_key TEXT NOT NULL DEFAULT '',
      choice_text TEXT NOT NULL DEFAULT '',
      is_correct INTEGER NOT NULL DEFAULT 0,
      note REAL NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (exam_id) REFERENCES exams(id) ON DELETE CASCADE,
      FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
      UNIQUE (exam_id, student_id, question_numero)
    );

    -- 11. Carnet de Bord (notebook per class)
    CREATE TABLE IF NOT EXISTS notebook_entries (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL DEFAULT 'default',
      entry_type TEXT NOT NULL DEFAULT 'SESSION',
      classe_id TEXT,
      date TEXT NOT NULL,
      heure_debut TEXT DEFAULT '',
      heure_fin TEXT DEFAULT '',
      titre TEXT NOT NULL,
      resume TEXT NOT NULL DEFAULT '',
      statut TEXT NOT NULL DEFAULT 'planifiee',
      tags TEXT NOT NULL DEFAULT '[]',
      exam_id TEXT,
      group_id TEXT DEFAULT '',
      meta TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (classe_id) REFERENCES classes(id) ON DELETE SET NULL,
      FOREIGN KEY (exam_id) REFERENCES exams(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS notebook_entry_documents (
      entry_id TEXT NOT NULL,
      document_id TEXT NOT NULL,
      PRIMARY KEY (entry_id, document_id),
      FOREIGN KEY (entry_id) REFERENCES notebook_entries(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS notebook_attachments (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL DEFAULT 'default',
      filename TEXT NOT NULL,
      original_name TEXT NOT NULL,
      mime_type TEXT NOT NULL DEFAULT 'application/octet-stream',
      size INTEGER NOT NULL DEFAULT 0,
      storage_path TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS notebook_entry_attachments (
      entry_id TEXT NOT NULL,
      attachment_id TEXT NOT NULL,
      PRIMARY KEY (entry_id, attachment_id),
      FOREIGN KEY (entry_id) REFERENCES notebook_entries(id) ON DELETE CASCADE,
      FOREIGN KEY (attachment_id) REFERENCES notebook_attachments(id) ON DELETE CASCADE
    );

    -- 12. Banque de questions (réutilisables entre examens)
    CREATE TABLE IF NOT EXISTS question_bank (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL DEFAULT 'default',
      type TEXT NOT NULL DEFAULT 'ouvert',
      enonce TEXT NOT NULL,
      bareme REAL NOT NULL DEFAULT 1,
      tags TEXT NOT NULL DEFAULT '[]',
      options TEXT NOT NULL DEFAULT '[]',
      image_url TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- 13. Présets de génération (métadonnées + prompts + documents sauvegardés)
    CREATE TABLE IF NOT EXISTS generation_presets (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL DEFAULT 'default',
      name TEXT NOT NULL,
      metadata TEXT NOT NULL DEFAULT '{}',
      documents TEXT NOT NULL DEFAULT '[]',
      include_prompt TEXT NOT NULL DEFAULT '',
      exclude_prompt TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- R3: index full-text unifié (générations + carnet + fichiers)
    CREATE VIRTUAL TABLE IF NOT EXISTS search_fts USING fts5(
      ref_type,
      ref_id UNINDEXED,
      title,
      body
    );

    CREATE TRIGGER IF NOT EXISTS fts_generations_ai AFTER INSERT ON generations BEGIN
      INSERT INTO search_fts(ref_type, ref_id, title, body)
      VALUES ('generation', new.id, new.lecon, new.matiere || ' ' || new.unite || ' ' || new.lecon);
    END;
    CREATE TRIGGER IF NOT EXISTS fts_generations_ad AFTER DELETE ON generations BEGIN
      DELETE FROM search_fts WHERE ref_type = 'generation' AND ref_id = old.id;
    END;
    CREATE TRIGGER IF NOT EXISTS fts_notebook_ai AFTER INSERT ON notebook_entries BEGIN
      INSERT INTO search_fts(ref_type, ref_id, title, body)
      VALUES ('notebook', new.id, new.titre, new.resume);
    END;
    CREATE TRIGGER IF NOT EXISTS fts_notebook_au AFTER UPDATE ON notebook_entries BEGIN
      DELETE FROM search_fts WHERE ref_type = 'notebook' AND ref_id = old.id;
      INSERT INTO search_fts(ref_type, ref_id, title, body)
      VALUES ('notebook', new.id, new.titre, new.resume);
    END;
    CREATE TRIGGER IF NOT EXISTS fts_notebook_ad AFTER DELETE ON notebook_entries BEGIN
      DELETE FROM search_fts WHERE ref_type = 'notebook' AND ref_id = old.id;
    END;
    CREATE TRIGGER IF NOT EXISTS fts_files_ai AFTER INSERT ON generated_files BEGIN
      INSERT INTO search_fts(ref_type, ref_id, title, body)
      VALUES ('file', new.id, new.name, new.doc_type || ' ' || new.format);
    END;
    CREATE TRIGGER IF NOT EXISTS fts_files_ad AFTER DELETE ON generated_files BEGIN
      DELETE FROM search_fts WHERE ref_type = 'file' AND ref_id = old.id;
    END;

    CREATE INDEX IF NOT EXISTS idx_classes_season ON classes(season_id);
    CREATE INDEX IF NOT EXISTS idx_classes_user ON classes(user_id);
    CREATE INDEX IF NOT EXISTS idx_enrollments_class ON class_enrollments(class_id);
    CREATE INDEX IF NOT EXISTS idx_enrollments_student ON class_enrollments(student_id);
    CREATE INDEX IF NOT EXISTS idx_attendance_student ON student_attendance(student_id, date);
    CREATE INDEX IF NOT EXISTS idx_grades_student ON student_grades(student_id);
    CREATE INDEX IF NOT EXISTS idx_student_grades_class ON student_grades(class_id);
    CREATE INDEX IF NOT EXISTS idx_obs_student ON student_observations(student_id, date);
    CREATE INDEX IF NOT EXISTS idx_session_feedback_class ON session_feedbacks(class_id);
    CREATE INDEX IF NOT EXISTS idx_session_feedback_lesson ON session_feedbacks(matiere, niveau, lecon);
    CREATE INDEX IF NOT EXISTS idx_skills_user_scope ON skills(user_id, scope_type, scope_subject);
    CREATE INDEX IF NOT EXISTS idx_image_cache_prompt ON image_cache(prompt_hash);
    CREATE INDEX IF NOT EXISTS idx_exam_questions_exam ON exam_questions(exam_id);
    CREATE INDEX IF NOT EXISTS idx_exam_grades_exam ON exam_grades(exam_id);
    CREATE INDEX IF NOT EXISTS idx_exam_grades_student ON exam_grades(student_id);
    CREATE INDEX IF NOT EXISTS idx_exam_student_answers_exam ON exam_student_answers(exam_id);
    CREATE INDEX IF NOT EXISTS idx_exam_student_answers_student ON exam_student_answers(student_id);
    CREATE INDEX IF NOT EXISTS idx_notebook_classe ON notebook_entries(classe_id, date);
    CREATE INDEX IF NOT EXISTS idx_notebook_user ON notebook_entries(user_id, date DESC);
    CREATE INDEX IF NOT EXISTS idx_notebook_exam ON notebook_entries(exam_id);
    CREATE INDEX IF NOT EXISTS idx_nb_att_entry ON notebook_entry_attachments(entry_id);
    CREATE INDEX IF NOT EXISTS idx_nb_att_user ON notebook_attachments(user_id);
    CREATE INDEX IF NOT EXISTS idx_generations_user_created ON generations(user_id, created_at DESC);
  `);

  // Migration: add pedagogical columns to student_observations if missing
  const obsCols = db.prepare("PRAGMA table_info(student_observations)").all() as any[];
  const obsColNames = obsCols.map((c: any) => c.name);
  const obsMigrations: [string, string][] = [
    ['observation_type', "TEXT NOT NULL DEFAULT 'individuelle'"],
    ['participation', "TEXT NOT NULL DEFAULT 'moyenne'"],
    ['comprehension', "TEXT NOT NULL DEFAULT 'maitrise'"],
    ['comportements', "TEXT NOT NULL DEFAULT '[]'"],
    ['difficulte', "TEXT NOT NULL DEFAULT 'aucune'"],
    ['action_pedagogique', "TEXT NOT NULL DEFAULT 'aucune'"],
    ['notion', "TEXT NOT NULL DEFAULT ''"],
    ['matiere', "TEXT NOT NULL DEFAULT ''"],
    ['niveau', "TEXT NOT NULL DEFAULT ''"],
    ['unite', "TEXT NOT NULL DEFAULT ''"],
    ['lecon', "TEXT NOT NULL DEFAULT ''"],
    ['cause_possible', "TEXT NOT NULL DEFAULT 'a_determiner'"],
    ['prochaine_seance', "TEXT NOT NULL DEFAULT '[]'"],
  ];
  for (const [col, def] of obsMigrations) {
    if (!obsColNames.includes(col)) {
      db.exec(`ALTER TABLE student_observations ADD COLUMN ${col} ${def}`);
    }
  }

  // Safe index creation after columns are guaranteed to exist
  db.exec(`CREATE INDEX IF NOT EXISTS idx_obs_notion ON student_observations(notion);`);

  // Migration: add columns to generations if missing (migration schema was different)
  const genCols = db.prepare("PRAGMA table_info(generations)").all() as any[];
  const genNames = genCols.map((c: any) => c.name);
  const genMigrations: [string, string][] = [
    ['matiere', 'TEXT NOT NULL DEFAULT \'\''],
    ['niveau', 'TEXT NOT NULL DEFAULT \'\''],
    ['lecon', 'TEXT NOT NULL DEFAULT \'\''],
    ['unite', 'TEXT NOT NULL DEFAULT \'\''],
    ['duree', 'INTEGER NOT NULL DEFAULT 50'],
    ['competences', 'TEXT NOT NULL DEFAULT \'[]\''],
    ['langue', 'TEXT NOT NULL DEFAULT \'francais\''],
    ['semestre', 'INTEGER NOT NULL DEFAULT 1'],
    ['files_count', 'INTEGER NOT NULL DEFAULT 0'],
    ['zip_url', 'TEXT'],
    ['metadata', 'TEXT'],
    ['files', 'TEXT NOT NULL DEFAULT \'[]\''],
  ];
  for (const [col, def] of genMigrations) {
    if (!genNames.includes(col)) {
      db.exec(`ALTER TABLE generations ADD COLUMN ${col} ${def}`);
    }
  }

  // Migration: add enabled/builtin columns if missing
  const cols = db.prepare("PRAGMA table_info(reference_files)").all() as any[];
  const colNames = cols.map((c: any) => c.name);
  if (!colNames.includes('enabled')) {
    db.exec("ALTER TABLE reference_files ADD COLUMN enabled INTEGER NOT NULL DEFAULT 1");
  }
  if (!colNames.includes('builtin')) {
    db.exec("ALTER TABLE reference_files ADD COLUMN builtin INTEGER NOT NULL DEFAULT 0");
  }
  // R2: per-user references (existing rows stay 'default' and remain visible to everyone)
  if (!colNames.includes('user_id')) {
    db.exec("ALTER TABLE reference_files ADD COLUMN user_id TEXT NOT NULL DEFAULT 'default'");
    db.exec("CREATE INDEX IF NOT EXISTS idx_reference_files_user ON reference_files(user_id)");
  }

  // Migration: add aref/direction_provinciale columns to users if missing
  const userCols = db.prepare("PRAGMA table_info(users)").all() as any[];
  const userNames = userCols.map((c: any) => c.name);
  if (!userNames.includes('aref')) {
    db.exec("ALTER TABLE users ADD COLUMN aref TEXT NOT NULL DEFAULT ''");
  }
  if (!userNames.includes('direction_provinciale')) {
    db.exec("ALTER TABLE users ADD COLUMN direction_provinciale TEXT NOT NULL DEFAULT ''");
  }

  // Migration: notebook_entries (heure_debut, heure_fin, group_id, entry_type, meta, and nullable classe_id)
  const nbCols = db.prepare("PRAGMA table_info(notebook_entries)").all() as any[];
  const nbColNames = nbCols.map((c: any) => c.name);
  const classeIdCol = nbCols.find((c: any) => c.name === 'classe_id');

  if (
    !nbColNames.includes('entry_type') ||
    !nbColNames.includes('meta') ||
    (classeIdCol && classeIdCol.notnull === 1)
  ) {
    db.exec("PRAGMA foreign_keys = OFF");
    db.exec(`
      CREATE TABLE IF NOT EXISTS notebook_entries_migrated (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL DEFAULT 'default',
        entry_type TEXT NOT NULL DEFAULT 'SESSION',
        classe_id TEXT,
        date TEXT NOT NULL,
        heure_debut TEXT DEFAULT '',
        heure_fin TEXT DEFAULT '',
        titre TEXT NOT NULL,
        resume TEXT NOT NULL DEFAULT '',
        statut TEXT NOT NULL DEFAULT 'planifiee',
        tags TEXT NOT NULL DEFAULT '[]',
        exam_id TEXT,
        group_id TEXT DEFAULT '',
        meta TEXT NOT NULL DEFAULT '{}',
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (classe_id) REFERENCES classes(id) ON DELETE SET NULL,
        FOREIGN KEY (exam_id) REFERENCES exams(id) ON DELETE SET NULL
      );
      INSERT INTO notebook_entries_migrated (
        id, user_id, entry_type, classe_id, date, heure_debut, heure_fin,
        titre, resume, statut, tags, exam_id, group_id, meta, created_at, updated_at
      )
      SELECT
        id,
        user_id,
        ${nbColNames.includes('entry_type') ? "COALESCE(entry_type, 'SESSION')" : "'SESSION'"},
        classe_id,
        date,
        ${nbColNames.includes('heure_debut') ? "COALESCE(heure_debut, '')" : "''"},
        ${nbColNames.includes('heure_fin') ? "COALESCE(heure_fin, '')" : "''"},
        titre,
        COALESCE(resume, ''),
        COALESCE(statut, 'planifiee'),
        COALESCE(tags, '[]'),
        exam_id,
        ${nbColNames.includes('group_id') ? "COALESCE(group_id, '')" : "''"},
        ${nbColNames.includes('meta') ? "COALESCE(meta, '{}')" : "'{}'"},
        created_at,
        updated_at
      FROM notebook_entries;
      DROP TABLE notebook_entries;
      ALTER TABLE notebook_entries_migrated RENAME TO notebook_entries;
    `);
    db.exec("PRAGMA foreign_keys = ON");
  } else {
    if (!nbColNames.includes('heure_debut')) {
      db.exec("ALTER TABLE notebook_entries ADD COLUMN heure_debut TEXT DEFAULT ''");
    }
    if (!nbColNames.includes('heure_fin')) {
      db.exec("ALTER TABLE notebook_entries ADD COLUMN heure_fin TEXT DEFAULT ''");
    }
    if (!nbColNames.includes('group_id')) {
      db.exec("ALTER TABLE notebook_entries ADD COLUMN group_id TEXT DEFAULT ''");
    }
  }
  db.exec("CREATE INDEX IF NOT EXISTS idx_notebook_group_id ON notebook_entries(group_id)");
  db.exec("CREATE INDEX IF NOT EXISTS idx_notebook_classe ON notebook_entries(classe_id, date)");
  db.exec("CREATE INDEX IF NOT EXISTS idx_notebook_exam ON notebook_entries(exam_id)");
  db.exec("CREATE INDEX IF NOT EXISTS idx_notebook_type ON notebook_entries(entry_type)");

  // Migration: add options/image_url to exam_questions if missing
  const eqCols = db.prepare("PRAGMA table_info(exam_questions)").all() as any[];
  const eqColNames = eqCols.map((c: any) => c.name);
  if (!eqColNames.includes('options')) {
    db.exec("ALTER TABLE exam_questions ADD COLUMN options TEXT NOT NULL DEFAULT '[]'");
  }
  if (!eqColNames.includes('image_url')) {
    db.exec("ALTER TABLE exam_questions ADD COLUMN image_url TEXT NOT NULL DEFAULT ''");
  }

  // Migration: add options/image_url to question_bank if missing
  const qbCols = db.prepare("PRAGMA table_info(question_bank)").all() as any[];
  const qbColNames = qbCols.map((c: any) => c.name);
  if (!qbColNames.includes('options')) {
    db.exec("ALTER TABLE question_bank ADD COLUMN options TEXT NOT NULL DEFAULT '[]'");
  }
  if (!qbColNames.includes('image_url')) {
    db.exec("ALTER TABLE question_bank ADD COLUMN image_url TEXT NOT NULL DEFAULT ''");
  }

  // Migration: add user_id to custom_prompts if missing
  const cpCols = db.prepare("PRAGMA table_info(custom_prompts)").all() as any[];
  const cpColNames = cpCols.map((c: any) => c.name);
  if (!cpColNames.includes('user_id')) {
    db.exec("ALTER TABLE custom_prompts ADD COLUMN user_id TEXT NOT NULL DEFAULT 'default'");
    db.exec("CREATE INDEX IF NOT EXISTS idx_custom_prompts_user ON custom_prompts(user_id, key)");
  }

  // Migration: add guide_config to exams if missing
  const examCols = db.prepare("PRAGMA table_info(exams)").all() as any[];
  const examColNames = examCols.map((c: any) => c.name);
  if (!examColNames.includes('guide_config')) {
    db.exec("ALTER TABLE exams ADD COLUMN guide_config TEXT NOT NULL DEFAULT ''");
  }

  db.exec(`
    CREATE TABLE IF NOT EXISTS exam_student_answers (
      id TEXT PRIMARY KEY,
      exam_id TEXT NOT NULL,
      student_id TEXT NOT NULL,
      question_numero INTEGER NOT NULL,
      choice_key TEXT NOT NULL DEFAULT '',
      choice_text TEXT NOT NULL DEFAULT '',
      is_correct INTEGER NOT NULL DEFAULT 0,
      note REAL NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (exam_id) REFERENCES exams(id) ON DELETE CASCADE,
      FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
      UNIQUE (exam_id, student_id, question_numero)
    );
    CREATE INDEX IF NOT EXISTS idx_exam_student_answers_exam ON exam_student_answers(exam_id);
    CREATE INDEX IF NOT EXISTS idx_exam_student_answers_student ON exam_student_answers(student_id);
  `);
  
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
  if (process.env.NODE_ENV === 'production' || process.env.DISABLE_SEED === 'true') return;

  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get('enseignant@pedagogen.ma');
  if (existing) return;

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

function seedDefaultSeason(db: Database.Database) {
  try {
    const existing = db.prepare("SELECT id FROM academic_seasons WHERE code = '2026/2027'").get();
    if (!existing) {
      db.prepare(`
        INSERT INTO academic_seasons (id, user_id, code, label, is_current, start_date, end_date)
        VALUES (?, ?, ?, ?, 1, '2026-09-01', '2027-06-30')
      `).run('season-2026-2027', 'default', '2026/2027', 'Année Scolaire 2026/2027');
    }
  } catch (err) {
    console.error('Failed to seed default season:', err);
  }
}
