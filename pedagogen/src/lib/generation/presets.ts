import { getDb } from '@/lib/db';

export interface Preset {
  id: string;
  name: string;
  metadata: Record<string, unknown>;
  documents: string[];
  include_prompt: string;
  exclude_prompt: string;
  is_owner?: boolean;
}

const DEFAULT_TEMPLATES = [
  {
    name: "Modèle MEN — Démarche d'Investigation (APC)",
    metadata: {
      niveau: "1AC",
      matiere: "Informatique",
      methode: "Découverte",
      ton: "Engageant",
      niveauxBloom: ["Comprendre", "Appliquer"],
      differentiation: "standard",
      imageStyle: "Illustration",
      competences: "Analyser une situation problème, Mobiliser les concepts fondamentaux, Structurer les démarches de résolution",
    },
    documents: ["fiche_pedagogique", "planification", "resume_eleve"],
    include_prompt: "Respecter la démarche pédagogique par compétences (Situation-problème déclenchante, formulation des hypothèses, activités d'investigation, institutionnalisation et réinvestissement).",
    exclude_prompt: "",
  },
  {
    name: "Modèle MEN — Résolution de Problèmes & Évaluation",
    metadata: {
      niveau: "2AC",
      matiere: "Informatique",
      methode: "Résolution de Problèmes",
      ton: "Académique",
      niveauxBloom: ["Appliquer", "Analyser"],
      differentiation: "soutien",
      imageStyle: "Minimaliste",
      competences: "Résoudre un problème algorithmique ou technique, Évaluer la validité de la solution",
    },
    documents: ["fiche_pedagogique", "cours_complet", "evaluation"],
    include_prompt: "Fournir un barème détaillé par question avec remédiation anticipée des erreurs courantes.",
    exclude_prompt: "",
  },
  {
    name: "Modèle MEN — Travaux Pratiques & Diapositives",
    metadata: {
      niveau: "3AC",
      matiere: "Informatique",
      methode: "Démonstrative",
      ton: "Moderne",
      niveauxBloom: ["Appliquer", "Créer"],
      differentiation: "defi",
      imageStyle: "3D",
      competences: "Maîtriser les manipulations techniques en atelier, Produire un livrable autonome",
    },
    documents: ["fiche_pedagogique", "plan_gestion_classe", "presentation_pptx"],
    include_prompt: "Prévoir les consignes de sécurité en laboratoire et le guidage pas-à-pas pour les manipulations informatiques.",
    exclude_prompt: "",
  },
];

function seedDefaultPresets(db: ReturnType<typeof getDb>) {
  try {
    const count = (db.prepare('SELECT COUNT(*) as c FROM generation_presets WHERE user_id = ?').get('system') as any)?.c || 0;
    if (count === 0) {
      for (const t of DEFAULT_TEMPLATES) {
        const id = `preset_sys_${Math.random().toString(36).slice(2, 8)}`;
        db.prepare(`
          INSERT INTO generation_presets (id, user_id, name, metadata, documents, include_prompt, exclude_prompt)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run(
          id,
          'system',
          t.name,
          JSON.stringify(t.metadata),
          JSON.stringify(t.documents),
          t.include_prompt,
          t.exclude_prompt
        );
      }
    }
  } catch (err) {
    console.error('Failed to seed default presets:', err);
  }
}

export function listPresets(userId: string = 'default'): Preset[] {
  const db = getDb();
  seedDefaultPresets(db);

  const rows = db.prepare(`
    SELECT * FROM generation_presets 
    WHERE user_id = ? OR user_id = 'default' OR user_id = 'system'
    ORDER BY CASE WHEN user_id = 'system' THEN 1 ELSE 0 END, created_at DESC
  `).all(userId) as any[];

  return rows.map((r) => {
    let metadata: Record<string, unknown> = {};
    let documents: string[] = [];
    try { metadata = JSON.parse(r.metadata || '{}'); } catch { /* {} */ }
    try { documents = JSON.parse(r.documents || '[]'); } catch { /* [] */ }
    return {
      id: r.id,
      name: r.name,
      metadata,
      documents,
      include_prompt: r.include_prompt,
      exclude_prompt: r.exclude_prompt,
      is_owner: r.user_id === userId || (userId === 'default' && r.user_id !== 'system'),
    };
  });
}

export function createPreset(
  data: { name: string; metadata: Record<string, unknown>; documents: string[]; include_prompt?: string; exclude_prompt?: string },
  userId: string = 'default'
): Preset | null {
  const db = getDb();
  if (!data.name?.trim()) return null;
  const id = `preset_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  db.prepare(`
    INSERT INTO generation_presets (id, user_id, name, metadata, documents, include_prompt, exclude_prompt)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    userId,
    data.name.trim(),
    JSON.stringify(data.metadata || {}),
    JSON.stringify(data.documents || []),
    data.include_prompt || '',
    data.exclude_prompt || ''
  );
  return listPresets(userId).find((p) => p.id === id) || null;
}

export function deletePreset(id: string, userId: string = 'default'): boolean {
  const db = getDb();
  return db.prepare('DELETE FROM generation_presets WHERE id = ? AND (user_id = ? OR user_id = "default")').run(id, userId).changes > 0;
}
