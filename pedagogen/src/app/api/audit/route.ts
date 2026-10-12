import { NextRequest, NextResponse } from 'next/server';
import { auditFichePedagogique } from '@/lib/audit/pedagogicalInspector';
import { getProvider } from '@/lib/ai/factory';
import { getDbSetting } from '@/lib/db/settings';
import type { ProviderId } from '@/lib/ai/types';

export const maxDuration = 120;
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { fiche, metadata, deepAiInspection, provider: requestedProvider } = body as {
      fiche: Record<string, unknown>;
      metadata?: Record<string, unknown>;
      deepAiInspection?: boolean;
      provider?: ProviderId;
    };

    let targetFiche = fiche;
    if (typeof targetFiche === 'string') {
      try {
        targetFiche = JSON.parse(targetFiche);
      } catch {
        return NextResponse.json({ error: 'JSON de la fiche pédagogique invalide' }, { status: 400 });
      }
    }

    if (!targetFiche || typeof targetFiche !== 'object') {
      return NextResponse.json({ error: 'Fiche pédagogique requise' }, { status: 400 });
    }

    // 1. Run local deterministic rule-based audit engine
    const report = auditFichePedagogique(targetFiche as Record<string, unknown>);

    let aiInspectorFeedback: string | undefined;

    // 2. If requested, run deep AI qualitative inspector analysis
    if (deepAiInspection) {
      try {
        const userId = request.headers.get('x-user-id') || undefined;
        const savedProvider = await getDbSetting('default_provider', userId);
        const activeProviderId: ProviderId = (requestedProvider || savedProvider || 'huggingface') as ProviderId;
        const provider = getProvider(activeProviderId);

        const systemPrompt = `Tu es un Inspecteur Pédagogique Principal du Ministère de l'Éducation Nationale (Collège) au Maroc.
Tu réalises une visite conseil et un pré-audit bienveillant mais très rigoureux d'une fiche pédagogique préparée par un enseignant.

Tes critères fondamentaux sont :
1. Cadence temporelle : 50 à 55 minutes maximum par séance de collège (aucun débordement toléré).
2. Approche Par Compétences (APC) et Taxonomie de Bloom : verbes d'action obligatoires, rejet strict des verbes passifs ("comprendre", "savoir", "découvrir").
3. Démarche socio-constructiviste active : l'élève doit manipuler, chercher et émettre des hypothèses.
4. Alignement didactique : cohérence rigoureuse entre situation-problème, compétences visées et évaluation formative de fin de séance.

Rédige une observation d'inspection structurée en 3 parties concises :
1. 🌟 Points forts remarqués (2-3 puces)
2. ⚠️ Points de vigilance prioritaires avant ma venue en classe (2-3 puces précises)
3. 💡 Conseil didactique & remédiation concrète pour la gestion de classe.

Ton style est professionnel, chaleureux, valorisant, précis et respectueux des orientations pédagogiques marocaines. Sois synthétique (250 mots max).`;

        const f = fiche as Record<string, any>;
        const der = (f.deroulement || {}) as Record<string, any>;

        const userPrompt = `Fiche Pédagogique soumise à l'inspection :
Titre : ${f.titre_seance || metadata?.lecon || 'Séance'}
Matière : ${metadata?.matiere || 'Informatique'} (Niveau : ${metadata?.niveau || 'Collège'})
Durée estimée : ${report.totalDurationMin} min (Plafond MEN : 55 min)
Objectifs déclarés : ${JSON.stringify(f.objectifs || [])}
Déroulement résumé :
- Mise en situation : ${JSON.stringify(der.Mise_en_situation || {})}
- Analyse & Démarche : ${JSON.stringify(der.Analyse || {})}
- Synthèse & Quiz : ${JSON.stringify(der.Synthese || {})}

Diagnostic préliminaire du système :
Score : ${report.scoreOn20}/20 (${report.mention})
Minutage : ${report.timing.diagnostic}
Objectifs vagues identifiés : ${report.objectives.passiveOrVagueCount}

Donne ton avis d'inspecteur en français avec les recommandations prioritaires.`;

        const hfToken = (await getDbSetting('huggingface_token', userId)) || process.env.HF_TOKEN;
        const gen = provider.generate({
          systemPrompt,
          userPrompt,
          temperature: 0.4,
          maxTokens: 800,
          apiKey: hfToken,
        });

        for await (const event of gen) {
          if (event.type === 'done') {
            aiInspectorFeedback = event.fullText.trim();
          }
        }
      } catch (aiErr: any) {
        console.warn('AI Inspector analysis unavailable, continuing with rule-based report:', aiErr);
      }
    }

    return NextResponse.json({
      success: true,
      report,
      aiInspectorFeedback,
    });
  } catch (error: any) {
    console.error('Pedagogical audit error:', error);
    return NextResponse.json({ error: error.message || 'Erreur lors de l audit' }, { status: 500 });
  }
}
