'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { animate, stagger } from 'animejs';
import {
  FileText, Clock, BookOpen, FileCheck,
  Search, Sparkles, ArrowRight, Download, Eye, Plus,
  Presentation, Zap, Calendar, ClipboardCheck, AlertTriangle,
  GraduationCap, CheckCircle2, ChevronRight, NotebookPen, Users
} from 'lucide-react';
import { PageTransition } from '@/components/layout/PageTransition';
import { FavoritesPanel } from '@/components/layout/FavoritesPanel';
import type { GenerationMode } from '@/types/generation';

interface UpcomingSession {
  id: string;
  classe_id: string;
  classe_nom: string;
  classe_niveau: string;
  date: string;
  heure_debut: string;
  heure_fin: string;
  titre: string;
  resume?: string;
  statut: string;
}

interface PendingExam {
  id: string;
  titre: string;
  exam_date: string;
  niveau: string;
  graded_students: number;
  total_students: number;
  questions_count: number;
  isCompleted: boolean;
}

interface ClassPerformance {
  id: string;
  name: string;
  niveau: string;
  student_count: number;
  avg_grade: number | null;
  students_below_10: number;
  help_requests_count: number;
}

interface RecentDoc {
  id: string;
  title: string;
  mode: GenerationMode;
  created_at: string;
  tokens_used: number;
  files_count?: number;
}

interface DashboardStatsData {
  upcomingSessions: UpcomingSession[];
  pendingExams: PendingExam[];
  classes: ClassPerformance[];
  recentDocs: RecentDoc[];
  kpis: {
    totalStudents: number;
    totalClasses: number;
    totalNotebookSessions: number;
    totalGenerations: number;
    pendingExamsCount: number;
    upcomingSessionsCount: number;
  };
}

