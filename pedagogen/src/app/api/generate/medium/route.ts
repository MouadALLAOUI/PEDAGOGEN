import { NextRequest, NextResponse } from 'next/server';
import { saveGeneratedFile, getDynamicFilename } from '@/lib/utils/generatedStorage';
import { buildDocx } from '@/lib/builders/docxBuilder';
import { buildPdf, type WatermarkInfo } from '@/lib/builders/pdfBuilder';
import { buildPptx } from '@/lib/builders/pptxBuilder';
import { buildMarkdown } from '@/lib/builders/mdBuilder';
import { getDb } from '@/lib/db';
import { generateFluxImage } from '@/lib/utils/imageCache';
import { callHuggingFace, pedagogicalTools } from '@/lib/agents/agentTools';
import { GenerationRequest, DocumentType, BEST_FORMATS } from '@/types/generation';
import { logGenerationError } from '@/lib/utils/logger';
import { createGeneration, addProgress } from '@/lib/agents/generationManager';
import { verifyToken, getUserFromDb } from '@/lib/db/auth';

export const maxDuration = 900;
export const dynamic = 'force-dynamic';

const DOC_CONFIG: Record<DocumentType, { label: string; docType: DocumentType; promptPrefix: string }> = {
  fiche_pedagogique: {
    label: 'Fiche Pédagogique',
    docType: 'fiche_pedagogique',
    promptPrefix: 'Generate a detailed fiche pédagogique following official guidelines. Establish objectives, prerequisites, and session progression.',
  },
  planification: {
    label: 'Planification',
    docType: 'planification',
    promptPrefix: 'Generate a structured semester planification sequence.',
  },
  cours_complet: {
    label: 'Cours Complet',
    docType: 'cours_complet',
    promptPrefix: 'Generate a complete, rich lesson plan content for the teacher script and student exercises.',
  },
  plan_gestion_classe: {
    label: 'Plan de Gestion de Classe',
    docType: 'plan_gestion_classe',
    promptPrefix: 'Generate a classroom management strategy document.',
  },
  resume_eleve: {
    label: 'Résumé Élève',
    docType: 'resume_eleve',
    promptPrefix: 'Generate a student-facing summary in simple language.',
  },
  presentation_pptx: {
    label: 'Présentation PPTX',
    docType: 'presentation_pptx',
    promptPrefix: 'Generate a PPTX outline with bullet points for slides.',
  },
  evaluation: {
    label: 'Fiche d\'évaluation',
    docType: 'evaluation',
    promptPrefix: 'Generate an evaluation sheet/test representing the concepts.',
  },
  images_illustratives: {
    label: 'Images Illustratives',
    docType: 'images_illustratives',
    promptPrefix: 'Generate image illustration prompts.',
  },
};

const DOC_STEP_MAP: Record<string, string> = {
  fiche_pedagogique: 'fiche',
  planification: 'planification',
  cours_complet: 'cours',
  plan_gestion_classe: 'gestion',
  resume_eleve: 'resume',
  presentation_pptx: 'pptx',
  images_illustratives: 'images',
};

