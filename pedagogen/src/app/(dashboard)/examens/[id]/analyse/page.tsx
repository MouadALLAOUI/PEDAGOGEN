'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, BarChart3, Loader2, FileDown, FileText, AlertCircle, TrendingUp, Award, Users, BookOpen } from 'lucide-react';
import toast from 'react-hot-toast';
import { PageTransition } from '@/components/layout/PageTransition';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Card, CardContent } from '@/components/ui/Card';

interface Question { id: string; numero: number; type: string; enonce: string; bareme: number }
interface QuestionStat { numero: number; type: string; enonce: string; bareme: number; moyenne: number | null; tauxEchec: number | null }
interface StudentRow {
  id: string; nom: string; prenom: string; classe_nom: string;
  total: number | null; norm20: number | null;
  profil: 'en_difficulte' | 'dans_la_moyenne' | 'en_avance' | 'non_note';
}
interface Analyse {
  exam: { id: string; titre: string; exam_date: string; niveau: string; duree: number; total_points: number };
  questions: Question[];
  students: StudentRow[];
  moyenne20: number | null;
  tauxReussite: number | null;
  histogram: { bucket: string; count: number }[];
  questionStats: QuestionStat[];
  profils: { en_difficulte: number; dans_la_moyenne: number; en_avance: number; non_note: number };
}

const HISTO_COLORS = ['bg-red', 'bg-amber', 'bg-green', 'bg-teal'];
const PROFIL_META = {
  en_difficulte: { label: 'En difficulté (< 10/20)', variant: 'red' as const, icon: AlertCircle },
  dans_la_moyenne: { label: 'Dans la moyenne (10–14,99)', variant: 'gold' as const, icon: TrendingUp },
  en_avance: { label: 'En avance (≥ 15/20)', variant: 'green' as const, icon: Award },
};