export default function Dashboard() {
  const cardsRef = useRef<HTMLDivElement>(null);
  const statsRef = useRef<HTMLDivElement>(null);
  const [search, setSearch] = useState('');
  const [data, setData] = useState<DashboardStatsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/dashboard/stats')
      .then((r) => r.json())
      .then((res) => {
        if (!res.error) {
          setData(res);
        }
      })
      .catch((err) => console.error('Failed to load dashboard stats:', err))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (cardsRef.current) {
      animate(cardsRef.current, {
        translateY: [20, 0],
        opacity: [0, 1],
        ease: 'outExpo',
        duration: 500,
      });
    }
    const statTargets = statsRef.current?.querySelectorAll('[data-stat]');
    if (statTargets?.length) {
      animate(statTargets, {
        scale: [0.94, 1],
        opacity: [0, 1],
        delay: stagger(60),
        ease: 'outQuad',
        duration: 350,
      });
    }
  }, [loading]);

  const upcomingSessions = data?.upcomingSessions || [];
  const pendingExams = data?.pendingExams || [];
  const allClasses = data?.classes || [];
  const classesUnderAverage = allClasses.filter((c) => c.avg_grade !== null && c.avg_grade < 10);
  const recentDocs = data?.recentDocs || [];

  return (
    <PageTransition>
      <div className="max-w-6xl mx-auto space-y-7 pb-12">

        {/* ─── HERO ─── */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-teal via-teal-dark to-navy p-6 lg:p-8 text-white shadow-sm">
          <div className="absolute top-0 right-0 w-72 h-72 bg-teal-light/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-gold/10 rounded-full blur-2xl translate-y-1/2 -translate-x-1/4 pointer-events-none" />

          <div className="relative z-10 flex flex-col md:flex-row md:items-start justify-between gap-6">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-xl bg-white/15 backdrop-blur flex items-center justify-center shadow-inner">
                  <Sparkles size={20} className="text-white" />
                </div>
                <div>
                  <h1 className="font-display text-2xl lg:text-3xl font-bold tracking-tight">PEDAGOGEN</h1>
                  <p className="text-white/70 text-xs">Tableau de Bord Enseignant Centralisé · Cycle Collégial</p>
                </div>
              </div>
              <p className="text-white/90 text-base lg:text-lg mt-3 max-w-xl leading-relaxed">
                Bienvenue dans votre espace pédagogique.<br />
                <span className="text-white font-semibold">Suivi des séances, évaluations, progression et préparations.</span>
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 shrink-0">
              <Link
                href="/notebook"
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 backdrop-blur border border-white/20 text-white text-xs font-semibold hover:bg-white/20 transition-all"
              >
                <NotebookPen size={14} />
                Carnet de bord
              </Link>
              <Link
                href="/generate"
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gold/90 text-navy text-xs font-bold shadow hover:bg-gold transition-all"
              >
                <Plus size={15} />
                Nouveau document
              </Link>
            </div>
          </div>

          {/* Quick Filter Search */}
          <div className="relative mt-5 max-w-lg">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/50" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher une séance, une classe, un document..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/10 backdrop-blur border border-white/20 text-sm text-white placeholder:text-white/50 focus:outline-none focus:border-white/40 focus:bg-white/15 transition-all"
            />
          </div>
        </div>

        {/* ─── 4 UNIFIED KPI CARDS ─── */}
        <div ref={statsRef} className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
          {/* 1. Prochaines séances */}
          <Link href="/notebook" data-stat className="block">
            <div className="rounded-xl border border-teal/20 bg-teal/5 p-4 hover:border-teal/40 hover:shadow-sm transition-all h-full">
              <div className="flex items-center justify-between mb-2">
                <div className="w-8 h-8 rounded-lg bg-teal/15 flex items-center justify-center text-teal">
                  <Calendar size={16} />
                </div>
                <span className="text-[11px] font-medium text-teal flex items-center gap-1">
                  Carnet <ChevronRight size={12} />
                </span>
              </div>
              <p className="text-2xl font-bold text-navy tracking-tight">
                {data ? data.kpis.upcomingSessionsCount : '—'}
              </p>
              <p className="text-xs text-muted font-medium mt-0.5">Séances planifiées</p>
            </div>
          </Link>

          {/* 2. Grilles d'évaluation en attente */}
          <Link href="/examens" data-stat className="block">
            <div className={`rounded-xl border p-4 hover:shadow-sm transition-all h-full ${
              pendingExams.length > 0
                ? 'border-amber/30 bg-amber/5 hover:border-amber/50'
                : 'border-green/20 bg-green/5 hover:border-green/40'
            }`}>
              <div className="flex items-center justify-between mb-2">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                  pendingExams.length > 0 ? 'bg-amber/15 text-amber' : 'bg-green/15 text-green'
                }`}>
                  <ClipboardCheck size={16} />
                </div>
                <span className={`text-[11px] font-medium flex items-center gap-1 ${
                  pendingExams.length > 0 ? 'text-amber' : 'text-green'
                }`}>
                  Grilles <ChevronRight size={12} />
                </span>
              </div>
              <p className="text-2xl font-bold text-navy tracking-tight">
                {data ? data.kpis.pendingExamsCount : '—'}
              </p>
              <p className="text-xs text-muted font-medium mt-0.5">Grilles à compléter</p>
            </div>
          </Link>

          {/* 3. Classes sous la moyenne */}
          <Link href="/students" data-stat className="block">
            <div className={`rounded-xl border p-4 hover:shadow-sm transition-all h-full ${
              classesUnderAverage.length > 0
                ? 'border-red-200 bg-red-50/50 hover:border-red-300'
                : 'border-teal/20 bg-teal/5 hover:border-teal/40'
            }`}>
              <div className="flex items-center justify-between mb-2">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                  classesUnderAverage.length > 0 ? 'bg-red-100 text-red-600' : 'bg-teal/15 text-teal'
                }`}>
                  {classesUnderAverage.length > 0 ? <AlertTriangle size={16} /> : <GraduationCap size={16} />}
                </div>
                <span className={`text-[11px] font-medium flex items-center gap-1 ${
                  classesUnderAverage.length > 0 ? 'text-red-600 font-semibold' : 'text-teal'
                }`}>
                  Suivi <ChevronRight size={12} />
                </span>
              </div>
              <p className="text-2xl font-bold text-navy tracking-tight">
                {data ? classesUnderAverage.length : '—'}
              </p>
              <p className="text-xs text-muted font-medium mt-0.5">
                {classesUnderAverage.length > 0 ? 'Classes < 10/20' : 'Classes au-dessus de 10'}
              </p>
            </div>
          </Link>

          {/* 4. Documents générés */}
          <Link href="/history" data-stat className="block">
            <div className="rounded-xl border border-navy/10 bg-navy/5 p-4 hover:border-navy/25 hover:shadow-sm transition-all h-full">
              <div className="flex items-center justify-between mb-2">
                <div className="w-8 h-8 rounded-lg bg-navy/10 flex items-center justify-center text-navy">
                  <FileCheck size={16} />
                </div>
                <span className="text-[11px] font-medium text-navy flex items-center gap-1">
                  Archives <ChevronRight size={12} />
                </span>
              </div>
              <p className="text-2xl font-bold text-navy tracking-tight">
                {data ? data.kpis.totalGenerations : '—'}
              </p>
              <p className="text-xs text-muted font-medium mt-0.5">Fiches & documents</p>
            </div>
          </Link>
        </div>

        {/* ─── QUICK BANNER FOR FAST GENERATION ─── */}
        <div ref={cardsRef}>
          <Link href="/generate">
            <div className="group relative overflow-hidden rounded-xl border border-teal/25 bg-white p-5 flex items-center justify-between shadow-xs hover:border-teal/50 hover:shadow-md transition-all">
              <div className="flex items-center gap-4 min-w-0">
                <div className="w-11 h-11 rounded-xl bg-teal/10 flex items-center justify-center text-teal shrink-0 group-hover:scale-105 transition-transform">
                  <Sparkles size={20} />
                </div>
                <div>
                  <h3 className="font-display text-base font-bold text-navy">Générer une nouvelle préparation</h3>
                  <p className="text-xs text-muted line-clamp-1">
                    Fiche pédagogique, déroulement didactique, grille d&apos;évaluation et diapositives conformes MEN marocain.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 text-xs font-semibold text-teal shrink-0 ml-4">
                Lancer <ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
              </div>
            </div>
          </Link>
        </div>

        {/* ─── CORE TWO COLUMNS ─── */}
        <div className="grid lg:grid-cols-2 gap-6">

          {/* ── COL 1: SEANCES PLANIFIEES + EXAMENS EN ATTENTE ── */}
          <div className="space-y-6">

            {/* 1. Prochaines séances planifiées */}
            <div className="rounded-xl border border-border bg-white shadow-xs overflow-hidden">
              <div className="flex items-center justify-between px-5 py-3.5 border-b border-border/80 bg-parchment/40">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-teal/10 text-teal flex items-center justify-center">
                    <Calendar size={15} />
                  </div>
                  <h2 className="font-display text-sm font-bold text-navy">Prochaines Séances Planifiées</h2>
                </div>
                <Link
                  href="/notebook"
                  className="text-xs text-teal hover:text-teal-dark font-medium flex items-center gap-1 transition-colors"
                >
                  Ouvrir carnet <ChevronRight size={13} />
                </Link>
              </div>

              <div className="divide-y divide-border/60">
                {upcomingSessions.length === 0 ? (
                  <div className="p-7 text-center">
                    <Calendar size={28} className="text-muted/40 mx-auto mb-2" />
                    <p className="text-sm font-medium text-navy">Aucune séance planifiée à venir</p>
                    <p className="text-xs text-muted mt-1">Rendez-vous dans le carnet de bord pour planifier vos cours.</p>
                    <Link
                      href="/notebook"
                      className="inline-flex items-center gap-1.5 mt-3 text-xs font-semibold text-teal hover:underline"
                    >
                      <Plus size={13} /> Ajouter une entrée
                    </Link>
                  </div>
                ) : (
                  upcomingSessions.map((s) => (
                    <div key={s.id} className="p-4 hover:bg-parchment/30 transition-colors flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-teal/10 text-teal border border-teal/20">
                            {s.classe_nom} ({s.classe_niveau})
                          </span>
                          <span className="text-xs text-muted flex items-center gap-1">
                            <Clock size={11} /> {s.date} · {s.heure_debut} - {s.heure_fin}
                          </span>
                        </div>
                        <h4 className="text-sm font-semibold text-navy truncate">{s.titre}</h4>
                        {s.resume && (
                          <p className="text-xs text-muted line-clamp-1 mt-0.5">{s.resume}</p>
                        )}
                      </div>
                      <Link
                        href={`/notebook?date=${s.date}`}
                        className="p-1.5 rounded-lg border border-border text-muted hover:text-teal hover:border-teal/30 hover:bg-teal-50 transition-all shrink-0"
                        title="Consulter dans le carnet"
                      >
                        <ChevronRight size={15} />
                      </Link>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* 2. Examens sans grille complétée */}
            <div className="rounded-xl border border-border bg-white shadow-xs overflow-hidden">
              <div className="flex items-center justify-between px-5 py-3.5 border-b border-border/80 bg-parchment/40">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-amber/15 text-amber flex items-center justify-center">
                    <ClipboardCheck size={15} />
                  </div>
                  <div>
                    <h2 className="font-display text-sm font-bold text-navy">Examens & Grilles en Attente</h2>
                  </div>
                </div>
                <Link
                  href="/examens"
                  className="text-xs text-teal hover:text-teal-dark font-medium flex items-center gap-1 transition-colors"
                >
                  Tous les examens <ChevronRight size={13} />
                </Link>
              </div>

              <div className="divide-y divide-border/60">
                {pendingExams.length === 0 ? (
                  <div className="p-7 text-center">
                    <CheckCircle2 size={28} className="text-green/60 mx-auto mb-2" />
                    <p className="text-sm font-medium text-navy">Toutes les grilles d&apos;examens sont à jour</p>
                    <p className="text-xs text-muted mt-1">Tous les élèves évalués disposent d&apos;une saisie complète.</p>
                  </div>
                ) : (
                  pendingExams.map((ex) => (
                    <div key={ex.id} className="p-4 hover:bg-parchment/30 transition-colors flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-navy/5 text-navy border border-navy/10">
                            {ex.niveau}
                          </span>
                          <span className="text-xs text-muted">
                            {ex.exam_date || 'Date non définie'}
                          </span>
                        </div>
                        <h4 className="text-sm font-semibold text-navy truncate">{ex.titre}</h4>
                        <div className="flex items-center gap-3 mt-1.5 text-xs text-muted">
                          <span>
                            Notés : <strong className="text-navy">{ex.graded_students}</strong> / {ex.total_students || '?'}
                          </span>
                          <span>·</span>
                          <span>{ex.questions_count} questions</span>
                        </div>
                      </div>

                      <Link
                        href={`/examens?examId=${ex.id}`}
                        className="px-3 py-1.5 rounded-lg bg-teal text-white text-xs font-semibold hover:bg-teal-dark transition-all shrink-0 flex items-center gap-1 shadow-xs"
                      >
                        Compléter <ChevronRight size={12} />
                      </Link>
                    </div>
                  ))
                )}
              </div>
            </div>

          </div>

          {/* ── COL 2: CLASSES SOUS LA MOYENNE + DOCUMENTS RECENTS ── */}
          <div className="space-y-6">

            {/* 3. Classes sous la moyenne & Alertes */}
            <div className="rounded-xl border border-border bg-white shadow-xs overflow-hidden">
              <div className="flex items-center justify-between px-5 py-3.5 border-b border-border/80 bg-parchment/40">
                <div className="flex items-center gap-2.5">
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                    classesUnderAverage.length > 0 ? 'bg-red-100 text-red-600' : 'bg-teal/10 text-teal'
                  }`}>
                    {classesUnderAverage.length > 0 ? <AlertTriangle size={15} /> : <GraduationCap size={15} />}
                  </div>
                  <h2 className="font-display text-sm font-bold text-navy">Performance des Classes</h2>
                </div>
                <Link
                  href="/students"
                  className="text-xs text-teal hover:text-teal-dark font-medium flex items-center gap-1 transition-colors"
                >
                  Vue détaillée <ChevronRight size={13} />
                </Link>
              </div>

              <div className="p-4 space-y-3">
                {classesUnderAverage.length > 0 && (
                  <div className="p-3 rounded-lg bg-red-50/70 border border-red-200/80 flex items-start gap-2.5 text-xs text-red-800">
                    <AlertTriangle size={16} className="text-red-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold">{classesUnderAverage.length} classe(s) sous le seuil de 10/20</p>
                      <p className="text-red-700 mt-0.5">Nécessite des séances de remédiation ciblées.</p>
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  {allClasses.length === 0 ? (
                    <p className="text-xs text-muted text-center py-4">Aucune classe enregistrée.</p>
                  ) : (
                    allClasses.slice(0, 4).map((c) => {
                      const isBelow = c.avg_grade !== null && c.avg_grade < 10;
                      return (
                        <div
                          key={c.id}
                          className="p-3 rounded-lg border border-border/70 hover:border-border flex items-center justify-between gap-3 bg-white hover:bg-parchment/20 transition-all"
                        >
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <h4 className="text-sm font-semibold text-navy truncate">{c.name}</h4>
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted/10 text-muted font-medium">
                                {c.niveau}
                              </span>
                            </div>
                            <p className="text-xs text-muted mt-0.5">
                              {c.student_count} élèves · {c.students_below_10} sous 10/20
                            </p>
                          </div>

                          <div className="text-right shrink-0">
                            <div className={`text-sm font-bold ${
                              c.avg_grade === null ? 'text-muted' :
                              isBelow ? 'text-red-600' : 'text-teal'
                            }`}>
                              {c.avg_grade !== null ? `${c.avg_grade}/20` : '—'}
                            </div>
                            <span className="text-[10px] text-muted block">Moyenne</span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>

            {/* 4. Documents récemment générés */}
            <div className="rounded-xl border border-border bg-white shadow-xs overflow-hidden">
              <div className="flex items-center justify-between px-5 py-3.5 border-b border-border/80 bg-parchment/40">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-navy/10 text-navy flex items-center justify-center">
                    <FileText size={15} />
                  </div>
                  <h2 className="font-display text-sm font-bold text-navy">Documents Récents</h2>
                </div>
                <Link
                  href="/files"
                  className="text-xs text-teal hover:text-teal-dark font-medium flex items-center gap-1 transition-colors"
                >
                  Tous les fichiers <ChevronRight size={13} />
                </Link>
              </div>

              <div className="divide-y divide-border/60">
                {recentDocs.length === 0 ? (
                  <div className="p-6 text-center">
                    <FileText size={24} className="text-muted/40 mx-auto mb-2" />
                    <p className="text-xs text-muted">Aucun document généré pour l&apos;instant.</p>
                  </div>
                ) : (
                  recentDocs.map((doc) => (
                    <div key={doc.id} className="p-3.5 hover:bg-parchment/30 transition-colors flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`w-7 h-7 rounded-md flex items-center justify-center shrink-0 ${
                            doc.mode === 'heavy' ? 'bg-green/10 text-green' :
                            doc.mode === 'medium' ? 'bg-amber/10 text-amber' :
                            'bg-teal/10 text-teal'
                          }`}
                        >
                          {doc.mode === 'heavy' ? <FileText size={13} /> :
                           doc.mode === 'medium' ? <Presentation size={13} /> :
                           <Zap size={13} />}
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-xs font-semibold text-navy truncate">{doc.title}</h4>
                          <span className="text-[10px] text-muted">
                            {doc.created_at ? new Date(doc.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) : '—'}
                            {' · '}
                            {doc.mode === 'heavy' ? 'Complet' : doc.mode === 'medium' ? 'Sélectif' : 'Rapide'}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <Link
                          href={`/files?file=${doc.id}`}
                          className="p-1.5 rounded-md hover:bg-teal-50 text-muted hover:text-teal transition-colors"
                          title="Aperçu"
                        >
                          <Eye size={13} />
                        </Link>
                        <Link
                          href={`/api/downloads/${doc.id}`}
                          className="p-1.5 rounded-md hover:bg-teal-50 text-muted hover:text-teal transition-colors"
                          title="Télécharger"
                        >
                          <Download size={13} />
                        </Link>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Raccourcis et Favoris */}
            <div className="space-y-3">
              <FavoritesPanel />
              <div className="grid grid-cols-2 gap-2">
                <Link
                  href="/references"
                  className="p-3 rounded-xl border border-border/80 bg-white hover:border-teal/30 hover:bg-teal-50/20 transition-all flex items-center gap-2.5"
                >
                  <BookOpen size={15} className="text-amber" />
                  <span className="text-xs font-semibold text-navy">Guides CRMEF</span>
                </Link>
                <Link
                  href="/classes"
                  className="p-3 rounded-xl border border-border/80 bg-white hover:border-teal/30 hover:bg-teal-50/20 transition-all flex items-center gap-2.5"
                >
                  <Users size={15} className="text-teal" />
                  <span className="text-xs font-semibold text-navy">Gestion Classes</span>
                </Link>
              </div>
            </div>

          </div>

        </div>

      </div>
    </PageTransition>
  );
}
