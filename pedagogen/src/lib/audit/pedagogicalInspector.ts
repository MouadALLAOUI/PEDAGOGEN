import { BLOOM_ACTION_VERBS, PASSIVE_DISCOURAGED_VERBS } from '@/lib/curriculum/moroccoCollege';

export type AuditStatus = 'compliant' | 'warning' | 'non_compliant';

export interface AuditCriterion {
  id: string;
  category: 'timing' | 'objectives_apc' | 'student_activity' | 'didactic_alignment' | 'prerequisites_safety';
  categoryLabel: string;
  title: string;
  status: AuditStatus;
  score: number; // 0 to maxScore
  maxScore: number;
  finding: string;
  recommendation: string;
  suggestedAction?: {
    field: string;
    label: string;
  };
}

export interface PhaseTiming {
  name: string;
  label: string;
  minutes: number;
  recommendedRange: string;
  status: 'ok' | 'warning' | 'alert';
}

export interface ObjectiveFinding {
  index: number;
  text: string;
  detectedPassiveVerb?: string;
  matchedSnippet?: string;
  suggestedBloomVerbs: string[];
  isActionOriented: boolean;
  bloomCategory?: string;
  explanation?: string;
}

export interface InspectionAuditReport {
  overallScore: number; // 0 - 100
  scoreOn20: number;    // 0.0 - 20.0
  mention: 'Excellent (Prêt pour inspection)' | 'Très Satisfaisant' | 'Satisfaisant avec réserves' | 'À réviser impérativement';
  mentionColor: string; // Tailwind color token
  summary: string;
  totalDurationMin: number;
  timing: {
    totalMinutes: number;
    isOver55Min: boolean;
    isUnder40Min: boolean;
    phases: PhaseTiming[];
    diagnostic: string;
  };
  objectives: {
    totalCount: number;
    actionOrientedCount: number;
    passiveOrVagueCount: number;
    hasTiceObjective: boolean;
    items: ObjectiveFinding[];
  };
  studentEngagement: {
    score: number; // 0 to 100
    studentActiveActionsCount: number;
    teacherCenteredCount: number;
    hasProblemSolving: boolean;
    hasHandsOn: boolean;
    diagnostic: string;
  };
  didacticAlignment: {
    hasFormativeEvaluation: boolean;
    hasPrerequisites: boolean;
    hasDigitalSafety: boolean;
    hasCompetencesDeclared: boolean;
    evaluationTools: string[];
    diagnostic: string;
  };
  criteria: AuditCriterion[];
  inspectorAdvice: string[];
}

/**
 * Extracts minutes from a string like "5 min", "10-15 min", "5min", etc.
 */
function parseDurationMinutes(val: unknown): number {
  if (typeof val === 'number') return val;
  if (typeof val !== 'string') return 0;
  const match = val.match(/(\d+)\s*(?:-|à)?\s*(\d+)?\s*(?:min|m|mn)?/i);
  if (!match || !match[1]) return 0;
  const val1 = parseInt(match[1], 10) || 0;
  if (match[2]) {
    const val2 = parseInt(match[2], 10) || 0;
    return Math.round((val1 + val2) / 2);
  }
  return val1;
}

/**
 * Extracts duration from an object with multiple possible keys (duration, duree, temps, timing)
 */
function getStepDuration(step: unknown): number {
  if (!step) return 0;
  if (typeof step === 'number') return step;
  if (typeof step === 'string') return parseDurationMinutes(step);
  if (typeof step === 'object') {
    const s = step as Record<string, unknown>;
    return (
      parseDurationMinutes(s.duration) ||
      parseDurationMinutes(s.duree) ||
      parseDurationMinutes(s.temps) ||
      parseDurationMinutes(s.timing)
    );
  }
  return 0;
}

/**
 * Safely converts any input (array, object, markdown text) into an array of non-empty strings.
 */
