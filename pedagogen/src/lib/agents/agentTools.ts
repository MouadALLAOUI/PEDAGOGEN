import type { CourseMetadata } from '@/types/generation';
import { estimateTokens } from '@/lib/utils/tokenEstimator';
import { assembleSystemPrompt } from '@/lib/agents/prompts';

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
      name: 'generate_evaluation',
      description: 'Generate an evaluation/quiz for the lesson.',
      parameters: {
        type: 'object',
        properties: {
          titre: { type: 'string', description: 'Title of the evaluation' },
          consigne: { type: 'string', description: 'General instructions for students' },
          questions: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                numero: { type: 'number' },
                type: { type: 'string', enum: ['qcm', 'vrai_faux', 'ouvert', 'appariement', 'exercice'] },
                enonce: { type: 'string', description: 'Question text' },
                points: { type: 'number' },
                options: { type: 'array', items: { type: 'string' }, description: 'Answer choices for QCM' },
                correction: { type: 'string', description: 'Expected answer or correction key' },
              },
            },
          },
          bareme: {
            type: 'object',
            properties: {
              total_points: { type: 'number' },
              criteres: { type: 'array', items: { type: 'string' } },
            },
          },
          grille_evaluation: { type: 'array', items: { type: 'string' } },
        },
        required: ['titre', 'questions'],
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

