'use client';

import { useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Eye, Monitor } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { CourseForm } from '@/components/generate/CourseForm';
import { DocumentPicker } from '@/components/generate/DocumentPicker';
import { GenerationProgress } from '@/components/generate/GenerationProgress';
import { OutputPreview } from '@/components/generate/OutputPreview';
import { useGeneration } from '@/hooks/useGeneration';
import type { GenerationMode, CourseMetadata, DocumentType, OutputFormat } from '@/types/generation';

const DEFAULT_DOCS: DocumentType[] = [
  'fiche_pedagogique', 'planification', 'cours_complet',
  'plan_gestion_classe', 'resume_eleve', 'presentation_pptx',
];

export default function SplitScreenEditor() {
  const params = useParams();
  const router = useRouter();
  const mode = (params.mode as GenerationMode) || 'medium';
  const {
    status, activeStep, stepStatus, stepStatuses, tokens,
    error, result, generate, reset,
  } = useGeneration();

  const [metadata, setMetadata] = useState<CourseMetadata | null>(null);
  const [selectedDocs, setSelectedDocs] = useState<DocumentType[]>(DEFAULT_DOCS);
  const [outputFormat, setOutputFormat] = useState<OutputFormat>('docx');

  const handleGenerate = useCallback(() => {
    if (!metadata) return;
    generate({
      mode, metadata,
      documentsToGenerate: mode === 'medium' ? selectedDocs : undefined,
      outputFormat: mode === 'light' ? 'md' : outputFormat,
      useReferences: false, debugMode: false,
    });
  }, [metadata, mode, selectedDocs, outputFormat, generate]);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-6 py-3 bg-white border-b border-border shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="p-1.5 rounded-lg hover:bg-parchment-dark text-muted transition-colors">
            <ArrowLeft size={16} />
          </button>
          <span className="text-sm font-medium text-navy">Éditeur Split-Screen</span>
          <Badge variant="teal" className="text-[10px]">Aperçu en direct</Badge>
        </div>
        {metadata && !result && (
          <button
            onClick={handleGenerate}
            disabled={status === 'generating'}
            className="px-4 py-1.5 rounded-lg bg-teal text-white text-sm font-semibold hover:bg-teal-dark transition-colors disabled:opacity-50"
          >
            {status === 'generating' ? 'Génération...' : 'Lancer la génération'}
          </button>
        )}
      </div>

      <div className="flex-1 flex overflow-hidden">
        <div className="w-1/2 overflow-y-auto border-r border-border bg-white p-6">
          {!metadata && (
            <div className="max-w-xl mx-auto">
              <CourseForm onSubmit={setMetadata} />
            </div>
          )}

          {metadata && !result && (
            <div className="max-w-xl mx-auto space-y-4">
              <div className="flex items-center justify-between p-3 rounded-lg bg-parchment-dark/50 border border-border">
                <div className="text-sm text-navy truncate">
                  <span className="font-medium">{metadata.matiere}</span>
                  <span className="text-muted mx-1.5">·</span>
                  {metadata.unite} — {metadata.lecon}
                </div>
                <button onClick={() => setMetadata(null)} className="text-xs text-muted hover:text-navy transition-colors shrink-0 ml-2">
                  Modifier
                </button>
              </div>

              {mode === 'medium' && (
                <DocumentPicker selected={selectedDocs} onChange={setSelectedDocs} />
              )}

              {mode !== 'light' && (
                <div>
                  <label className="block text-sm font-medium text-navy mb-1.5">Format</label>
                  <div className="flex gap-2">
                    {(['docx', 'pdf', 'pptx', 'md'] as OutputFormat[]).map((f) => (
                      <button
                        key={f}
                        onClick={() => setOutputFormat(f)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                          outputFormat === f
                            ? 'bg-teal text-white'
                            : 'bg-parchment-dark text-muted hover:text-navy border border-border'
                        }`}
                      >
                        {f.toUpperCase()}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {status === 'generating' && (
                <GenerationProgress
                  mode={mode}
                  activeStep={activeStep}
                  stepStatus={stepStatus}
                  stepStatuses={stepStatuses}
                  tokens={tokens}
                />
              )}
            </div>
          )}
        </div>

        <div className="w-1/2 overflow-y-auto bg-parchment-dark/30 p-6 flex items-start justify-center">
          {!metadata && (
            <div className="text-center py-20 text-muted">
              <Monitor size={48} className="mx-auto mb-4 opacity-30" />
              <p className="text-sm font-medium">Aperçu en direct</p>
              <p className="text-xs mt-1">Remplissez le formulaire à gauche pour voir l'aperçu.</p>
            </div>
          )}

          {metadata && !result && status !== 'generating' && (
            <div className="w-full max-w-2xl">
              <div className="rounded-xl border border-border bg-white shadow-sm p-8 min-h-[400px]">
                <div className="text-center text-muted/50 text-sm py-16">
                  <Eye size={40} className="mx-auto mb-3 opacity-30" />
                  <p className="font-medium">{metadata.matiere} — {metadata.lecon}</p>
                  <p className="text-xs mt-1">{metadata.niveau} · S{metadata.semestre} · {metadata.duree}min</p>
                  <p className="text-xs mt-1">Cliquez sur "Lancer la génération" pour générer le document.</p>
                </div>
              </div>
            </div>
          )}

          {result && (
            <div className="w-full max-w-2xl">
              <OutputPreview result={result} onReset={reset} />
            </div>
          )}

          {error && (
            <div className="w-full max-w-2xl">
              <div className="rounded-xl border border-red/20 bg-red/5 p-6 text-center">
                <p className="text-sm text-red font-medium">{error}</p>
                <button onClick={reset} className="mt-3 text-sm text-teal hover:underline">Réessayer</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
