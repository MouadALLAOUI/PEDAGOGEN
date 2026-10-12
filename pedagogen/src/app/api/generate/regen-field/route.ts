import { NextRequest, NextResponse } from 'next/server';
import { getProvider } from '@/lib/ai/factory';
import { getDbSetting } from '@/lib/db/settings';
import type { ProviderId } from '@/lib/ai/types';

export const maxDuration = 120;
export const dynamic = 'force-dynamic';

function getByPath(obj: Record<string, unknown>, path: string): unknown {
  const parts = path.split('.');
  let current: any = obj;
  for (const key of parts) {
    if (current == null) return undefined;
    current = current[key];
  }
  return current;
}

function setByPath(obj: Record<string, unknown>, path: string, value: unknown): void {
  const parts = path.split('.');
  let current: any = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    const key = parts[i]!;
    if (current[key] == null) current[key] = {};
    current = current[key];
  }
  current[parts[parts.length - 1]!] = value;
}

const DOC_LABELS: Record<string, string> = {
  fiche_pedagogique: 'Fiche Pédagogique',
  planification: 'Planification',
  cours_complet: 'Cours Complet',
  plan_gestion_classe: 'Plan de Gestion de Classe',
  evaluation: 'Évaluation',
  resume_eleve: 'Résumé Élève',
  presentation_pptx: 'Présentation PPTX',
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { metadata, currentJson, fieldPath, docType, provider: providerId } = body as {
      metadata: Record<string, unknown>;
      currentJson: Record<string, unknown>;
      fieldPath: string;
      docType: string;
      provider: ProviderId;
    };

    if (!currentJson || !fieldPath || !docType) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const currentValue = getByPath(currentJson, fieldPath);
    const docLabel = DOC_LABELS[docType] || docType;

    // Build context string from metadata
    const metaCtx = [
      `Matière: ${metadata.matiere}`,
      `Niveau: ${metadata.niveau}`,
      `Leçon: ${metadata.lecon}`,
      `Unité: ${metadata.unite}`,
      `Durée: ${metadata.duree}min`,
      metadata.competences ? `Compétences: ${Array.isArray(metadata.competences) ? metadata.competences.join(', ') : metadata.competences}` : '',
      metadata.methodePedagogique ? `Méthode: ${metadata.methodePedagogique}` : '',
      metadata.ton ? `Ton: ${metadata.ton}` : '',
    ].filter(Boolean).join('\n');

    const currentStr = typeof currentValue === 'object' ? JSON.stringify(currentValue, null, 2) : String(currentValue ?? '');

    const systemPrompt = `Tu es un expert pédagogique spécialisé dans la création de documents pour le collège marocain (APC, programme MEN).
Tu dois régénérer UN SEUL champ d'un document pédagogique.
Respecte strictement le format et le type de données du champ original.
Réponds UNIQUEMENT avec la nouvelle valeur du champ, sans explication, sans markdown, sansbalise.
Si c'est un tableau, réponds avec un tableau JSON valide.
Si c'est une chaîne, réponds avec du texte brut.
Si c'est un objet, réponds avec un objet JSON valide.`;

    const userPrompt = `Document: ${docLabel}
Contexte du cours:
${metaCtx}

Champ à régénérer: "${fieldPath}"
Valeur actuelle:
${currentStr}

Régénère ce champ en gardant la cohérence avec le reste du document et le contexte pédagogique.
Réponds UNIQUEMENT avec la nouvelle valeur (même format que l'original).`;

    // Resolve provider
    const selectedProvider = providerId || 'huggingface';
    const activeProvider = getProvider(selectedProvider);
    if (!activeProvider) {
      return NextResponse.json({ error: 'Provider not available' }, { status: 400 });
    }

    // Load provider settings for the authenticated user
    const userId = request.headers.get('x-user-id') || undefined;
    const providerSettings: Record<string, string> = {};
    for (const key of ['huggingface_token', 'lmstudio_url', 'lmstudio_model', 'opencode_model']) {
      const val = await getDbSetting(key, userId);
      if (val) providerSettings[key] = val;
    }

    // Use generate() for simple text completion
    const gen = activeProvider.generate({
      systemPrompt,
      userPrompt,
      maxTokens: 2000,
      temperature: 0.7,
      apiKey: providerSettings.huggingface_token,
      baseUrl: providerSettings.lmstudio_url,
      modelName: providerSettings.lmstudio_model,
      opencodeModel: providerSettings.opencode_model,
    });

    let result = '';
    for await (const event of gen) {
      if (event.type === 'done') {
        result = event.fullText;
      } else if (event.type === 'error') {
        return NextResponse.json({ error: event.message }, { status: 500 });
      }
    }

    if (!result) {
      return NextResponse.json({ error: 'Empty AI response' }, { status: 500 });
    }

    // Clean the result — remove markdown code fences, extra whitespace
    let cleaned = result.trim();
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');
    cleaned = cleaned.trim();

    // Try to parse as JSON for object/array fields
    const originalValue = getByPath(currentJson, fieldPath);
    let newValue: unknown;
    if (typeof originalValue === 'object' && originalValue !== null) {
      try {
        newValue = JSON.parse(cleaned);
      } catch {
        // If parsing fails and original was an array, try wrapping
        if (Array.isArray(originalValue)) {
          try {
            newValue = JSON.parse(`[${cleaned}]`);
          } catch {
            newValue = cleaned;
          }
        } else {
          newValue = cleaned;
        }
      }
    } else if (typeof originalValue === 'number') {
      const num = parseFloat(cleaned);
      newValue = isNaN(num) ? cleaned : num;
    } else {
      newValue = cleaned;
    }

    // Build updated JSON
    const updatedJson = { ...currentJson };
    setByPath(updatedJson, fieldPath, newValue);

    return NextResponse.json({ updatedJson, newValue });
  } catch (error) {
    console.error('Regen field error:', error);
    const msg = error instanceof Error ? error.message : 'Regeneration failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
