import { getProvider } from '@/lib/ai/factory';
import type { ProviderId } from '@/lib/ai/types';
import { getDbSetting } from '@/lib/db/settings';
import type { StudentProfile360, StudentAiInsight } from '@/types/student';
import { saveAiInsight } from './studentManager';

/**
 * Conseiller Didactique & Pédagogique IA (Élève individuel)
 * Analyse la situation d'apprentissage et les obstacles didactiques concrets, JAMAIS la psychologie ou la personnalité.
 */
export async function analyzeStudentWithAi(
  profile: StudentProfile360,
  providerId?: ProviderId
): Promise<StudentAiInsight> {
  const { student, class_info, stats, grades, observations, pedagogicalPatterns } = profile;

  // Prepare structured context for the AI
  const recentGrades = grades.slice(0, 5).map(g => `${g.title}: ${g.score}/${g.max_score} (${g.eval_type})`).join(', ');
  
  const recentObservations = observations.slice(0, 10).map(o => {
    const parts = [
      `[${o.date}]`,
      o.notion ? `Notion: ${o.notion}` : null,
      `Compréhension: ${o.comprehension || 'non observée'}`,
      `Participation: ${o.participation || 'moyenne'}`,
      o.difficulte && o.difficulte !== 'aucune' ? `Difficulté: ${o.difficulte}` : null,
      o.action_pedagogique && o.action_pedagogique !== 'aucune' ? `Action testée: ${o.action_pedagogique}` : null,
      o.cause_possible && o.cause_possible !== 'a_determiner' ? `Cause didactique: ${o.cause_possible}` : null,
      o.observation_text ? `Note de terrain: "${o.observation_text}"` : null,
    ].filter(Boolean).join(' | ');
    return parts;
  }).join('\n');

  const systemPrompt = `Tu es un Conseiller Didactique Principal expert du cycle collégial au Maroc (MEN).
Ton rôle est d'analyser la situation d'apprentissage d'un élève (acquis didactiques, obstacles cognitifs, méthodes ayant fait leurs preuves) et de fournir à l'enseignant un plan d'action pédagogique concret, bienveillant et applicable dès la prochaine séance.

RÈGLES IMPÉRATIVES :
1. Tu es un pédagogue, pas un psychologue. NE POSE AUCUN DIAGNOSTIC DE PERSONNALITÉ OU PSYCHOLOGIQUE.
2. Analyse les faits observables : compréhension des notions, clarté des consignes, niveau de participation, démarche de résolution.
3. Identifie ce qui aide réellement l'élève (actions didactiques efficaces : reformulation, manipulation, travail en binôme, exemple concret).
4. Fournis des recommandations directes conformes à l'Approche Par Compétences (APC) et au soutien intégré TaRL.

Format de réponse attendu (JSON strict uniquement) :
{
  "summary": "Synthèse didactique en 2-3 phrases décrivant le niveau d'appropriation des notions et la dynamique d'apprentissage.",
  "strengths": [
    "Compétence ou méthode bien acquise",
    "Comportement d'apprentissage constructif (ex: bonne coopération en binôme)"
  ],
  "weaknesses": [
    "Obstacle didactique récurrent (ex: blocage sur les consignes abstraites)",
    "Notion ou démarche nécessitant consolidation"
  ],
  "recommendations": [
    "Action pédagogique concrète à tester lors de la prochaine séance",
    "Modalité de différenciation (aide guidée TaRL ou tâche complexe valorisante)",
    "Stratégie de reformulation ou étayage spécifique pour cet élève"
  ]
}`;

  const effectiveActionsStr = pedagogicalPatterns?.effectiveActions?.length 
    ? pedagogicalPatterns.effectiveActions.map(a => `${a.label} (${a.count}x)`).join(', ')
    : 'Pas encore de stratégie dominante identifiée';

  const userPrompt = `Fiche d'Observations Pédagogiques de l'Élève :
- Élève : ${student.first_name} ${student.last_name} (${student.gender === 'F' ? 'Fille' : 'Garçon'})
- Classe : ${class_info ? `${class_info.niveau} ${class_info.name}` : 'Collège'} (Matière : ${class_info?.matiere || 'Informatique'})
- Statut d'acquisition TaRL : ${student.tarl_status}
- Aménagements / Besoins particuliers : ${student.special_needs || 'Aucun'}
- Moyenne actuelle : ${stats.averageGrade}/20 (sur ${stats.totalEvaluations} évaluations)
- Assiduité : ${stats.totalAbsences} absence(s), ${stats.totalRetards} retard(s)
- Niveau de compréhension prédominant : ${stats.predominantComprehension || 'maitrise'}
- Actions pédagogiques ayant déjà fonctionné : ${effectiveActionsStr}

Dernières notes obtenues :
${recentGrades || 'Aucune note enregistrée pour le moment'}

Observations didactiques récentes en classe :
${recentObservations || 'Aucune observation enregistrée'}

Génère ton analyse didactique et tes recommandations pédagogiques au format JSON strict.`;

  try {
    const savedProvider = await getDbSetting('default_provider');
    const activeProviderId: ProviderId = (providerId || savedProvider || 'huggingface') as ProviderId;
    const provider = getProvider(activeProviderId);
    const hfToken = (await getDbSetting('huggingface_token')) || process.env.HF_TOKEN;

    const gen = provider.generate({
      systemPrompt,
      userPrompt,
      temperature: 0.3,
      maxTokens: 1000,
      apiKey: hfToken,
    });

    let fullText = '';
    for await (const event of gen) {
      if (event.type === 'chunk') {
        fullText += event.text;
      } else if (event.type === 'done') {
        fullText = event.fullText;
      }
    }

    const jsonMatch = fullText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return saveAiInsight({
        student_id: student.id,
        class_id: student.class_id,
        analysis_type: 'individual',
        summary: parsed.summary || 'Profil didactique analysé avec succès.',
        strengths: Array.isArray(parsed.strengths) ? parsed.strengths : [],
        weaknesses: Array.isArray(parsed.weaknesses) ? parsed.weaknesses : [],
        recommendations: Array.isArray(parsed.recommendations) ? parsed.recommendations : [],
        raw_ai_text: fullText,
      });
    }
  } catch (err) {
    console.warn('AI didactic analysis fallback triggered:', err);
  }

  // Fallback rule-based pedagogical advisor if offline or AI call fails
  return buildDeterministicInsight(profile);
}

