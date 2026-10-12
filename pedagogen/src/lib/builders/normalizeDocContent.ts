/**
 * Normalisation robuste des contenus générés par l'IA.
 *
 * Les modèles (gpt-oss, DeepSeek, modèles locaux…) renvoient les mêmes données
 * avec des variantes imprévisibles : clés accentuées ou majusculées
 * (« Déroulement », « remédiation »), valeurs sous forme de chaîne au lieu de
 * tableau, wrappers d'outils imbriqués ({ generate_fiche_pedagogique: {...} }), etc.
 * Les builders et les aperçus lisent des clés canoniques — sans normalisation,
 * le document sort vide (seul l'en-tête est rendu) ou l'aperçu plante.
 *
 * Chaque normaliseur accepte n'importe quelle variante et renvoie la forme
 * canonique attendue par les builders et DocPreview.
 */

type AnyObj = Record<string, any>;

/** lowercase + sans accents, pour comparer les clés insensiblement. */
function normKey(key: string): string {
  return key
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[\s\-]/g, '_');
}

/** Recherche une clé parmi des candidats, insensible à la casse/accents/underscores. */
function findKey(source: AnyObj | null | undefined, ...candidates: string[]): any {
  if (!source || typeof source !== 'object') return undefined;
  for (const c of candidates) {
    if (source[c] !== undefined && source[c] !== null) return source[c];
  }
  const wanted = candidates.map(normKey);
  for (const k of Object.keys(source)) {
    if (wanted.includes(normKey(k)) && source[k] !== undefined && source[k] !== null) {
      return source[k];
    }
  }
  return undefined;
}

/** Retire les wrappers d'outils IA autour du contenu réel. */
export function unwrapContent(raw: unknown): AnyObj {
  if (!raw || typeof raw !== 'object') return {};
  let obj: AnyObj = Array.isArray(raw) ? { items: raw } : { ...(raw as AnyObj) };

  const WRAPPERS = ['arguments', 'data', 'properties', 'input', 'content', 'result', 'response'];
  for (let i = 0; i < 3; i++) {
    let unwrapped = false;
    for (const w of WRAPPERS) {
      if (obj[w] && typeof obj[w] === 'object' && !Array.isArray(obj[w]) && Object.keys(obj).length <= 3) {
        obj = { ...obj[w] };
        unwrapped = true;
        break;
      }
      if (typeof obj[w] === 'string' && Object.keys(obj).length === 1) {
        try {
          obj = JSON.parse(obj[w]);
          unwrapped = true;
          break;
        } catch { /* not JSON */ }
      }
    }
    if (unwrapped) continue;
    // Wrappers nommés d'après l'outil ou le type de document
    for (const k of Object.keys(obj)) {
      const v = obj[k];
      if (
        typeof v === 'object' && v !== null && !Array.isArray(v) &&
        Object.keys(obj).length === 1 &&
        /^(generate_|plan_|fiche_|cours_|evaluation|resume_|presentation_|plan_gestion|planification)/i.test(k)
      ) {
        obj = { ...v };
        unwrapped = true;
        break;
      }
    }
    if (!unwrapped) break;
  }
  return obj;
}

/** Coerce n'importe quoi en tableau de chaînes non vides. */
export function toStringArray(value: unknown): string[] {
  if (value === null || value === undefined) return [];
  if (Array.isArray(value)) {
    return value
      .map((item) => {
        if (item === null || item === undefined) return '';
        if (typeof item === 'string') return item.trim();
        if (typeof item === 'number' || typeof item === 'boolean') return String(item);
        if (typeof item === 'object') {
          // ex: { texte: '...' } | { description: '...' }
          const o = item as AnyObj;
          const first = findKey(o, 'texte', 'text', 'description', 'titre', 'label', 'valeur', 'value', 'contenu');
          return String(first ?? Object.values(o)[0] ?? '').trim();
        }
        return String(item).trim();
      })
      .filter((s) => s.length > 0);
  }
  if (typeof value === 'string') {
    const v = value.trim();
    if (!v) return [];
    // Tenter un parse JSON (modèle qui stringifie un tableau)
    if (/^\[/.test(v)) {
      try {
        const parsed = JSON.parse(v);
        if (Array.isArray(parsed)) return toStringArray(parsed);
      } catch { /* not JSON */ }
    }
    return v
      .split(/\r?\n|(?:\s*[;•]\s*)/)
      .map((s) => s.replace(/^[-*\d.)\s]+/, '').trim())
      .filter((s) => s.length > 0);
  }
  if (typeof value === 'object') return toStringArray(Object.values(value));
  return [String(value)];
}

