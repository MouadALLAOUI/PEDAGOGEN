import { NextRequest, NextResponse } from 'next/server';
import { runMediumAgent } from '@/lib/agents/mediumAgent';
import { saveGeneratedFile, getDynamicFilename } from '@/lib/utils/generatedStorage';
import { buildDocx } from '@/lib/builders/docxBuilder';
import { buildPdf } from '@/lib/builders/pdfBuilder';
import { buildPptx } from '@/lib/builders/pptxBuilder';
import { buildMarkdown } from '@/lib/builders/mdBuilder';
import { getDb } from '@/lib/db';
import { generateFluxImage } from '@/lib/utils/imageCache';
import { callHuggingFace } from '@/lib/agents/agentTools';
import { GenerationRequest, OutputFormat, DocumentType, BEST_FORMATS } from '@/types/generation';
import { logGenerationError } from '@/lib/utils/logger';
import { createGeneration, addProgress } from '@/lib/agents/generationManager';

const DOC_LABELS: Record<string, string> = {
  generate_fiche_pedagogique: 'Fiche Pédagogique',
  generate_planification: 'Planification',
  generate_cours_complet: 'Cours Complet',
  generate_gestion_classe: 'Plan de Gestion de Classe',
  generate_resume_eleve: 'Résumé Élève',
  generate_pptx_outline: 'Présentation PPTX',
};

const DOC_TYPES: Record<string, DocumentType> = {
  generate_fiche_pedagogique: 'fiche_pedagogique',
  generate_planification: 'planification',
  generate_cours_complet: 'cours_complet',
  generate_gestion_classe: 'plan_gestion_classe',
  generate_resume_eleve: 'resume_eleve',
  generate_pptx_outline: 'presentation_pptx',
};

export async function POST(request: NextRequest) {
  try {
    const body: GenerationRequest = await request.json();

    if (body.mode !== 'medium') {
      return NextResponse.json({ error: 'Invalid mode' }, { status: 400 });
    }

    if (!body.useLocalModel && !process.env.HF_TOKEN) {
      return NextResponse.json({ error: 'HF_TOKEN not configured' }, { status: 500 });
    }

    if (!body.documentsToGenerate || body.documentsToGenerate.length === 0) {
      return NextResponse.json({ error: 'No documents selected' }, { status: 400 });
    }

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
            const builtin = await getBuiltinReferences(body.metadata.matiere, body.metadata.niveau);
            contents.push(...builtin);

            if (signal.aborted) return;

            // User-uploaded references (only enabled ones)
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

        const result = await runMediumAgent(
          body.metadata,
          body.documentsToGenerate!,
          body.useReferences,
          referenceContents,
          body.includePrompt,
          body.excludePrompt,
          body.useLocalModel,
          body.localModelName,
          body.localModelUrl,
          body.localApiType,
          signal,
          customPrompts,
          body.debugMode
        );

        if (signal.aborted) return;
        addProgress(generationId, { type: 'progress', step: 'build', label: 'Compilation des documents...', status: 'active' });

        const files = [];

        for (const [toolName, toolArgs] of Object.entries(result.toolResults)) {
          if (signal.aborted) return;
          const content = toolArgs as Record<string, unknown>;

          // Determine which document types requested by the user correspond to this tool call
          const matchedDocTypes: DocumentType[] = [];
          if (toolName === 'generate_fiche_pedagogique') {
            if (body.documentsToGenerate?.includes('fiche_pedagogique')) matchedDocTypes.push('fiche_pedagogique');
            if (body.documentsToGenerate?.includes('evaluation')) matchedDocTypes.push('evaluation');
            if (body.documentsToGenerate?.includes('images_illustratives')) matchedDocTypes.push('images_illustratives');
            // fallback
            if (matchedDocTypes.length === 0) matchedDocTypes.push('fiche_pedagogique');
          } else {
            const dt = DOC_TYPES[toolName];
            if (dt) matchedDocTypes.push(dt);
          }

          for (const docType of matchedDocTypes) {
            if (signal.aborted) return;
            const label = docType === 'evaluation' ? 'Évaluation' : docType === 'images_illustratives' ? 'Images Illustratives' : (DOC_LABELS[toolName] || toolName);
            const fmt = BEST_FORMATS[docType] || 'pdf';

            if (docType === 'images_illustratives') {
              try {
                const systemMsg = `You are a creative visual assistant. Based on the lesson metadata, generate 2 specific image prompts for illustrating the concepts in a Moroccan classroom. Return ONLY a JSON array of 2 strings containing the English prompts.`;
                const userMsg = `Lesson: ${body.metadata.lecon}, Matiere: ${body.metadata.matiere}, Niveau: ${body.metadata.niveau}`;
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
              } catch (err) {
                console.error(`Failed to generate images in medium route:`, err);
                logGenerationError('medium', 'images_illustratives', err);
              }
              continue;
            }

            try {
              let buffer: Buffer;
              const fmt = body.debugMode ? 'md' : (BEST_FORMATS[docType] || 'pdf');
              switch (fmt) {
                case 'docx':
                  buffer = await buildDocx(body.metadata, content, label);
                  break;
                case 'pdf':
                  buffer = buildPdf(body.metadata, content, label);
                  break;
                case 'pptx':
                  buffer = await buildPptx(body.metadata, content, label);
                  break;
                case 'md':
                  buffer = Buffer.from(buildMarkdown(body.metadata, content, label));
                  break;
                default:
                  continue;
              }
              if (signal.aborted) return;
              const filename = getDynamicFilename(label, body.metadata, fmt);
              const file = await saveGeneratedFile(buffer, filename, fmt, docType);
              files.push(file);
            } catch (err) {
              console.error(`Failed to build ${fmt} for ${docType}:`, err);
              logGenerationError('medium', docType, err);
            }
          }
        }

        const durationMs = Date.now() - startTime;

        if (signal.aborted) return;

        addProgress(generationId, {
          type: 'done',
          result: {
            id: `medium-${Date.now()}`,
            createdAt: new Date(),
            mode: 'medium',
            metadata: body.metadata,
            files,
            tokensUsed: result.usage?.total_tokens || 0,
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
