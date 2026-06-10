import type { CourseMetadata } from '@/types/generation';
import { estimateTokens } from '@/lib/utils/tokenEstimator';

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

function generateMockDebugResponse(systemPrompt: string, userMessage: string, tools?: typeof pedagogicalTools) {
  const toolResults: Record<string, unknown> = {};
  const contentBlocks: unknown[] = [];
  
  const textContent = `# MODE DÉBOGAGE\n\n### SYSTEM PROMPT\n${systemPrompt}\n\n### USER MESSAGE\n${userMessage}`;
  contentBlocks.push({ type: 'text', text: textContent });
  
  const requestedToolName = tools?.[0]?.function.name || 'generate_fiche_pedagogique';
  
  let mockArgs: Record<string, any> = {};
  if (requestedToolName === 'generate_fiche_pedagogique') {
    mockArgs = {
      titre_seance: `DEBUG MODE: Fiche Pédagogique`,
      objectifs: ['Comprendre les concepts de base de la leçon', 'Identifier les composants principaux'],
      competences_visees: ['Maîtriser les bases du sujet'],
      prerequis: ['Connaissances de base préalables'],
      deroulement: {
        introduction: 'Présentation du sujet et objectifs de la séance.',
        activite_principale: 'Explications détaillées avec exemples pratiques et manipulation.',
        synthese: 'Synthèse des points clés et questions-réponses.'
      },
      evaluation_type: 'formative',
      materiel: ['Tableau', 'Ordinateur', 'Projecteur']
    };
  } else if (requestedToolName === 'generate_planification') {
    mockArgs = {
      semestre: 1,
      sequence: [
        { seance: 1, titre: 'Introduction et concepts de base', duree: '50 min', competences: ['Introduction'] },
        { seance: 2, titre: 'Activités pratiques', duree: '50 min', competences: ['Pratique'] }
      ]
    };
  } else if (requestedToolName === 'generate_cours_complet') {
    mockArgs = {
      script_enseignant: 'Introduction: Commencer par présenter le sujet.\nDéveloppement: Expliquer les notions fondamentales.\nConclusion: Résumer et évaluer.',
      activites_eleves: ['Prendre des notes', 'Faire les exercices d\'application'],
      plan_tableau: 'Titre\n1. Définitions\n2. Exemples',
      annotations: 'Veiller à ce que tous les élèves participent.'
    };
  } else if (requestedToolName === 'generate_gestion_classe') {
    mockArgs = {
      strategie_entree: 'Accueillir les élèves et faire l\'appel rapidement.',
      organisation_espace: 'Disposer les tables en U pour favoriser les échanges.',
      gestion_temps: '10 min introduction, 30 min activité principale, 10 min conclusion.',
      differenciation: 'Proposer des fiches d\'exercices de différents niveaux de complexité.',
      remédiation: 'Aider individuellement les élèves en difficulté.'
    };
  } else if (requestedToolName === 'generate_resume_eleve') {
    mockArgs = {
      resume: 'Ce cours présente les notions fondamentales de la leçon.',
      points_cles: ['Notion clé 1', 'Notion clé 2'],
      exercices: ['Exercice d\'application 1', 'Exercice d\'application 2']
    };
  } else if (requestedToolName === 'generate_pptx_outline') {
    mockArgs = {
      slides: [
        { title: 'Introduction au sujet', bullets: ['Définitions de base', 'Objectifs du module'], speaker_notes: 'Présenter le plan général' },
        { title: 'Concepts clés', bullets: ['Premier point important', 'Deuxième point important'], speaker_notes: 'Expliquer en détail' }
      ]
    };
  } else {
    mockArgs = {
      content: textContent
    };
  }
  
  if (tools && tools.length > 0) {
    toolResults[requestedToolName] = mockArgs;
    contentBlocks.push({ type: 'tool_use', name: requestedToolName, input: mockArgs });
  }
  
  return {
    content: contentBlocks,
    toolResults,
    usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 }
  };
}