function toSafeStringArray(val: unknown): string[] {
  if (!val) return [];
  if (Array.isArray(val)) {
    return val.map(item => String(item ?? '').trim()).filter(Boolean);
  }
  if (typeof val === 'string') {
    return val
      .split(/\r?\n|•|\*|- |\d+\.\s*/)
      .map(s => s.trim())
      .filter(Boolean);
  }
  if (typeof val === 'object') {
    return Object.values(val as Record<string, unknown>)
      .map(item => String(item ?? '').trim())
      .filter(Boolean);
  }
  return [];
}

/**
 * Normalizes text for keyword matching.
 */
function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

/**
 * Common conjugated forms mapping to base passive verbs
 */
const PASSIVE_CONJUGATIONS: Record<string, string> = {
  comprend: 'comprendre',
  comprennent: 'comprendre',
  compris: 'comprendre',
  sait: 'savoir',
  savent: 'savoir',
  su: 'savoir',
  connait: 'connaître',
  connaissent: 'connaître',
  connu: 'connaître',
  decouvre: 'découvrir',
  decouvrent: 'découvrir',
  decouvert: 'découvrir',
  etudie: 'étudier',
  etudient: 'étudier',
  apprend: 'apprendre',
  apprennent: 'apprendre',
  appris: 'apprendre',
  voit: 'voir',
  voient: 'voir',
  vu: 'voir',
};

/**
 * Inspects a single pedagogical objective according to Bloom taxonomy and APC requirements.
 */
