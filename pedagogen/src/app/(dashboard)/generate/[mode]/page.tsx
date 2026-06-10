'use client';

import { useParams, useRouter } from 'next/navigation';
import { useState, useCallback, useEffect } from 'react';
import toast from 'react-hot-toast';
import { ArrowLeft, Play, Loader2, BookOpen } from 'lucide-react';
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

const DEFAULT_DOCS: DocumentType[] = [
  'fiche_pedagogique',
  'planification',
  'cours_complet',
  'plan_gestion_classe',
  'resume_eleve',
  'presentation_pptx',
];

export default function ModePage() {
  const params = useParams();
  const router = useRouter();
  const mode = params.mode as GenerationMode;

  const [metadata, setMetadata] = useState<CourseMetadata | null>(null);
  const [selectedDocs, setSelectedDocs] = useState<DocumentType[]>([]);
  const [outputFormat, setOutputFormat] = useState<OutputFormat>('docx');
  const [useReferences, setUseReferences] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<GenerationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeStep, setActiveStep] = useState<string | undefined>();
  const [stepStatus, setStepStatus] = useState<'active' | 'done' | 'error' | undefined>();
  const [stepStatuses, setStepStatuses] = useState<Record<string, 'pending' | 'active' | 'done' | 'error' | { status: 'pending' | 'active' | 'done' | 'error'; error?: string }>>({});
  const [tokens, setTokens] = useState(0);
  const [includePrompt, setIncludePrompt] = useState('');
  const [excludePrompt, setExcludePrompt] = useState('');
  const [useLocalModel, setUseLocalModel] = useState(false);
  const [localModelName, setLocalModelName] = useState('google/gemma-4-e2b');
  const [localModelUrl, setLocalModelUrl] = useState('http://localhost:1234/v1/chat/completions');
  const [localApiType, setLocalApiType] = useState<'openai' | 'custom'>('openai');
  const [debugMode, setDebugMode] = useState(false);

  // Pre-select docs and load saved prompts
  useEffect(() => {
    if (mode === 'heavy') {
      setSelectedDocs([...DEFAULT_DOCS]);
    } else if (mode === 'medium' && selectedDocs.length === 0) {
      setSelectedDocs([]);
    }
    setIncludePrompt(localStorage.getItem('pedagogen_include_prompt') || '');
    setExcludePrompt(localStorage.getItem('pedagogen_exclude_prompt') || '');
    setUseLocalModel(localStorage.getItem('pedagogen_use_local_model') === 'true');
    setLocalModelName(localStorage.getItem('pedagogen_local_model_name') || 'google/gemma-4-e2b');
    setLocalModelUrl(localStorage.getItem('pedagogen_local_model_url') || 'http://localhost:1234/v1/chat/completions');
    setLocalApiType((localStorage.getItem('pedagogen_local_api_type') as 'openai' | 'custom') || 'openai');
    setDebugMode(localStorage.getItem('pedagogen_debug_mode') === 'true');
  }, [mode]);

  // Prevent accidental page refresh during generation
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (generating) {
        e.preventDefault();
        e.returnValue = 'Génération en cours. Si vous quittez ou actualisez la page, la génération sera interrompue et vous perdrez votre progression.';
        return e.returnValue;
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [generating]);

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

    try {
      const docTypes = [
        'fiche_pedagogique',
        'planification',
        'cours_complet',
        'plan_gestion_classe',
        'resume_eleve',
        'presentation_pptx',
        'evaluation',
        'images_illustratives',
      ];
      const customPrompts: Record<string, string> = {};
      for (const doc of docTypes) {
        const saved = localStorage.getItem(`pedagogen_prompt_${doc}`);
        if (saved) {
          customPrompts[doc] = saved;
        }
      }

      const response = await fetch(`/api/generate/${mode}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode,
          metadata,
          documentsToGenerate: selectedDocs.length > 0 ? selectedDocs : undefined,
          outputFormat: mode === 'light' ? 'md' : outputFormat,
          useReferences,
          includePrompt,
          excludePrompt,
          useLocalModel,
          localModelName,
          localModelUrl,
          localApiType,
          customPrompts,
          debugMode,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Erreur lors de la génération');
      }

      const data = await response.json();
      if (data.generationId) {
        toast.success('Génération démarrée en arrière-plan !');
        router.push(`/generate/status?id=${data.generationId}`);
      } else {
        throw new Error('Erreur: ID de génération non retourné');
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erreur inconnue';
      setError(msg);
      toast.error(msg);
      setGenerating(false);
    }
  }, [
    metadata,
    mode,
    selectedDocs,
    outputFormat,
    useReferences,
    includePrompt,
    excludePrompt,
    useLocalModel,
    localModelName,
    localModelUrl,
    localApiType,
    router,
    debugMode,
  ]);

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

        {/* Document picker — medium mode only (heavy always generates all) */}
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
                maxSelected={3}
              />
            </CardContent>
          </Card>
        )}

        {/* Format selector — medium/light only (heavy generates all formats) */}
        {mode !== 'heavy' && metadata && !result && (
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
              <div className="mt-4 p-3 rounded-lg bg-navy-light/5 border border-border">
                <label className="flex items-center gap-3 cursor-pointer">
                  <div className="relative">
                    <input
                      type="checkbox"
                      checked={useReferences}
                      onChange={(e) => setUseReferences(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-10 h-5 rounded-full bg-border peer-checked:bg-teal transition-colors" />
                    <div className="absolute left-0.5 top-0.5 w-4 h-4 rounded-full bg-white shadow peer-checked:translate-x-5 transition-transform" />
                  </div>
                  <div className="flex items-center gap-2">
                    <BookOpen size={16} className={useReferences ? 'text-teal' : 'text-muted'} />
                    <div>
                      <span className="text-sm font-medium text-navy">Références pédagogiques</span>
                      <p className="text-xs text-muted">Inclure le programme officiel et vos fichiers de référence</p>
                    </div>
                  </div>
                </label>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Local Model Switch */}
        {metadata && !result && (
          <Card>
            <CardHeader>
              <h2 className="font-display font-semibold text-navy">
                Configuration du Modèle
              </h2>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-col gap-2 p-3 rounded-lg bg-navy-light/5 border border-border">
                <label className="flex items-center gap-3 cursor-pointer">
                  <div className="relative">
                    <input
                      type="checkbox"
                      checked={useLocalModel}
                      onChange={(e) => {
                        setUseLocalModel(e.target.checked);
                        localStorage.setItem('pedagogen_use_local_model', String(e.target.checked));
                      }}
                      className="sr-only peer"
                    />
                    <div className="w-10 h-5 rounded-full bg-border peer-checked:bg-teal transition-colors" />
                    <div className="absolute left-0.5 top-0.5 w-4 h-4 rounded-full bg-white shadow peer-checked:translate-x-5 transition-transform" />
                  </div>
                  <div>
                    <span className="text-sm font-medium text-navy">Utiliser le modèle local (LM Studio)</span>
                    <p className="text-xs text-muted">Exécuter la génération sur http://localhost:1234/api/v1/chat</p>
                  </div>
                </label>
                
                {useLocalModel && (
                  <div className="mt-2">
                    <label className="text-xs font-medium text-navy mb-1 block">Nom du modèle local</label>
                    <input
                      type="text"
                      value={localModelName}
                      onChange={(e) => {
                        setLocalModelName(e.target.value);
                        localStorage.setItem('pedagogen_local_model_name', e.target.value);
                      }}
                      placeholder="google/gemma-4-e2b"
                      className="w-full px-3 py-1.5 text-sm rounded-lg border border-border bg-white text-navy focus:outline-none focus:ring-2 focus:ring-teal/30 focus:border-teal"
                    />
                  </div>
                )}
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
            className="btn-gradient w-full"
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
          <GenerationProgress
            mode={mode}
            activeStep={activeStep}
            stepStatus={stepStatus}
            stepStatuses={stepStatuses}
            tokens={tokens}
          />
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
