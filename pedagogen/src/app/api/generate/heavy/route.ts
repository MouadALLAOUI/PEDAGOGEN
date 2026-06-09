import { NextRequest } from 'next/server';
import { runHeavyAgent } from '@/lib/agents/heavyAgent';
import { readReferenceContent } from '@/lib/utils/fileStorage';
import { saveGeneratedFile } from '@/lib/utils/generatedStorage';
import { buildDocx } from '@/lib/builders/docxBuilder';
import { buildPdf } from '@/lib/builders/pdfBuilder';
import { buildPptx } from '@/lib/builders/pptxBuilder';
import { buildMarkdown } from '@/lib/builders/mdBuilder';
import type { GenerationRequest, OutputFormat, DocumentType } from '@/types/generation';

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

function sseEvent(event: Record<string, unknown>): string {
  return `data: ${JSON.stringify(event)}\n\n`;
}

export async function POST(request: NextRequest) {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: Record<string, unknown>) => {
        controller.enqueue(encoder.encode(sseEvent(event)));
      };

      try {
        const body: GenerationRequest = await request.json();

        if (body.mode !== 'heavy') {
          send({ type: 'error', message: 'Invalid mode' });
          controller.close();
          return;
        }

        if (!process.env.HF_TOKEN) {
          send({ type: 'error', message: 'HF_TOKEN not configured' });
          controller.close();
          return;
        }

        send({ type: 'progress', step: 'init', label: 'Initialisation...' });

        // Load reference contents if needed
        let referenceContents: string | undefined;
        if (body.useReferences) {
          send({ type: 'progress', step: 'references', label: 'Chargement des références...' });
          try {
            const { listReferenceFiles } = await import('@/lib/utils/fileStorage');
            const refFiles = await listReferenceFiles();
            const contents: string[] = [];
            for (const f of refFiles) {
              const content = await readReferenceContent(f.name);
              if (content) contents.push(`[${f.name}]\n${content}`);
            }
            if (contents.length > 0) {
              referenceContents = contents.join('\n\n---\n\n');
            }
          } catch {
            // References not critical
          }
        }

        send({ type: 'progress', step: 'fiche', label: 'Fiche Pédagogique' });

        const startTime = Date.now();
        const result = await runHeavyAgent(body.metadata, body.useReferences, referenceContents);

        send({ type: 'progress', step: 'planification', label: 'Planification' });
        send({ type: 'progress', step: 'cours', label: 'Cours Complet' });
        send({ type: 'progress', step: 'gestion', label: 'Gestion de Classe' });
        send({ type: 'progress', step: 'resume', label: 'Résumé Élève' });
        send({ type: 'progress', step: 'pptx', label: 'Présentation PPTX' });
        send({ type: 'progress', step: 'build', label: 'Compilation des fichiers' });

        // Build files from tool results
        const formats = (body.outputFormat
          ? Array.isArray(body.outputFormat) ? body.outputFormat : [body.outputFormat]
          : ['docx']) as OutputFormat[];

        const files = [];

        for (const [toolName, toolArgs] of Object.entries(result.toolResults)) {
          const label = DOC_LABELS[toolName] || toolName;
          const docType = DOC_TYPES[toolName] || 'fiche_pedagogique';
          const content = toolArgs as Record<string, unknown>;

          for (const fmt of formats) {
            try {
              let buffer: Buffer;
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
              const file = await saveGeneratedFile(buffer, `${label}.${fmt}`, fmt, docType);
              files.push(file);
            } catch (err) {
              console.error(`Failed to build ${fmt} for ${toolName}:`, err);
            }
          }
        }

        const durationMs = Date.now() - startTime;

        send({
          type: 'done',
          result: {
            id: `heavy-${Date.now()}`,
            createdAt: new Date(),
            mode: 'heavy',
            metadata: body.metadata,
            files,
            tokensUsed: result.usage?.total_tokens || 0,
            durationMs,
          },
        });

        controller.close();
      } catch (error) {
        const msg = error instanceof Error ? error.message : 'Generation failed';
        send({ type: 'error', message: msg });
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}
