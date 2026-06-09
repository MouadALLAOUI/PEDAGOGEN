'use client';

import { Check, Loader2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/Card';
import type { GenerationMode } from '@/types/generation';

interface Step {
  id: string;
  label: string;
  status: 'pending' | 'active' | 'done' | 'error';
}

const HEAVY_STEPS: Step[] = [
  { id: 'fiche', label: 'Fiche Pédagogique', status: 'pending' },
  { id: 'planification', label: 'Planification', status: 'pending' },
  { id: 'cours', label: 'Cours Complet', status: 'pending' },
  { id: 'gestion', label: 'Gestion de Classe', status: 'pending' },
  { id: 'resume', label: 'Résumé Élève', status: 'pending' },
  { id: 'pptx', label: 'Présentation PPTX', status: 'pending' },
  { id: 'build', label: 'Compilation des fichiers', status: 'pending' },
];

const MEDIUM_STEPS: Step[] = [
  { id: 'docs', label: 'Documents sélectionnés', status: 'pending' },
  { id: 'build', label: 'Compilation', status: 'pending' },
];

interface GenerationProgressProps {
  mode: GenerationMode;
  activeStep?: string;
  tokens?: number;
}

export function GenerationProgress({ mode, activeStep, tokens = 0 }: GenerationProgressProps) {
  const baseSteps = mode === 'heavy' ? HEAVY_STEPS : MEDIUM_STEPS;

  const steps = baseSteps.map((step) => {
    if (!activeStep) return step;

    const activeIdx = baseSteps.findIndex((s) => s.id === activeStep);
    const stepIdx = baseSteps.findIndex((s) => s.id === step.id);

    if (stepIdx < activeIdx) return { ...step, status: 'done' as const };
    if (stepIdx === activeIdx) return { ...step, status: 'active' as const };
    return { ...step, status: 'pending' as const };
  });

  const doneCount = steps.filter((s) => s.status === 'done').length;

  return (
    <Card>
      <CardContent className="py-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-display font-semibold text-navy">Progression</h3>
          <span className="text-sm font-mono text-teal font-medium">
            {tokens.toLocaleString()} tokens
          </span>
        </div>

        <div className="space-y-2">
          {steps.map((step) => (
            <div
              key={step.id}
              className="flex items-center gap-3 py-2 px-3 rounded-lg transition-all duration-300"
              style={{
                backgroundColor: step.status === 'active' ? 'rgba(13, 148, 136, 0.08)' : undefined,
              }}
            >
              <div className="w-6 h-6 flex items-center justify-center flex-shrink-0">
                {step.status === 'done' && (
                  <div className="w-5 h-5 rounded-full bg-green/10 flex items-center justify-center">
                    <Check size={12} className="text-green" />
                  </div>
                )}
                {step.status === 'active' && (
                  <Loader2 size={16} className="text-teal animate-spin" />
                )}
                {step.status === 'pending' && (
                  <div className="w-2 h-2 rounded-full bg-muted/30" />
                )}
                {step.status === 'error' && (
                  <div className="w-2 h-2 rounded-full bg-red" />
                )}
              </div>
              <span
                className={`text-sm ${
                  step.status === 'active'
                    ? 'text-teal font-medium'
                    : step.status === 'done'
                    ? 'text-muted line-through'
                    : 'text-muted'
                }`}
              >
                {step.label}
              </span>
            </div>
          ))}
        </div>

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