function generateMockDebugResponse(systemPrompt: string | any[], userMessage?: string, tools?: typeof pedagogicalTools) {
  const toolResults: Record<string, unknown> = {};
  const contentBlocks: unknown[] = [];
  
  const sysStr = Array.isArray(systemPrompt) ? JSON.stringify(systemPrompt) : systemPrompt;
  const userStr = userMessage || '';
  const textContent = `# MODE DÉBOGAGE\n\n### SYSTEM PROMPT\n${sysStr}\n\n### USER MESSAGE\n${userStr}`;
  contentBlocks.push({ type: 'text', text: textContent });
  
  const requestedToolName = tools?.[0]?.function.name || 'generate_fiche_pedagogique';
  
  let mockArgs: Record<string, any> = {};
  if (requestedToolName === 'generate_fiche_pedagogique') {
    mockArgs = {
      titre_seance: `DEBUG MODE: Fiche Pédagogique`,
      objectifs: [`System Prompt:\n${systemPrompt}`, `User Message:\n${userMessage}`],
      competences_visees: ['Debug Mode'],
      prerequis: ['Debug Mode'],
      deroulement: {
        introduction: `System Prompt:\n${systemPrompt}`,
        activite_principale: `User Message:\n${userMessage}`,
        synthese: 'Debug Mode'
      },
      evaluation_type: 'formative',
      materiel: ['Debug Mode']
    };
  } else if (requestedToolName === 'generate_planification') {
    mockArgs = {
      semestre: 1,
      sequence: [
        { seance: 1, titre: 'System Prompt', duree: '55 min', competences: [systemPrompt] },
        { seance: 2, titre: 'User Message', duree: '55 min', competences: [userMessage] }
      ]
    };
  } else if (requestedToolName === 'generate_cours_complet') {
    mockArgs = {
      script_enseignant: `SYSTEM PROMPT:\n${systemPrompt}\n\nUSER MESSAGE:\n${userMessage}`,
      activites_eleves: ['Debug Mode'],
      plan_tableau: 'Debug Mode',
      annotations: 'Debug Mode'
    };
  } else if (requestedToolName === 'generate_gestion_classe') {
    mockArgs = {
      strategie_entree: `System Prompt:\n${systemPrompt}`,
      organisation_espace: `User Message:\n${userMessage}`,
      gestion_temps: 'Debug Mode',
      differenciation: 'Debug Mode',
      remédiation: 'Debug Mode'
    };
  } else if (requestedToolName === 'generate_resume_eleve') {
    mockArgs = {
      resume: `System Prompt:\n${systemPrompt}`,
      points_cles: [`User Message:\n${userMessage}`],
      exercices: ['Debug Mode']
    };
  } else if (requestedToolName === 'generate_pptx_outline') {
    mockArgs = {
      slides: [
        { title: 'System Prompt', bullets: [systemPrompt.substring(0, 300) + '...'], speaker_notes: systemPrompt },
        { title: 'User Message', bullets: [userMessage], speaker_notes: userMessage }
      ]
    };
  } else if (requestedToolName === 'generate_evaluation') {
    mockArgs = {
      titre: 'Évaluation — Leçon',
      consigne: 'Lisez attentivement chaque question et répondez sur votre feuille.',
      questions: [
        { numero: 1, type: 'qcm', enonce: 'Question à choix multiples ?', points: 2, options: ['Option A', 'Option B', 'Option C'], correction: 'Option B' },
        { numero: 2, type: 'vrai_faux', enonce: 'Vrai ou faux ?', points: 1, correction: 'Vrai' },
        { numero: 3, type: 'ouvert', enonce: 'Expliquez en quelques phrases.', points: 4, correction: 'Réponse attendue...' },
      ],
      bareme: { total_points: 7, criteres: ['Clarté de la réponse', 'Utilisation des concepts clés'] },
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
  systemPrompt: string | any[],
  userMessage?: string,
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
    const messages = Array.isArray(systemPrompt)
      ? systemPrompt
      : [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage || '' },
        ];
    
    const body: Record<string, unknown> = {
      model,
      messages,
      max_tokens: Math.min(maxTokens, 2048),
      temperature: 0.7,
      stream: true,
    };
    
    if (tools && tools.length > 0) {
      body.tools = tools;
      body.tool_choice = 'auto';
    }
    
    console.log('=== SENDING PROMPT TO LOCAL AI (STREAMING) ===', {
      timestamp: new Date().toISOString(),
      apiUrl: url,
      apiType,
      model,
      systemPrompt,
      userMessage,
      tools: tools || [],
      requestBody: body,
    });

    const timeoutMs = 1200000; // 20 minutes
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    if (signal) {
      signal.addEventListener('abort', () => {
        clearTimeout(timeoutId);
        controller.abort();
      });
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Local model OpenAI API error ${response.status}: ${errorText}`);
    }

    if (!response.body) {
      throw new Error('No response body from Local Model API');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let buffer = '';
    let contentText = '';
    let toolCallsBuffer: any[] = [];

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const cleanLine = line.trim();
        if (!cleanLine) continue;
        if (cleanLine === 'data: [DONE]') continue;

        if (cleanLine.startsWith('data: ')) {
          try {
            const dataStr = cleanLine.slice(6);
            const parsed = JSON.parse(dataStr);
            const choice = parsed.choices?.[0];

            if (choice?.delta?.content) {
              contentText += choice.delta.content;
            }

            if (choice?.delta?.tool_calls) {
              for (const tc of choice.delta.tool_calls) {
                const index = tc.index ?? 0;
                if (!toolCallsBuffer[index]) {
                  toolCallsBuffer[index] = {
                    id: tc.id || '',
                    type: tc.type || 'function',
                    function: {
                      name: tc.function?.name || '',
                      arguments: tc.function?.arguments || ''
                    }
                  };
                } else {
                  if (tc.id) toolCallsBuffer[index].id = tc.id;
                  if (tc.function?.name) toolCallsBuffer[index].function.name += tc.function.name;
                  if (tc.function?.arguments) toolCallsBuffer[index].function.arguments += tc.function.arguments;
                }
              }
            }
          } catch (e) {
            // Ignore parse errors on incomplete JSON chunks
          }
        }
      }
    }

    const message = {
      role: 'assistant',
      content: contentText,
      tool_calls: toolCallsBuffer.filter(Boolean)
    };
    
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
    
    const sysPromptStr = Array.isArray(systemPrompt) ? JSON.stringify(systemPrompt) : systemPrompt;
    const userMsgStr = Array.isArray(userMessage) ? JSON.stringify(userMessage) : (userMessage || '');
    const promptTokens = estimateTokens(sysPromptStr) + estimateTokens(userMsgStr);
    const completionTokens = estimateTokens(contentText);
    const usage = {
      prompt_tokens: promptTokens,
      completion_tokens: completionTokens,
      total_tokens: promptTokens + completionTokens,
    };
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

    const sysPromptStr = Array.isArray(localSystemPrompt) ? JSON.stringify(localSystemPrompt) : localSystemPrompt;
    const userMsgStr = Array.isArray(localUserMessage) ? JSON.stringify(localUserMessage) : (localUserMessage || '');
    const promptTokens = estimateTokens(sysPromptStr) + estimateTokens(userMsgStr);
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
  systemPrompt: string | any[],
  userMessage?: string,
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
  const messages = Array.isArray(systemPrompt)
    ? systemPrompt
    : [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage || '' },
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

  const timeoutMs = 1200000; // 20 minutes
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  if (options?.signal) {
    options.signal.addEventListener('abort', () => {
      clearTimeout(timeoutId);
      controller.abort();
    });
  }

  const response = await fetch(HF_API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.HF_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
    signal: controller.signal,
  });

  clearTimeout(timeoutId);

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
    const allText = JSON.stringify(toolResults) + (message.content || '');
    const sysPromptStr = Array.isArray(systemPrompt) ? JSON.stringify(systemPrompt) : systemPrompt;
    const userMsgStr = Array.isArray(userMessage) ? JSON.stringify(userMessage) : (userMessage || '');
    const estimatedPrompt = estimateTokens(sysPromptStr) + estimateTokens(userMsgStr);
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
  _langue: string,
  _useReferences: boolean,
  referenceContents?: string,
  includePrompt?: string,
  excludePrompt?: string,
  customPrompts?: Record<string, string>
): string {
  return assembleSystemPrompt({
    metadata,
    includePrompt,
    excludePrompt,
    customGlobal: customPrompts?.global,
    customContext: customPrompts?.context,
    referenceContents,
  });
}

export { HF_MODEL, HF_API_URL };