export async function POST(request: NextRequest) {
  try {
    const body: GenerationRequest = await request.json();

    const dbToken = await getDbSetting('huggingface_token');
    if (dbToken) process.env.HF_TOKEN = dbToken;

    if (body.mode !== 'medium') {
      return NextResponse.json({ error: 'Invalid mode' }, { status: 400 });
    }

    if (!body.useLocalModel && !process.env.HF_TOKEN) {
      return NextResponse.json({ error: 'HF_TOKEN not configured' }, { status: 500 });
    }

    if (!body.documentsToGenerate || body.documentsToGenerate.length === 0) {
      return NextResponse.json({ error: 'No documents selected' }, { status: 400 });
    }

    let watermark: WatermarkInfo | undefined;
    try {
      const token = request.cookies.get('auth-token')?.value;
      if (token) {
        const payload = await verifyToken(token);
        if (payload?.sub) {
          const user = getUserFromDb(payload.sub);
          if (user) {
            watermark = { fullName: user.full_name, etablissement: user.etablissement };
          }
        }
      }
    } catch {}

    const generationId = `medium-${Date.now()}`;
    const gen = createGeneration(generationId, 'medium', body.metadata);

    // Run generation asynchronously in the background
    (async () => {
      const signal = gen.controller.signal;
      try {
        addProgress(generationId, { type: 'progress', step: 'init', label: 'Initialisation...', status: 'active' });

        if (signal.aborted) return;

        // Load reference contents if needed
        let referenceContents: string | undefined;
        if (body.useReferences) {
          addProgress(generationId, { type: 'progress', step: 'references', label: 'Chargement des références...', status: 'active' });
          try {
            const contents: string[] = [];

            // Built-in references (curriculum, etc.)
            const { getBuiltinReferences } = await import('@/lib/utils/builtinReferences');
            const builtin = await getBuiltinReferences(body.metadata.matiere, body.metadata.niveau, body.metadata.unite);
            contents.push(...builtin);

            if (signal.aborted) return;

            // User-uploaded references (only enabled ones)
            const db = getDb();
            const enabledRefs = db.prepare(
              'SELECT id, name FROM reference_files WHERE enabled = 1 AND builtin = 0'
            ).all() as any[];
            const { readReferenceContent } = await import('@/lib/utils/fileStorage');
            const { compressReferenceDocument } = await import('@/lib/utils/builtinReferences');
            for (const f of enabledRefs) {
              if (signal.aborted) return;
              let content = await readReferenceContent(f.id);
              if (content) {
                content = compressReferenceDocument(content, body.metadata.niveau, body.metadata.unite);
                contents.push(`[${f.name}]\n${content}`);
              }
            }

            if (contents.length > 0) {
              referenceContents = contents.join('\n\n---\n\n');
            }
          } catch {
            // References not critical
          }
        }

        if (signal.aborted) return;
        addProgress(generationId, { type: 'progress', step: 'docs', label: 'Documents sélectionnés', status: 'done' });

        const startTime = Date.now();
        const db = getDb();
        const rows = db.prepare('SELECT key, value FROM custom_prompts').all() as { key: string; value: string }[];
        const dbPrompts: Record<string, string> = {};
        for (const r of rows) {
          dbPrompts[r.key] = r.value;
        }
        const customPrompts = {
          ...dbPrompts,
          ...body.customPrompts,
        };
        const { buildSystemPrompt } = await import('@/lib/agents/agentTools');
        const systemPrompt = buildSystemPrompt(
          body.metadata, body.metadata.langue, body.useReferences,
          referenceContents, body.includePrompt, body.excludePrompt,
          customPrompts
        );

        const DOC_TOOL_MAP: Record<DocumentType, string> = {
          fiche_pedagogique: 'generate_fiche_pedagogique',
          planification: 'generate_planification',
          plan_gestion_classe: 'generate_gestion_classe',
          evaluation: 'generate_fiche_pedagogique',
          cours_complet: 'generate_cours_complet',
          resume_eleve: 'generate_resume_eleve',
          presentation_pptx: 'generate_pptx_outline',
          images_illustratives: 'generate_fiche_pedagogique',
        };

        const docsToGenerate = body.documentsToGenerate!;

        // Sort documents in a specific order: fiche_pedagogique -> cours_complet -> presentation_pptx -> others
        const order = ['fiche_pedagogique', 'cours_complet', 'presentation_pptx'];
        const sortedDocs = [...docsToGenerate].sort((a, b) => {
          const idxA = order.indexOf(a);
          const idxB = order.indexOf(b);
          const valA = idxA === -1 ? 99 : idxA;
          const valB = idxB === -1 ? 99 : idxB;
          return valA - valB;
        });

        const files = [];
        const allToolResults: Record<string, unknown> = {};
        let totalUsage = { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 };

        // Initialize Context and wait for receipt acknowledgement
        addProgress(generationId, { type: 'progress', step: 'init', label: 'Initialisation du contexte de travail...', status: 'active' });
        const messages: any[] = [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Veuillez accuser réception des directives pédagogiques et du programme pour la leçon: ${body.metadata.lecon}. Répondez simplement par le mot "Reçu".` }
        ];

        if (body.debugMode) {
          messages.push({ role: 'assistant', content: 'Reçu.' });
        } else {
          try {
            const initResult = await callHuggingFace(
              messages,
              undefined,
              undefined,
              200,
              'openai/gpt-oss-120b:fastest',
              {
                useLocalModel: body.useLocalModel,
                localModelName: body.localModelName,
                localModelUrl: body.localModelUrl,
                localApiType: body.localApiType,
                signal,
                debugMode: body.debugMode
              }
            );

            if (signal.aborted) return;

            const textBlock = initResult.content.find((c: any) => c.type === 'text') as any;
            const ackText = textBlock?.text || 'Reçu.';
            messages.push({ role: 'assistant', content: ackText });

            if (initResult.usage) {
              totalUsage.prompt_tokens += initResult.usage.prompt_tokens;
              totalUsage.completion_tokens += initResult.usage.completion_tokens;
              totalUsage.total_tokens += initResult.usage.total_tokens;
            }
          } catch (err) {
            console.error('Failed to initialize context cache:', err);
            messages.push({ role: 'assistant', content: 'Reçu.' });
          }
        }

        addProgress(generationId, { type: 'progress', step: 'init', label: 'Contexte initialisé', status: 'done' });

        for (const docType of sortedDocs) {
          if (signal.aborted) return;
          const config = DOC_CONFIG[docType];
          if (!config) continue;

          const stepId = DOC_STEP_MAP[docType] || docType;
          addProgress(generationId, { type: 'progress', step: stepId, label: config.label, status: 'active' });

          if (docType === 'images_illustratives') {
            if (body.debugMode) {
              const mdContent = `# Images Illustratives - DEBUG PROMPT\n\n## Conversations History\n\n${JSON.stringify(messages, null, 2)}`;
              const filename = getDynamicFilename('Images_Illustratives', body.metadata, 'md');
              const file = await saveGeneratedFile(Buffer.from(mdContent), filename, 'md', 'images_illustratives');
              files.push(file);
              messages.push({ role: 'user', content: 'Génère les invites d\'images.' });
              messages.push({ role: 'assistant', content: `[MOCK IMAGES]` });
              addProgress(generationId, { type: 'progress', step: stepId, label: `${config.label} — Terminé`, status: 'done' });
              continue;
            }

            try {
              addProgress(generationId, { type: 'progress', step: stepId, label: `${config.label} — IA en cours...`, status: 'active' });
              const userMsg = `generate: images_illustratives | count: 2 | output: JSON`;
              
              messages.push({ role: 'user', content: userMsg });

              if (signal.aborted) return;
              const promptsResponse = await callHuggingFace(messages, undefined, undefined, 500, 'openai/gpt-oss-120b:fastest', {
                useLocalModel: body.useLocalModel,
                localModelName: body.localModelName,
                localModelUrl: body.localModelUrl,
                localApiType: body.localApiType,
                signal,
                debugMode: body.debugMode
              });

              if (signal.aborted) return;

              const responseText = (promptsResponse.content.find((c: any) => c.type === 'text') as any)?.text || '';
              messages.push({ role: 'assistant', content: responseText });

              if (promptsResponse.usage) {
                totalUsage.prompt_tokens += promptsResponse.usage.prompt_tokens;
                totalUsage.completion_tokens += promptsResponse.usage.completion_tokens;
                totalUsage.total_tokens += promptsResponse.usage.total_tokens;
              }

              let prompts = [
                `Moroccan classroom illustrating ${body.metadata.lecon}`,
                `Students interacting with computer systems for ${body.metadata.lecon}`
              ];
              try {
                const match = responseText.match(/\[([\s\S]*?)\]/);
                if (match) {
                  prompts = JSON.parse(match[0]);
                }
              } catch (e) {
                console.error("Failed to parse prompts", e);
              }

              addProgress(generationId, { type: 'progress', step: stepId, label: `${config.label} — Compilation...`, status: 'active' });
              for (let i = 0; i < prompts.length; i++) {
                if (signal.aborted) return;
                const prompt = prompts[i]!;
                const imgBuffer = await generateFluxImage(prompt);
                const filename = getDynamicFilename(`Illustration_${i + 1}`, body.metadata, 'png');
                const file = await saveGeneratedFile(imgBuffer, filename, 'png', 'images_illustratives');
                files.push(file);
              }

              addProgress(generationId, { type: 'progress', step: stepId, label: `${config.label} — Terminé`, status: 'done' });
            } catch (err) {
              console.error(`Failed to generate images in medium route:`, err);
              logGenerationError('medium', 'images_illustratives', err);
              const errMsg = err instanceof Error ? err.message : 'Unknown error';
              addProgress(generationId, { type: 'progress', step: stepId, label: `${config.label} — échoué`, status: 'error', error: errMsg });
            }
            continue;
          }

          // Find matching tool definition
          const toolName = DOC_TOOL_MAP[docType];
          const toolDef = toolName ? pedagogicalTools.find((t) => t.function.name === toolName) : undefined;
          if (!toolDef) continue;

          try {
            if (signal.aborted) return;
            addProgress(generationId, { type: 'progress', step: stepId, label: `${config.label} — IA en cours...`, status: 'active' });

            const modelToUse = docType === 'cours_complet' ? 'deepseek-ai/DeepSeek-R1' : 'openai/gpt-oss-120b:fastest';
            
            let userPrompt = '';
            if (docType === 'fiche_pedagogique') {
              userPrompt = "Génère maintenant uniquement la fiche_pedagogique pour cette leçon.";
            } else if (docType === 'cours_complet') {
              userPrompt = "En te basant sur la fiche précédente, génère maintenant le cours_complet pour cette leçon.";
            } else if (docType === 'presentation_pptx') {
              userPrompt = "En te basant sur le cours complet précédent, génère maintenant le plan PPTX (presentation_pptx) sous forme de slides.";
            } else {
              const prefix = customPrompts?.[docType] || config.promptPrefix;
              userPrompt = `${prefix}\nGénère maintenant le document "${config.label}" (type: ${docType}).`;
            }

            messages.push({ role: 'user', content: userPrompt });

            if (body.debugMode) {
              const mdContent = `# ${config.label} - DEBUG PROMPT\n\nModel: ${modelToUse}\n\n## Conversations History\n\n${JSON.stringify(messages, null, 2)}`;
              const filename = getDynamicFilename(config.label, body.metadata, 'md');
              const file = await saveGeneratedFile(Buffer.from(mdContent), filename, 'md', config.docType);
              files.push(file);
              messages.push({ role: 'assistant', content: `[MOCK ANSWER: Generated debug prompt for ${docType}]` });
              addProgress(generationId, { type: 'progress', step: stepId, label: `${config.label} — Terminé`, status: 'done' });
              continue;
            }

            const result = await callHuggingFace(
              messages,
              undefined,
              [toolDef],
              16000,
              modelToUse,
              {
                useLocalModel: body.useLocalModel,
                localModelName: body.localModelName,
                localModelUrl: body.localModelUrl,
                localApiType: body.localApiType,
                signal,
                debugMode: body.debugMode
              }
            );

            if (signal.aborted) return;

            const assistantMsg: any = {
              role: 'assistant',
              content: (result.content.find((c: any) => c.type === 'text') as any)?.text || ''
            };
            
            const toolCallResult = result.content.find((c: any) => c.type === 'tool_use') as any;
            if (toolCallResult) {
              assistantMsg.tool_calls = [
                {
                  id: `call_${Date.now()}`,
                  type: 'function',
                  function: {
                    name: toolCallResult.name,
                    arguments: JSON.stringify(toolCallResult.input)
                  }
                }
              ];
            }
            messages.push(assistantMsg);

            for (const [key, value] of Object.entries(result.toolResults)) {
              allToolResults[key] = value;
            }

            if (result.usage) {
              totalUsage.prompt_tokens += result.usage.prompt_tokens;
              totalUsage.completion_tokens += result.usage.completion_tokens;
              totalUsage.total_tokens += result.usage.total_tokens;
            }

            addProgress(generationId, { type: 'progress', step: stepId, label: `${config.label} — Compilation...`, status: 'active' });

            for (const [, toolArgs] of Object.entries(result.toolResults)) {
              if (signal.aborted) return;
              const content = toolArgs as Record<string, unknown>;
              const fmt = body.debugMode ? 'md' : (BEST_FORMATS[docType] || 'pdf');

              try {
                let buffer: Buffer;
                switch (fmt) {
                  case 'docx':
                    buffer = await buildDocx(body.metadata, content, config.label);
                    break;
                  case 'pdf':
                    buffer = buildPdf(body.metadata, content, config.label, watermark);
                    break;
                  case 'pptx':
                    buffer = await buildPptx(body.metadata, content, config.label);
                    break;
                  case 'md':
                    buffer = Buffer.from(buildMarkdown(body.metadata, content, config.label));
                    break;
                  default:
                    continue;
                }
                if (signal.aborted) return;
                const filename = getDynamicFilename(config.label, body.metadata, fmt);
                const file = await saveGeneratedFile(buffer, filename, fmt, config.docType);
                files.push(file);
              } catch (err) {
                console.error(`Failed to build ${fmt} for ${docType}:`, err);
              }
            }

            addProgress(generationId, { type: 'progress', step: stepId, label: `${config.label} — Terminé`, status: 'done' });

          } catch (err) {
            console.error(`Failed to generate ${docType}:`, err);
            logGenerationError('medium', docType, err);
            const errMsg = err instanceof Error ? err.message : 'Unknown error';
            addProgress(generationId, { type: 'progress', step: stepId, label: `${config.label} — échoué`, status: 'error', error: errMsg });
          }
        }

        const durationMs = Date.now() - startTime;

        if (signal.aborted) return;

        addProgress(generationId, {
          type: 'done',
          result: {
            id: generationId,
            createdAt: new Date(),
            mode: 'medium',
            metadata: body.metadata,
            files,
            tokensUsed: totalUsage.total_tokens,
            durationMs,
          },
        });
      } catch (error) {
        if (signal.aborted) return;
        logGenerationError('medium', 'outer_orchestrator', error);
        const msg = error instanceof Error ? error.message : 'Generation failed';
        addProgress(generationId, { type: 'error', message: msg });
      }
    })();

    return NextResponse.json({ success: true, generationId });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to initiate background generation' }, { status: 500 });
  }
}

async function getDbSetting(key: string): Promise<string | undefined> {
  try {
    const row = getDb()
      .prepare("SELECT value FROM settings WHERE key = ? AND user_id = 'default'")
      .get(key) as { value: string } | undefined;
    return row?.value;
  } catch {
    return undefined;
  }
}