/** Coerce en texte simple (string | array join | { text } | object values). */
export function toText(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value.trim();
  if (Array.isArray(value)) return toStringArray(value).join('\n');
  if (typeof value === 'object') {
    const o = value as AnyObj;
    const direct = findKey(o, 'texte', 'text', 'description', 'contenu', 'value');
    if (typeof direct === 'string') return direct.trim();
    return Object.values(o).map((v) => toText(v)).filter(Boolean).join('\n');
  }
  return String(value);
}

/** Coerce en dialogue { enseignant, apprenent } (+ savoir éventuel). */
function toDialogue(value: unknown): { enseignant: string; apprenent: string; savoir?: string } {
  if (value === null || value === undefined) return { enseignant: '', apprenent: '' };
  if (typeof value === 'string') return { enseignant: value.trim(), apprenent: '' };
  if (Array.isArray(value)) {
    // ex: [{ enseignant: ... }, { apprenent: ... }] ou tableau d'étapes texte
    const merged = {
      enseignant: toStringArray(value.map((v: any) => (v && typeof v === 'object' ? v.enseignant : undefined))).join('\n'),
      apprenent: toStringArray(value.map((v: any) => (v && typeof v === 'object' ? (v.apprenent ?? v.apprenant) : undefined))).join('\n'),
    };
    if (!merged.enseignant && !merged.apprenent) merged.enseignant = toStringArray(value).join('\n');
    return merged;
  }
  if (typeof value === 'object') {
    const o = value as AnyObj;
    const savoirRaw = findKey(o, 'savoir', 'notion', 'cours');
    const out: { enseignant: string; apprenent: string; savoir?: string } = {
      enseignant: toText(findKey(o, 'enseignant', 'enseignant_role', 'prof', 'teacher', 'action')),
      apprenent: toText(findKey(o, 'apprenent', 'apprenant', 'eleve', 'student')),
    };
    if (savoirRaw !== undefined) out.savoir = toText(savoirRaw);
    if (!out.enseignant && !out.apprenent) out.enseignant = toText(o);
    return out;
  }
  return { enseignant: String(value), apprenent: '' };
}

/** Coerce en objet { clé: valeur } en généralisant les variantes de clés de phases. */
function toSection(value: unknown): AnyObj {
  if (value && typeof value === 'object' && !Array.isArray(value)) return value as AnyObj;
  return {};
}

// ─── FICHE PÉDAGOGIQUE ───

