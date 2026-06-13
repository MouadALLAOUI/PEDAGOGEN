'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { useState, useEffect, useMemo, Suspense } from 'react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { ArrowLeft, Loader2, Play, Square, Check, X, AlertTriangle, Clock, Activity, Brain, FileCode, ChevronDown, ChevronRight } from 'lucide-react';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { PageTransition } from '@/components/layout/PageTransition';
import { OutputPreview } from '@/components/generate/OutputPreview';
import type { GenerationResult } from '@/types/generation';

const FORMAT_LABELS: Record<string, string> = {
  pdf: 'PDF',
  docx: 'DOCX',
  pptx: 'PPTX',
  html: 'HTML',
  md: 'MD',
  png: 'PNG',
  zip: 'ZIP',
};

const FORMAT_COLORS: Record<string, string> = {
  pdf: 'bg-red/10 text-red',
  docx: 'bg-blue-100 text-blue-700',
  pptx: 'bg-orange-100 text-orange-700',
  html: 'bg-purple-100 text-purple-700',
  md: 'bg-teal/10 text-teal',
  png: 'bg-green/10 text-green',
};

function StatusContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const id = searchParams.get('id');

  const [steps, setSteps] = useState<Record<string, { status: string; label: string; error?: string }>>({});
  const [reasoningSteps, setReasoningSteps] = useState<{ step: string; label: string }[]>([]);
  const [buildSteps, setBuildSteps] = useState<{ step: string; label: string; format?: string; status: string }[]>([]);
  const [result, setResult] = useState<GenerationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tokens, setTokens] = useState<number>(0);
  const [elapsedTime, setElapsedTime] = useState<number>(0);
  const [isStopping, setIsStopping] = useState<boolean>(false);
  const [isCompleted, setIsCompleted] = useState<boolean>(false);
  const [reasoningOpen, setReasoningOpen] = useState(true);
  const [activeGenerations, setActiveGenerations] = useState<any[]>([]);
  const [loadingActive, setLoadingActive] = useState<boolean>(true);

  const orderedSteps = useMemo(() => {
    const order = ['init', 'references', 'docs', 'fiche', 'planification', 'cours', 'gestion', 'evaluation', 'resume', 'pptx', 'images', 'build'];
    return Object.entries(steps)
      .filter(([id]) => id !== 'build')
      .sort(([a], [b]) => order.indexOf(a) - order.indexOf(b));
  }, [steps]);

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

  // Request notification permission on mount
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {});
    }
  }, []);

  const notify = (title: string, body: string) => {
    if ('Notification' in window && Notification.permission === 'granted' && document.hidden) {
      try { new Notification(title, { body, icon: '/favicon.ico' }); } catch {}
    }
  };

  // Timer
  useEffect(() => {
    if (!id || isCompleted || error) return;
    const interval = setInterval(() => {
      setElapsedTime((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [id, isCompleted, error]);

  // Connect to progress SSE
  useEffect(() => {
    if (!id || isCompleted || result || error) return;

    let eventSource: EventSource;
    let reconnectTimer: ReturnType<typeof setTimeout>;

    const connect = () => {
      try {
        eventSource = new EventSource(`/api/generate/progress/${id}`);

        eventSource.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);

            if (data.type === 'progress' && data.step) {
              setSteps((prev) => ({
                ...prev,
                [data.step]: {
                  status: data.status || 'active',
                  label: data.label || data.step,
                  error: data.error,
                },
              }));
              if (data.status === 'active') {
                setReasoningSteps((prev) => {
                  const existing = prev.find(s => s.step === data.step);
                  if (existing) return prev;
                  return [...prev, { step: data.step, label: data.label || data.step }];
                });
              }
            } else if (data.type === 'reasoning' && data.step) {
              setReasoningSteps((prev) => {
                const existing = prev.find(s => s.step === data.step);
                if (existing) return prev;
                return [...prev, { step: data.step, label: data.label || 'Analyse...' }];
              });
            } else if (data.type === 'build') {
              setBuildSteps((prev) => {
                if (data.status === 'active') {
                  return [...prev, { step: data.step, label: data.label, format: data.format, status: 'active' }];
                }
                return prev.map(s =>
                  s.step === data.step && s.label === data.label
                    ? { ...s, status: data.status }
                    : s
                );
              });
            } else if (data.type === 'tokens') {
              setTokens(data.count || 0);
            } else if (data.type === 'done') {
              setResult(data.result);
              setIsCompleted(true);
              toast.success('Génération terminée !');
              notify('PEDAGOGEN', 'Vos documents pédagogiques sont prêts !');
              eventSource.close();
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

        eventSource.onerror = () => {
          if (!isCompleted && !result && !error) {
            reconnectTimer = setTimeout(connect, 3000);
          }
        };
      } catch (e) {
        console.error('EventSource initialization error', e);
        setError('Impossible de se connecter au flux de génération.');
      }
    };

    connect();

    return () => {
      if (eventSource) eventSource.close();
      clearTimeout(reconnectTimer);
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
                        <span className="text-xs px-2 py-0.5 bg-parchment-dark rounded uppercase font-bold text-muted">
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
      <div className="max-w-5xl mx-auto space-y-6">

        {/* Header */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-teal via-teal-dark to-navy p-6 lg:p-8 text-white">
          <div className="absolute top-0 right-0 w-72 h-72 bg-teal-light/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
          <div className="relative z-10 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                href="/generate"
                className="p-2 rounded-lg hover:bg-white/15 text-white/80 hover:text-white transition-colors"
              >
                <ArrowLeft size={20} />
              </Link>
              <div className="flex items-center gap-4">
                <div className="w-11 h-11 rounded-xl bg-white/15 backdrop-blur flex items-center justify-center shrink-0">
                  <Activity size={20} className="text-white" />
                </div>
                <div>
                  <h1 className="font-display text-2xl lg:text-3xl font-bold tracking-tight">Suivi de la Génération</h1>
                  <p className="text-white/60 text-sm mt-0.5">ID: {id}</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3 text-sm text-white/80 bg-white/10 px-4 py-2 rounded-lg border border-white/15">
              {tokens > 0 && <span className="text-teal-light font-mono">{tokens.toLocaleString()} tokens</span>}
              <Clock size={16} className="text-teal-light" />
              <span>{elapsedTime}s</span>
            </div>
          </div>
        </div>

        {/* Main content grid */}
        {!result && !error && (
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Progress column — 2/3 */}
            <div className="lg:col-span-2">
              <Card className="overflow-hidden border-teal/20">
                <CardHeader className="bg-navy text-parchment py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Loader2 size={18} className="animate-spin text-teal-light" />
                      <span className="font-medium">Génération en cours...</span>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="py-6 space-y-3">
                  {orderedSteps.map(([key, item]) => {
                    const isActive = item.status === 'active';
                    const isDone = item.status === 'done';
                    const isError = item.status === 'error';

                    const stepBuilds = buildSteps.filter(s => s.step === key);

                    return (
                      <div key={key}>
                        <div
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
                                  : 'bg-parchment-dark text-navy'
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

                        {/* Build sub-steps */}
                        {stepBuilds.length > 0 && (
                          <div className="ml-8 mt-1 space-y-1">
                            {stepBuilds.map((b, i) => (
                              <div key={i} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white border border-border/50">
                                <FileCode size={12} className={b.status === 'done' ? 'text-green' : 'text-teal animate-pulse'} />
                                <span className="text-xs text-muted flex-1">{b.label}</span>
                                {b.format && (
                                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${FORMAT_COLORS[b.format] || 'bg-parchment-dark text-muted'}`}>
                                    {FORMAT_LABELS[b.format] || b.format.toUpperCase()}
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {/* Stop Button */}
                  <div className="flex justify-end border-t border-border pt-4 mt-4">
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
            </div>

            {/* Reasoning aside — 1/3 */}
            <div className="lg:col-span-1">
              <Card className="border-amber/20 bg-amber/5 sticky top-6">
                <CardContent className="py-4 space-y-3">
                  <button
                    onClick={() => setReasoningOpen(!reasoningOpen)}
                    className="flex items-center gap-2 w-full text-left"
                  >
                    {reasoningOpen ? <ChevronDown size={14} className="text-amber" /> : <ChevronRight size={14} className="text-amber" />}
                    <Brain size={16} className="text-amber" />
                    <h3 className="text-xs font-bold uppercase tracking-wider text-amber">Raisonnement Pédagogique</h3>
                  </button>

                  {reasoningOpen && (
                    <div className="space-y-2 mt-2">
                      {reasoningSteps.length === 0 ? (
                        <p className="text-[11px] text-muted italic">Analyse pédagogique en cours...</p>
                      ) : (
                        reasoningSteps.map((rs, i) => {
                          const isActive = steps[rs.step]?.status === 'active';
                          const isDone = steps[rs.step]?.status === 'done';
                          return (
                            <div key={i} className="flex items-start gap-2 text-xs">
                              <div className={`mt-1 w-1.5 h-1.5 rounded-full shrink-0 ${isDone ? 'bg-green' : isActive ? 'bg-amber animate-pulse' : 'bg-muted'}`} />
                              <div>
                                <p className="text-navy font-medium">{rs.label.replace(/ — .*$/, '')}</p>
                                <p className="text-muted mt-0.5 leading-relaxed">
                                  {isDone
                                    ? 'Contenu généré avec succès, passage à la compilation...'
                                    : isActive
                                    ? 'Analyse des objectifs pédagogiques et structuration du contenu selon le programme officiel...'
                                    : 'En attente...'}
                                </p>
                              </div>
                            </div>
                          );
                        })
                      )}
                      {!isCompleted && reasoningSteps.length > 0 && (
                        <div className="flex items-center gap-2 pt-2 text-[11px] text-muted border-t border-amber/10">
                          <Loader2 size={10} className="animate-spin text-amber" />
                          Traitement en cours...
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
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

        {/* Debug Prompt (provider = aucun) */}
        {result && result.debugPrompt && (
          <Card className="border-amber/20 bg-amber/5">
            <CardHeader>
              <div className="flex items-center gap-2">
                <FileCode size={18} className="text-amber" />
                <h2 className="font-display font-semibold text-navy">Aperçu du Prompt (Mode Aucun)</h2>
              </div>
              <p className="text-xs text-muted mt-1">Aucun appel IA n&apos;a été effectué. Voici le prompt qui aurait été envoyé.</p>
            </CardHeader>
            <CardContent>
              <pre className="text-xs font-mono leading-relaxed whitespace-pre-wrap bg-navy text-parchment p-4 rounded-xl overflow-x-auto max-h-[70vh] overflow-y-auto">{result.debugPrompt}</pre>
            </CardContent>
          </Card>
        )}

        {/* Result Preview State */}
        {result && !result.debugPrompt && (
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
