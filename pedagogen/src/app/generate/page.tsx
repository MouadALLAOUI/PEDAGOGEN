'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import {
  Zap,
  FileText,
  Presentation,
  Clock,
  TrendingUp,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/Card';
import { PageTransition } from '@/components/layout/PageTransition';
import { MODE_DESCRIPTIONS, type GenerationMode } from '@/types/generation';

const MODES: { mode: GenerationMode; icon: typeof Zap }[] = [
  { mode: 'heavy', icon: FileText },
  { mode: 'medium', icon: Presentation },
  { mode: 'light', icon: Zap },
];

export default function GeneratePage() {
  const [animated, setAnimated] = useState(false);

  useEffect(() => {
    setAnimated(true);
  }, []);

  return (
    <PageTransition>
      <div className="max-w-4xl mx-auto space-y-8">
        <div>
          <h1 className="font-display text-2xl font-bold text-navy">
            Choisir un Mode de Génération
          </h1>
          <p className="text-muted mt-1">
            Sélectionnez le niveau de détail souhaité pour vos documents pédagogiques.
          </p>
        </div>

        <div className="grid gap-6">
          {MODES.map(({ mode, icon: Icon }, i) => {
            const info = MODE_DESCRIPTIONS[mode];
            return (
              <Link key={mode} href={`/generate/${mode}`}>
                <Card
                  variant="elevated"
                  className="group cursor-pointer hover:shadow-xl hover:shadow-navy/5 hover:-translate-y-0.5 transition-all duration-300"
                  style={{
                    opacity: animated ? 1 : 0,
                    transform: animated ? 'translateY(0)' : 'translateY(20px)',
                    transition: `opacity 0.4s ease-out ${i * 0.1}s, transform 0.4s ease-out ${i * 0.1}s`,
                  }}
                >
                  <CardContent className="flex items-center gap-6 py-6">
                    <div
                      className="w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-110"
                      style={{ backgroundColor: `${info.color}15` }}
                    >
                      <Icon size={28} style={{ color: info.color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-1">
                        <h3 className="font-display text-lg font-semibold text-navy">
                          {info.title}
                        </h3>
                        <div
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: info.color }}
                        />
                      </div>
                      <p className="text-sm text-muted leading-relaxed">
                        {info.description}
                      </p>
                      <div className="flex items-center gap-5 mt-3 text-xs text-muted">
                        <span className="flex items-center gap-1">
                          <Clock size={12} />
                          {info.estimatedTime}
                        </span>
                        <span className="flex items-center gap-1">
                          <TrendingUp size={12} />
                          {info.tokenRange} tokens
                        </span>
                      </div>
                    </div>
                    <div className="hidden sm:block text-muted group-hover:text-teal transition-colors">
                      →
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      </div>
    </PageTransition>
  );
}