export function normalizeFichePedagogique(raw: unknown, fallbackTitle?: string): AnyObj {
  let obj = unwrapContent(raw);
  if (Object.keys(obj).length === 0) {
    const text = typeof raw === 'string' ? raw.trim() : '';
    return {
      titre_seance: fallbackTitle || (text ? text.slice(0, 80) : 'Fiche Pédagogique'),
      objectifs: text ? [text.slice(0, 400)] : [],
      deroulement: {},
    };
  }

  const out: AnyObj = { ...obj };

  out.titre_seance = toText(findKey(obj, 'titre_seance', 'titre_de_la_seance', 'titre_de_seance', 'titre', 'title', 'séance')) || fallbackTitle || 'Fiche Pédagogique';
  out.timing_consistency_check = toText(findKey(obj, 'timing_consistency_check', 'timing', 'coherence_duree'));

  const arrayFields: Array<[string, string[]]> = [
    ['liens_avec_autres_disciplines', ['liens_avec_autres_disciplines', 'liens_disciplines', 'liens']],
    ['modalités_évaluation_formative', ['modalités_évaluation_formative', 'modalites_evaluation_formative', 'modalites_evaluation', 'evaluation_formative']],
    ['competences_visees', ['competences_visees', 'competences']],
    ['objectifs', ['objectifs', 'objectifs_pedagogiques', 'objectif']],
    ['prerequis', ['prerequis', 'prérequis', 'prerequis_requis']],
    ['savoir_faire', ['savoir_faire', 'savoirfaire']],
    ['savoir_etre', ['savoir_etre', 'savoirêtre', 'savoir_etre_developpes']],
    ['activites_eleves', ['activites_eleves', 'activites']],
  ];
  for (const [canonical, candidates] of arrayFields) {
    const v = findKey(obj, ...candidates);
    if (v !== undefined) out[canonical] = toStringArray(v);
  }
  // Jumeaux non accentués (aperçu lit l'un, builders l'autre)
  const modalites = toStringArray(findKey(obj, 'modalités_évaluation_formative', 'modalites_evaluation_formative', 'modalites_evaluation', 'evaluation_formative'));
  out.modalités_évaluation_formative = modalites;
  out.modalites_evaluation_formative = modalites;

  out.préparation_antérieure = toText(findKey(obj, 'préparation_antérieure', 'preparation_anterieure', 'preparation'));
  out.preparation_anterieure = out.préparation_antérieure;

  out.remédiation = normalizeRemediation(obj);
  out.remediation = out.remédiation;

  // ── Déroulement (3 phases, clés insensibles aux accents/casse) ──
  const derRaw = toSection(findKey(obj, 'deroulement', 'déroulement', 'deroulement_seance', 'phases'));
  if (Object.keys(derRaw).length > 0) {
    const mise = toSection(findKey(derRaw, 'Mise_en_situation', 'mise_en_situation', 'mise en situation', 'MiseEnSituation'));
    const analyse = toSection(findKey(derRaw, 'Analyse', 'analyse'));
    const synthese = toSection(findKey(derRaw, 'Synthese', 'synthèse', 'Synthese', 'synthese'));

    out.deroulement = {
      Mise_en_situation: {
        rappel: toDialogue(findKey(mise, 'rappel', 'Rappel', 'revision')),
        situation_probleme: toDialogue(findKey(mise, 'situation_probleme', 'situation_problème', 'SP', 'probleme')),
        ...(Array.isArray(findKey(mise, 'outils_didactiques', 'outils'))
          ? { outils_didactiques: toStringArray(findKey(mise, 'outils_didactiques', 'outils')) }
          : {}),
      },
      Analyse: {
        Analyse_SP: toDialogue(findKey(analyse, 'Analyse_SP', 'analyse_sp', 'Analyse de la SP', 'analyseSP', 'analyse_de_la_sp')),
        Investigation: toDialogue(findKey(analyse, 'Investigation', 'investigation')),
        Generalisation: toDialogue(findKey(analyse, 'Generalisation', 'généralisation', 'Generalisation', 'generalisation')),
        ENTRAINEMENT: toDialogue(findKey(analyse, 'ENTRAINEMENT', 'Entrainement', 'entraînement', 'entrainement', 'Entraînement')),
        ...(Array.isArray(findKey(analyse, 'outils_didactiques', 'outils'))
          ? { outils_didactiques: toStringArray(findKey(analyse, 'outils_didactiques', 'outils')) }
          : {}),
      },
      Synthese: {
        Quiz: toDialogue(findKey(synthese, 'Quiz', 'quiz', 'evaluation')),
        ...(Array.isArray(findKey(synthese, 'outils_didactiques_materiel', 'outils', 'materiel'))
          ? { outils_didactiques_materiel: toStringArray(findKey(synthese, 'outils_didactiques_materiel', 'outils', 'materiel')) }
          : {}),
      },
    };

    // Conserver le savoir de la Généralisation en champ dédié si présent
    const gen = out.deroulement.Analyse.Generalisation as { savoir?: string };
    if (gen.savoir) out.savoir_cles = gen.savoir;
  } else if (out.deroulement === undefined) {
    out.deroulement = {};
  }

  return out;
}

function normalizeRemediation(obj: AnyObj): AnyObj {
  const rm = toSection(findKey(obj, 'remédiation', 'remediation', 'remédiation_erreurs'));
  const prio = findKey(rm, 'priorisation_erreurs_frequentes', 'priorisation_erreurs', 'priorisation');
  return {
    erreurs_frequentes_prevues: toStringArray(findKey(rm, 'erreurs_frequentes_prevues', 'erreurs_frequentes')),
    ...(prio !== undefined ? { priorisation_erreurs_frequentes: prio } : {}),
    strategie_correction: toText(findKey(rm, 'strategie_correction', 'stratégie_correction', 'correction')),
  };
}

// ─── PLAN DE GESTION DE CLASSE ───

