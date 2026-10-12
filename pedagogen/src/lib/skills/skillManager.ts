import { getDb } from '@/lib/db';
import type { CourseMetadata } from '@/types/generation';
import type { Skill, CreateSkillInput, UpdateSkillInput } from '@/types/skills';

export const BUILTIN_SKILLS: Omit<Skill, 'created_at' | 'updated_at'>[] = [
  {
    id: 'skill-docx-morocco-pro',
    user_id: 'system',
    name: 'Formatage DOCX Pro (Normes MEN)',
    description: 'Structure les tableaux Word avec bordures soignées, barèmes aérés et interlignage clair sans rupture inopinée.',
    category: 'format',
    prompt_instruction: `POUR LES FICHIERS ET CONTENUS DESTINÉS AU FORMAT DOCX:
- Structurer systématiquement les exercices et synthèses sous forme de tableaux ou encadrés clairs.
- Ajouter des lignes en pointillés ou espaces suffisants pour la rédaction manuscrite de l'élève.
- Préciser un barème fractionné clair (/1 pt, /2 pts) pour chaque question d'application.
- Assurer une hiérarchie stricte des titres (I. Activité de découverte, II. Trace écrite, III. Exercices d'application).`,
    scope_type: 'global',
    scope_subject: '',
    scope_level: '',
    scope_unit: '',
    scope_lesson: '',
    target_doc_types: ['fiche_pedagogique', 'cours_complet', 'evaluation', 'plan_gestion_classe'],
    target_formats: ['docx'],
    is_enabled: true,
    is_builtin: true,
  },
  {
    id: 'skill-timing-strict-55min',
    user_id: 'system',
    name: 'Gestion du Minutage Strict (Séance 50-55 min)',
    description: 'Cadre précisément la progression pour éviter tout débordement horaire dans les classes de collège marocain.',
    category: 'timing',
    prompt_instruction: `RÈGLES IMPÉRATIVES DE GESTION DU TEMPS (SÉANCE DE 50 À 55 MINUTES AU COLLÈGE):
1. Phase de rappel & diagnostic : 5 minutes maximum.
2. Situation-problème / Activité de découverte : 15 à 20 minutes avec consigne brève et mesurable.
3. Institutionnalisation / Trace écrite : 15 minutes. Limiter impérativement le texte à copier par les élèves pour ne pas dépasser le temps.
4. Application immédiate & évaluation formative : 10 minutes (1 à 2 exercices ciblés).
5. Bilan & Devoirs / Clôture : 5 minutes.
AUCUNE activité ne doit être irréaliste en durée. Si le contenu est trop vaste, le scinder explicitement.`,
    scope_type: 'global',
    scope_subject: '',
    scope_level: '',
    scope_unit: '',
    scope_lesson: '',
    target_doc_types: ['fiche_pedagogique', 'planification', 'cours_complet'],
    target_formats: [],
    is_enabled: true,
    is_builtin: true,
  },
  {
    id: 'skill-prerequisites-conflict-resolution',
    user_id: 'system',
    name: 'Gestion des Conflits & Lacunes de Prérequis',
    description: 'Diagnostique les prérequis manquants et injecte une mini-remédiation de 5 min au lieu de bloquer la séance.',
    category: 'conflict_resolution',
    prompt_instruction: `GESTION DES CONFLITS PÉDAGOGIQUES ET LACUNES DE PRÉREQUIS:
- Si les prérequis indispensables à la leçon (ex: notion de fraction en maths, système de fichiers en info) ne sont pas maîtrisés par tous les élèves :
  1. Prévoir un test flash de diagnostic initial (3 questions simples en 3 minutes).
  2. Proposer une alternative de remédiation immédiate 'Voie Rapide' pour les élèves en difficulté sans ralentir le reste du groupe.
  3. Fournir une analogie concrète ou une aide visuelle d'appoint (fiches coup de pouce).
  4. Ne jamais bloquer la leçon : intégrer la remédiation au cours de l'activité elle-même.`,
    scope_type: 'global',
    scope_subject: '',
    scope_level: '',
    scope_unit: '',
    scope_lesson: '',
    target_doc_types: ['fiche_pedagogique', 'cours_complet', 'plan_gestion_classe'],
    target_formats: [],
    is_enabled: true,
    is_builtin: true,
  },
  {
    id: 'skill-html-interactive-offline',
    user_id: 'system',
    name: 'Quiz & Flashcards HTML Interactifs Offline',
    description: 'Optimise les évaluations HTML avec validation instantanée et flashcards tactiles pour PC ou tablettes hors-ligne.',
    category: 'format',
    prompt_instruction: `POUR LES ÉVALUATIONS ET QUIZ AU FORMAT HTML INTERACTIF:
- Générer des questions variées (QCM à choix unique, vrai/faux argumenté, associations).
- Pour chaque question, fournir une explication didactique bienveillante affichée immédiatement après la réponse.
- Intégrer un mode 'Flashcard' avec recto (notion clé / question) et verso (synthèse / réponse).
- Veiller à ce que l'évaluation soit notée sur 20 selon les standards des collèges marocains.`,
    scope_type: 'global',
    scope_subject: '',
    scope_level: '',
    scope_unit: '',
    scope_lesson: '',
    target_doc_types: ['evaluation', 'resume_eleve'],
    target_formats: ['html'],
    is_enabled: true,
    is_builtin: true,
  },
  {
    id: 'skill-info-scratch-algo',
    user_id: 'system',
    name: 'Algorithmique & Scratch (Didactique Informatique)',
    description: 'Directives ciblées pour l\'enseignement de l\'algorithmique et des blocs Scratch (2AC / 3AC) : boucles, conditions et variables.',
    category: 'pedagogy',
    prompt_instruction: `DIDACTIQUE DE L'ALGORITHMIQUE ET DE LA PROGRAMMATION PAR BLOCS (SCRATCH):
- Toujours formaliser l'algorithme en langage naturel / pseudo-code (Entrée -> Traitement -> Sortie) avant le code Scratch.
- Expliciter les pièges récurrents des élèves : confusion entre 'Si ... alors' et 'Répéter jusqu'à', initialisation incorrecte des variables.
- Prévoir un mini-défi progressif pour les élèves qui terminent avant les autres (différenciation).
- Mettre en avant le rôle de la scène, des lutins et des coordonnées (x, y).`,
    scope_type: 'subject',
    scope_subject: 'Informatique',
    scope_level: '',
    scope_unit: 'Algorithmique & Programmation',
    scope_lesson: '',
    target_doc_types: ['fiche_pedagogique', 'cours_complet', 'evaluation'],
    target_formats: [],
    is_enabled: true,
    is_builtin: true,
  },
  {
    id: 'skill-sciences-demarche-investigation',
    user_id: 'system',
    name: 'Démarche d\'Investigation Scientifique (Physique / SVT)',
    description: 'Structure la séance selon la démarche scientifique : situation déclenchante, hypothèses d\'élèves, manipulation et confrontation.',
    category: 'pedagogy',
    prompt_instruction: `DÉMARCHE D'INVESTIGATION POUR LES SCIENCES (SVT / PHYSIQUE-CHIMIE):
1. Partir d'une situation déclenchante concrète issue de l'environnement marocain (phénomène naturel, expérience intrigante).
2. Guider les élèves vers l'émission d'hypothèses rédigées clairement au tableau.
3. Formuler le protocole expérimental ou d'observation avec liste du matériel de laboratoire usuel du collège.
4. Conclure par une confrontation rigoureuse : validation ou réfutation de l'hypothèse initiale.`,
    scope_type: 'subject',
    scope_subject: 'Physique-Chimie',
    scope_level: '',
    scope_unit: '',
    scope_lesson: '',
    target_doc_types: ['fiche_pedagogique', 'cours_complet'],
    target_formats: [],
    is_enabled: true,
    is_builtin: true,
  },
];