/**
 * Conseiller Didactique de Séquence & de Séance (Niveau Classe / Notion)
 * Analyse une leçon enseignée et propose l'adaptation de la prochaine fiche
 */
export async function analyzeTeachingSequenceWithAi(data: {
  classLevel: string;
  matiere: string;
  lecon: string;
  notion?: string;
  totalStudents: number;
  maitriseCount: number;
  avecAideCount: number;
  difficulteCount: number;
  frequentDifficulties: string[];
  testedActions: string[];
  teacherNotes?: string;
  providerId?: ProviderId;
}): Promise<{
  didacticDiagnosis: string;
  nextSessionSteps: string[];
  differentiationTiers: {
    groupeA: string;
    groupeB: string;
    groupeC: string;
  };
}> {
  const systemPrompt = `Tu es un Conseiller Didactique Principal et Concepteur de Programmes au Ministère de l'Éducation Nationale au Maroc.
Ton rôle est d'analyser le déroulement d'une séquence d'enseignement au collège à partir des résultats observables de la classe et de concevoir la remédiation pour la prochaine séance.
Fournis un diagnostic clair de la source didactique du problème (ex: surcharge cognitive, consigne ambiguë, abstraction trop précoce) et le déroulement exact étape par étape pour la séance suivante.

Format de réponse attendu (JSON strict uniquement) :
{
  "didacticDiagnosis": "Diagnostic didactique précis expliquant pourquoi certains élèves ont rencontré des blocages.",
  "nextSessionSteps": [
    "Étape 1 : Amorce / Situation concrète (5-7 min)",
    "Étape 2 : Verbalisation active de la consigne par les élèves (10 min)",
    "Étape 3 : Activité d'application guidée en binômes (20 min)",
    "Étape 4 : Institutionnalisation et synthèse (15 min)"
  ],
  "differentiationTiers": {
    "groupeA": "Soutien fondamental guidé (TaRL) : exercice découpé pas-à-pas avec fiche ressource.",
    "groupeB": "Consolidation standard : tâche d'application autonome.",
    "groupeC": "Dépassement / Défi : situation-problème ouverte complexe."
  }
}`;

  const userPrompt = `Bilan de la séance enseignée :
- Niveau : ${data.classLevel} | Matière : ${data.matiere}
- Leçon : ${data.lecon} ${data.notion ? `(Notion ciblée : ${data.notion})` : ''}
- Effectif observé : ${data.totalStudents} élèves
- Résultats de compréhension observés :
  • ${data.maitriseCount} élèves en maîtrise validée
  • ${data.avecAideCount} élèves comprenant avec étayage
  • ${data.difficulteCount} élèves en difficulté importante
- Difficultés dominantes signalées : ${data.frequentDifficulties.join(', ') || 'Consignes et abstraction'}
- Stratégies déjà testées : ${data.testedActions.join(', ') || 'Reformulation au tableau'}
- Remarques de l'enseignant : ${data.teacherNotes || 'Aucune remarque spécifique'}

Établis le diagnostic didactique et le plan de remédiation au format JSON strict.`;

  try {
    const savedProvider = await getDbSetting('default_provider');
    const activeProviderId: ProviderId = (data.providerId || savedProvider || 'huggingface') as ProviderId;
    const provider = getProvider(activeProviderId);
    const hfToken = (await getDbSetting('huggingface_token')) || process.env.HF_TOKEN;

    const gen = provider.generate({
      systemPrompt,
      userPrompt,
      temperature: 0.3,
      maxTokens: 1100,
      apiKey: hfToken,
    });

    let fullText = '';
    for await (const event of gen) {
      if (event.type === 'chunk') fullText += event.text;
      else if (event.type === 'done') fullText = event.fullText;
    }

    const jsonMatch = fullText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        didacticDiagnosis: parsed.didacticDiagnosis || 'La difficulté observée est liée à l’assimilation du formalisme et nécessite un ancrage concret.',
        nextSessionSteps: Array.isArray(parsed.nextSessionSteps) ? parsed.nextSessionSteps : [
          'Étape 1 : Rappel par un exemple visuel concret',
          'Étape 2 : Reformulation de la consigne par un élève',
          'Étape 3 : Exercice guidé en binôme',
          'Étape 4 : Institutionnalisation brève de la règle',
        ],
        differentiationTiers: parsed.differentiationTiers || {
          groupeA: 'Soutien guidé pas-à-pas avec étayage visuel.',
          groupeB: 'Application standard sur situation courante.',
          groupeC: 'Situation-problème complexe et défi ouvert.',
        },
      };
    }
  } catch (err) {
    console.warn('Sequence AI analysis fallback triggered:', err);
  }

  // Fallback déterministe
  return {
    didacticDiagnosis: `La difficulté semble principalement liée à la compréhension des consignes et à l’abstraction de la notion "${data.notion || data.lecon}". Un étayage direct et une situation concrète permettront de lever l'obstacle.`,
    nextSessionSteps: [
      '1. Commencer par une mise en situation concrète issue du quotidien des apprenants (5-8 min).',
      '2. Faire verbaliser la consigne par 2 élèves différents avant tout travail individuel (5 min).',
      '3. Dérouler une activité d’application guidée en binôme hétérogène (25 min).',
      '4. Clôturer par une synthèse brève au tableau et un bilan de compréhension rapide (10 min).',
    ],
    differentiationTiers: {
      groupeA: 'Soutien fondamental TaRL : Rappel guidé avec exercice d’application directe pas-à-pas.',
      groupeB: 'Consolidation standard : Problème guidé de niveau attendu.',
      groupeC: 'Défi / Approfondissement : Situation-problème ouverte à contraintes multiples.',
    },
  };
}

