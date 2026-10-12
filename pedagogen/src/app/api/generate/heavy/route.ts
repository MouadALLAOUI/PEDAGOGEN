import { NextRequest, NextResponse } from 'next/server';
import { saveGeneratedFile, getDynamicFilename } from '@/lib/utils/generatedStorage';
import { buildDocx } from '@/lib/builders/docxBuilder';
import { buildPdf, type WatermarkInfo } from '@/lib/builders/pdfBuilder';
import { buildFichePedagogiquePdf, type FicheContent } from '@/lib/builders/fichePedagogiqueBuilder';
import { buildFichePedagogiqueDocx } from '@/lib/builders/fichePedagogiqueDocxBuilder';
import { buildPlanificationPdf, type PlanificationContent } from '@/lib/builders/planificationBuilder';
import { buildPlanificationDocx } from '@/lib/builders/planificationDocxBuilder';
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
import { assembleSystemPrompt } from '@/lib/agents/prompts';
import { generateTokenReport, logTokenReport } from '@/lib/utils/tokenTracker';
import { getDb } from '@/lib/db';
import { getDbSetting } from '@/lib/db/settings';
import { buildImagePromptsTxt } from '@/lib/builders/imagesTxtBuilder';
import { pedagogicalTools, HF_MODEL } from '@/lib/agents/agentTools';
import { GenerationRequest, DocumentType, BEST_FORMATS } from '@/types/generation';
import { logGenerationError } from '@/lib/utils/logger';
import { createGeneration, addProgress, getGeneration, enqueueGeneration, queuePosition } from '@/lib/agents/generationManager';
import { addHistoryEntry } from '@/lib/utils/historyStore';
import { verifyToken, getUserFromDb } from '@/lib/db/auth';
import { getProvider } from '@/lib/ai/factory';
import type { ProviderId } from '@/lib/ai/types';
import { checkHeavyRateLimit } from '@/lib/utils/rateLimit';
import { generationRequestSchema } from '@/lib/validators/generation';
import type { MinisterialHeaderInfo } from '@/lib/utils/ministerialHeader';

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
  evaluation: 'evaluation',
  resume_eleve: 'resume',
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

    if (body.mode !== 'heavy') {
      return NextResponse.json({ error: 'Invalid mode' }, { status: 400 });
    }

    // If provider is 'none', skip AI and show prompt only
    if (body.provider === 'none') {
      const nid = `heavy-${Date.now()}`;
      createGeneration(nid, 'heavy', body.metadata);
      const sortedDocs = body.documentsToGenerate || Object.keys(DOC_CONFIG) as DocumentType[];

      const db2 = getDb();
      const rows2 = db2.prepare(`
        SELECT key, value FROM custom_prompts 
        WHERE user_id = ? OR user_id = 'default' 
        ORDER BY CASE WHEN user_id = ? THEN 1 ELSE 0 END ASC
      `).all(userId || 'default', userId || 'default') as { key: string; value: string }[];
      const dbPrompts2: Record<string, string> = {};
      for (const r of rows2) { dbPrompts2[r.key] = r.value; }
      const customPrompts2 = { ...dbPrompts2, ...body.customPrompts };

      const promptParts: string[] = [
        '[PROMPT SYSTEME]\n',
        assembleSystemPrompt({
          metadata: body.metadata,
          documentsToGenerate: body.documentsToGenerate,
          includePrompt: body.includePrompt,
          excludePrompt: body.excludePrompt,
          customGlobal: customPrompts2?.global,
          customContext: customPrompts2?.context,
        }),
      ];

      for (const docType of sortedDocs) {
        const config = DOC_CONFIG[docType];
        if (!config) continue;
        promptParts.push(`\n---\n[PROMPT UTILISATEUR - ${config.label}]\ngenerate: ${docType} | based_on: none`);
      }

      addProgress(nid, {
        type: 'done',
        result: {
          id: nid,
          createdAt: new Date().toISOString(),
          mode: 'heavy',
          metadata: body.metadata,
          files: [],
          tokensUsed: 0,
          durationMs: 0,
          debugPrompt: promptParts.join('\n'),
        },
      });

      return NextResponse.json({ success: true, generationId: nid });
    }

    const dbToken = await getDbSetting('huggingface_token', userId);
    const resolvedHfToken = dbToken || process.env.HF_TOKEN;

    const selectedProvider = (body.provider || 'huggingface') as ProviderId;
    if (selectedProvider === 'huggingface' && !resolvedHfToken) {
      return NextResponse.json({ error: 'HF_TOKEN not configured' }, { status: 500 });
    }

    const rateCheck = await checkHeavyRateLimit(userId);
    if (!rateCheck.allowed) {
      return NextResponse.json({ error: 'Limite quotidienne atteinte.' }, { status: 429 });
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

    const generationId = `heavy-${Date.now()}`;
    const gen = createGeneration(generationId, 'heavy', body.metadata);

    // Run generation asynchronously in the background (R6: via the concurrency queue)
    enqueueGeneration(generationId, queuePosition(), async () => {
      const signal = gen.controller.signal;
      try {
        addProgress(generationId, { type: 'progress', step: 'init', label: 'Initialisation...', status: 'active' });

        if (signal.aborted) return;

        // Resolve provider
        const activeProvider = getProvider((body.provider || 'huggingface') as ProviderId);
        const providerSettings: Record<string, string | undefined> = {};
        try {
          const db = getDb();
          const rows = db.prepare("SELECT key, value FROM settings WHERE (user_id = ? OR user_id = 'default') AND key IN ('provider', 'huggingface_token', 'lmstudio_url', 'lmstudio_model', 'opencode_model', 'filigran_enabled', 'default_format', 'doc_models') ORDER BY CASE WHEN user_id = ? THEN 0 ELSE 1 END").all(userId || 'default', userId || 'default') as { key: string; value: string }[];
          for (const r of rows) {
            if (providerSettings[r.key] === undefined) {
              providerSettings[r.key] = r.value;
            }
          }
          if (resolvedHfToken) providerSettings.huggingface_token = resolvedHfToken;
          if (providerSettings.filigran_enabled === 'false') watermark = undefined;
        } catch { /* non-critical */ }

        // Choix du modèle par document (Paramètres → clé doc_models, JSON {docType: modelId})
        let docModels: Record<string, string> = {};
        try { if (providerSettings.doc_models) docModels = JSON.parse(providerSettings.doc_models); } catch { /* {} */ }

        // Load reference contents
        let referenceContents: string | undefined;
        if (body.useReferences) {
          addProgress(generationId, { type: 'progress', step: 'references', label: 'Chargement des références...', status: 'active' });
          try {
            const contents: string[] = [];
            const { getBuiltinReferences } = await import('@/lib/utils/builtinReferences');
            const builtin = await getBuiltinReferences(body.metadata.matiere, body.metadata.niveau, body.metadata.unite);
            contents.push(...builtin);

            if (signal.aborted) return;

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
            // not critical
          }
        }

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

        const docsToGenerate = (body.documentsToGenerate && body.documentsToGenerate.length > 0)
          ? body.documentsToGenerate
          : Object.keys(DOC_CONFIG) as DocumentType[];

        // Sort documents in a specific order: fiche_pedagogique -> cours_complet -> presentation_pptx -> others
        const order = ['fiche_pedagogique', 'cours_complet', 'presentation_pptx'];
        const sortedDocs = [...docsToGenerate].sort((a, b) => {
          const idxA = order.indexOf(a);
          const idxB = order.indexOf(b);
          const valA = idxA === -1 ? 99 : idxA;
          const valB = idxB === -1 ? 99 : idxB;
          return valA - valB;
        });

        const startTime = Date.now();
        const allToolResults: Record<string, unknown> = {};
        let totalUsage = { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 };

        if (signal.aborted) return;

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

        const files = [];

        // Assemble system prompt using minified template engine (includes schemas for selected docs)
        addProgress(generationId, { type: 'progress', step: 'init', label: 'Assemblage du contexte optimisé...', status: 'active' });
        const { resolveApplicableSkills } = await import('@/lib/skills/skillManager');
        const { activeSkills } = resolveApplicableSkills(body.metadata, body.activeSkillIds, userId || 'default');

        const systemPrompt = assembleSystemPrompt({
          metadata: body.metadata,
          documentsToGenerate: docsToGenerate as string[],
          includePrompt: body.includePrompt,
          excludePrompt: body.excludePrompt,
          customGlobal: customPrompts?.global,
          customContext: customPrompts?.context,
          referenceContents,
          activeSkills,
        });

        const messages: any[] = [
          { role: 'system', content: systemPrompt },
        ];

        // Log token savings
        try {
          const report = generateTokenReport([
            { label: 'core_instruction', text: systemPrompt.split('---')[0] || '' },
            { label: 'metadata', text: systemPrompt.split('---')[1] || '' },
            { label: 'schemas+refs', text: systemPrompt.split('---').slice(2).join('---') },
          ]);
          logTokenReport(report);
        } catch { /* non-critical */ }

        addProgress(generationId, { type: 'progress', step: 'init', label: 'Contexte optimisé', status: 'done' });

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

                addProgress(generationId, { type: 'reasoning', step: stepId, label: `${config.label} — Analyse pédagogique...`, status: 'active' });

                const modelToUse = docModels[docType] || HF_MODEL;
            
            const deps: string[] = [];
            if (docType === 'cours_complet') deps.push('based_on: fiche_pedagogique');
            if (docType === 'presentation_pptx') deps.push('based_on: cours_complet');
            const userPrompt = `generate: ${docType}${deps.length ? ` | ${deps.join(', ')}` : ''}`;

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

            const modelArg = activeProvider.id === 'huggingface' ? modelToUse : undefined;
            const maxTokensForDoc = docType === 'evaluation' ? 4000 : docType === 'resume_eleve' ? 4000 : 16000;
            const result = await activeProvider.generateWithTools!({
              messages,
              tools: [toolDef],
              maxTokens: maxTokensForDoc,
              model: modelArg,
              apiKey: providerSettings.huggingface_token,
              baseUrl: providerSettings.lmstudio_url,
              modelName: providerSettings.lmstudio_model,
              opencodeModel: providerSettings.opencode_model,
              signal,
            });

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

            // REVIEW MODE: store JSON, skip file building
            if (body.reviewMode) {
              for (const [, toolArgs] of Object.entries(result.toolResults)) {
                allToolResults[docType] = docType === 'cours_complet'
                  ? normalizeCoursComplet(toolArgs, body.metadata.lecon)
                  : normalizeDocContent(docType, toolArgs, config.label);
              }
              addProgress(generationId, { type: 'progress', step: stepId, label: `${config.label} — JSON prêt`, status: 'done' });
              continue;
            }

            addProgress(generationId, { type: 'progress', step: stepId, label: `${config.label} — Compilation...`, status: 'active' });

            for (const [, toolArgs] of Object.entries(result.toolResults)) {
              if (signal.aborted) return;
              const content = (docType === 'cours_complet'
                ? normalizeCoursComplet(toolArgs, body.metadata.lecon)
                : normalizeDocContent(docType, toolArgs, config.label)) as Record<string, unknown>;
              const bestFmt = BEST_FORMATS[docType] || 'pdf';
              const fmt = body.debugMode ? 'md' : (bestFmt === 'pdf' && providerSettings.default_format === 'docx' ? 'docx' : bestFmt);

              addProgress(generationId, { type: 'build', step: stepId, label: `${config.label} — Compilation ${fmt.toUpperCase()}...`, status: 'active', format: fmt });

              try {
                  let buffer: Buffer;
                  switch (fmt) {
                    case 'docx':
                      buffer = docType === 'fiche_pedagogique'
                        ? await buildFichePedagogiqueDocx(body.metadata, content as FicheContent, config.label)
                        : docType === 'planification'
                        ? await buildPlanificationDocx(body.metadata, content as PlanificationContent, config.label)
                        : docType === 'cours_complet'
                        ? await buildCoursCompletDocx(body.metadata, content as CoursCompletContent, config.label)
                        : docType === 'plan_gestion_classe'
                        ? await buildPlanGestionDocx(body.metadata, content as PlanGestionContent, config.label)
                        : docType === 'resume_eleve'
                        ? await buildResumeDocx(body.metadata, content as ResumeContent, config.label)
                        : docType === 'evaluation'
                        ? await buildEvaluationDocx(body.metadata, content as EvaluationContent, config.label, ministerialHeader)
                        : await buildDocx(body.metadata, content, config.label, ministerialHeader);
                      break;
                    case 'pdf':
                      buffer = docType === 'fiche_pedagogique'
                        ? buildFichePedagogiquePdf(body.metadata, content as FicheContent, config.label, watermark)
                        : docType === 'planification'
                        ? buildPlanificationPdf(body.metadata, content as PlanificationContent, config.label, watermark)
                        : docType === 'cours_complet'
                        ? buildCoursCompletPdf(body.metadata, content as CoursCompletContent, config.label, watermark)
                        : docType === 'plan_gestion_classe'
                        ? buildPlanGestionPdf(body.metadata, content as PlanGestionContent, config.label, watermark)
                        : docType === 'resume_eleve'
                        ? buildResumePdf(body.metadata, content as ResumeContent, config.label, watermark)
                        : docType === 'evaluation'
                        ? buildEvaluationPdf(body.metadata, content as EvaluationContent, config.label, watermark, ministerialHeader)
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

                // For evaluation: also generate self-contained offline interactive HTML quiz/flashcard
                if (docType === 'evaluation' && fmt !== 'html') {
                  try {
                    const htmlBuffer = Buffer.from(buildHtml(body.metadata, content, 'Quiz & Flashcards Interactifs', ministerialHeader));
                    const htmlFilename = getDynamicFilename('Quiz Interactif', body.metadata, 'html');
                    const htmlFile = await saveGeneratedFile(htmlBuffer, htmlFilename, 'html', 'evaluation');
                    files.push(htmlFile);
                  } catch (htmlErr) {
                    console.warn('Failed to build auxiliary interactive HTML quiz:', htmlErr);
                  }
                }

                addProgress(generationId, { type: 'build', step: stepId, label: `${config.label} — ${fmt.toUpperCase()} créé`, status: 'done', format: fmt });
              } catch (err) {
                console.error(`Failed to build ${fmt} for ${docType}:`, err);
                addProgress(generationId, { type: 'build', step: stepId, label: `${config.label} — ${fmt.toUpperCase()} échoué`, status: 'error', format: fmt });
              }
            }

            addProgress(generationId, { type: 'progress', step: stepId, label: `${config.label} — Terminé`, status: 'done' });

          } catch (err) {
            console.error(`Failed to generate ${docType}:`, err);
            logGenerationError('heavy', docType, err);
            const errMsg = err instanceof Error ? err.message : 'Unknown error';
            addProgress(generationId, { type: 'progress', step: stepId, label: `${config.label} — échoué`, status: 'error', error: errMsg });
            if (docType !== 'images_illustratives') {
              throw err;
            }
          }
        }

        const durationMs = Date.now() - startTime;

        if (signal.aborted) return;

        // REVIEW MODE: emit review event with JSONs for user inspection
        if (body.reviewMode) {
          const gen = getGeneration(generationId);
          if (gen) {
            gen.jsonResults = allToolResults;
            gen.messages = messages;
            gen.totalTokens = totalUsage.total_tokens;
          }
          addProgress(generationId, {
            type: 'review',
            result: {
              id: generationId,
              metadata: { ...body.metadata, provider: body.provider || 'huggingface' },
              jsonResults: allToolResults,
              tokensUsed: totalUsage.total_tokens,
              durationMs,
              documentsToGenerate: sortedDocs,
            },
          });
          return;
        }

        const generationResult = {
          id: generationId,
          createdAt: new Date(),
          mode: 'heavy' as const,
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
        logGenerationError('heavy', 'outer_orchestrator', error);
        const msg = error instanceof Error ? error.message : 'Generation failed';
        addProgress(generationId, { type: 'error', message: msg });
      }
    });

    return NextResponse.json({ success: true, generationId });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to initiate background generation' }, { status: 500 });
  }
}
