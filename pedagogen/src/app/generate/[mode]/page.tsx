'use client';

import { useParams } from 'next/navigation';
import { useState, useCallback } from 'react';
import { ArrowLeft, Play, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { PageTransition } from '@/components/layout/PageTransition';
import { CourseForm } from '@/components/generate/CourseForm';
import { DocumentPicker } from '@/components/generate/DocumentPicker';
import { GenerationProgress } from '@/components/generate/GenerationProgress';
import { OutputPreview } from '@/components/generate/OutputPreview';
import {
  MODE_DESCRIPTIONS,
  type GenerationMode,
  type CourseMetadata,
  type GenerationResult,
  type DocumentType,
  type OutputFormat,
} from '@/types/generation';
import { addHistoryEntry } from '@/lib/utils/historyStore';

export default function ModePage() {
  const params = useParams();
  const mode = params.mode as GenerationMode;

  const [metadata, setMetadata] = useState<CourseMetadata | null>(null);
  const [selectedDocs, setSelectedDocs] = useState<DocumentType[]>([]);
  const [outputFormat, setOutputFormat] = useState<OutputFormat>('docx');
  const [useReferences, setUseReferences] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<GenerationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeStep, setActiveStep] = useState<string | undefined>();
  const [tokens, setTokens] = useState(0);

  const modeInfo = MODE_DESCRIPTIONS[mode];

  if (!modeInfo) {
    return (
      <div className="text-center py-20">
        <p className="text-muted">Mode invalide.</p>
        <Link href="/generate" className="text-teal hover:underline mt-4 inline-block">
          Retour
        </Link>
      </div>
    );
  }

  const handleGenerate = useCallback(async () => {
    if (!metadata) return;

    setGenerating(true);
    setError(null);
    setResult(null);
    setActiveStep('init');
    setTokens(0);

    try {
      if (mode === 'light') {
        // Light mode: JSON response
        const response = await fetch(`/api/generate/light`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            mode,
            metadata,
            outputFormat: 'md',
            useReferences,
          }),
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Erreur lors de la génération');
        }

        const data = await response.json();
        setResult(data.result);
        addHistoryEntry(data.result);
      } else {
        // Heavy/Medium: SSE stream
        const response = await fetch(`/api/generate/${mode}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            mode,
            metadata,
            documentsToGenerate: mode === 'medium' ? selectedDocs : undefined,
            outputFormat,
            useReferences,
          }),
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Erreur lors de la génération');
        }

        const reader = response.body?.getReader();
        const decoder = new TextDecoder();

        if (reader) {
          let buffer = '';
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });

            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
              if (line.startsWith('data: ')) {
                try {
                  const event = JSON.parse(line.slice(6));
                  if (event.type === 'progress') {
                    setActiveStep(event.step);
                  } else if (event.type === 'tokens') {
                    setTokens(event.count);
                  } else if (event.type === 'done') {
                    setResult(event.result);
                    addHistoryEntry(event.result);
                  } else if (event.type === 'error') {
                    setError(event.message);
                  }
                } catch {
                  // Ignore malformed events
                }
              }
            }
          }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
    } finally {
      setGenerating(false);
      setActiveStep(undefined);
    }
  }, [metadata, mode, selectedDocs, outputFormat, useReferences]);

  const handleFormSubmit = (data: CourseMetadata) => {
    setMetadata(data);
  };

  return (
    <PageTransition>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Link
            href="/generate"
            className="p-2 rounded-lg hover:bg-navy-light/5 text-muted hover:text-navy transition-colors"
          >
            <ArrowLeft size={20} />
          </Link>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h1 className="font-display text-2xl font-bold text-navy">
                {modeInfo.title}
              </h1>
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: modeInfo.color }}
              />
            </div>
            <p className="text-sm text-muted mt-0.5">{modeInfo.description}</p>
          </div>
          <Badge variant={mode === 'heavy' ? 'red' : mode === 'medium' ? 'gold' : 'green'}>
            {modeInfo.tokenRange} tokens
          </Badge>
        </div>

        {/* Form */}
        {!result && (
          <Card>
            <CardHeader>
              <h2 className="font-display font-semibold text-navy">
                Informations du Cours
              </h2>
            </CardHeader>
            <CardContent>
              <CourseForm onSubmit={handleFormSubmit} />
            </CardContent>
          </Card>
        )}

        {/* Medium mode: document picker */}
        {mode === 'medium' && metadata && !result && (
          <Card>
            <CardHeader>
              <h2 className="font-display font-semibold text-navy">
                Documents à Générer
              </h2>
            </CardHeader>
            <CardContent>
              <DocumentPicker
                selected={selectedDocs}
                onChange={setSelectedDocs}
              />
            </CardContent>
          </Card>
        )}

        {/* Format selector */}
        {metadata && !result && (
          <Card>
            <CardHeader>
              <h2 className="font-display font-semibold text-navy">
                Format de Sortie
              </h2>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-3">
                {(mode === 'light' ? ['md'] : ['docx', 'pptx', 'pdf', 'md']).map((fmt) => (
                  <button
                    key={fmt}
                    onClick={() => setOutputFormat(fmt as OutputFormat)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      outputFormat === fmt
                        ? 'bg-teal text-white shadow-md'
                        : 'bg-navy-light/5 text-navy hover:bg-navy-light/10'
                    }`}
                  >
                    .{fmt.toUpperCase()}
                  </button>
                ))}
              </div>
              <div className="mt-4">
                <label className="flex items-center gap-2 text-sm text-muted cursor-pointer">
                  <input
                    type="checkbox"
                    checked={useReferences}
                    onChange={(e) => setUseReferences(e.target.checked)}
                    className="w-4 h-4 rounded border-border text-teal focus:ring-teal"
                  />
                  Utiliser les fichiers de référence
                </label>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Generate button */}
        {metadata && !result && (
          <Button
            onClick={handleGenerate}
            disabled={generating || (mode === 'medium' && selectedDocs.length === 0)}
            size="lg"
            className="w-full"
          >
            {generating ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                Génération en cours...
              </>
            ) : (
              <>
                <Play size={18} />
                Lancer la Génération
              </>
            )}
          </Button>
        )}

        {/* Progress */}
        {generating && (
          <GenerationProgress mode={mode} activeStep={activeStep} tokens={tokens} />
        )}

        {/* Error */}
        {error && (
          <Card className="border-red/20 bg-red/5">
            <CardContent className="py-4">
              <p className="text-red text-sm font-medium">{error}</p>
            </CardContent>
          </Card>
        )}

        {/* Result */}
        {result && (
          <OutputPreview result={result} onReset={() => { setResult(null); setMetadata(null); }} />
        )}
      </div>
    </PageTransition>
  );
}