function inspectObjective(text: string, index: number): ObjectiveFinding {
  const rawWords = text.split(/[\s,;:.'"-]+/).filter(Boolean);
  const norm = normalizeText(text);
  const words = norm.split(/[\s,;:.'"-]+/).filter(Boolean);

  let detectedPassiveVerb: string | undefined;
  let matchedSnippet: string | undefined;
  let explanation: string | undefined;
  let suggestedBloomVerbs: string[] = [];

  // 1. Check for passive/discouraged verbs
  for (const [vKey, info] of Object.entries(PASSIVE_DISCOURAGED_VERBS)) {
    const normKey = normalizeText(vKey);
    const wordIdx = words.findIndex(w => w === normKey);
    if (wordIdx !== -1) {
      detectedPassiveVerb = info.verb;
      matchedSnippet = rawWords[wordIdx] || vKey;
      explanation = info.explanation;
      suggestedBloomVerbs = info.alternatives;
      break;
    } else if (norm.includes(normKey)) {
      detectedPassiveVerb = info.verb;
      matchedSnippet = vKey;
      explanation = info.explanation;
      suggestedBloomVerbs = info.alternatives;
      break;
    }
  }

  // Also check common conjugated forms if base form wasn't directly found
  if (!detectedPassiveVerb) {
    for (const [conj, baseKey] of Object.entries(PASSIVE_CONJUGATIONS)) {
      const normConj = normalizeText(conj);
      const wordIdx = words.findIndex(w => w === normConj);
      if (wordIdx !== -1) {
        const info = PASSIVE_DISCOURAGED_VERBS[baseKey] || PASSIVE_DISCOURAGED_VERBS[normalizeText(baseKey)];
        if (info) {
          detectedPassiveVerb = info.verb;
          matchedSnippet = rawWords[wordIdx] || conj;
          explanation = info.explanation;
          suggestedBloomVerbs = info.alternatives;
          break;
        }
      }
    }
  }

  // 2. Check for recognized Bloom action verbs
  let isActionOriented = false;
  let bloomCategory: string | undefined;

  for (const [category, verbs] of Object.entries(BLOOM_ACTION_VERBS)) {
    for (const v of verbs) {
      const normV = normalizeText(v);
      if (words.includes(normV) || norm.startsWith(normV)) {
        isActionOriented = true;
        bloomCategory = category;
        break;
      }
    }
    if (isActionOriented) break;
  }

  // If no passive verb was caught, but it's not a standard Bloom verb either, suggest creation/application verbs
  if (!detectedPassiveVerb && !isActionOriented) {
    if (norm.startsWith('l\'eleve') || norm.startsWith('etre capable')) {
      suggestedBloomVerbs = ['Manipuler', 'Identifier', 'Résoudre', 'Appliquer'];
    } else {
      suggestedBloomVerbs = ['Identifier', 'Appliquer', 'Expliquer', 'Concevoir'];
    }
  }

  return {
    index,
    text,
    detectedPassiveVerb,
    matchedSnippet,
    suggestedBloomVerbs,
    isActionOriented: isActionOriented && !detectedPassiveVerb,
    bloomCategory,
    explanation,
  };
}

/**
 * Main Didactic Audit Engine for Moroccan College Teaching Sheets (Fiches Pédagogiques).
 */
export function auditFichePedagogique(fiche: Record<string, unknown>): InspectionAuditReport {
  if (!fiche || typeof fiche !== 'object') {
    fiche = {};
  }
  const der = (fiche.deroulement || {}) as Record<string, any>;
  const objectifsRaw = toSafeStringArray(fiche.objectifs);
  const competencesRaw = toSafeStringArray(fiche.competences_visees);
  const prerequisRaw = toSafeStringArray(fiche.prerequis);
  const savoirEtreRaw = toSafeStringArray(fiche.savoir_etre);
  const evalFormatRaw = toSafeStringArray(fiche.modalités_évaluation_formative || (fiche as any).modalites_evaluation_formative);

  // ─────────────────────────────────────────────────────────────
  // 1. TIMING AUDIT (Cadence & Minutage - 55 min max)
  // ─────────────────────────────────────────────────────────────
  const p1Rappel = getStepDuration(der.Mise_en_situation?.rappel);
  const p1Sp = getStepDuration(der.Mise_en_situation?.situation_probleme);
  const p1Overall = getStepDuration(der.Mise_en_situation);
  const p1Total = (p1Rappel + p1Sp) > 0 ? (p1Rappel + p1Sp) : (p1Overall > 0 ? p1Overall : 15);

  const p2Sp = getStepDuration(der.Analyse?.Analyse_SP);
  const p2Inv = getStepDuration(der.Analyse?.Investigation);
  const p2Gen = getStepDuration(der.Analyse?.Generalisation);
  const p2Entr = getStepDuration(der.Analyse?.ENTRAINEMENT);
  const p2Overall = getStepDuration(der.Analyse);
  const p2Calculated = p2Sp + p2Inv + p2Gen + p2Entr;
  const p2Total = p2Calculated > 0 ? p2Calculated : (p2Overall > 0 ? p2Overall : 30);

  const p3Quiz = getStepDuration(der.Synthese?.Quiz);
  const p3Overall = getStepDuration(der.Synthese);
  const p3Total = p3Quiz > 0 ? p3Quiz : (p3Overall > 0 ? p3Overall : 10);

  const totalCalculated = p1Total + p2Total + p3Total;
  const totalDurationMin = parseDurationMinutes(fiche.duree) || totalCalculated;

  const isOver55Min = totalDurationMin > 55;
  const isUnder40Min = totalDurationMin < 40;

  const phases: PhaseTiming[] = [
    {
      name: 'Mise_en_situation',
      label: 'Phase 1 : Mise en situation & Situation-Problème',
      minutes: p1Total,
      recommendedRange: '10 à 15 min',
      status: p1Total > 20 ? 'alert' : p1Total < 5 ? 'warning' : 'ok',
    },
    {
      name: 'Analyse',
      label: 'Phase 2 : Analyse, Investigation & Entraînement (APC)',
      minutes: p2Total,
      recommendedRange: '25 à 30 min',
      status: p2Total > 35 ? 'warning' : p2Total < 15 ? 'alert' : 'ok',
    },
    {
      name: 'Synthese',
      label: 'Phase 3 : Synthèse, Bilan & Évaluation Formative',
      minutes: p3Total,
      recommendedRange: '5 à 10 min',
      status: p3Total > 15 ? 'warning' : p3Total < 5 ? 'warning' : 'ok',
    },
  ];

  let timingDiag = 'Minutage réglementaire respecté (50-55 min), répartition didactique harmonieuse.';
  if (isOver55Min) {
    timingDiag = `Attention : la durée cumulée (${totalDurationMin} min) dépasse le plafond strict de 55 min au collège marocain. Risque de déborder sur l'interclasse.`;
  } else if (isUnder40Min) {
    timingDiag = `La durée (${totalDurationMin} min) est inférieure au standard d'une heure de cours. Risque de temps mort ou de manque d'approfondissement.`;
  }

  // ─────────────────────────────────────────────────────────────
  // 2. OBJECTIVES & BLOOM / APC AUDIT
  // ─────────────────────────────────────────────────────────────
  const inspectedObjectives = objectifsRaw.map((obj, i) => inspectObjective(String(obj), i));
  const passiveCount = inspectedObjectives.filter(o => o.detectedPassiveVerb).length;
  const actionCount = inspectedObjectives.filter(o => o.isActionOriented).length;

  const hasTice = objectifsRaw.some(obj => {
    const n = normalizeText(String(obj));
    return n.includes('tice') || n.includes('logiciel') || n.includes('ordinateur') || n.includes('poste') || n.includes('scratch') || n.includes('fichier') || n.includes('manipul');
  });

  // ─────────────────────────────────────────────────────────────
  // 3. STUDENT ACTIVITY & DIDACTIC ROLE AUDIT
  // ─────────────────────────────────────────────────────────────
  let studentActiveCount = 0;
  let teacherCenteredCount = 0;

  const checkDialogueBlock = (block: any) => {
    if (!block) return;
    const appr = normalizeText(String(block.apprenent || block.interaction || ''));
    const ens = normalizeText(String(block.enseignant || block.parole || ''));

    if (appr) {
      if (appr.includes('ecoute') || appr.includes('assiste') || appr.includes('recopie')) {
        teacherCenteredCount++;
      } else {
        studentActiveCount++;
      }
    }
    if (ens && !appr) {
      teacherCenteredCount++;
    }
  };

  if (der.Mise_en_situation) {
    checkDialogueBlock(der.Mise_en_situation.rappel);
    checkDialogueBlock(der.Mise_en_situation.situation_probleme);
  }
  if (der.Analyse) {
    checkDialogueBlock(der.Analyse.Analyse_SP);
    checkDialogueBlock(der.Analyse.Investigation);
    checkDialogueBlock(der.Analyse.Generalisation);
    checkDialogueBlock(der.Analyse.ENTRAINEMENT);
  }
  if (der.Synthese) {
    checkDialogueBlock(der.Synthese.Quiz);
  }

  const hasSp = Boolean(der.Mise_en_situation?.situation_probleme);
  const hasInvestigation = Boolean(der.Analyse?.Investigation);
  const engagementRatio = (studentActiveCount + (hasInvestigation ? 2 : 0)) / Math.max(1, studentActiveCount + teacherCenteredCount);
  const studentEngagementScore = Math.min(100, Math.round(engagementRatio * 100));

  // ─────────────────────────────────────────────────────────────
  // 4. DIDACTIC ALIGNMENT & FORMATIVE EVALUATION
  // ─────────────────────────────────────────────────────────────
  const hasQuizOrSynthese = Boolean(der.Synthese?.Quiz || evalFormatRaw.length > 0);
  const hasPrereq = prerequisRaw.length > 0;
  const hasDigitalSafety = savoirEtreRaw.some(se => {
    const n = normalizeText(String(se));
    return n.includes('securit') || n.includes('mot de passe') || n.includes('respect') || n.includes('materiel') || n.includes('posture');
  });
  const hasCompetences = competencesRaw.length > 0;

  // ─────────────────────────────────────────────────────────────
  // 5. CRITERIA BREAKDOWN & SCORES
  // ─────────────────────────────────────────────────────────────
  const criteria: AuditCriterion[] = [];

  // Critère 1 : Minutage total (25 pts)
  let timingScore = 25;
  let timingStatus: AuditStatus = 'compliant';
  let timingFinding = `Durée totale estimée à ${totalDurationMin} min. Conforme au cadre horaire 55 min max.`;
  let timingRec = 'Maintenir cette cadence en classe et surveiller le chronomètre lors de l\'investigation.';

  if (isOver55Min) {
    timingScore = 10;
    timingStatus = 'non_compliant';
    timingFinding = `Durée cumulée excessive (${totalDurationMin} min). Les séances de collège doivent impérativement tenir en 55 min max.`;
    timingRec = 'Réduire le temps consacré à la situation-problème (-5 min) ou différer une partie des exercices d\'entraînement à la séance suivante.';
  } else if (isUnder40Min) {
    timingScore = 15;
    timingStatus = 'warning';
    timingFinding = `Durée cumulée courte (${totalDurationMin} min).`;
    timingRec = 'Prévoir une activité d\'approfondissement ou un défi supplémentaire pour les élèves rapides.';
  }

  criteria.push({
    id: 'timing-55min',
    category: 'timing',
    categoryLabel: 'Gestion du Temps & Minutage',
    title: 'Respect du plafond officiel de 55 minutes',
    status: timingStatus,
    score: timingScore,
    maxScore: 25,
    finding: timingFinding,
    recommendation: timingRec,
    suggestedAction: isOver55Min ? { field: 'deroulement', label: 'Réguler le minutage des phases' } : undefined,
  });

  // Critère 2 : Formulation des objectifs selon l'APC (30 pts)
  let objScore = 30;
  let objStatus: AuditStatus = 'compliant';
  let objFinding = `${inspectedObjectives.length} objectif(s) formulé(s) avec des verbes d'action mesurables.`;
  let objRec = 'Excellente formulation conforme aux recommandations de l\'inspection pédagogique.';

  if (passiveCount > 0) {
    objScore = Math.max(8, 30 - passiveCount * 8);
    objStatus = passiveCount >= 2 ? 'non_compliant' : 'warning';
    objFinding = `${passiveCount} objectif(s) utilise(nt) des verbes passifs ou non mesurables (${inspectedObjectives.filter(o => o.detectedPassiveVerb).map(o => `"${o.detectedPassiveVerb}"`).join(', ')}).`;
    objRec = 'Remplacer les verbes mentalistes (Comprendre, Savoir) par des verbes d\'action observables de la taxonomie de Bloom (Identifier, Décrire, Appliquer).';
  } else if (!hasTice) {
    objScore = 24;
    objStatus = 'warning';
    objFinding = 'Objectifs corrects, mais aucun objectif opérationnel TICE/manipulation concret explicité.';
    objRec = 'Ajouter un objectif TICE observable (ex: "L\'élève manipule l\'outil informatique pour...").';
  }

  criteria.push({
    id: 'objectifs-apc-bloom',
    category: 'objectives_apc',
    categoryLabel: 'Formulation des Objectifs APC & Bloom',
    title: 'Verbes d\'action mesurables et observables',
    status: objStatus,
    score: objScore,
    maxScore: 30,
    finding: objFinding,
    recommendation: objRec,
    suggestedAction: passiveCount > 0 ? { field: 'objectifs', label: 'Reformuler les verbes vagues' } : undefined,
  });

  // Critère 3 : Démarche Active de l'Élève (20 pts)
  let activeScore = 20;
  let activeStatus: AuditStatus = 'compliant';
  let activeFinding = 'Démarche d\'investigation active bien ancrée : l\'élève émet des hypothèses et résout la situation.';
  let activeRec = 'Maintenir cette dynamique socio-constructiviste pendant la séance.';

  if (studentEngagementScore < 45) {
    activeScore = 8;
    activeStatus = 'non_compliant';
    activeFinding = 'Posture apprenant trop passive. Prédominance du cours magistral ou de l\'écoute passive.';
    activeRec = 'Attribuer un rôle concret à l\'apprenant dans chaque phase (manipulation, questionnement par pairs, formulation d\'hypothèses écrites sur l\'ardoise).';
  } else if (studentEngagementScore < 70) {
    activeScore = 14;
    activeStatus = 'warning';
    activeFinding = 'Rôle élève présent mais perfectible dans la phase d\'analyse.';
    activeRec = 'Solliciter explicitement les élèves pour formuler les synthèses avant l\'institutionnalisation par l\'enseignant.';
  }

  criteria.push({
    id: 'demarche-active-eleve',
    category: 'student_activity',
    categoryLabel: 'Démarche Active de l\'Apprenant',
    title: 'Implication active de l\'élève (APC)',
    status: activeStatus,
    score: activeScore,
    maxScore: 20,
    finding: activeFinding,
    recommendation: activeRec,
  });

  // Critère 4 : Alignement Didactique & Évaluation Formative (15 pts)
  let alignScore = 15;
  let alignStatus: AuditStatus = 'compliant';
  let alignFinding = 'Évaluation formative et bilan de fin de séance bien prévus pour vérifier l\'atteinte des objectifs.';
  let alignRec = 'Utiliser les résultats du quiz/bilan pour orienter la séance de consolidation.';

  if (!hasQuizOrSynthese) {
    alignScore = 4;
    alignStatus = 'non_compliant';
    alignFinding = 'Absence d\'évaluation formative ou de quiz de clôture pour valider les acquis.';
    alignRec = 'Intégrer impérativement 5 à 10 minutes de quiz formatif rapide ou évaluation sur ardoise avant la sonnerie.';
  } else if (!hasSp || !hasCompetences) {
    alignScore = 10;
    alignStatus = 'warning';
    alignFinding = !hasCompetences
      ? 'Compétences visées non explicitées dans l\'en-tête de la fiche.'
      : 'Évaluation présente, mais situation-problème de départ absente ou peu caractérisée.';
    alignRec = !hasCompetences
      ? 'Déclarer au moins 1 à 2 compétences disciplinaires visées selon les orientations MEN.'
      : 'Structurer une situation-problème contextualisée dans l\'environnement marocain en amorce de séance.';
  }

  criteria.push({
    id: 'alignement-evaluation',
    category: 'didactic_alignment',
    categoryLabel: 'Alignement Didactique & Évaluation',
    title: 'Cohérence Objectifs - Déroulement - Évaluation',
    status: alignStatus,
    score: alignScore,
    maxScore: 15,
    finding: alignFinding,
    recommendation: alignRec,
  });

  // Critère 5 : Prérequis & Sécurité Numérique / Savoir-Être (10 pts)
  let safetyScore = 10;
  let safetyStatus: AuditStatus = 'compliant';
  let safetyFinding = 'Prérequis et consignes de savoir-être/sécurité bien identifiés.';
  let safetyRec = 'Vérifier les prérequis dès l\'accueil par un rappel ciblé.';

  if (!hasPrereq && !hasDigitalSafety) {
    safetyScore = 2;
    safetyStatus = 'non_compliant';
    safetyFinding = 'Absence de prérequis formalisés et de consignes de sécurité/savoir-être.';
    safetyRec = 'Ajouter au moins 2 prérequis indispensables et une règle de sécurité numérique (protection des données, respect du matériel).';
  } else if (!hasPrereq || !hasDigitalSafety) {
    safetyScore = 6;
    safetyStatus = 'warning';
    safetyFinding = !hasPrereq ? 'Prérequis non spécifiés.' : 'Consignes de sécurité numérique/savoir-être manquantes.';
    safetyRec = !hasPrereq ? 'Préciser les acquis antérieurs nécessaires.' : 'Intégrer une consigne civique de bon usage des équipements numériques.';
  }

  criteria.push({
    id: 'prerequis-securite',
    category: 'prerequisites_safety',
    categoryLabel: 'Prérequis & Savoir-Être Citoyen',
    title: 'Identification des prérequis & Règles de sécurité',
    status: safetyStatus,
    score: safetyScore,
    maxScore: 10,
    finding: safetyFinding,
    recommendation: safetyRec,
  });

  // ─────────────────────────────────────────────────────────────
  // 6. OVERALL SCORE & INSPECTION MENTION
  // ─────────────────────────────────────────────────────────────
  const overallScore = Math.max(0, Math.min(100, timingScore + objScore + activeScore + alignScore + safetyScore));
  const scoreOn20 = Number(((overallScore / 100) * 20).toFixed(1));

  let mention: InspectionAuditReport['mention'] = 'Excellent (Prêt pour inspection)';
  let mentionColor = 'text-emerald-700 bg-emerald-50 border-emerald-300';

  if (overallScore >= 85) {
    mention = 'Excellent (Prêt pour inspection)';
    mentionColor = 'text-emerald-700 bg-emerald-50 border-emerald-300';
  } else if (overallScore >= 70) {
    mention = 'Très Satisfaisant';
    mentionColor = 'text-teal-700 bg-teal-50 border-teal-300';
  } else if (overallScore >= 50) {
    mention = 'Satisfaisant avec réserves';
    mentionColor = 'text-amber-700 bg-amber-50 border-amber-300';
  } else {
    mention = 'À réviser impérativement';
    mentionColor = 'text-rose-700 bg-rose-50 border-rose-300';
  }

  // ─────────────────────────────────────────────────────────────
  // 7. INSPECTOR ADVICE & SYNTHESIS
  // ─────────────────────────────────────────────────────────────
  const adviceList: string[] = [];
  if (isOver55Min) {
    adviceList.push('⏱️ Cadence temporelle : Veillez à chronométrer l\'investigation pour préserver impérativement 10 minutes d\'évaluation et de trace écrite.');
  }
  if (passiveCount > 0) {
    adviceList.push('🎯 Formulation APC : L\'inspecteur examinera en premier lieu les verbes de vos objectifs. Privilégiez des verbes mesurables (Identifier, Élaborer, Manipuler).');
  }
  if (studentEngagementScore < 60) {
    adviceList.push('👥 Rôle apprenant : Laissez les élèves manipuler avant d\'expliquer. La démarche par essai-erreur valorise l\'esprit critique.');
  }
  adviceList.push('📑 En classe : Ayez toujours à portée de main le cahier de texte et la fiche imprimée avec le barème horaire visible.');

  return {
    overallScore,
    scoreOn20,
    mention,
    mentionColor,
    summary: `Score de conformité MEN : ${scoreOn20}/20 (${overallScore}%). ${timingDiag}`,
    totalDurationMin,
    timing: {
      totalMinutes: totalDurationMin,
      isOver55Min,
      isUnder40Min,
      phases,
      diagnostic: timingDiag,
    },
    objectives: {
      totalCount: inspectedObjectives.length,
      actionOrientedCount: actionCount,
      passiveOrVagueCount: passiveCount,
      hasTiceObjective: hasTice,
      items: inspectedObjectives,
    },
    studentEngagement: {
      score: studentEngagementScore,
      studentActiveActionsCount: studentActiveCount,
      teacherCenteredCount,
      hasProblemSolving: hasSp,
      hasHandsOn: hasInvestigation,
      diagnostic: activeFinding,
    },
    didacticAlignment: {
      hasFormativeEvaluation: hasQuizOrSynthese,
      hasPrerequisites: hasPrereq,
      hasDigitalSafety: hasDigitalSafety,
      hasCompetencesDeclared: hasCompetences,
      evaluationTools: evalFormatRaw,
      diagnostic: alignFinding,
    },
    criteria,
    inspectorAdvice: adviceList,
  };
}
