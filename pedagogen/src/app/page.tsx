'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import {
  Wand2,
  FileText,
  Presentation,
  FileCheck,
  Clock,
  Zap,
  TrendingUp,
  BookOpen,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { PageTransition } from '@/components/layout/PageTransition';
import { MODE_DESCRIPTIONS } from '@/types/generation';

export default function Dashboard() {
  const [animated, setAnimated] = useState(false);
  const cardsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setAnimated(true);
  }, []);

  const modes = [
    {
      ...MODE_DESCRIPTIONS.heavy,
      mode: 'heavy' as const,
      icon: FileText,
    },
    {
      ...MODE_DESCRIPTIONS.medium,
      mode: 'medium' as const,
      icon: Presentation,
    },
    {
      ...MODE_DESCRIPTIONS.light,
      mode: 'light' as const,
      icon: Zap,
    },
  ];

  return (
    <PageTransition>
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Hero */}
        <div className="relative overflow-hidden rounded-2xl bg-navy p-8 lg:p-12 text-parchment">
          <div className="absolute inset-0 zellige-bg" />
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-teal flex items-center justify-center animate-pulse-teal">
                <BookOpen size={24} className="text-white" />
              </div>
              <Badge variant="teal">v1.0</Badge>
            </div>
            <h1 className="font-display text-3xl lg:text-4xl font-bold mb-3">
              PEDAGOGEN
            </h1>
            <p className="text-parchment/70 text-lg max-w-xl">
              Générez des documents pédagogiques professionnels pour le collège marocain.
              Fiches, planifications, cours, présentations — le tout en quelques clics.
            </p>
          </div>
          {/* Decorative circles */}
          <div className="absolute -right-20 -top-20 w-64 h-64 rounded-full bg-teal/10 blur-3xl" />
          <div className="absolute -right-10 -bottom-10 w-48 h-48 rounded-full bg-gold/10 blur-2xl" />
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Documents générés', value: '0', icon: FileCheck, color: 'text-teal' },
            { label: 'Tokens utilisés', value: '0', icon: TrendingUp, color: 'text-gold' },
            { label: 'Dernière génération', value: 'Aucune', icon: Clock, color: 'text-muted' },
            { label: 'Références uploadées', value: '0', icon: FileText, color: 'text-green' },
          ].map((stat) => (
            <Card key={stat.label}>
              <CardContent className="flex items-center gap-4 py-4">
                <div className={`w-10 h-10 rounded-lg bg-navy-light/5 flex items-center justify-center ${stat.color}`}>
                  <stat.icon size={20} />
                </div>
                <div>
                  <p className="text-2xl font-bold text-navy">{stat.value}</p>
                  <p className="text-xs text-muted">{stat.label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Mode Selection */}
        <div>
          <h2 className="font-display text-xl font-semibold text-navy mb-4">
            Choisir un Mode de Génération
          </h2>
          <div ref={cardsRef} className="grid md:grid-cols-3 gap-6">
            {modes.map((mode, i) => (
              <Link key={mode.mode} href={`/generate/${mode.mode}`}>
                <Card
                  variant="elevated"
                  className="group cursor-pointer hover:shadow-xl hover:shadow-navy/5 hover:-translate-y-1 transition-all duration-300 h-full"
                  style={{
                    opacity: animated ? 1 : 0,
                    transform: animated ? 'translateY(0)' : 'translateY(24px)',
                    transition: `opacity 0.5s ease-out ${i * 0.12}s, transform 0.5s ease-out ${i * 0.12}s`,
                  }}
                >
                  <CardContent className="pt-6">
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center mb-4 transition-transform group-hover:scale-110"
                      style={{ backgroundColor: `${mode.color}15` }}
                    >
                      <mode.icon size={24} style={{ color: mode.color }} />
                    </div>
                    <h3 className="font-display text-lg font-semibold text-navy mb-2">
                      {mode.title}
                    </h3>
                    <p className="text-sm text-muted mb-4 leading-relaxed">
                      {mode.description}
                    </p>
                    <div className="flex items-center gap-4 text-xs text-muted">
                      <span className="flex items-center gap-1">
                        <Clock size={12} />
                        {mode.estimatedTime}
                      </span>
                      <span className="flex items-center gap-1">
                        <TrendingUp size={12} />
                        {mode.tokenRange} tokens
                      </span>
                    </div>
                    <div
                      className="mt-4 h-1 rounded-full opacity-20"
                      style={{ backgroundColor: mode.color }}
                    />
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <Card>
          <CardContent className="py-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <div className="flex-1">
                <h3 className="font-display font-semibold text-navy">Actions Rapides</h3>
                <p className="text-sm text-muted mt-1">
                  Gérez vos fichiers de référence ou consultez votre historique.
                </p>
              </div>
              <div className="flex gap-3">
                <Link
                  href="/references"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-navy-light/5 text-navy text-sm font-medium hover:bg-navy-light/10 transition-colors"
                >
                  <FileText size={16} />
                  Références
                </Link>
                <Link
                  href="/history"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-navy-light/5 text-navy text-sm font-medium hover:bg-navy-light/10 transition-colors"
                >
                  <Clock size={16} />
                  Historique
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </PageTransition>
  );
}