export function seedBuiltinSkills(): void {
  const db = getDb();
  const insertStmt = db.prepare(
    `INSERT OR IGNORE INTO skills (
      id, user_id, name, description, category, prompt_instruction,
      scope_type, scope_subject, scope_level, scope_unit, scope_lesson,
      target_doc_types, target_formats, is_enabled, is_builtin
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );

  for (const s of BUILTIN_SKILLS) {
    insertStmt.run(
      s.id,
      s.user_id,
      s.name,
      s.description,
      s.category,
      s.prompt_instruction,
      s.scope_type,
      s.scope_subject,
      s.scope_level,
      s.scope_unit,
      s.scope_lesson,
      JSON.stringify(s.target_doc_types || []),
      JSON.stringify(s.target_formats || []),
      s.is_enabled ? 1 : 0,
      1
    );
  }
}

export function getAllSkills(userId = 'default'): Skill[] {
  const db = getDb();
  seedBuiltinSkills();

  const rows = db.prepare(
    `SELECT * FROM skills
    WHERE user_id = ? OR is_builtin = 1
    ORDER BY is_builtin DESC, created_at DESC`
  ).all(userId) as any[];

  return rows.map((r) => ({
    id: r.id,
    user_id: r.user_id,
    name: r.name,
    description: r.description || '',
    category: r.category,
    prompt_instruction: r.prompt_instruction,
    scope_type: r.scope_type,
    scope_subject: r.scope_subject || '',
    scope_level: r.scope_level || '',
    scope_unit: r.scope_unit || '',
    scope_lesson: r.scope_lesson || '',
    target_doc_types: JSON.parse(r.target_doc_types || '[]'),
    target_formats: JSON.parse(r.target_formats || '[]'),
    is_enabled: Boolean(r.is_enabled),
    is_builtin: Boolean(r.is_builtin),
    created_at: r.created_at,
    updated_at: r.updated_at,
  }));
}

export function getSkillById(id: string, userId = 'default'): Skill | null {
  const db = getDb();
  const r = db.prepare(
    `SELECT * FROM skills WHERE id = ? AND (user_id = ? OR is_builtin = 1)`
  ).get(id, userId) as any;

  if (!r) return null;
  return {
    id: r.id,
    user_id: r.user_id,
    name: r.name,
    description: r.description || '',
    category: r.category,
    prompt_instruction: r.prompt_instruction,
    scope_type: r.scope_type,
    scope_subject: r.scope_subject || '',
    scope_level: r.scope_level || '',
    scope_unit: r.scope_unit || '',
    scope_lesson: r.scope_lesson || '',
    target_doc_types: JSON.parse(r.target_doc_types || '[]'),
    target_formats: JSON.parse(r.target_formats || '[]'),
    is_enabled: Boolean(r.is_enabled),
    is_builtin: Boolean(r.is_builtin),
    created_at: r.created_at,
    updated_at: r.updated_at,
  };
}

export function createSkill(input: CreateSkillInput, userId = 'default'): Skill {
  const db = getDb();
  const id = `skill-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  db.prepare(
    `INSERT INTO skills (
      id, user_id, name, description, category, prompt_instruction,
      scope_type, scope_subject, scope_level, scope_unit, scope_lesson,
      target_doc_types, target_formats, is_enabled, is_builtin
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)`
  ).run(
    id,
    userId,
    input.name.trim(),
    (input.description || '').trim(),
    input.category,
    input.prompt_instruction.trim(),
    input.scope_type,
    (input.scope_subject || '').trim(),
    (input.scope_level || '').trim(),
    (input.scope_unit || '').trim(),
    (input.scope_lesson || '').trim(),
    JSON.stringify(input.target_doc_types || []),
    JSON.stringify(input.target_formats || []),
    input.is_enabled !== false ? 1 : 0
  );

  return getSkillById(id, userId)!;
}

export function updateSkill(input: UpdateSkillInput, userId = 'default'): Skill | null {
  const db = getDb();
  const existing = getSkillById(input.id, userId);
  if (!existing) return null;

  const name = input.name !== undefined ? input.name.trim() : existing.name;
  const description = input.description !== undefined ? input.description.trim() : existing.description;
  const category = input.category !== undefined ? input.category : existing.category;
  const prompt_instruction = input.prompt_instruction !== undefined ? input.prompt_instruction.trim() : existing.prompt_instruction;
  const scope_type = input.scope_type !== undefined ? input.scope_type : existing.scope_type;
  const scope_subject = input.scope_subject !== undefined ? input.scope_subject.trim() : existing.scope_subject;
  const scope_level = input.scope_level !== undefined ? input.scope_level.trim() : existing.scope_level;
  const scope_unit = input.scope_unit !== undefined ? input.scope_unit.trim() : existing.scope_unit;
  const scope_lesson = input.scope_lesson !== undefined ? input.scope_lesson.trim() : existing.scope_lesson;
  const target_doc_types = input.target_doc_types !== undefined ? JSON.stringify(input.target_doc_types) : JSON.stringify(existing.target_doc_types);
  const target_formats = input.target_formats !== undefined ? JSON.stringify(input.target_formats) : JSON.stringify(existing.target_formats);
  const is_enabled = input.is_enabled !== undefined ? (input.is_enabled ? 1 : 0) : (existing.is_enabled ? 1 : 0);

  db.prepare(
    `UPDATE skills SET
      name = ?, description = ?, category = ?, prompt_instruction = ?,
      scope_type = ?, scope_subject = ?, scope_level = ?, scope_unit = ?, scope_lesson = ?,
      target_doc_types = ?, target_formats = ?, is_enabled = ?, updated_at = datetime('now')
    WHERE id = ?`
  ).run(
    name, description, category, prompt_instruction,
    scope_type, scope_subject, scope_level, scope_unit, scope_lesson,
    target_doc_types, target_formats, is_enabled, input.id
  );

  return getSkillById(input.id, userId);
}

export function toggleSkill(id: string, userId = 'default'): boolean | null {
  const db = getDb();
  const existing = getSkillById(id, userId);
  if (!existing) return null;

  const nextState = existing.is_enabled ? 0 : 1;
  db.prepare(`UPDATE skills SET is_enabled = ?, updated_at = datetime('now') WHERE id = ?`).run(nextState, id);
  return nextState === 1;
}

export function deleteSkill(id: string, userId = 'default'): boolean {
  const db = getDb();
  const res = db.prepare(`DELETE FROM skills WHERE id = ? AND user_id = ? AND is_builtin = 0`).run(id, userId);
  return res.changes > 0;
}

/**
 * Filtre intelligemment les skills applicables pour une génération donnée
 * en fonction de la matière, de l'unité, de la leçon et du niveau.
 */
export function resolveApplicableSkills(
  metadata: Partial<CourseMetadata>,
  activeSkillIds?: string[],
  userId = 'default'
): { recommendedSkills: Skill[]; activeSkills: Skill[]; allSkills: Skill[] } {
  const allSkills = getAllSkills(userId);

  const cleanSubject = (metadata.matiere || '').toLowerCase().trim();
  const cleanLevel = (metadata.niveau || '').toLowerCase().trim();
  const cleanUnit = (metadata.unite || '').toLowerCase().trim();
  const cleanLesson = (metadata.lecon || '').toLowerCase().trim();

  // Détection des skills recommandés contextuellement
  const recommendedSkills = allSkills.filter((skill) => {
    if (!skill.is_enabled) return false;

    // Scope global : toujours recommandé
    if (skill.scope_type === 'global') return true;

    // Scope matière
    if (skill.scope_type === 'subject') {
      const matchSub = !skill.scope_subject || cleanSubject.includes(skill.scope_subject.toLowerCase());
      const matchLvl = !skill.scope_level || cleanLevel === skill.scope_level.toLowerCase();
      return matchSub && matchLvl;
    }

    // Scope unité
    if (skill.scope_type === 'unit') {
      const matchSub = !skill.scope_subject || cleanSubject.includes(skill.scope_subject.toLowerCase());
      const matchUnit = !skill.scope_unit || cleanUnit.includes(skill.scope_unit.toLowerCase()) || skill.scope_unit.toLowerCase().includes(cleanUnit);
      return matchSub && matchUnit;
    }

    // Scope leçon
    if (skill.scope_type === 'lesson') {
      const matchSub = !skill.scope_subject || cleanSubject.includes(skill.scope_subject.toLowerCase());
      const matchLesson = !skill.scope_lesson || cleanLesson.includes(skill.scope_lesson.toLowerCase()) || skill.scope_lesson.toLowerCase().includes(cleanLesson);
      return matchSub && matchLesson;
    }

    return false;
  });

  // Détermination des skills actifs effectifs
  let activeSkills: Skill[] = [];

  if (activeSkillIds && activeSkillIds.length > 0) {
    // Si l'utilisateur a explicitement fourni une sélection manuelle dans le formulaire
    const idSet = new Set(activeSkillIds);
    activeSkills = allSkills.filter((s) => idSet.has(s.id));
  } else {
    // Par défaut : tous les skills recommandés et activés
    activeSkills = recommendedSkills;
  }

  return {
    recommendedSkills,
    activeSkills,
    allSkills,
  };
}