export default function AnalysePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [analyse, setAnalyse] = useState<Analyse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/examens/${id}/analyse`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        setAnalyse(data);
      })
      .catch((e) => toast.error(e.message || 'Échec du chargement'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <PageTransition>
        <div className="flex items-center justify-center py-20"><Loader2 size={24} className="animate-spin text-teal" /></div>
      </PageTransition>
    );
  }

  if (!analyse) {
    return (
      <PageTransition>
        <div className="max-w-5xl mx-auto py-20 text-center">
          <p className="text-muted">Analyse indisponible.</p>
          <Button variant="ghost" size="sm" className="mt-2" onClick={() => router.push('/examens')}>← Retour</Button>
        </div>
      </PageTransition>
    );
  }

  const maxCount = Math.max(1, ...analyse.histogram.map((h) => h.count));
  const sorted = [...analyse.students].sort((a, b) => (b.norm20 ?? -1) - (a.norm20 ?? -1));

  return (
    <PageTransition>
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-teal via-teal-dark to-navy p-6 lg:p-8 text-white">
          <div className="absolute top-0 right-0 w-56 h-56 bg-teal-light/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
          <div className="relative z-10">
            <button onClick={() => router.push('/examens')} className="flex items-center gap-1.5 text-white/60 text-xs mb-3 hover:text-white transition-colors">
              <ArrowLeft size={13} />Retour aux examens
            </button>
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-11 h-11 rounded-xl bg-white/15 backdrop-blur flex items-center justify-center shrink-0">
                  <BarChart3 size={20} />
                </div>
                <div>
                  <h1 className="font-display text-2xl font-bold tracking-tight">Analyse de Classe</h1>
                  <p className="text-white/60 text-sm mt-0.5">{analyse.exam.titre} — {analyse.exam.niveau} — {analyse.exam.exam_date}</p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-white hover:bg-white/15 border border-white/20 h-9 text-xs"
                  onClick={() => router.push(`/examens/${id}/grille`)}
                  title="Consulter le Guide du Professeur et le corrigé"
                >
                  <BookOpen size={13} className="mr-1.5" />
                  Guide du Professeur
                </Button>
                <a href={`/api/examens/${id}/guide/export`} className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg bg-white/15 text-white text-xs font-medium hover:bg-white/25 transition-colors" title="Guide du professeur & corrigé PDF">
                  <FileText size={13} />Guide PDF
                </a>
                <a href={`/api/examens/${id}/sujet/export`} className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg bg-white/15 text-white text-xs font-medium hover:bg-white/25 transition-colors" title="Sujet imprimable pour les élèves">
                  <FileText size={13} />Sujet élève PDF
                </a>
                <a href={`/api/examens/${id}/analyse/export`} className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg bg-white/15 text-white text-xs font-medium hover:bg-white/25 transition-colors">
                  <FileDown size={13} />Rapport PDF
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Indicators */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card><CardContent className="p-5 pt-5 text-center">
            <p className="text-3xl font-display font-bold text-teal">{analyse.moyenne20 ?? '—'}</p>
            <p className="text-xs text-muted mt-1">Indice de la classe (/20)</p>
          </CardContent></Card>
          <Card><CardContent className="p-5 pt-5 text-center">
            <p className="text-3xl font-display font-bold text-green">{analyse.tauxReussite ?? '—'}%</p>
            <p className="text-xs text-muted mt-1">Taux de réussite</p>
          </CardContent></Card>
          <Card><CardContent className="p-5 pt-5 text-center">
            <p className="text-3xl font-display font-bold text-navy">{analyse.students.filter((s) => s.norm20 !== null).length}/{analyse.students.length}</p>
            <p className="text-xs text-muted mt-1">Élèves notés</p>
          </CardContent></Card>
          <Card><CardContent className="p-5 pt-5 text-center">
            <p className="text-3xl font-display font-bold text-navy">{analyse.exam.total_points}</p>
            <p className="text-xs text-muted mt-1">Points au total</p>
          </CardContent></Card>
        </div>

        {/* Histogram + profils */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card>
            <CardContent className="p-6 pt-6">
              <h3 className="font-display text-lg font-semibold text-navy mb-4">Distribution des notes (/20)</h3>
              <div className="flex items-end justify-around h-40">
                {analyse.histogram.map((h, i) => (
                  <div key={h.bucket} className="flex flex-col items-center gap-1 w-16">
                    <span className="text-xs font-bold text-navy">{h.count}</span>
                    <div
                      className={`w-full rounded-t-md ${HISTO_COLORS[i]} transition-all`}
                      style={{ height: `${Math.max(2, (h.count / maxCount) * 100)}%` }}
                    />
                    <span className="text-[10px] text-muted">{h.bucket}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6 pt-6">
              <h3 className="font-display text-lg font-semibold text-navy mb-4">Profils des élèves</h3>
              <div className="space-y-3">
                {(Object.keys(PROFIL_META) as Array<keyof typeof PROFIL_META>).map((key) => {
                  const meta = PROFIL_META[key];
                  const Icon = meta.icon;
                  const count = analyse.profils[key];
                  return (
                    <div key={key} className="flex items-center justify-between bg-parchment-dark/40 rounded-lg px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Icon size={15} className={key === 'en_difficulte' ? 'text-red' : key === 'dans_la_moyenne' ? 'text-amber' : 'text-green'} />
                        <span className="text-sm text-navy">{meta.label}</span>
                      </div>
                      <Badge variant={meta.variant}>{count}</Badge>
                    </div>
                  );
                })}
                <div className="flex items-center justify-between bg-parchment-dark/40 rounded-lg px-4 py-3">
                  <div className="flex items-center gap-2"><Users size={15} className="text-muted" /><span className="text-sm text-navy">Non notés</span></div>
                  <Badge variant="muted">{analyse.profils.non_note}</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Question failure rates */}
        {analyse.questionStats.length > 0 && (
          <Card>
            <CardContent className="p-6 pt-6">
              <h3 className="font-display text-lg font-semibold text-navy mb-4">Taux d'échec par question</h3>
              <div className="space-y-2.5">
                {analyse.questionStats.map((q) => (
                  <div key={q.numero} className="flex items-center gap-3">
                    <span className="text-xs font-bold text-navy w-12 shrink-0">Q{q.numero}</span>
                    <span className="text-xs text-muted flex-1 truncate">{q.enonce || q.type} <span className="opacity-60">(/ {q.bareme})</span></span>
                    <div className="w-40 h-2 bg-parchment-dark rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${q.tauxEchec !== null && q.tauxEchec > 50 ? 'bg-red' : q.tauxEchec !== null && q.tauxEchec > 25 ? 'bg-amber' : 'bg-green'}`}
                        style={{ width: `${q.tauxEchec ?? 0}%` }}
                      />
                    </div>
                    <span className="text-xs font-medium text-navy w-20 text-right">
                      {q.tauxEchec ?? '—'}% <span className="text-muted font-normal">· moy {q.moyenne ?? '—'}</span>
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Student ranking */}
        <Card>
          <CardContent className="p-6 pt-6">
            <h3 className="font-display text-lg font-semibold text-navy mb-4">Détail par élève</h3>
            <div className="rounded-xl border border-border overflow-hidden">
              <div className="grid grid-cols-[1fr_110px_90px_80px] gap-3 px-4 py-2.5 border-b border-border text-xs font-medium text-muted bg-parchment-dark/50">
                <span>Élève</span><span>Classe</span><span className="text-center">Note /20</span><span className="text-right">Profil</span>
              </div>
              {sorted.map((s) => (
                <div key={s.id} className="grid grid-cols-[1fr_110px_90px_80px] gap-3 px-4 py-2.5 items-center border-b border-border/50 last:border-0 text-xs">
                  <span className="font-medium text-navy truncate">{s.nom} {s.prenom}</span>
                  <span className="text-muted truncate">{s.classe_nom}</span>
                  <span className={`text-center font-bold ${
                    s.norm20 === null ? 'text-muted' : s.norm20 < 5 ? 'text-red' : s.norm20 < 10 ? 'text-amber' : 'text-green'
                  }`}>{s.norm20 ?? '—'}</span>
                  <div className="text-right">
                    <Badge variant={s.profil === 'non_note' ? 'muted' : s.profil === 'en_difficulte' ? 'red' : s.profil === 'dans_la_moyenne' ? 'gold' : 'green'}>
                      {s.profil === 'non_note' ? 'non noté' : s.profil.replace(/_/g, ' ')}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </PageTransition>
  );
}