/**
 * Deterministic didactic advisor providing tailored pedagogical suggestions even offline.
 */
function buildDeterministicInsight(profile: StudentProfile360): StudentAiInsight {
  const { student, stats, pedagogicalPatterns } = profile;
  const strengths: string[] = [];
  const weaknesses: string[] = [];
  const recommendations: string[] = [];

  if (stats.averageGrade >= 14) {
    strengths.push('Solides acquis conceptuels et bonne autonomie dans la tâche.');
    recommendations.push('Valoriser l’élève en lui confiant un rôle de tuteur dans les activités en binôme.');
  } else if (stats.averageGrade >= 10) {
    strengths.push('Compréhension générale convenable avec un potentiel de consolidation régulier.');
    recommendations.push('Consolider les démarches de travail par des fiches-méthodes pas-à-pas.');
  } else {
    weaknesses.push('Moyenne inférieure au seuil de maîtrise (fragilités didactiques fondamentales).');
    recommendations.push('Intégrer immédiatement l’élève dans un protocole de soutien TaRL A avec objectifs découpés.');
  }

  if (pedagogicalPatterns?.effectiveActions && pedagogicalPatterns.effectiveActions.length > 0) {
    const topAction = pedagogicalPatterns.effectiveActions[0]!.label;
    strengths.push(`Répond très positivement à la démarche : "${topAction}".`);
    recommendations.push(`Privilégier l'approche "${topAction}" lors des phases d'appropriation en classe.`);
  }

  if (pedagogicalPatterns?.frequentDifficulties && pedagogicalPatterns.frequentDifficulties.length > 0) {
    const topDiff = pedagogicalPatterns.frequentDifficulties[0]!.label;
    weaknesses.push(`Obstacle récurrent observé : difficulté liée à "${topDiff}".`);
    recommendations.push(`Fournir une fiche de consignes reformulée pour surmonter l'obstacle de "${topDiff}".`);
  }

  if (stats.totalAbsences >= 3) {
    weaknesses.push(`Absentéisme important (${stats.totalAbsences} absences) créant des ruptures dans les prérequis.`);
    recommendations.push('Prévoir un rapide temps d’étayage individuel de 3 minutes pour combler les notions clés manquées.');
  }

  const summary = `Élève ${student.first_name} ${student.last_name} : Niveau d’acquisition ${student.tarl_status.replace(/_/g, ' ')}, moyenne de ${stats.averageGrade}/20. Diagnostic didactique : compréhension globalement ${stats.predominantComprehension || 'satisfaisante'}, nécessitant un étayage méthodologique ciblé.`;

  return saveAiInsight({
    student_id: student.id,
    class_id: student.class_id,
    analysis_type: 'individual',
    summary,
    strengths,
    weaknesses,
    recommendations,
  });
}
