'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { animate, stagger } from 'animejs';
import {
  FileText, Clock, TrendingUp, BookOpen, FileCheck,
  Search, Sparkles, ArrowRight, Download, Eye, Cpu, Plus,
  Presentation, Zap,
} from 'lucide-react';
import { PageTransition } from '@/components/layout/PageTransition';
import { FavoritesPanel } from '@/components/layout/FavoritesPanel';
import type { GenerationMode } from '@/types/generation';

const STAT_TINTS = [
  { bg: 'bg-teal/8', iconBg: 'bg-teal/15', iconColor: 'text-teal', border: 'border-teal/15' },
  { bg: 'bg-amber/8', iconBg: 'bg-amber/15', iconColor: 'text-amber', border: 'border-amber/15' },
  { bg: 'bg-navy/4', iconBg: 'bg-navy-light/10', iconColor: 'text-muted', border: 'border-border' },
  { bg: 'bg-green/5', iconBg: 'bg-green/15', iconColor: 'text-green', border: 'border-green/15' },
];

interface RecentDoc {
  id: string;
  title: string;
  mode: GenerationMode;
  createdAt: string;
  tokensUsed: number;
}

export default function Dashboard() {
  const cardsRef = useRef<HTMLDivElement>(null);
  const statsRef = useRef<HTMLDivElement>(null);
  const recentRef = useRef<HTMLDivElement>(null);
  const [search, setSearch] = useState('');
  const [recentDocs, setRecentDocs] = useState<RecentDoc[]>([]);
  const [stats, setStats] = useState([
    { label: 'Documents', value: '—', icon: FileCheck, idx: 0 },
    { label: 'Tokens', value: '—', icon: TrendingUp, idx: 1 },
    { label: 'Dernière gén.', value: '—', icon: Clock, idx: 2 },
    { label: 'Fournisseur', value: '—', icon: Cpu, idx: 3 },
  ]);

  useEffect(() => {
    Promise.all([
      fetch('/api/history').then((r) => r.json().catch(() => ({}))),
      fetch('/api/settings').then((r) => r.json().catch(() => ({}))),
    ]).then(([historyData, settingsData]) => {
      const gens = historyData.entries || historyData.generations || historyData || [];
      const docs: RecentDoc[] = gens.slice(0, 5).map((g: Record<string, unknown>) => {
        let meta: Record<string, unknown> = {};
        try { meta = typeof g.metadata === 'string' ? JSON.parse(g.metadata as string) : (g.metadata as Record<string, unknown>) || {}; } catch { /* empty */ }
        return {
          id: g.id as string,
          title: (meta.lecon as string) || (meta.matiere as string) || (g.mode as string) || 'Document',
          mode: (g.mode as GenerationMode) || 'light',
          createdAt: g.created_at as string,
          tokensUsed: (g.tokens_used as number) || 0,
        };
      });
      setRecentDocs(docs);

      const s = settingsData.settings || {};
      const providerLabel: Record<string, string> = { none: 'Aucun', huggingface: 'HuggingFace', lmstudio: 'LM Studio' };
      const activeProvider = s.provider ? (providerLabel[s.provider as string] || s.provider) : '—';

      const totalTokens = docs.reduce((sum, d) => sum + d.tokensUsed, 0);
      setStats([
        { label: 'Documents', value: String(docs.length), icon: FileCheck, idx: 0 },
        { label: 'Tokens', value: totalTokens > 1000 ? `${(totalTokens / 1000).toFixed(1)}K` : String(totalTokens || 0), icon: TrendingUp, idx: 1 },
        { label: 'Dernière gén.', value: docs[0]?.createdAt ? new Date(docs[0].createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) : '—', icon: Clock, idx: 2 },
        { label: 'Fournisseur', value: activeProvider, icon: Cpu, idx: 3 },
      ]);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (cardsRef.current) {
      animate(cardsRef.current, {
        translateY: [30, 0],
        opacity: [0, 1],
        ease: 'outExpo',
        duration: 500,
      });
    }
    const statTargets = statsRef.current?.querySelectorAll('[data-stat]');
    if (statTargets?.length) {
      animate(statTargets, {
        scale: [0.92, 1],
        opacity: [0, 1],
        delay: stagger(60),
        ease: 'outQuad',
        duration: 350,
      });
    }
    const rowTargets = recentRef.current?.querySelectorAll('[data-row]');
    if (rowTargets?.length) {
      animate(rowTargets, {
        translateX: [-20, 0],
        opacity: [0, 1],
        delay: stagger(80),
        ease: 'outExpo',
        duration: 400,
      });
    }
  }, [recentDocs]);

  return (
    <PageTransition>
      <div className="max-w-6xl mx-auto space-y-7">

        {/* ─── HERO ─── */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-teal via-teal-dark to-navy p-6 lg:p-8 text-white">
          <div className="absolute top-0 right-0 w-72 h-72 bg-teal-light/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-gold/10 rounded-full blur-2xl translate-y-1/2 -translate-x-1/4" />

          <div className="relative z-10 flex items-start justify-between gap-6">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-xl bg-white/15 backdrop-blur flex items-center justify-center">
                  <Sparkles size={20} className="text-white" />
                </div>
                <div>
                  <h1 className="font-display text-2xl lg:text-3xl font-bold tracking-tight">PEDAGOGEN</h1>
                  <p className="text-white/60 text-xs">Assistant Pédagogique IA · v2.0</p>
                </div>
              </div>
              <p className="text-white/80 text-base lg:text-lg mt-3 max-w-lg leading-relaxed">
                Bonjour, Enseignant.<br />
                <span className="text-white font-medium">Qu&apos;allons-nous créer aujourd&apos;hui ?</span>
              </p>
            </div>

            <Link
              href="/generate"
              className="hidden md:flex items-center gap-2 px-5 py-3 rounded-xl bg-white/15 backdrop-blur border border-white/20 text-white text-sm font-medium hover:bg-white/25 transition-all shrink-0"
            >
              <Plus size={16} />
              Nouveau document
            </Link>
          </div>

          {/* Search */}
          <div className="relative mt-5 max-w-lg">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher une leçon, une matière..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/10 backdrop-blur border border-white/15 text-sm text-white placeholder:text-white/40 focus:outline-none focus:border-white/30 focus:bg-white/15 transition-all"
            />
          </div>
        </div>

        {/* ─── STATS ─── */}
        <div ref={statsRef} className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {stats.map((stat) => {
            const t = STAT_TINTS[stat.idx]!;
            return (
              <div
                key={stat.label}
                data-stat
                className={`rounded-xl border ${t.border} ${t.bg} p-4 transition-all duration-200 hover:shadow-sm`}
              >
                <div className="flex items-center gap-2.5 mb-3">
                  <div className={`w-8 h-8 rounded-lg ${t.iconBg} flex items-center justify-center ${t.iconColor}`}>
                    <stat.icon size={16} />
                  </div>
                  <span className="text-xs font-medium text-muted">{stat.label}</span>
                </div>
                <p className="text-2xl font-bold text-navy tracking-tight">{stat.value}</p>
              </div>
            );
          })}
        </div>

        {/* ─── NEW GENERATION CTA ─── */}
        <div ref={cardsRef} data-mode-card>
          <Link href="/generate">
            <div className="group relative overflow-hidden rounded-xl border border-teal/20 bg-white transition-all duration-300 hover:shadow-lg hover:shadow-teal/5 hover:-translate-y-0.5 hover:border-teal/40 p-6 flex items-center justify-between">
              <div className="absolute top-0 right-0 w-48 h-48 bg-teal/5 rounded-full blur-3xl translate-x-1/4 -translate-y-1/4 pointer-events-none" />
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-teal/10 flex items-center justify-center text-teal shrink-0 group-hover:scale-110 transition-transform">
                  <Sparkles size={22} />
                </div>
                <div>
                  <h3 className="font-display text-lg font-bold text-navy">Nouvelle Génération</h3>
                  <p className="text-sm text-muted mt-0.5">
                    Fiche pédagogique, planification, cours complet, évaluation, diapositives et visuels en une seule fois.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-sm font-semibold text-teal">
                Commencer
                <ArrowRight size={15} className="group-hover:translate-x-0.5 transition-transform" />
              </div>
            </div>
          </Link>
        </div>

        {/* ─── BOTTOM ROW ─── */}
        <div className="grid lg:grid-cols-3 gap-6">

          {/* Recent — 2/3 */}
          <div className="lg:col-span-2" ref={recentRef}>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-display text-xl font-semibold text-navy">Activité Récente</h2>
              {recentDocs.length > 0 && (
                <Link href="/history" className="text-xs text-teal hover:text-teal-dark font-medium transition-colors">
                  Tout voir →
                </Link>
              )}
            </div>

            {recentDocs.length === 0 ? (
              <div className="rounded-xl border border-border bg-white p-8 text-center">
                <div className="w-12 h-12 rounded-xl bg-parchment-dark flex items-center justify-center mx-auto mb-3">
                  <FileText size={20} className="text-muted/50" />
                </div>
                <p className="text-sm text-muted font-medium">Aucun document encore</p>
                <p className="text-xs text-muted/60 mt-1">Vos générations apparaîtront ici.</p>
              </div>
            ) : (
              <div className="rounded-xl border border-border bg-white overflow-hidden">
                {/* Table header */}
                <div className="grid grid-cols-[1fr_80px_80px_70px] gap-3 px-4 py-2.5 border-b border-border text-xs font-medium text-muted bg-parchment-dark/50">
                  <span>Document</span>
                  <span>Date</span>
                  <span>Mode</span>
                  <span className="text-right">Actions</span>
                </div>
                {/* Rows */}
                {recentDocs.map((doc) => (
                  <div
                    key={doc.id}
                    data-row
                    className="grid grid-cols-[1fr_80px_80px_70px] gap-3 px-4 py-3 items-center border-b border-border/50 last:border-0 hover:bg-parchment-dark/30 transition-colors"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
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
                      <span className="text-sm font-medium text-navy truncate">{doc.title}</span>
                    </div>
                    <span className="text-xs text-muted">
                      {doc.createdAt ? new Date(doc.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) : '—'}
                    </span>
                    <span className="text-xs text-muted">
                      {doc.mode === 'heavy' ? 'Complet' : doc.mode === 'medium' ? 'Sélectif' : 'Rapide'}
                    </span>
                    <div className="flex items-center justify-end gap-1">
                      <Link href={`/files?file=${doc.id}`} className="p-1.5 rounded-md hover:bg-teal-50 text-muted hover:text-teal transition-colors">
                        <Eye size={13} />
                      </Link>
                      <Link href={`/api/downloads/${doc.id}`} className="p-1.5 rounded-md hover:bg-teal-50 text-muted hover:text-teal transition-colors">
                        <Download size={13} />
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Shortcuts — 1/3 */}
          <div className="space-y-4">
            <FavoritesPanel />
            <h2 className="font-display text-xl font-semibold text-navy mb-3">Raccourcis</h2>
            <div className="space-y-2">
              {[
                { label: 'Mes Fichiers', desc: 'Consulter et télécharger', icon: FileText, href: '/files', color: 'text-green', bg: 'bg-green/8' },
                { label: 'Références', desc: 'Ressources et directives', icon: BookOpen, href: '/references', color: 'text-amber', bg: 'bg-amber/8' },
                { label: 'Assistant IA', desc: 'Tester et discuter', icon: Cpu, href: '/chatbot', color: 'text-teal', bg: 'bg-teal/8' },
                { label: 'Historique', desc: 'Activité récente et favoris', icon: Clock, href: '/history', color: 'text-navy', bg: 'bg-navy/4' },
              ].map((tip) => (
                <Link key={tip.label} href={tip.href}>
                  <div className="flex items-center gap-3 p-3 rounded-xl border border-border/60 bg-white hover:border-teal/30 hover:bg-teal-50/30 transition-all cursor-pointer group">
                    <div className={`w-8 h-8 rounded-lg ${tip.bg} flex items-center justify-center ${tip.color} shrink-0 group-hover:scale-110 transition-transform`}>
                      <tip.icon size={15} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-navy truncate">{tip.label}</p>
                      <p className="text-[11px] text-muted truncate">{tip.desc}</p>
                    </div>
                    <ArrowRight size={12} className="ml-auto text-muted/40 group-hover:text-teal transition-colors shrink-0" />
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>

      </div>
    </PageTransition>
  );
}
