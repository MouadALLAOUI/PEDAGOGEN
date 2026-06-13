import { NextRequest, NextResponse } from 'next/server';
import { saveGeneratedFile, getDynamicFilename } from '@/lib/utils/generatedStorage';
import { buildDocx } from '@/lib/builders/docxBuilder';
import { buildPdf, type WatermarkInfo } from '@/lib/builders/pdfBuilder';
import { buildPptx } from '@/lib/builders/pptxBuilder';
import { buildMarkdown } from '@/lib/builders/mdBuilder';
import { buildHtml } from '@/lib/builders/htmlBuilder';
import { assembleSystemPrompt } from '@/lib/agents/prompts';
import { generateTokenReport, logTokenReport } from '@/lib/utils/tokenTracker';
import { getDb } from '@/lib/db';
import { generateFluxImage } from '@/lib/utils/imageCache';
import { pedagogicalTools } from '@/lib/agents/agentTools';
import { GenerationRequest, DocumentType, BEST_FORMATS } from '@/types/generation';
import { logGenerationError } from '@/lib/utils/logger';
import { createGeneration, addProgress } from '@/lib/agents/generationManager';
import { verifyToken, getUserFromDb } from '@/lib/db/auth';
import { getProvider } from '@/lib/ai/factory';
import type { ProviderId } from '@/lib/ai/types';

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

async function checkHeavyRateLimit(): Promise<{ allowed: boolean; remaining: number }> {
  // Simple rate limit helper
  return { allowed: true, remaining: 3 };
}

export async function POST(request: NextRequest) {
  try {
    const body: GenerationRequest = await request.json();

    if (body.mode !== 'heavy') {
      return NextResponse.json({ error: 'Invalid mode' }, { status: 400 });
    }

    // If provider is 'none', skip AI and show prompt only
    if (body.provider === 'none') {
      const dbToken = await getDbSetting('huggingface_token');
      if (dbToken) process.env.HF_TOKEN = dbToken;

      const nid = `heavy-${Date.now()}`;
      createGeneration(nid, 'heavy', body.metadata);
      const sortedDocs = body.documentsToGenerate || Object.keys(DOC_CONFIG) as DocumentType[];
      const promptParts: string[] = [
        '[PROMPT SYSTEME]\n',
        assembleSystemPrompt({ metadata: body.metadata, documentsToGenerate: body.documentsToGenerate }),
      ];

      for (const docType of sortedDocs) {
        if (docType === 'images_illustratives') continue;
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

    const dbToken = await getDbSetting('huggingface_token');
    if (dbToken) process.env.HF_TOKEN = dbToken;

    const selectedProvider = (body.provider || 'huggingface') as ProviderId;
    if (selectedProvider === 'huggingface' && !process.env.HF_TOKEN) {
      return NextResponse.json({ error: 'HF_TOKEN not configured' }, { status: 500 });
    }

    const rateCheck = await checkHeavyRateLimit();
    if (!rateCheck.allowed) {
      return NextResponse.json({ error: 'Limite quotidienne atteinte.' }, { status: 429 });
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

    const generationId = `heavy-${Date.now()}`;
    const gen = createGeneration(generationId, 'heavy', body.metadata);

    // Run generation asynchronously in the background
    (async () => {
      const signal = gen.controller.signal;
      try {
        addProgress(generationId, { type: 'progress', step: 'init', label: 'Initialisation...', status: 'active' });

        if (signal.aborted) return;

        // Resolve provider
        const activeProvider = getProvider((body.provider || 'huggingface') as ProviderId);
        const providerSettings: Record<string, string | undefined> = {};
        try {
          const db = getDb();
          const rows = db.prepare("SELECT key, value FROM settings WHERE user_id = 'default' AND key IN ('provider', 'huggingface_token', 'lmstudio_url', 'lmstudio_model', 'opencode_model')").all() as { key: string; value: string }[];
          for (const r of rows) providerSettings[r.key] = r.value;
        } catch { /* non-critical */ }

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
          images_illustratives: 'generate_fiche_pedagogique',
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
        const systemPrompt = assembleSystemPrompt({
          metadata: body.metadata,
          documentsToGenerate: docsToGenerate as string[],
          includePrompt: body.includePrompt,
          excludePrompt: body.excludePrompt,
          customGlobal: customPrompts?.global,
          customContext: customPrompts?.context,
          referenceContents,
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
              const promptsResponse = await activeProvider.generateWithTools!({
                messages,
                tools: undefined,
                maxTokens: 500,
                apiKey: providerSettings.huggingface_token,
                baseUrl: providerSettings.lmstudio_url,
                modelName: providerSettings.lmstudio_model,
                opencodeModel: providerSettings.opencode_model,
                signal,
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
              console.error(`Failed to generate images:`, err);
              logGenerationError('heavy', 'images_illustratives', err);
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

                addProgress(generationId, { type: 'reasoning', step: stepId, label: `${config.label} — Analyse pédagogique...`, status: 'active' });

                const modelToUse = docType === 'cours_complet' ? 'deepseek-ai/DeepSeek-R1' : 'openai/gpt-oss-120b:fastest';
            
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
            const result = await activeProvider.generateWithTools!({
              messages,
              tools: [toolDef],
              maxTokens: 16000,
              model: modelArg,
              apiKey: providerSettings.huggingface_token,
              baseUrl: providerSettings.lmstudio_url,
              modelName: providerSettings.lmstudio_model,
              opencodeModel: providerSettings.opencode_model,
              signal,
            });

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

              addProgress(generationId, { type: 'build', step: stepId, label: `${config.label} — Compilation ${fmt.toUpperCase()}...`, status: 'active', format: fmt });

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
                    case 'html':
                      buffer = Buffer.from(buildHtml(body.metadata, content, config.label));
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
          }
        }

        const durationMs = Date.now() - startTime;

        if (signal.aborted) return;

        addProgress(generationId, {
          type: 'done',
          result: {
            id: generationId,
            createdAt: new Date(),
            mode: 'heavy',
            metadata: body.metadata,
            files,
            tokensUsed: totalUsage.total_tokens,
            durationMs,
          },
        });
      } catch (error) {
        if (signal.aborted) return;
        logGenerationError('heavy', 'outer_orchestrator', error);
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
