'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Clock,
  Target,
  Award,
  AlertTriangle,
  CheckCircle2,
  AlertOctagon,
  Sparkles,
  BookOpen,
  Loader2,
  Copy,
  Check,
  Printer,
} from 'lucide-react';
import type { InspectionAuditReport } from '@/lib/audit/pedagogicalInspector';

interface InspectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  report: InspectionAuditReport;
  ficheTitle?: string;
  onApplyFix?: (fieldPath: string, value: unknown) => void;
  onRequestAiInspection?: () => Promise<string | undefined>;
  aiInspectorFeedback?: string;
}

export function InspectorModal({
  isOpen,
  onClose,
  report,
  ficheTitle,
  onApplyFix,
  onRequestAiInspection,
  aiInspectorFeedback: initialAiFeedback,
}: InspectorModalProps) {
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'timing' | 'objectives' | 'criteria' | 'ai'>('overview');
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [aiFeedback, setAiFeedback] = useState<string | undefined>(initialAiFeedback);
  const [loadingAi, setLoadingAi] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen || !mounted) return null;

  const handleCopySuggestion = (text: string, idx: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(idx);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const handleRunAi = async () => {
    if (!onRequestAiInspection || loadingAi) return;
    setLoadingAi(true);
    try {
      const res = await onRequestAiInspection();
      if (res) setAiFeedback(res);
    } finally {
      setLoadingAi(false);
    }
  };

  const getStatusIcon = (status: 'compliant' | 'warning' | 'non_compliant') => {
    switch (status) {
      case 'compliant':
        return <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />;
      case 'warning':
        return <AlertTriangle size={16} className="text-amber-500 shrink-0" />;
      case 'non_compliant':
        return <AlertOctagon size={16} className="text-rose-600 shrink-0" />;
    }
  };

  const getStatusBadge = (status: 'compliant' | 'warning' | 'non_compliant') => {
    switch (status) {
      case 'compliant':
        return <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">Conforme</span>;
      case 'warning':
        return <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">À améliorer</span>;
      case 'non_compliant':
        return <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-rose-100 text-rose-800">Non conforme</span>;
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto bg-navy/70 backdrop-blur-sm animate-in fade-in duration-200 transition-all"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white w-full max-w-4xl max-h-[90vh] rounded-2xl shadow-2xl border border-border flex flex-col overflow-hidden my-auto animate-in fade-in zoom-in-95">
        
        {/* Ministerial Inspection Header */}
        <div className="bg-navy text-parchment px-6 py-4 border-b-4 border-teal flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal/20 border border-teal/40 flex items-center justify-center text-teal-light">
              <Award size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase font-bold tracking-widest text-teal-light">
                  Royaume du Maroc &middot; Ministère de l&apos;Éducation Nationale
                </span>
                <span className="text-[9px] bg-white/10 text-white/80 px-1.5 py-0.5 rounded font-mono">Collège</span>
              </div>
              <h2 className="text-base font-display font-bold text-white tracking-wide">
                Inspecteur Pédagogique Virtuel &middot; Pré-Audit Didactique
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Hero Score Banner */}
        <div className="bg-gradient-to-r from-slate-50 to-teal/5 px-6 py-4 border-b border-border flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="relative flex items-center justify-center w-16 h-16 rounded-2xl bg-white border-2 border-teal shadow-sm">
              <span className="text-2xl font-black text-navy">{report.scoreOn20}</span>
              <span className="text-[10px] font-bold text-muted absolute bottom-1">/ 20</span>
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${report.mentionColor}`}>
                  {report.mention}
                </span>
                <span className="text-xs font-semibold text-slate-500">
                  Score : {report.overallScore}%
                </span>
              </div>
              <p className="text-xs text-slate-600 font-medium line-clamp-1">
                {ficheTitle ? `Séance : ${ficheTitle}` : report.summary}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => window.print()}
              className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-border rounded-lg hover:bg-slate-50 flex items-center gap-1.5 shadow-sm transition-colors"
            >
              <Printer size={13} />
              <span>Imprimer</span>
            </button>
            {onRequestAiInspection && (
              <button
                onClick={() => {
                  setActiveTab('ai');
                  if (!aiFeedback) handleRunAi();
                }}
                disabled={loadingAi}
                className="px-3 py-1.5 text-xs font-semibold text-white bg-gradient-to-r from-teal to-teal-dark rounded-lg hover:opacity-95 flex items-center gap-1.5 shadow-sm transition-opacity"
              >
                {loadingAi ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
                <span>Avis Approfondi IA</span>
              </button>
            )}
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-border bg-slate-50/50 px-6 gap-1 overflow-x-auto">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 flex items-center gap-2 transition-colors ${
              activeTab === 'overview' ? 'border-teal text-teal bg-white' : 'border-transparent text-slate-600 hover:text-navy'
            }`}
          >
            <Award size={14} />
            <span>Vue d&apos;ensemble</span>
          </button>
          <button
            onClick={() => setActiveTab('timing')}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 flex items-center gap-2 transition-colors ${
              activeTab === 'timing' ? 'border-teal text-teal bg-white' : 'border-transparent text-slate-600 hover:text-navy'
            }`}
          >
            <Clock size={14} />
            <span>Minutage ({report.totalDurationMin} min)</span>
            {report.timing.isOver55Min && <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />}
          </button>
          <button
            onClick={() => setActiveTab('objectives')}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 flex items-center gap-2 transition-colors ${
              activeTab === 'objectives' ? 'border-teal text-teal bg-white' : 'border-transparent text-slate-600 hover:text-navy'
            }`}
          >
            <Target size={14} />
            <span>Objectifs APC & Bloom</span>
            {report.objectives.passiveOrVagueCount > 0 && (
              <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-1.5 py-0.2 rounded-full">
                {report.objectives.passiveOrVagueCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('criteria')}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 flex items-center gap-2 transition-colors ${
              activeTab === 'criteria' ? 'border-teal text-teal bg-white' : 'border-transparent text-slate-600 hover:text-navy'
            }`}
          >
            <BookOpen size={14} />
            <span>Critères MEN ({report.criteria.length})</span>
          </button>
          {onRequestAiInspection && (
            <button
              onClick={() => setActiveTab('ai')}
              className={`px-4 py-2.5 text-xs font-bold border-b-2 flex items-center gap-2 transition-colors ${
                activeTab === 'ai' ? 'border-teal text-teal bg-white' : 'border-transparent text-slate-600 hover:text-navy'
              }`}
            >
              <Sparkles size={14} className="text-amber-500" />
              <span>Avis Inspecteur IA</span>
            </button>
          )}
        </div>

        {/* Content Area */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">

          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Quick Summary Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                
                {/* Timing Card */}
                <div className="p-4 rounded-xl border border-border bg-white shadow-sm space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase text-slate-500 flex items-center gap-1">
                      <Clock size={12} className="text-teal" />
                      Minutage Séance
                    </span>
                    {report.timing.isOver55Min ? (
                      <span className="text-[10px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded">Débordement</span>
                    ) : (
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">Conforme</span>
                    )}
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-extrabold text-navy">{report.totalDurationMin}</span>
                    <span className="text-xs font-semibold text-slate-500">/ 55 min max</span>
                  </div>
                  <p className="text-[11px] text-slate-600 leading-relaxed">
                    {report.timing.isOver55Min
                      ? 'Dépasse la limite de 55 minutes réglementaires au collège.'
                      : 'Cadence temporelle équilibrée adaptée aux élèves.'}
                  </p>
                </div>

                {/* Objectives Card */}
                <div className="p-4 rounded-xl border border-border bg-white shadow-sm space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase text-slate-500 flex items-center gap-1">
                      <Target size={12} className="text-teal" />
                      Objectifs APC
                    </span>
                    {report.objectives.passiveOrVagueCount > 0 ? (
                      <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded">
                        {report.objectives.passiveOrVagueCount} verbe(s) vague(s)
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">100% Bloom</span>
                    )}
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-extrabold text-navy">{report.objectives.actionOrientedCount}</span>
                    <span className="text-xs font-semibold text-slate-500">/ {report.objectives.totalCount} mesurables</span>
                  </div>
                  <p className="text-[11px] text-slate-600 leading-relaxed">
                    {report.objectives.passiveOrVagueCount > 0
                      ? 'Des verbes passifs (ex: Comprendre, Savoir) doivent être remplacés.'
                      : 'Tous les objectifs sont formulés avec des verbes observables.'}
                  </p>
                </div>

                {/* Active Student Engagement */}
                <div className="p-4 rounded-xl border border-border bg-white shadow-sm space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase text-slate-500 flex items-center gap-1">
                      <BookOpen size={12} className="text-teal" />
                      Rôle Actif Élève
                    </span>
                    <span className="text-[10px] font-bold text-teal bg-teal/10 px-2 py-0.5 rounded">
                      {report.studentEngagement.score}% Actif
                    </span>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-extrabold text-navy">
                      {report.studentEngagement.hasProblemSolving ? 'APC Validée' : 'Partiel'}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 leading-relaxed">
                    {report.studentEngagement.hasProblemSolving
                      ? 'Situation-problème contextualisée et démarche active.'
                      : 'Renforcer la part d\'autonomie et d\'expérimentation élève.'}
                  </p>
                </div>
              </div>

              {/* Inspector Practical Advice Checklist */}
              <div className="bg-parchment/40 border border-gold/40 rounded-xl p-5 space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-navy flex items-center gap-2">
                  <Award size={16} className="text-gold-600" />
                  Conseils Prioritaires de l&apos;Inspecteur Pédagogique
                </h4>
                <ul className="space-y-2 text-xs text-slate-700">
                  {report.inspectorAdvice.map((advice, i) => (
                    <li key={i} className="flex items-start gap-2 bg-white/80 p-2.5 rounded-lg border border-gold/20">
                      <span className="text-teal font-bold shrink-0">•</span>
                      <span>{advice}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Quick Status List of 5 Criteria */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600">
                  Synthèse des 5 Critères Réglementaires MEN
                </h4>
                <div className="divide-y divide-border border border-border rounded-xl bg-white overflow-hidden">
                  {report.criteria.map((c) => (
                    <div key={c.id} className="p-3.5 flex items-center justify-between gap-4 hover:bg-slate-50 transition-colors">
                      <div className="flex items-center gap-3">
                        {getStatusIcon(c.status)}
                        <div>
                          <p className="text-xs font-bold text-navy">{c.title}</p>
                          <p className="text-[11px] text-slate-500">{c.finding}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className="text-xs font-mono font-bold text-slate-700">
                          {c.score}/{c.maxScore} pts
                        </span>
                        {getStatusBadge(c.status)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: TIMING */}
          {activeTab === 'timing' && (
            <div className="space-y-6">
              <div className="bg-slate-50 border border-border rounded-xl p-5 space-y-4">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <h3 className="text-sm font-bold text-navy">Cadence Didactique de la Séance</h3>
                    <p className="text-xs text-slate-500">Règle officielle MEN : 50 à 55 minutes maximum par séance de collège.</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-700">Total calculé :</span>
                    <span className={`text-base font-black px-3 py-1 rounded-lg ${
                      report.timing.isOver55Min ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'
                    }`}>
                      {report.totalDurationMin} min
                    </span>
                  </div>
                </div>

                {/* Visual Proportion Bar */}
                <div>
                  <div className="flex justify-between text-[11px] font-semibold text-slate-600 mb-1.5">
                    <span>Répartition visuelle des 3 phases :</span>
                    <span>100% de la séance</span>
                  </div>
                  <div className="h-6 w-full rounded-lg overflow-hidden flex bg-slate-200 shadow-inner">
                    <div
                      style={{ width: `${Math.round((report.timing.phases[0]?.minutes || 10) / report.totalDurationMin * 100)}%` }}
                      className="bg-teal flex items-center justify-center text-[10px] font-bold text-white overflow-hidden px-1"
                      title="Phase 1: Mise en situation"
                    >
                      P1 ({report.timing.phases[0]?.minutes}m)
                    </div>
                    <div
                      style={{ width: `${Math.round((report.timing.phases[1]?.minutes || 25) / report.totalDurationMin * 100)}%` }}
                      className="bg-navy flex items-center justify-center text-[10px] font-bold text-white overflow-hidden px-1"
                      title="Phase 2: Analyse & APC"
                    >
                      Phase 2 — Analyse & Démarche ({report.timing.phases[1]?.minutes}m)
                    </div>
                    <div
                      style={{ width: `${Math.round((report.timing.phases[2]?.minutes || 10) / report.totalDurationMin * 100)}%` }}
                      className="bg-amber-500 flex items-center justify-center text-[10px] font-bold text-white overflow-hidden px-1"
                      title="Phase 3: Synthèse & Bilan"
                    >
                      P3 ({report.timing.phases[2]?.minutes}m)
                    </div>
                  </div>
                </div>

                {/* Diagnostic alert */}
                {report.timing.isOver55Min && (
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-800 flex items-start gap-2">
                    <AlertOctagon size={16} className="text-rose-600 shrink-0 mt-0.5" />
                    <div>
                      <strong>Alerte Minutage :</strong> {report.timing.diagnostic}
                    </div>
                  </div>
                )}
              </div>

              {/* Phases Details Table */}
              <div className="border border-border rounded-xl overflow-hidden bg-white">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-slate-700 font-bold border-b border-border">
                    <tr>
                      <th className="p-3">Phase Pédagogique</th>
                      <th className="p-3 w-28 text-center">Durée Prévue</th>
                      <th className="p-3 w-36">Recommandation MEN</th>
                      <th className="p-3 w-28 text-center">Statut</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {report.timing.phases.map((p, i) => (
                      <tr key={i} className="hover:bg-slate-50">
                        <td className="p-3 font-semibold text-navy">
                          {p.label}
                        </td>
                        <td className="p-3 text-center font-mono font-bold text-slate-800">
                          {p.minutes} min
                        </td>
                        <td className="p-3 text-slate-600">
                          {p.recommendedRange}
                        </td>
                        <td className="p-3 text-center">
                          {p.status === 'ok' ? (
                            <span className="px-2 py-0.5 text-[10px] font-bold bg-emerald-100 text-emerald-800 rounded-full">Optimal</span>
                          ) : (
                            <span className="px-2 py-0.5 text-[10px] font-bold bg-amber-100 text-amber-800 rounded-full">Ajuster</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: OBJECTIVES & BLOOM */}
          {activeTab === 'objectives' && (
            <div className="space-y-6">
              <div className="bg-slate-50 border border-border rounded-xl p-4 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-navy">Audit Didactique des Objectifs (APC)</h3>
                  <p className="text-xs text-slate-500">
                    Les objectifs doivent spécifier une performance élève observable et mesurable.
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-xs font-bold text-teal block">Taxonomie de Bloom</span>
                  <span className="text-[11px] text-slate-500">
                    {report.objectives.actionOrientedCount} / {report.objectives.totalCount} mesurables
                  </span>
                </div>
              </div>

              {/* Passive Verbs Warning Banner */}
              {report.objectives.passiveOrVagueCount > 0 && (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl space-y-2 text-xs text-amber-900">
                  <div className="flex items-center gap-2 font-bold text-amber-800">
                    <AlertTriangle size={16} />
                    <span>Verbes passifs ou non mesurables détectés</span>
                  </div>
                  <p>
                    L&apos;inspection pédagogique pénalise l&apos;usage de verbes mentalistes comme <em>« Comprendre »</em>, <em>« Savoir »</em> ou <em>« Découvrir »</em> car ils décrivent un état interne non évaluable directement en classe.
                  </p>
                </div>
              )}

              {/* List of Inspected Objectives */}
              <div className="space-y-3">
                {report.objectives.items.map((obj, i) => (
                  <div
                    key={i}
                    className={`p-4 rounded-xl border transition-all ${
                      obj.detectedPassiveVerb
                        ? 'bg-amber-50/40 border-amber-300'
                        : 'bg-white border-border'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-2.5">
                        <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-700 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                          {i + 1}
                        </span>
                        <div>
                          <p className="text-xs font-semibold text-navy">
                            {obj.text}
                          </p>
                          {obj.detectedPassiveVerb && (
                            <p className="text-[11px] text-amber-800 mt-1 font-medium">
                              ⚠️ Verbe identifié : <strong className="underline decoration-rose-400 font-bold">{obj.detectedPassiveVerb}</strong>. {obj.explanation}
                            </p>
                          )}
                          {obj.isActionOriented && (
                            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded inline-flex items-center gap-1 mt-1.5">
                              <CheckCircle2 size={11} />
                              Verbe mesurable ({obj.bloomCategory || 'Bloom'})
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Suggestions list */}
                      {obj.suggestedBloomVerbs.length > 0 && (
                        <div className="shrink-0 text-right">
                          <span className="text-[10px] font-bold text-slate-400 block mb-1">Suggestions Bloom :</span>
                          <div className="flex flex-wrap gap-1 justify-end max-w-[200px]">
                            {obj.suggestedBloomVerbs.slice(0, 3).map((verb, vIdx) => (
                              <button
                                key={vIdx}
                                onClick={() => {
                                  handleCopySuggestion(verb, i * 10 + vIdx);
                                  if (onApplyFix && (obj.matchedSnippet || obj.detectedPassiveVerb)) {
                                    const targetWord = obj.matchedSnippet || obj.detectedPassiveVerb!;
                                    const firstChar = targetWord.charAt(0);
                                    const isFirstLetterCap = firstChar !== '' && firstChar === firstChar.toUpperCase();
                                    const replacement = isFirstLetterCap
                                      ? verb.charAt(0).toUpperCase() + verb.slice(1)
                                      : verb.toLowerCase();
                                    const updated = obj.text.replace(new RegExp(targetWord, 'i'), replacement);
                                    onApplyFix(`objectifs.${i}`, updated);
                                  }
                                }}
                                title="Copier et appliquer ce verbe d'action"
                                className="px-2 py-0.5 text-[10px] font-bold bg-teal/10 text-teal hover:bg-teal hover:text-white rounded border border-teal/20 transition-colors flex items-center gap-1"
                              >
                                {copiedIndex === i * 10 + vIdx ? <Check size={10} /> : <Copy size={10} />}
                                <span>{verb}</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 4: CRITERIA */}
          {activeTab === 'criteria' && (
            <div className="space-y-4">
              <div className="text-xs text-slate-500 mb-2">
                Évaluation selon les circulaires officielles et directives pédagogiques du collège marocain.
              </div>

              {report.criteria.map((crit) => (
                <div key={crit.id} className="p-4 rounded-xl border border-border bg-white shadow-sm space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(crit.status)}
                      <h4 className="text-xs font-bold text-navy">{crit.title}</h4>
                      <span className="text-[10px] text-muted">({crit.categoryLabel})</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold text-slate-700">{crit.score}/{crit.maxScore} pts</span>
                      {getStatusBadge(crit.status)}
                    </div>
                  </div>

                  <div className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-border/50">
                    <strong className="text-slate-800">Constat de l&apos;inspecteur :</strong> {crit.finding}
                  </div>

                  <div className="text-xs text-teal-800 bg-teal/5 p-2.5 rounded-lg border border-teal/20 flex items-start gap-2">
                    <span className="font-bold shrink-0">💡 Recommandation :</span>
                    <span>{crit.recommendation}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* TAB 5: AI INSPECTOR REMARKS */}
          {activeTab === 'ai' && (
            <div className="space-y-4">
              <div className="bg-gradient-to-r from-navy/90 to-teal/90 text-white p-4 rounded-xl flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold flex items-center gap-2">
                    <Sparkles size={16} className="text-gold" />
                    Rapport Qualitatif de l&apos;Inspecteur Virtuel
                  </h3>
                  <p className="text-xs text-white/80 mt-0.5">
                    Analyse approfondie contextualisée selon les orientations officielles du Ministère.
                  </p>
                </div>
                <button
                  onClick={handleRunAi}
                  disabled={loadingAi}
                  className="px-3 py-1.5 text-xs font-bold bg-white text-navy rounded-lg hover:bg-slate-100 flex items-center gap-1.5 shadow"
                >
                  {loadingAi ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
                  <span>{aiFeedback ? 'Réanalyser' : 'Lancer l\'audit'}</span>
                </button>
              </div>

              {loadingAi && (
                <div className="p-8 text-center space-y-3">
                  <Loader2 size={32} className="animate-spin text-teal mx-auto" />
                  <p className="text-xs font-semibold text-slate-600">
                    L&apos;inspecteur pédagogique virtuel analyse votre fiche de séance...
                  </p>
                </div>
              )}

              {aiFeedback && !loadingAi && (
                <div className="bg-white border-2 border-teal/30 rounded-xl p-6 shadow-sm space-y-4">
                  <div className="flex items-center gap-2 pb-3 border-b border-border text-xs font-bold text-teal uppercase tracking-wider">
                    <span>Avis & Observations d&apos;Inspection</span>
                  </div>
                  <div className="prose prose-sm max-w-none text-xs text-slate-700 leading-relaxed whitespace-pre-wrap">
                    {aiFeedback}
                  </div>
                </div>
              )}

              {!aiFeedback && !loadingAi && (
                <div className="p-8 text-center text-slate-500 text-xs border border-dashed border-border rounded-xl">
                  Cliquez sur « Lancer l&apos;audit » pour recevoir les observations qualitatives détaillées et personnalisées d&apos;un inspecteur MEN.
                </div>
              )}
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="bg-slate-50 px-6 py-3 border-t border-border flex items-center justify-between">
          <div className="text-[11px] text-slate-500 font-medium">
            Conforme aux circulaires de l&apos;inspection générale MEN (Maroc).
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-700 bg-white border border-border rounded-lg hover:bg-slate-100 transition-colors"
          >
            Fermer le rapport
          </button>
        </div>

      </div>
    </div>,
    document.body
  );
}