export async function callLocalModel(
  systemPrompt: string,
  userMessage: string,
  tools?: typeof pedagogicalTools,
  maxTokens: number = 4096,
  modelName?: string,
  localModelUrl?: string,
  localApiType?: 'openai' | 'custom',
  signal?: AbortSignal,
  debugMode?: boolean
): Promise<{
  content: unknown[];
  toolResults: Record<string, unknown>;
  usage: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
}> {
  if (debugMode) {
    return generateMockDebugResponse(systemPrompt, userMessage, tools);
  }

  const model = modelName || 'google/gemma-4-e2b';
  const apiType = localApiType || 'openai';
  const url = localModelUrl || (apiType === 'openai' ? 'http://localhost:1234/v1/chat/completions' : 'http://localhost:1234/api/v1/chat');

  if (apiType === 'openai') {
    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage },
    ];
    
    const body: Record<string, unknown> = {
      model,
      messages,
      max_tokens: Math.min(maxTokens, 2048),
      temperature: 0.7,
    };
    
    if (tools && tools.length > 0) {
      body.tools = tools;
      body.tool_choice = 'auto';
    }
    
    console.log('=== SENDING PROMPT TO LOCAL AI ===', {
      timestamp: new Date().toISOString(),
      apiUrl: url,
      apiType,
      model,
      systemPrompt,
      userMessage,
      tools: tools || [],
      requestBody: body,
    });

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      signal,
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Local model OpenAI API error ${response.status}: ${errorText}`);
    }
    
    const data = await response.json();
    const choice = data.choices?.[0];
    const message = choice?.message;
    
    if (!message) {
      throw new Error('No message in Local model response');
    }
    
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

    if (tools && tools.length > 0 && Object.keys(toolResults).length === 0) {
      const contentText = message.content || '';
      try {
        let jsonStr = contentText.trim();
        const jsonRegex = /\{[\s\S]*\}/;
        const match = jsonStr.match(jsonRegex);
        if (match) {
          jsonStr = match[0];
        }
        const parsed = JSON.parse(jsonStr);
        
        if (parsed.tool_calls && Array.isArray(parsed.tool_calls)) {
          for (const tc of parsed.tool_calls) {
            const fnName = tc.name;
            const fnArgs = tc.arguments;
            if (fnName) {
              toolResults[fnName] = fnArgs;
              contentBlocks.push({ type: 'tool_use', name: fnName, input: fnArgs });
            }
          }
        } else {
          // Check if the parsed JSON is a wrapper containing keys for multiple tools
          let foundKeys = false;
          for (const t of tools) {
            const toolName = t.function.name;
            const docType = toolName.replace('generate_', '');
            const possibleKeys = [
              toolName,
              docType,
              `generate_${docType}`,
              `plan_${docType}`,
              docType.replace('plan_', ''),
              docType.replace('generate_', '')
            ];
            
            const matchedKey = possibleKeys.find(k => parsed[k] !== undefined);
            if (matchedKey) {
              toolResults[toolName] = parsed[matchedKey];
              contentBlocks.push({ type: 'tool_use', name: toolName, input: parsed[matchedKey] });
              foundKeys = true;
            }
          }
          
          if (!foundKeys) {
            const requestedToolName = tools[0]?.function.name;
            if (requestedToolName) {
              toolResults[requestedToolName] = parsed;
              contentBlocks.push({ type: 'tool_use', name: requestedToolName, input: parsed });
            }
          }
        }
      } catch (e) {
        console.error('Failed to parse OpenAI-compatible tool calling fallback response:', e);
        const requestedToolName = tools[0]?.function.name;
        if (requestedToolName) {
          toolResults[requestedToolName] = {
            titre_seance: 'Cours local',
            objectifs: ['Objectif 1'],
            deroulement: {
              introduction: contentText,
              activite_principale: contentText,
              synthese: contentText
            },
            semestre: 1,
            sequence: [{ seance: 1, titre: 'Séance 1', duree: '55 min', competences: [] }],
            script_enseignant: contentText,
            activites_eleves: ['Participation'],
            strategie_entree: contentText,
            organisation_espace: contentText,
            resume: contentText,
            points_cles: ['Points clés'],
            slides: [{ title: 'Slide 1', bullets: [contentText], speaker_notes: '' }]
          };
          contentBlocks.push({ type: 'tool_use', name: requestedToolName, input: toolResults[requestedToolName] });
        }
      }
    }
    
    let usage = data.usage || { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 };
    return {
      content: contentBlocks,
      toolResults,
      usage,
    };
  } else {
    let localSystemPrompt = systemPrompt;
    let localUserMessage = userMessage;

    if (tools && tools.length > 0) {
      const toolsDescription = tools.map(t => {
        return `Tool Name: "${t.function.name}"
