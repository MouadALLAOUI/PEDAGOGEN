import { NextRequest, NextResponse } from 'next/server';
import { saveGeneratedFile, getDynamicFilename } from '@/lib/utils/generatedStorage';
import { buildDocx } from '@/lib/builders/docxBuilder';
import { buildPdf, type WatermarkInfo } from '@/lib/builders/pdfBuilder';
import { buildFichePedagogiquePdf, type FicheContent } from '@/lib/builders/fichePedagogiqueBuilder';
import { buildFichePedagogiqueDocx } from '@/lib/builders/fichePedagogiqueDocxBuilder';
import { buildCoursCompletPdf, normalizeCoursComplet, type CoursCompletContent } from '@/lib/builders/coursCompletBuilder';
import { normalizeDocContent } from '@/lib/builders/normalizeDocContent';
import { buildCoursCompletDocx } from '@/lib/builders/coursCompletDocxBuilder';
import { buildPlanGestionPdf, type PlanGestionContent } from '@/lib/builders/planGestionBuilder';
import { buildPlanGestionDocx } from '@/lib/builders/planGestionDocxBuilder';
import { buildResumePdf, type ResumeContent } from '@/lib/builders/resumeBuilder';
import { buildResumeDocx } from '@/lib/builders/resumeDocxBuilder';
import { buildEvaluationPdf, type EvaluationContent } from '@/lib/builders/evaluationBuilder';
import { buildEvaluationDocx } from '@/lib/builders/evaluationDocxBuilder';
import { buildPptx } from '@/lib/builders/pptxBuilder';
import { buildMarkdown } from '@/lib/builders/mdBuilder';
import { buildHtml } from '@/lib/builders/htmlBuilder';
import { getDb } from '@/lib/db';
import { getDbSetting } from '@/lib/db/settings';
import { buildImagePromptsTxt } from '@/lib/builders/imagesTxtBuilder';
import { callHuggingFace, pedagogicalTools } from '@/lib/agents/agentTools';
import { GenerationRequest, DocumentType, BEST_FORMATS } from '@/types/generation';
import { logGenerationError } from '@/lib/utils/logger';
import { createGeneration, addProgress, enqueueGeneration, queuePosition } from '@/lib/agents/generationManager';
import { verifyToken, getUserFromDb } from '@/lib/db/auth';
import { addHistoryEntry } from '@/lib/utils/historyStore';
import { MinisterialHeaderInfo } from '@/lib/utils/ministerialHeader';
import { generationRequestSchema } from '@/lib/validators/generation';

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
  evaluation: 'evaluation',
  presentation_pptx: 'pptx',
  images_illustratives: 'images',
};

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.json();
    const parsed = generationRequestSchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Données invalides', details: parsed.error.format() }, { status: 400 });
    }
    const body: GenerationRequest = rawBody as GenerationRequest;

    const userIdHeader = request.headers.get('x-user-id');
    let userId = userIdHeader || undefined;
    if (!userId) {
      const token = request.cookies.get('auth-token')?.value;
      if (token) {
        const payload = await verifyToken(token);
        if (payload?.sub) userId = String(payload.sub);
      }
    }

    const dbToken = await getDbSetting('huggingface_token', userId);
    const apiKey = dbToken || process.env.HF_TOKEN;

    if (body.mode !== 'medium') {
      return NextResponse.json({ error: 'Invalid mode' }, { status: 400 });
    }

    if (!body.useLocalModel && !apiKey) {
      return NextResponse.json({ error: 'HF_TOKEN not configured' }, { status: 500 });
    }

    if (!body.documentsToGenerate || body.documentsToGenerate.length === 0) {
      return NextResponse.json({ error: 'No documents selected' }, { status: 400 });
    }

    let watermark: WatermarkInfo | undefined;
    let ministerialHeader: MinisterialHeaderInfo | undefined;
    try {
      if (userId) {
        const user = getUserFromDb(userId);
        if (user) {
          ministerialHeader = {
            aref: user.aref || '',
            directionProvinciale: user.direction_provinciale || '',
            etablissement: user.etablissement || '',
            teacherName: user.full_name || '',
            subject: user.matiere || body.metadata.matiere || '',
          };
          watermark = { fullName: user.full_name, etablissement: user.etablissement };
        }
      }
    } catch {}
    let defaultFormat: 'pdf' | 'docx' = getDbSetting('default_format', userId) === 'docx' ? 'docx' : 'pdf';
    try {
      if (getDbSetting('filigran_enabled', userId) === 'false') watermark = undefined;
    } catch { /* non-critical */ }

    const generationId = `medium-${Date.now()}`;
    const gen = createGeneration(generationId, 'medium', body.metadata);

    // Run generation asynchronously in the background (R6: via the concurrency queue)
    enqueueGeneration(generationId, queuePosition(), async () => {
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
              "SELECT id, name FROM reference_files WHERE enabled = 1 AND builtin = 0 AND (user_id = ? OR user_id = 'default')"
            ).all(userId || 'default') as any[];
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
        const { resolveApplicableSkills } = await import('@/lib/skills/skillManager');
        const { activeSkills } = resolveApplicableSkills(body.metadata, body.activeSkillIds, userId || 'default');

        const systemPrompt = buildSystemPrompt(
          body.metadata, body.metadata.langue, body.useReferences,
          referenceContents, body.includePrompt, body.excludePrompt,
          customPrompts, activeSkills
        );

        const DOC_TOOL_MAP: Record<DocumentType, string> = {
          fiche_pedagogique: 'generate_fiche_pedagogique',
          planification: 'generate_planification',
          plan_gestion_classe: 'generate_gestion_classe',
          evaluation: 'generate_evaluation',
          cours_complet: 'generate_cours_complet',
          resume_eleve: 'generate_resume_eleve',
          presentation_pptx: 'generate_pptx_outline',
          images_illustratives: 'generate_images_illustratives',
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
                debugMode: body.debugMode,
                apiKey,
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

          // Find matching tool definition
          const toolName = DOC_TOOL_MAP[docType];
          const toolDef = toolName ? pedagogicalTools.find((t) => t.function.name === toolName) : undefined;
          if (!toolDef) continue;

          try {
            if (signal.aborted) return;
            addProgress(generationId, { type: 'progress', step: stepId, label: `${config.label} — IA en cours...`, status: 'active' });

            const modelToUse = 'openai/gpt-oss-120b:fastest';
            
            let userPrompt = '';
            if (docType === 'fiche_pedagogique') {
              userPrompt = "Génère maintenant uniquement la fiche_pedagogique pour cette leçon.";
            } else if (docType === 'cours_complet') {
              const hasFiche = sortedDocs.indexOf('fiche_pedagogique') !== -1 && sortedDocs.indexOf('fiche_pedagogique') < sortedDocs.indexOf('cours_complet');
              userPrompt = hasFiche
                ? "En te basant sur la fiche précédente, génère maintenant le cours_complet pour cette leçon."
                : "Génère maintenant le document Cours Complet (type: cours_complet) pour cette leçon.";
            } else if (docType === 'presentation_pptx') {
              const hasCours = sortedDocs.indexOf('cours_complet') !== -1 && sortedDocs.indexOf('cours_complet') < sortedDocs.indexOf('presentation_pptx');
              userPrompt = hasCours
                ? "En te basant sur le cours complet précédent, génère maintenant le plan PPTX (presentation_pptx) sous forme de slides."
                : "Génère maintenant le plan PPTX (presentation_pptx) sous forme de slides pour cette leçon.";
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

            const maxTokensForDoc = docType === 'evaluation' ? 4000 : docType === 'resume_eleve' ? 4000 : 16000;
            const result = await callHuggingFace(
              messages,
              undefined,
              [toolDef],
              maxTokensForDoc,
              modelToUse,
              {
                useLocalModel: body.useLocalModel,
                localModelName: body.localModelName,
                localModelUrl: body.localModelUrl,
                localApiType: body.localApiType,
                signal,
                debugMode: body.debugMode,
                apiKey,
              }
            );

            if (signal.aborted) return;

            // Build the assistant message with ALL tool_use blocks; each must be
            // answered by a role:'tool' message or the next API call fails with
            // "assistant message with 'tool_calls' must be followed by tool messages".
            const toolUses = result.content.filter((c: any) => c.type === 'tool_use') as any[];
            const assistantMsg: any = {
              role: 'assistant',
              content: (result.content.find((c: any) => c.type === 'text') as any)?.text || ''
            };
            const toolResponses: any[] = [];
            if (toolUses.length > 0) {
              assistantMsg.tool_calls = toolUses.map((tc, i) => {
                const id = `call_${Date.now()}_${i}`;
                toolResponses.push({
                  role: 'tool',
                  tool_call_id: id,
                  content: JSON.stringify(tc.input ?? {}).slice(0, 4000) || 'OK',
                });
                return {
                  id,
                  type: 'function',
                  function: {
                    name: tc.name,
                    arguments: JSON.stringify(tc.input ?? {})
                  }
                };
              });
            }
            messages.push(assistantMsg);
            messages.push(...toolResponses);

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
              const content = (docType === 'cours_complet'
                ? normalizeCoursComplet(toolArgs, body.metadata.lecon)
                : normalizeDocContent(docType, toolArgs, config.label)) as Record<string, unknown>;
              const bestFmt = BEST_FORMATS[docType] || 'pdf';
              const fmt = body.debugMode ? 'md' : (bestFmt === 'pdf' && defaultFormat === 'docx' ? 'docx' : bestFmt);

              try {
                let buffer: Buffer;
                switch (fmt) {
                  case 'docx':
                    buffer = docType === 'fiche_pedagogique'
                      ? await buildFichePedagogiqueDocx(body.metadata, content as FicheContent, config.label)
                      : docType === 'plan_gestion_classe'
                      ? await buildPlanGestionDocx(body.metadata, content as PlanGestionContent, config.label)
                      : docType === 'cours_complet'
                      ? await buildCoursCompletDocx(body.metadata, content as CoursCompletContent, config.label)
                      : docType === 'resume_eleve'
                      ? await buildResumeDocx(body.metadata, content as ResumeContent, config.label)
                      : docType === 'evaluation'
                      ? await buildEvaluationDocx(body.metadata, content as EvaluationContent, config.label)
                      : await buildDocx(body.metadata, content, config.label, ministerialHeader);
                    break;
                  case 'pdf':
                    buffer = docType === 'fiche_pedagogique'
                      ? buildFichePedagogiquePdf(body.metadata, content as FicheContent, config.label, watermark)
                      : docType === 'plan_gestion_classe'
                      ? buildPlanGestionPdf(body.metadata, content as PlanGestionContent, config.label, watermark)
                      : docType === 'cours_complet'
                      ? buildCoursCompletPdf(body.metadata, content as CoursCompletContent, config.label, watermark)
                      : docType === 'resume_eleve'
                      ? buildResumePdf(body.metadata, content as ResumeContent, config.label, watermark)
                      : docType === 'evaluation'
                      ? buildEvaluationPdf(body.metadata, content as EvaluationContent, config.label, watermark)
                      : buildPdf(body.metadata, content, config.label, watermark);
                    break;
                  case 'pptx':
                    buffer = await buildPptx(body.metadata, content, config.label);
                    break;
                  case 'html':
                    buffer = Buffer.from(buildHtml(body.metadata, content, config.label, ministerialHeader));
                    break;
                  case 'md':
                    buffer = Buffer.from(buildMarkdown(body.metadata, content, config.label));
                    break;
                  case 'txt':
                    buffer = Buffer.from(buildImagePromptsTxt(content));
                    break;
                  default:
                    continue;
                }
                if (signal.aborted) return;
                const filename = getDynamicFilename(config.label, body.metadata, fmt);
                const file = await saveGeneratedFile(buffer, filename, fmt, config.docType);
                files.push(file);

                // For evaluation: also auto-generate offline HTML quiz/flashcard
                if (docType === 'evaluation' && fmt !== 'html') {
                  try {
                    const htmlBuffer = Buffer.from(buildHtml(body.metadata, content, 'Quiz & Flashcards Interactifs', ministerialHeader));
                    const htmlFilename = getDynamicFilename('Quiz Interactif', body.metadata, 'html');
                    const htmlFile = await saveGeneratedFile(htmlBuffer, htmlFilename, 'html', 'evaluation');
                    files.push(htmlFile);
                  } catch (e) {
                    console.error('Failed to auto-generate offline HTML quiz:', e);
                  }
                }
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
            if (docType !== 'images_illustratives') {
              throw err;
            }
          }
        }

        const durationMs = Date.now() - startTime;

        if (signal.aborted) return;

        const generationResult = {
          id: generationId,
          createdAt: new Date(),
          mode: 'medium' as const,
          metadata: body.metadata,
          files,
          tokensUsed: totalUsage.total_tokens,
          durationMs,
        };

        try {
          await addHistoryEntry(generationResult, userId);
        } catch (histErr) {
          console.error('Failed to save history entry server-side:', histErr);
        }

        addProgress(generationId, {
          type: 'done',
          result: generationResult,
        });
      } catch (error) {
        if (signal.aborted) return;
        logGenerationError('medium', 'outer_orchestrator', error);
        const msg = error instanceof Error ? error.message : 'Generation failed';
        addProgress(generationId, { type: 'error', message: msg });
      }
    });

    return NextResponse.json({ success: true, generationId });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to initiate background generation' }, { status: 500 });
  }
}
