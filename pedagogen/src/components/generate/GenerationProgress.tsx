'use client';

import { useEffect, useRef, useState } from 'react';
import { animate } from 'animejs';
import { Loader2, X } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/Card';
import type { GenerationMode } from '@/types/generation';

interface Step {
  id: string;
  label: string;
  status: 'pending' | 'active' | 'done' | 'error';
  error?: string;
}

const HEAVY_STEPS: Step[] = [
  { id: 'fiche', label: 'Fiche Pédagogique', status: 'pending' },
  { id: 'planification', label: 'Planification', status: 'pending' },
  { id: 'cours', label: 'Cours Complet', status: 'pending' },
  { id: 'gestion', label: 'Gestion de Classe', status: 'pending' },
  { id: 'resume', label: 'Résumé Élève', status: 'pending' },
  { id: 'pptx', label: 'Présentation PPTX', status: 'pending' },
  { id: 'images', label: 'Images Illustratives', status: 'pending' },
  { id: 'build', label: 'Compilation finale', status: 'pending' },
];

const MEDIUM_STEPS: Step[] = [
  { id: 'docs', label: 'Documents sélectionnés', status: 'pending' },
  { id: 'build', label: 'Compilation', status: 'pending' },
];

const PEDAGOGICAL_REASONING: Record<string, string> = {
  fiche: "Analyse du programme scolaire officiel pour structurer les objectifs d'apprentissage, les compétences ciblées et les prérequis de la leçon...",
  planification: "Établissement de la progression logique et chronologique des séances du semestre, en répartissant le volume horaire réglementaire...",
  cours: "Rédaction approfondie du contenu de la leçon, incluant les scripts didactiques de l'enseignant, la planification du tableau noir et les activités élèves...",
  gestion: "Définition des stratégies de gestion de l'espace classe, de la gestion du temps, des méthodes de différenciation et des plans de remédiation...",
  resume: "Synthèse des connaissances essentielles pour l'élève rédigée en langage accessible, accompagnée d'exercices d'application et de consolidation...",
  pptx: "Structuration des supports de présentation visuels, répartition des diapositives et rédaction des notes d'accompagnement de l'exposé...",
  images: "Conception créative et génération de visuels pédagogiques sur-mesure pour illustrer les concepts de la séance via l'intelligence artificielle FLUX...",
  init: "Initialisation du moteur pédagogique PEDAGOGEN, vérification des clés API et préparation des ressources de contextualisation...",
  references: "Lecture analytique et injection des documents de référence (programmes officiels, manuels et consignes de l'enseignant)...",
  docs: "Chargement de la sélection des documents pédagogiques et préparation de l'orchestration des tâches...",
  build: "Compilation finale des documents, application des styles de mise en page officiels et préparation des liens de téléchargement...",
};

interface GenerationProgressProps {
  mode: GenerationMode;
  activeStep?: string;
  stepStatus?: 'active' | 'done' | 'error' | 'pending';
  stepStatuses?: Record<string, 'pending' | 'active' | 'done' | 'error' | { status: 'pending' | 'active' | 'done' | 'error'; error?: string }>;
  tokens?: number;
}

function ActiveStepItem({ step, reasoning }: { step: Step; reasoning: string }) {
  const [percent, setPercent] = useState(0);

  useEffect(() => {
    if (step.status === 'active') {
      setPercent(0);
      const interval = setInterval(() => {
        setPercent((prev) => {
          if (prev >= 95) return prev;
          const diff = 95 - prev;
          const inc = Math.max(1, Math.round(diff / 8));
          return prev + inc;
        });
      }, 800);
      return () => clearInterval(interval);
    } else if (step.status === 'done') {
      setPercent(100);
    }
  }, [step.status]);

  return (
    <div
      className="flex flex-col gap-3 p-4 rounded-xl border border-teal/20 bg-teal/5 transition-all duration-300 shadow-sm animate-pulse"
      data-step={step.id}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Loader2 size={18} className="text-teal animate-spin" />
          <span className="font-semibold text-navy text-sm sm:text-base">
            {step.label}
          </span>
        </div>
        <span className="text-teal font-mono font-bold text-sm">
          {percent}%
        </span>
      </div>
      <p className="text-xs text-muted leading-relaxed font-body pl-3 border-l-2 border-teal/20 ml-2">
        {reasoning}
      </p>
    </div>
  );
}

