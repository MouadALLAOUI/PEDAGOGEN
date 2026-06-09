import type { CourseMetadata } from '@/types/generation';

const HF_API_URL = 'https://router.huggingface.co/v1/chat/completions';
const HF_MODEL = 'openai/gpt-oss-120b:fastest';

export const pedagogicalTools = [
  {
    type: 'function' as const,
    function: {
      name: 'generate_fiche_pedagogique',
      description: 'Generate a complete fiche pédagogique following the Moroccan Ministry of Education format.',
      parameters: {
        type: 'object',
        properties: {
          titre_seance: { type: 'string', description: 'Title of the lesson session' },
          objectifs: { type: 'array', items: { type: 'string' }, description: 'Learning objectives' },
          competences_visees: { type: 'array', items: { type: 'string' } },
          prerequis: { type: 'array', items: { type: 'string' } },
          deroulement: {
            type: 'object',
            properties: {
              introduction: { type: 'string' },
              activite_principale: { type: 'string' },
              synthese: { type: 'string' },
            },
          },
          evaluation_type: { type: 'string', enum: ['formative', 'sommative', 'diagnostique'] },
          materiel: { type: 'array', items: { type: 'string' } },
        },
        required: ['titre_seance', 'objectifs', 'deroulement'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'generate_planification',
      description: 'Generate a semester planification sequence for a given subject and level.',
      parameters: {
        type: 'object',
        properties: {
          semestre: { type: 'number', enum: [1, 2] },
          sequence: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                seance: { type: 'number' },
                titre: { type: 'string' },
                duree: { type: 'string' },
                competences: { type: 'array', items: { type: 'string' } },
              },
            },
          },
        },
        required: ['semestre', 'sequence'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'generate_cours_complet',
      description: 'Generate the full lesson content including teacher script, student activities, and blackboard layout.',
      parameters: {
        type: 'object',
        properties: {
          script_enseignant: { type: 'string', description: 'Full teacher script for the lesson' },
          activites_eleves: { type: 'array', items: { type: 'string' } },
          plan_tableau: { type: 'string', description: 'Blackboard layout plan' },
          annotations: { type: 'string', description: 'Teacher notes and tips' },
        },
        required: ['script_enseignant', 'activites_eleves'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'generate_gestion_classe',
      description: 'Generate a classroom management plan tailored to Moroccan collège context.',
      parameters: {
        type: 'object',
        properties: {
          strategie_entree: { type: 'string', description: 'Classroom entry strategy' },
          organisation_espace: { type: 'string', description: 'Space organization' },
          gestion_temps: { type: 'string', description: 'Time management plan' },
          differenciation: { type: 'string', description: 'Differentiation strategies' },
          remédiation: { type: 'string', description: 'Remediation plan' },
        },
        required: ['strategie_entree', 'organisation_espace'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'generate_resume_eleve',
      description: 'Generate a student-facing lesson summary in simplified French or Arabic.',
      parameters: {
        type: 'object',
        properties: {
          resume: { type: 'string', description: 'Student-facing summary text' },
          points_cles: { type: 'array', items: { type: 'string' }, description: 'Key takeaways' },
          exercices: { type: 'array', items: { type: 'string' }, description: 'Practice exercises' },
        },
        required: ['resume', 'points_cles'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'generate_pptx_outline',
      description: 'Generate a structured PPTX slide outline (titles, bullets, speaker notes).',
      parameters: {
        type: 'object',
        properties: {
          slides: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                title: { type: 'string' },
                bullets: { type: 'array', items: { type: 'string' } },
                speaker_notes: { type: 'string' },
              },
            },
          },
        },
        required: ['slides'],
      },
    },
  },
];

export async function callHuggingFace(
  systemPrompt: string,
  userMessage: string,
  tools?: typeof pedagogicalTools,
  maxTokens: number = 4096
): Promise<{
  content: unknown[];
  toolResults: Record<string, unknown>;
  usage: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
}> {
  const messages = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userMessage },
  ];

  const body: Record<string, unknown> = {
    model: HF_MODEL,
    messages,
    max_tokens: maxTokens,
    temperature: 0.7,
  };

  if (tools && tools.length > 0) {
    body.tools = tools;
    body.tool_choice = 'auto';
  }

  const response = await fetch(HF_API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.HF_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`HuggingFace API error ${response.status}: ${errorText}`);
  }

  const data = await response.json();
  const choice = data.choices?.[0];
  const message = choice?.message;

  if (!message) {
    throw new Error('No message in HuggingFace response');
  }

  // Extract tool calls if present
  const toolResults: Record<string, unknown> = {};
  const contentBlocks: unknown[] = [];

  if (message.tool_calls && Array.isArray(message.tool_calls)) {
    for (const toolCall of message.tool_calls) {
      const fnName = toolCall.function?.name;
      const fnArgs = typeof toolCall.function?.arguments === 'string'
        ? JSON.parse(toolCall.function.arguments)
        : toolCall.function?.arguments;
      if (fnName) {
        toolResults[fnName] = fnArgs;
        contentBlocks.push({ type: 'tool_use', name: fnName, input: fnArgs });
      }
    }
  }

  if (message.content) {
    contentBlocks.push({ type: 'text', text: message.content });
  }

  return {
    content: contentBlocks,
    toolResults,
    usage: data.usage || { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
  };
}

export function buildSystemPrompt(
  metadata: CourseMetadata,
  langue: string,
  useReferences: boolean,
  referenceContents?: string
): string {
  const langLabel = langue === 'fr' ? 'French' : langue === 'ar' ? 'Arabic' : 'bilingual French/Arabic';

  let prompt = `You are PEDAGOGEN, an AI assistant specialized in generating pedagogical documents for Moroccan collège teachers (1AC, 2AC, 3AC).

You follow the official Moroccan Ministry of Education curriculum guidelines.
You write in ${langLabel} as specified.
You produce structured, practical, classroom-ready content.

The teacher is preparing:
- Lesson: ${metadata.lecon}
- Subject: ${metadata.matiere}
- Level: ${metadata.niveau}
- Semester: ${metadata.semestre}
- Unit: ${metadata.unite}
- Duration: ${metadata.duree} minutes
- Target competences: ${metadata.competences.join(', ')}

Always structure your output strictly for document builders.
Return valid JSON matching the requested schema — no extra prose.`;

  if (useReferences && referenceContents) {
    prompt += `\n\nReference documents provided by the teacher:\n${referenceContents}`;
  }

  return prompt;
}

export { HF_MODEL, HF_API_URL };
