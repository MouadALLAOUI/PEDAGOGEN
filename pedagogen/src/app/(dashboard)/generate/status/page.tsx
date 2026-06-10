'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { ArrowLeft, Loader2, Play, Square, Check, X, AlertTriangle, Clock } from 'lucide-react';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { PageTransition } from '@/components/layout/PageTransition';
import { OutputPreview } from '@/components/generate/OutputPreview';
import type { GenerationResult } from '@/types/generation';

function StatusContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const id = searchParams.get('id');

  const [activeStep, setActiveStep] = useState<string | undefined>('init');
  const [stepStatuses, setStepStatuses] = useState<Record<string, { status: 'pending' | 'active' | 'done' | 'error'; label: string; error?: string }>>({
    init: { status: 'active', label: 'Initialisation...' },
    references: { status: 'pending', label: 'Chargement des références...' },
    docs: { status: 'pending', label: 'Analyse des documents...' },
    build: { status: 'pending', label: 'Compilation des documents...' }
  });
  const [result, setResult] = useState<GenerationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tokens, setTokens] = useState<number>(0);
  const [elapsedTime, setElapsedTime] = useState<number>(0);
  const [isStopping, setIsStopping] = useState<boolean>(false);
  const [isCompleted, setIsCompleted] = useState<boolean>(false);
  const [activeGenerations, setActiveGenerations] = useState<any[]>([]);
  const [loadingActive, setLoadingActive] = useState<boolean>(true);

  // Fetch active list if no id
  useEffect(() => {
    if (id) return;
    const fetchActive = async () => {
      try {
        const res = await fetch('/api/generate/active');
        if (res.ok) {
          const data = await res.json();
          setActiveGenerations(data.activeGenerations || []);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoadingActive(false);
      }
    };
    fetchActive();
    const interval = setInterval(fetchActive, 4000);
    return () => clearInterval(interval);
  }, [id]);

  // Timer
  useEffect(() => {
    if (!id || isCompleted || error) return;
    const interval = setInterval(() => {
      setElapsedTime((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [id, isCompleted, error]);

  // Connect to SSE stream
  useEffect(() => {
    if (!id || isCompleted || result || error) return;

    let eventSource: EventSource;

    try {
      eventSource = new EventSource(`/api/generate/stream?id=${id}`);

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          if (data.type === 'progress') {
            setActiveStep(data.step);
            const status = data.status || 'active';
            
            setStepStatuses((prev) => {
              const current = prev[data.step] || { label: data.label || data.step };
              return {
                ...prev,
                [data.step]: {
                  status,
                  label: data.label || current.label,
                  error: data.error
                }
              };
            });
          } else if (data.type === 'tokens') {
            setTokens(data.count);
          } else if (data.type === 'done') {
            setResult(data.result);
            setIsCompleted(true);
            toast.success('Génération terminée !');
            eventSource.close();
            
            // Sync with history
            fetch('/api/history', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(data.result),
            }).catch(() => {});
          } else if (data.type === 'error') {
            setError(data.message);
            setIsCompleted(true);
            toast.error(data.message);
            eventSource.close();
          }
        } catch (e) {
          console.error('Failed to parse SSE event', e);
        }
      };

      eventSource.onerror = (e) => {
        if (!isCompleted && !result && !error) {
          console.error('SSE connection lost, retrying...', e);
        }
      };
    } catch (e) {
      console.error('EventSource initialization error', e);
      setError('Impossible de se connecter au flux de génération.');
    }

    return () => {
      if (eventSource) {
        eventSource.close();
      }
    };
  }, [id, isCompleted, result, error]);

  const handleStop = async () => {
    if (!id) return;
    setIsStopping(true);
    try {
      const response = await fetch(`/api/generate/cancel?id=${id}`, {
        method: 'POST',
      });
      if (!response.ok) {
        throw new Error('Impossible d\'arrêter la génération.');
      }
      toast.success('Génération arrêtée.');
      setError('Génération arrêtée par l\'utilisateur.');
      setIsCompleted(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur lors de l\'arrêt');
    } finally {
      setIsStopping(false);
    }
  };

  if (!id) {
    return (
      <PageTransition>
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="font-display text-2xl font-bold text-navy">
                Générations en Arrière-plan
              </h1>
              <p className="text-sm text-muted mt-0.5">Suivi et gestion des tâches de génération actives</p>
            </div>
            <Button onClick={() => router.push('/generate')} variant="secondary">
              Nouvelle Génération
            </Button>
          </div>

          {loadingActive ? (
            <div className="flex justify-center py-12">
              <Loader2 size={32} className="animate-spin text-teal" />
            </div>
          ) : activeGenerations.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center space-y-4">
                <p className="text-muted">Aucune génération active en cours.</p>
                <Button onClick={() => router.push('/generate')}>
                  Lancer une génération
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {activeGenerations.map((gen) => (
                <Card key={gen.id} className="border-teal/20">
                  <CardContent className="py-4 flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-navy">
                          {gen.metadata?.lecon || 'Génération'}
                        </span>
                        <span className="text-xs px-2 py-0.5 bg-navy-light/10 rounded uppercase font-bold text-muted">
                          {gen.mode}
                        </span>
                      </div>
                      <p className="text-xs text-muted mt-1">
                        ID: {gen.id} • {gen.metadata?.matiere} ({gen.metadata?.niveau})
                      </p>
                    </div>

                    <div className="flex gap-2">
                      <Button onClick={() => router.push(`/generate/status?id=${gen.id}`)} size="sm">
                        Suivre
                      </Button>
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={async () => {
                          try {
                            const res = await fetch(`/api/generate/cancel?id=${gen.id}`, { method: 'POST' });
                            if (res.ok) {
                              toast.success('Génération arrêtée.');
                              const activeRes = await fetch('/api/generate/active');
                              if (activeRes.ok) {
                                const activeData = await activeRes.json();
                                setActiveGenerations(activeData.activeGenerations || []);
                              }
                            }
                          } catch (err) {
                            toast.error('Erreur lors de l\'arrêt');
                          }
                        }}
                      >
                        <Square size={12} className="mr-1" /> Arrêter
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/generate"
              className="p-2 rounded-lg hover:bg-navy-light/5 text-muted hover:text-navy transition-colors"
            >
              <ArrowLeft size={20} />
            </Link>
            <div>
              <h1 className="font-display text-2xl font-bold text-navy">
                Suivi de la Génération
              </h1>
              <p className="text-sm text-muted mt-0.5">ID: {id}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-sm text-muted bg-navy-light/5 px-3 py-1.5 rounded-lg border border-border">
            <Clock size={16} className="text-teal" />
            <span>Temps écoulé : {elapsedTime}s</span>
          </div>
        </div>

        {/* Live status */}
        {!result && !error && (
          <Card className="overflow-hidden border-teal/20">
            <CardHeader className="bg-navy text-parchment py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Loader2 size={18} className="animate-spin text-teal-light" />
                  <span className="font-medium">Génération en cours...</span>
                </div>
                {tokens > 0 && (
                  <span className="text-xs bg-white/10 px-2 py-0.5 rounded">
                    {tokens} tokens
                  </span>
                )}
              </div>
            </CardHeader>
            <CardContent className="py-6 space-y-6">
              {/* Progress Tracker Checklist */}
              <div className="space-y-4">
                {Object.entries(stepStatuses).map(([key, item]) => {
                  const isActive = item.status === 'active';
                  const isDone = item.status === 'done';
                  const isError = item.status === 'error';

                  return (
                    <div
                      key={key}
                      className={`flex items-center justify-between p-3 rounded-lg border transition-all ${
                        isActive
                          ? 'border-teal/30 bg-teal/5 shadow-sm'
                          : isDone
                          ? 'border-green/20 bg-green/5 opacity-80'
                          : isError
                          ? 'border-red/20 bg-red/5'
                          : 'border-border bg-white/40 opacity-50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
                            isActive
                              ? 'bg-teal text-white'
                              : isDone
                              ? 'bg-green text-white'
                              : isError
                              ? 'bg-red text-white'
                              : 'bg-navy-light/10 text-navy'
                          }`}
                        >
                          {isDone ? (
                            <Check size={14} />
                          ) : isError ? (
                            <X size={14} />
                          ) : isActive ? (
                            <Loader2 size={14} className="animate-spin" />
                          ) : (
                            <span className="text-xs font-semibold">•</span>
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-navy">{item.label}</p>
                          {item.error && (
                            <p className="text-xs text-red mt-0.5">{item.error}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Stop Button */}
              <div className="flex justify-end border-t border-border pt-4">
                <Button
                  onClick={handleStop}
                  disabled={isStopping}
                  variant="danger"
                  className="flex items-center gap-2"
                >
                  {isStopping ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <Square size={16} />
                  )}
                  Arrêter la Génération
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Error State */}
        {error && (
          <Card className="border-red/20 bg-red/5">
            <CardContent className="py-6 space-y-4">
              <div className="flex items-center gap-3 text-red">
                <AlertTriangle size={24} />
                <h3 className="font-semibold text-lg">Échec de la Génération</h3>
              </div>
              <p className="text-sm text-navy">{error}</p>
              <div className="flex gap-3">
                <Button onClick={() => router.push('/generate')}>
                  <Play size={16} className="mr-2" /> Réessayer
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Result Preview State */}
        {result && (
          <OutputPreview
            result={result}
            onReset={() => {
              router.push('/generate');
            }}
          />
        )}
      </div>
    </PageTransition>
  );
}

export default function StatusPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 size={36} className="animate-spin text-teal" />
      </div>
    }>
      <StatusContent />
    </Suspense>
  );
}