function ErrorStepItem({ step }: { step: Step }) {
  return (
    <div className="flex flex-col gap-2 p-4 rounded-xl border border-red/20 bg-red/5 transition-all duration-300">
      <div className="flex items-center gap-3">
        <X size={18} className="text-red" />
        <span className="font-semibold text-red text-sm sm:text-base">
          {step.label} — Échoué
        </span>
      </div>
      <p className="text-xs text-red/80 pl-3">
        {step.error ? `Détails de l'erreur : ${step.error}` : "Une erreur est survenue lors de la génération de ce document. Le système passe à l'étape suivante."}
      </p>
    </div>
  );
}

export function GenerationProgress({ mode, activeStep, stepStatus, stepStatuses, tokens = 0 }: GenerationProgressProps) {
  const tokenRef = useRef<HTMLSpanElement>(null);
  const prevTokens = useRef(0);
  const baseSteps = mode === 'heavy' ? HEAVY_STEPS : MEDIUM_STEPS;

  const steps = baseSteps.map((step) => {
    if (stepStatuses) {
      const entry = stepStatuses[step.id];
      if (entry) {
        if (typeof entry === 'object') {
          return { ...step, status: entry.status, error: entry.error };
        }
        return { ...step, status: entry };
      }
    }
    if (!activeStep) return step;
    if (step.id === activeStep && stepStatus) {
      return { ...step, status: stepStatus };
    }
    return step;
  });

  const doneCount = steps.filter((s) => s.status === 'done').length;

  // Find the currently active step object (or fallback if it's start state)
  let activeStepObj = steps.find((s) => s.status === 'active');
  if (!activeStepObj && activeStep) {
    const matchedBase = baseSteps.find((s) => s.id === activeStep);
    if (matchedBase) {
      activeStepObj = { ...matchedBase, status: 'active' };
    } else {
      // Fallback for states like 'init', 'references', 'docs'
      let fallbackLabel = activeStep;
      if (activeStep === 'init') fallbackLabel = 'Initialisation du package';
      if (activeStep === 'references') fallbackLabel = 'Chargement des références';
      if (activeStep === 'docs') fallbackLabel = 'Initialisation des documents';
      activeStepObj = { id: activeStep, label: fallbackLabel, status: 'active' };
    }
  }

  // Get any errors that occurred so they remain visible
  const errorSteps = steps.filter((s) => s.status === 'error');

  const reasoning = PEDAGOGICAL_REASONING[activeStepObj?.id || ''] || "Traitement pédagogique en cours...";

  useEffect(() => {
    if (tokenRef.current && tokens !== prevTokens.current) {
      animate(tokenRef.current, {
        innerHTML: [prevTokens.current, tokens],
        ease: 'outQuad',
        duration: 800,
      });
      prevTokens.current = tokens;
    }
  }, [tokens]);

  return (
    <Card className="shadow-md">
      <CardContent className="py-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-display font-semibold text-navy">Progression de la Génération</h3>
          <span
            ref={tokenRef}
            className="text-sm font-mono text-teal font-medium"
            id="token-counter"
          >
            {tokens.toLocaleString()} tokens
          </span>
        </div>

        <div className="space-y-3">
          {/* Render active step */}
          {activeStepObj && (
            <ActiveStepItem step={activeStepObj} reasoning={reasoning} />
          )}

          {/* Render error steps */}
          {errorSteps.map((step) => (
            <ErrorStepItem key={step.id} step={step} />
          ))}

          {/* If everything is finished but loader is still mounted */}
          {!activeStepObj && errorSteps.length === 0 && (
            <div className="flex items-center gap-3 p-4 rounded-xl border border-teal/20 bg-teal/5">
              <Loader2 size={18} className="text-teal animate-spin" />
              <span className="font-semibold text-navy text-sm">
                Finalisation de la génération...
              </span>
            </div>
          )}
        </div>

        {/* Global Progress Bar */}
        <div className="w-full bg-navy-light/5 rounded-full h-2 mt-2">
          <div
            className="bg-teal h-2 rounded-full transition-all duration-500"
            style={{
              width: `${steps.length > 0 ? (doneCount / steps.length) * 100 : 0}%`,
            }}
          />
        </div>
      </CardContent>
    </Card>
  );
}
