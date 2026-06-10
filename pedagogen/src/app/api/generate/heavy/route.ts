import { NextRequest, NextResponse } from 'next/server';
import { saveGeneratedFile, getDynamicFilename } from '@/lib/utils/generatedStorage';
import { buildDocx } from '@/lib/builders/docxBuilder';
import { buildPdf } from '@/lib/builders/pdfBuilder';
import { buildPptx } from '@/lib/builders/pptxBuilder';
import { buildMarkdown } from '@/lib/builders/mdBuilder';
import { getDb } from '@/lib/db';
import { generateFluxImage } from '@/lib/utils/imageCache';
import { callHuggingFace, pedagogicalTools, buildSystemPrompt } from '@/lib/agents/agentTools';
import { GenerationRequest, OutputFormat, DocumentType, BEST_FORMATS } from '@/types/generation';
import { logGenerationError } from '@/lib/utils/logger';
import { createGeneration, addProgress } from '@/lib/agents/generationManager';

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

    if (!body.useLocalModel && !process.env.HF_TOKEN) {
      return NextResponse.json({ error: 'HF_TOKEN not configured' }, { status: 500 });
    }

    const rateCheck = await checkHeavyRateLimit();
    if (!rateCheck.allowed) {
      return NextResponse.json({ error: 'Limite quotidienne atteinte.' }, { status: 429 });
    }

    const generationId = `heavy-${Date.now()}`;
    const gen = createGeneration(generationId, 'heavy', body.metadata);

    // Run generation asynchronously in the background
    (async () => {
      const signal = gen.controller.signal;
      try {
        addProgress(generationId, { type: 'progress', step: 'init', label: 'Initialisation...', status: 'active' });

        if (signal.aborted) return;

        // Load reference contents
        let referenceContents: string | undefined;
        if (body.useReferences) {
          addProgress(generationId, { type: 'progress', step: 'references', label: 'Chargement des références...', status: 'active' });
          try {
            const contents: string[] = [];
            const { getBuiltinReferences } = await import('@/lib/utils/builtinReferences');
            const builtin = await getBuiltinReferences(body.metadata.matiere, body.metadata.niveau);
            contents.push(...builtin);

            if (signal.aborted) return;

            const db = getDb();
            const enabledRefs = db.prepare(
              'SELECT id, name FROM reference_files WHERE enabled = 1 AND builtin = 0'
            ).all() as any[];
            const { readReferenceContent } = await import('@/lib/utils/fileStorage');
            for (const f of enabledRefs) {
              if (signal.aborted) return;
              const content = await readReferenceContent(f.id);
              if (content) contents.push(`[${f.name}]\n${content}`);
            }

            if (contents.length > 0) {
              referenceContents = contents.join('\n\n---\n\n');
            }
          } catch {
            // not critical
          }
        }

        const docsToGenerate = (body.documentsToGenerate && body.documentsToGenerate.length > 0)
          ? body.documentsToGenerate
          : Object.keys(DOC_CONFIG) as DocumentType[];

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

        const systemPrompt = buildSystemPrompt(
          body.metadata, body.metadata.langue, body.useReferences,
          referenceContents, body.includePrompt, body.excludePrompt,
          customPrompts
        );

        const files = [];

        for (const docType of docsToGenerate) {
          if (signal.aborted) return;
          const config = DOC_CONFIG[docType];
          if (!config) continue;

          const stepId = DOC_STEP_MAP[docType] || docType;
          addProgress(generationId, { type: 'progress', step: stepId, label: config.label, status: 'active' });

          if (docType === 'images_illustratives') {
            try {
              addProgress(generationId, { type: 'progress', step: stepId, label: `${config.label} — IA en cours...`, status: 'active' });
              const systemMsg = `You are a creative visual assistant. Based on the lesson metadata, generate 2 specific image prompts for illustrating the concepts in a Moroccan classroom. Return ONLY a JSON array of 2 strings containing the English prompts.`;
              const userMsg = `Lesson: ${body.metadata.lecon}, Matiere: ${body.metadata.matiere}, Niveau: ${body.metadata.niveau}`;
              
              if (signal.aborted) return;
              const promptsResponse = await callHuggingFace(systemMsg, userMsg, undefined, 500, 'openai/gpt-oss-120b:fastest', { 
                useLocalModel: body.useLocalModel, 
                localModelName: body.localModelName, 
                localModelUrl: body.localModelUrl, 
                localApiType: body.localApiType,
                signal,
                debugMode: body.debugMode
              });

              if (signal.aborted) return;

              let prompts = [
                `Moroccan classroom illustrating ${body.metadata.lecon}`,
                `Students interacting with computer systems for ${body.metadata.lecon}`
              ];
              try {
                const textBlock = (promptsResponse.content as any[]).find((c) => c.type === 'text');
                const text = textBlock?.text || '';
                const match = text.match(/\[([\s\S]*?)\]/);
                if (match) {
                  prompts = JSON.parse(match[0]);
                }
              } catch (e) {
                console.error("Failed to parse prompts", e);
              }

              addProgress(generationId, { type: 'progress', step: stepId, label: `${config.label} — Compilation...`, status: 'active' });
              if (body.debugMode) {
                const mdContent = `# Prompts d'images illustratives\n\n${prompts.map((p, idx) => `## Illustration ${idx + 1}\n\n${p}`).join('\n\n')}`;
                const filename = getDynamicFilename('Images_Illustratives', body.metadata, 'md');
                const file = await saveGeneratedFile(Buffer.from(mdContent), filename, 'md', 'images_illustratives');
                files.push(file);
              } else {
                for (let i = 0; i < prompts.length; i++) {
                  if (signal.aborted) return;
                  const imgBuffer = await generateFluxImage(prompts[i]);
                  const filename = getDynamicFilename(`Illustration_${i + 1}`, body.metadata, 'png');
                  const file = await saveGeneratedFile(imgBuffer, filename, 'png', 'images_illustratives');
                  files.push(file);
                }
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
          const toolDef = pedagogicalTools.find((t) => t.function.name === `generate_${docType}`);
          if (!toolDef) continue;

          try {
            if (signal.aborted) return;
            addProgress(generationId, { type: 'progress', step: stepId, label: `${config.label} — IA en cours...`, status: 'active' });

            const modelToUse = docType === 'cours_complet' ? 'deepseek-ai/DeepSeek-R1' : 'openai/gpt-oss-120b:fastest';
            const promptPrefix = customPrompts?.[docType] || config.promptPrefix;
            const result = await callHuggingFace(
              systemPrompt,
              `${promptPrefix}\n\nGenerate this document for: ${body.metadata.lecon} (${body.metadata.matiere} - ${body.metadata.niveau})`,
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

            for (const [key, value] of Object.entries(result.toolResults)) {
              allToolResults[key] = value;
            }

            if (result.usage) {
              totalUsage.prompt_tokens += result.usage.prompt_tokens;
              totalUsage.completion_tokens += result.usage.completion_tokens;
              totalUsage.total_tokens += result.usage.total_tokens;
            }

            addProgress(generationId, { type: 'progress', step: stepId, label: `${config.label} — Compilation...`, status: 'active' });

            for (const [toolName, toolArgs] of Object.entries(result.toolResults)) {
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
                    buffer = buildPdf(body.metadata, content, config.label);
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
            id: `heavy-${Date.now()}`,
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
