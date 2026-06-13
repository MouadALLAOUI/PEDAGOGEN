'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Sparkles, FileText, Zap, Presentation, ArrowRight, Check, GraduationCap, Settings } from 'lucide-react';
import { useAuth } from '@/components/auth/AuthProvider';

const STEPS = [
  {
    title: 'Bienvenue sur PEDAGOGEN',
    description: 'Votre assistant pédagogique IA pour préparer vos cours de collège au Maroc. Générez fiches, planifications, examens et présentations en quelques clics.',
    icon: Sparkles,
    color: 'bg-teal/10 text-teal',
  },
  {
    title: '3 Modes de Génération',
    description: (
      <div className="space-y-3 text-left">
        {[
          { mode: 'Complet', icon: FileText, desc: 'Tous les documents en une fois — fiche, cours, gestion de classe, présentation et images.', color: 'text-green', bg: 'bg-green/8' },
          { mode: 'Sélectif', icon: Presentation, desc: 'Choisissez précisément les documents dont vous avez besoin.', color: 'text-amber', bg: 'bg-amber/8' },
          { mode: 'Rapide', icon: Zap, desc: 'Un résumé Markdown structuré en quelques secondes.', color: 'text-teal', bg: 'bg-teal/8' },
        ].map((m) => (
          <div key={m.mode} className="flex items-start gap-3 p-3 rounded-xl bg-white/5">
            <div className={`w-8 h-8 rounded-lg ${m.bg} ${m.color} flex items-center justify-center shrink-0 mt-0.5`}>
              <m.icon size={15} />
            </div>
            <div>
              <p className="text-sm font-semibold text-navy">Mode {m.mode}</p>
              <p className="text-xs text-muted">{m.desc}</p>
            </div>
          </div>
        ))}
      </div>
    ),
    icon: GraduationCap,
    color: 'bg-amber/10 text-amber',
  },
  {
    title: 'Complétez Votre Profil',
    description: 'Renseignez votre matière principale et votre établissement pour des générations plus pertinentes et personnalisées.',
    icon: Settings,
    color: 'bg-navy/5 text-navy',
    action: { label: 'Configurer mon profil', href: '/profile' },
  },
];

export function OnboardingWizard() {
  const { profile, loading } = useAuth();
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    if (loading) return;
    const done = localStorage.getItem('pedagogen_onboarding_done');
    if (done === 'true') {
      setDismissed(true);
      return;
    }
    if (profile && profile.full_name) {
      localStorage.setItem('pedagogen_onboarding_done', 'true');
      setDismissed(true);
    } else {
      setDismissed(false);
    }
  }, [profile, loading]);

  const handleComplete = () => {
    localStorage.setItem('pedagogen_onboarding_done', 'true');
    setDismissed(true);
  };

  if (dismissed || loading) return null;

  const currentStep = STEPS[step];
  if (!currentStep) return null;

  const isLast = step === STEPS.length - 1;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy/50 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-lg rounded-2xl bg-white shadow-2xl animate-slide-up overflow-hidden">
        {/* Progress bar */}
        <div className="h-1 bg-parchment-dark">
          <div
            className="h-full bg-teal transition-all duration-500"
            style={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
          />
        </div>

        <div className="p-6 lg:p-8 space-y-6">
          {/* Step indicator */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {STEPS.map((_, i) => (
                <div
                  key={i}
                  className={`w-2 h-2 rounded-full transition-all ${
                    i === step ? 'bg-teal w-6' : i < step ? 'bg-teal/50' : 'bg-border'
                  }`}
                />
              ))}
            </div>
            <span className="text-xs text-muted">{step + 1} / {STEPS.length}</span>
          </div>

          {/* Icon */}
          <div className={`w-14 h-14 rounded-2xl ${currentStep.color} flex items-center justify-center`}>
            <currentStep.icon size={28} />
          </div>

          {/* Content */}
          <div>
            <h2 className="font-display text-xl font-bold text-navy mb-2">{currentStep.title}</h2>
            {typeof currentStep.description === 'string' ? (
              <p className="text-sm text-muted leading-relaxed">{currentStep.description}</p>
            ) : (
              currentStep.description
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between pt-2">
            <button
              onClick={handleComplete}
              className="text-xs text-muted hover:text-navy transition-colors"
            >
              Passer
            </button>

            <div className="flex items-center gap-3">
              {currentStep.action ? (
                <button
                  onClick={() => {
                    handleComplete();
                    router.push(currentStep.action!.href);
                  }}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-teal text-white text-sm font-semibold hover:bg-teal-dark transition-colors"
                >
                  {currentStep.action.label}
                  <ArrowRight size={14} />
                </button>
              ) : (
                <button
                  onClick={() => {
                    if (isLast) {
                      handleComplete();
                    } else {
                      setStep(step + 1);
                    }
                  }}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-teal text-white text-sm font-semibold hover:bg-teal-dark transition-colors"
                >
                  {isLast ? (
                    <>Commencer <Check size={14} /></>
                  ) : (
                    <>Suivant <ArrowRight size={14} /></>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