export function normalizePlanGestion(raw: unknown, fallbackTitle?: string): AnyObj {
  const obj = unwrapContent(raw);
  if (Object.keys(obj).length === 0) {
    return { titre_seance: fallbackTitle || 'Plan de Gestion de Classe' };
  }
  const out: AnyObj = { ...obj };

  out.titre_seance = toText(findKey(obj, 'titre_seance', 'titre', 'title')) || fallbackTitle || 'Plan de Gestion de Classe';
  out.gestion_retard = toText(findKey(obj, 'gestion_retard', 'retard'));
  out.gestion_fin_de_seance = toText(findKey(obj, 'gestion_fin_de_seance', 'fin_de_seance'));
  out.alternatives_sans_materiel = toText(findKey(obj, 'alternatives_sans_materiel', 'sans_materiel'));

  const se = toSection(findKey(obj, 'strategie_entree', 'stratégie_entree', 'strategieEntree'));
  out.strategie_entree = {
    accueil: toText(findKey(se, 'accueil')),
    mise_en_route: toText(findKey(se, 'mise_en_route', 'mise en route')),
    captation_attention: toText(findKey(se, 'captation_attention', 'captation de l attention', 'attention')),
  };

  const oe = toSection(findKey(obj, 'organisation_espace', 'organisation de l espace'));
  out.organisation_espace = {
    disposition_tables: toText(findKey(oe, 'disposition_tables', 'disposition des tables', 'disposition')),
    zones_activite: toStringArray(findKey(oe, 'zones_activite', 'zones d activite', 'zones')),
    acces_materiel: toText(findKey(oe, 'acces_materiel', 'accès matériel', 'acces au materiel')),
  };

  const gt = toSection(findKey(obj, 'gestion_temps', 'gestion du temps'));
  out.gestion_temps = {
    Mise_en_situation: toText(findKey(gt, 'Mise_en_situation', 'mise en situation')),
    Analyse: toText(findKey(gt, 'Analyse', 'analyse')),
    Synthese: toText(findKey(gt, 'Synthese', 'synthèse', 'synthese')),
    marge_imprevus: toText(findKey(gt, 'marge_imprevus', 'marge imprevus', 'imprevus')),
    signaux_transition: toText(findKey(gt, 'signaux_transition', 'signaux de transition', 'signaux')),
  };

  const gc = toSection(findKey(obj, 'gestion_comportement', 'gestion du comportement'));
  const bloque = toText(findKey(gc, 'gestion_eleve_bloqué', 'gestion_eleve_bloque', 'eleve bloque'));
  out.gestion_comportement = {
    regles_rappelees: toStringArray(findKey(gc, 'regles_rappelees', 'règles rappelées', 'regles')),
    gestion_bavardages: toText(findKey(gc, 'gestion_bavardages', 'bavardages')),
    gestion_eleve_bloqué: bloque,
    gestion_eleve_bloque: bloque,
  };

  const df = toSection(findKey(obj, 'differenciation', 'différenciation'));
  out.differenciation = {
    eleves_rapides: toText(findKey(df, 'eleves_rapides', 'élèves rapides')),
    eleves_en_difficulte: toText(findKey(df, 'eleves_en_difficulte', 'élèves en difficulté')),
  };

  out.remédiation = normalizeRemediation(obj);
  out.remediation = out.remédiation;

  return out;
}

// ─── PLANIFICATION (structure proche de la fiche) ───

export function normalizePlanification(raw: unknown, fallbackTitle?: string): AnyObj {
  const fiche = normalizeFichePedagogique(raw, fallbackTitle);
  return {
    titre_seance: fiche.titre_seance,
    competences_visees: fiche.competences_visees ?? [],
    objectifs: fiche.objectifs ?? [],
    prerequis: fiche.prerequis ?? [],
    savoir_faire: fiche.savoir_faire ?? [],
    savoir_etre: fiche.savoir_etre ?? [],
    deroulement: fiche.deroulement ?? {},
  };
}

// ─── ÉVALUATION ───