Description: ${t.function.description}
Parameters schema: ${JSON.stringify(t.function.parameters)}`;
      }).join('\n\n');

      localSystemPrompt += `\n\n[SYSTEM INSTRUCTION: TOOL CALLING EMULATION]
You have access to the following tool functions:
${toolsDescription}

You MUST choose one or more appropriate tools and respond ONLY with a JSON object containing the arguments for the tool call(s).
Your response must be a JSON object with this exact structure:
{
  "tool_calls": [
    {
      "name": "name_of_the_tool_you_want_to_use",
      "arguments": {
        // key-value pairs matching the parameters schema of the tool
      }
    }
  ]
}
Return ONLY valid JSON matching this schema. Do not write any other conversational text or introduction.`;
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: model,
        system_prompt: localSystemPrompt,
        input: localUserMessage,
      }),
      signal,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Local model API error ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    const contentText = data.choices?.[0]?.message?.content || 
                        data.choices?.[0]?.text || 
                        data.content || 
                        data.text || 
                        data.response || 
                        '';

    const toolResults: Record<string, unknown> = {};
    const contentBlocks: unknown[] = [];

    if (tools && tools.length > 0) {
      try {
        let jsonStr = contentText.trim();
        const jsonRegex = /\{[\s\S]*\}/;
        const match = jsonStr.match(jsonRegex);
        if (match) {
          jsonStr = match[0];
        }
        
        const parsed = JSON.parse(jsonStr);
        
        if (parsed.tool_calls && Array.isArray(parsed.tool_calls)) {
          for (const tc of parsed.tool_calls) {
            const fnName = tc.name;
            const fnArgs = tc.arguments;
            if (fnName) {
              toolResults[fnName] = fnArgs;
              contentBlocks.push({ type: 'tool_use', name: fnName, input: fnArgs });
            }
          }
        } else {
          const requestedToolName = tools[0]?.function.name;
          if (requestedToolName) {
            toolResults[requestedToolName] = parsed;
            contentBlocks.push({ type: 'tool_use', name: requestedToolName, input: parsed });
          }
        }
      } catch (e) {
        console.error('Failed to parse local model tool calling response:', e, 'Raw content was:', contentText);
        const requestedToolName = tools[0]?.function.name;
        if (requestedToolName) {
          toolResults[requestedToolName] = {
            titre_seance: 'Cours local',
            objectifs: ['Objectif 1'],
            deroulement: {
              introduction: contentText,
              activite_principale: contentText,
              synthese: contentText
            },
            semestre: 1,
            sequence: [{ seance: 1, titre: 'Séance 1', duree: '55 min', competences: [] }],
            script_enseignant: contentText,
            activites_eleves: ['Participation'],
            strategie_entree: contentText,
            organisation_espace: contentText,
            resume: contentText,
            points_cles: ['Points clés'],
            slides: [{ title: 'Slide 1', bullets: [contentText], speaker_notes: '' }]
          };
          contentBlocks.push({ type: 'tool_use', name: requestedToolName, input: toolResults[requestedToolName] });
        }
      }
    }

    if (contentText) {
      contentBlocks.push({ type: 'text', text: contentText });
    }

    const promptTokens = estimateTokens(localSystemPrompt) + estimateTokens(localUserMessage);
    const completionTokens = estimateTokens(contentText);

    return {
      content: contentBlocks,
      toolResults,
      usage: {
        prompt_tokens: promptTokens,
        completion_tokens: completionTokens,
        total_tokens: promptTokens + completionTokens,
      },
    };
  }
}

export async function callHuggingFace(
  systemPrompt: string,
  userMessage: string,
  tools?: typeof pedagogicalTools,
  maxTokens: number = 4096,
  model: string = HF_MODEL,
  options?: {
    useLocalModel?: boolean;
    localModelName?: string;
    localModelUrl?: string;
    localApiType?: 'openai' | 'custom';
    signal?: AbortSignal;
    debugMode?: boolean;
  }
): Promise<{
  content: unknown[];
  toolResults: Record<string, unknown>;
  usage: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
}> {
  if (options?.debugMode) {
    return generateMockDebugResponse(systemPrompt, userMessage, tools);
  }
  if (options?.useLocalModel) {
    return callLocalModel(systemPrompt, userMessage, tools, maxTokens, options.localModelName, options.localModelUrl, options.localApiType, options.signal, options.debugMode);
  }
  const messages = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userMessage },
  ];

  const body: Record<string, unknown> = {
    model: model,
    messages,
    max_tokens: maxTokens,
    temperature: 0.7,
  };

  if (tools && tools.length > 0) {
    body.tools = tools;
    body.tool_choice = 'auto';
  }

  console.log('=== SENDING PROMPT TO HUGGINGFACE AI ===', {
    timestamp: new Date().toISOString(),
    apiUrl: HF_API_URL,
    model: model,
    systemPrompt,
    userMessage,
    tools: tools || [],
    requestBody: body,
  });

  const response = await fetch(HF_API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.HF_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
    signal: options?.signal,
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

  if (tools && tools.length > 0 && Object.keys(toolResults).length === 0) {
    const contentText = message.content || '';
    try {
      let jsonStr = contentText.trim();
      const jsonRegex = /\{[\s\S]*\}/;
      const match = jsonStr.match(jsonRegex);
      if (match) {
        jsonStr = match[0];
      }
      const parsed = JSON.parse(jsonStr);
      
      if (parsed.tool_calls && Array.isArray(parsed.tool_calls)) {
        for (const tc of parsed.tool_calls) {
          const fnName = tc.name;
          const fnArgs = tc.arguments;
          if (fnName) {
            toolResults[fnName] = fnArgs;
            contentBlocks.push({ type: 'tool_use', name: fnName, input: fnArgs });
          }
        }
      } else {
        // Check if the parsed JSON is a wrapper containing keys for multiple tools
        let foundKeys = false;
        for (const t of tools) {
          const toolName = t.function.name;
          const docType = toolName.replace('generate_', '');
          const possibleKeys = [
            toolName,
            docType,
            `generate_${docType}`,
            `plan_${docType}`,
            docType.replace('plan_', ''),
            docType.replace('generate_', '')
          ];
          
          const matchedKey = possibleKeys.find(k => parsed[k] !== undefined);
          if (matchedKey) {
            toolResults[toolName] = parsed[matchedKey];
            contentBlocks.push({ type: 'tool_use', name: toolName, input: parsed[matchedKey] });
            foundKeys = true;
          }
        }
        
        if (!foundKeys) {
          const requestedToolName = tools[0]?.function.name;
          if (requestedToolName) {
            toolResults[requestedToolName] = parsed;
            contentBlocks.push({ type: 'tool_use', name: requestedToolName, input: parsed });
          }
        }
      }
    } catch (e) {
      console.error('Failed to parse HuggingFace tool calling fallback response:', e);
      const requestedToolName = tools[0]?.function.name;
      if (requestedToolName) {
        toolResults[requestedToolName] = {
          titre_seance: 'Cours local',
          objectifs: ['Objectif 1'],
          deroulement: {
            introduction: contentText,
            activite_principale: contentText,
            synthese: contentText
          },
          semestre: 1,
          sequence: [{ seance: 1, titre: 'Séance 1', duree: '55 min', competences: [] }],
          script_enseignant: contentText,
          activites_eleves: ['Participation'],
          strategie_entree: contentText,
          organisation_espace: contentText,
          resume: contentText,
          points_cles: ['Points clés'],
          slides: [{ title: 'Slide 1', bullets: [contentText], speaker_notes: '' }]
        };
        contentBlocks.push({ type: 'tool_use', name: requestedToolName, input: toolResults[requestedToolName] });
      }
    }
  }

  if (message.content) {
    contentBlocks.push({ type: 'text', text: message.content });
  }

  // Use API usage if available, otherwise estimate
  let usage = data.usage;
  if (!usage || (!usage.prompt_tokens && !usage.total_tokens)) {
    // Estimate from actual content
    const allText = JSON.stringify(toolResults) + (message.content || '');
    const estimatedPrompt = estimateTokens(systemPrompt) + estimateTokens(userMessage);
    const estimatedCompletion = estimateTokens(allText);
    usage = {
      prompt_tokens: estimatedPrompt,
      completion_tokens: estimatedCompletion,
      total_tokens: estimatedPrompt + estimatedCompletion,
    };
  }

  return {
    content: contentBlocks,
    toolResults,
    usage: usage || { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
  };
}

export function buildSystemPrompt(
  metadata: CourseMetadata,
  langue: string,
  useReferences: boolean,
  referenceContents?: string,
  includePrompt?: string,
  excludePrompt?: string,
  customPrompts?: Record<string, string>
): string {
  const langLabel = langue === 'fr' ? 'French' : langue === 'ar' ? 'Arabic' : 'bilingual French/Arabic';

  let prompt = `You are PEDAGOGEN, an AI assistant specialized in generating pedagogical documents for Moroccan collège teachers (1AC, 2AC, 3AC).

You follow the official Moroccan Ministry of Education curriculum guidelines.
You write in ${langLabel} as specified.
You produce structured, practical, classroom-ready content.`;

  if (customPrompts?.global) {
    prompt += `\n\n[GLOBAL INSTRUCTION FROM TEACHER]:\n${customPrompts.global.trim()}`;
  }
  if (customPrompts?.context) {
    prompt += `\n\n[GLOBAL CLASSROOM CONTEXT]:\n${customPrompts.context.trim()}`;
  }

  prompt += `\n\nThe teacher is preparing:
- Lesson: ${metadata.lecon}
- Subject: ${metadata.matiere}
- Level: ${metadata.niveau}
- Semester: ${metadata.semestre}
- Unit: ${metadata.unite}
- Duration: ${metadata.duree} minutes
- Target competences: ${metadata.competences.join(', ')}`;

  if (metadata.profilEleves && metadata.profilEleves.trim()) {
    prompt += `\n- Real Student Profile & Classroom Culture: ${metadata.profilEleves.trim()}
    
[IMPORTANT - ADAPTATION TO CLASSROOM PROFILE]
The teacher described their classroom dynamics and social culture as: "${metadata.profilEleves.trim()}".
You MUST adapt the language complexity, pedagogical approach, examples, and exercise difficulty to this specific profile. For example:
- If students struggle with the language of instruction (e.g. French), use simplified, clear language and scaffolding.
- Integrate cultural references and practical examples suited to their social context and interests to maximize engagement.`;
  }

  prompt += `\n\nAlways structure your output strictly for document builders.
Return valid JSON matching the requested schema — no extra prose.`;

  if (useReferences && referenceContents) {
    prompt += `\n\nReference documents provided by the teacher:\n${referenceContents}`;
  }

  if (includePrompt && includePrompt.trim()) {
    prompt += `\n\nIMPORTANT — Instructions to INCLUDE in your generation:\n${includePrompt.trim()}\nFollow these instructions carefully when generating content.`;
  }

  if (excludePrompt && excludePrompt.trim()) {
    prompt += `\n\nIMPORTANT — Things to EXCLUDE from your generation:\n${excludePrompt.trim()}\nStrictly avoid these elements in your output.`;
  }

  return prompt;
}

export { HF_MODEL, HF_API_URL };