export function normalizeEvaluation(raw: unknown, fallbackTitle?: string): AnyObj {
  const obj = unwrapContent(raw);
  if (Object.keys(obj).length === 0) {
    return { titre: fallbackTitle || 'Évaluation', questions: [], elements_reponse: [] };
  }
  const out: AnyObj = { ...obj };

  out.titre = toText(findKey(obj, 'titre', 'title', 'titre_evaluation')) || fallbackTitle || 'Évaluation';
  out.niveau = toText(findKey(obj, 'niveau'));
  out.duree = toText(findKey(obj, 'duree', 'durée'));
  out.consigne_generale = toText(findKey(obj, 'consigne_generale', 'consigne générale', 'consigne'));

  const asArray = (v: unknown): any[] => {
    if (Array.isArray(v)) return v;
    if (v && typeof v === 'object') return Object.values(v);
    if (typeof v === 'string' && v.trim()) {
      try {
        const parsed = JSON.parse(v);
        return Array.isArray(parsed) ? parsed : [];
      } catch { return []; }
    }
    return [];
  };

  // Parties restitution / raisonnement APC
  const pr = findKey(obj, 'partie_restitution', 'restitution');
  if (pr && typeof pr === 'object' && !Array.isArray(pr)) {
    const prObj = pr as AnyObj;
    out.partie_restitution = {
      ...prObj,
      questions: asArray(findKey(prObj, 'questions', 'exercices')),
    };
  } else if (pr !== undefined) {
    out.partie_restitution = { questions: asArray(pr) };
  }

  const pra = findKey(obj, 'partie_raisonnement_apc', 'raisonnement_apc');
  if (pra && typeof pra === 'object' && !Array.isArray(pra)) {
    const praObj = pra as AnyObj;
    out.partie_raisonnement_apc = {
      ...praObj,
      situations: asArray(findKey(praObj, 'situations', 'questions', 'exercices')),
    };
  } else if (pra !== undefined) {
    out.partie_raisonnement_apc = { situations: asArray(pra) };
  }

  // Questions
  out.questions = asArray(findKey(obj, 'questions', 'exercices')).map((q: any, i: number) => {
    if (q && typeof q === 'object') {
      return {
        ...q,
        numero: q.numero ?? i + 1,
        enonce: toText(findKey(q, 'enonce', 'énoncé', 'question')),
        options: Array.isArray(q.options) ? q.options.map(toText) : toStringArray(q.options),
        correction: toText(findKey(q, 'correction', 'reponse', 'réponse')),
      };
    }
    return { numero: i + 1, enonce: toText(q), type: 'ouvert', bareme: 1, options: [], correction: '' };
  });

  // Éléments de réponse (le modèle renvoie souvent criteres_acceptation en string)
  out.elements_reponse = asArray(findKey(obj, 'elements_reponse', 'éléments de réponse', 'elements_de_reponse')).map((el: any, i: number) => {
    if (el && typeof el === 'object') {
      return {
        ...el,
        question_ref: toText(findKey(el, 'question_ref', 'reference', 'ref')) || `Q${i + 1}`,
        reponse_modele: toText(findKey(el, 'reponse_modele', 'réponse modèle', 'reponse_attendue')),
        bareme_detaille: toText(findKey(el, 'bareme_detaille', 'barème détaillé', 'bareme')),
        criteres_acceptation: toStringArray(findKey(el, 'criteres_acceptation', 'critères d acceptation', 'criteres')),
      };
    }
    return { question_ref: `Q${i + 1}`, reponse_modele: toText(el), bareme_detaille: '', criteres_acceptation: [] };
  });

  // Barème
  const bm = toSection(findKey(obj, 'bareme', 'barème', 'barème de notation'));
  out.bareme = {
    ...bm,
    total_points: Number(findKey(bm, 'total_points', 'total', 'points')) || undefined,
    criteres: toStringArray(findKey(bm, 'criteres', 'critères')),
    repartition_par_competence: asArray(findKey(bm, 'repartition_par_competence', 'répartition par compétence', 'repartition')),
  };

  // Grilles
  out.grille_evaluation = asArray(findKey(obj, 'grille_evaluation', 'grille d evaluation', 'grille')).map((g: any) => {
    if (g && typeof g === 'object') {
      return {
        ...g,
        critere: toText(findKey(g, 'critere', 'critère')),
        indicateurs: toStringArray(findKey(g, 'indicateurs')),
        points_max: Number(findKey(g, 'points_max', 'points')) || undefined,
      };
    }
    return { critere: toText(g), indicateurs: [], points_max: undefined };
  });

  out.grille_criteriee_apc = asArray(findKey(obj, 'grille_criteriee_apc', 'grille critériée APC', 'grille_apc'));

  return out;
}

// ─── Point d'entrée unique par type de document ───

export function normalizeDocContent(docType: string, raw: unknown, fallbackTitle?: string): AnyObj {
  const type = docType.replace(/^generate_/, '');
  switch (type) {
    case 'fiche_pedagogique': return normalizeFichePedagogique(raw, fallbackTitle);
    case 'planification': return normalizePlanification(raw, fallbackTitle);
    case 'plan_gestion_classe': return normalizePlanGestion(raw, fallbackTitle);
    case 'evaluation': return normalizeEvaluation(raw, fallbackTitle);
    default: return unwrapContent(raw);
  }
}
