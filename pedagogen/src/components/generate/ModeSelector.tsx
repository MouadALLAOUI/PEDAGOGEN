'use client';

import Link from 'next/link';
import { Clock, TrendingUp, type LucideIcon } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/Card';
import { MODE_DESCRIPTIONS } from '@/lib/validators/generation';
import type { GenerationMode } from '@/types/generation';

interface ModeCard {
  mode: GenerationMode;
  icon: LucideIcon;
}

interface ModeSelectorProps {
  modes: ModeCard[];
  variant?: 'grid' | 'list';
}

export function ModeSelector({ modes, variant = 'grid' }: ModeSelectorProps) {
  if (variant === 'list') {
    return (
      <div className="grid gap-6">
        {modes.map(({ mode, icon: Icon }) => {
          const info = MODE_DESCRIPTIONS[mode];
          if (!info) return null;
          return (
            <Link key={mode} href={`/generate/${mode}`}>
              <Card
                variant="elevated"
                className="group cursor-pointer hover:shadow-xl hover:shadow-navy/5 hover:-translate-y-0.5 transition-all duration-300"
              >
                <CardContent className="flex items-center gap-6 py-6">
                  <div
                    className="w-14 h-14 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-110"
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
    );
  }

  return (
    <div className="grid md:grid-cols-3 gap-6">
      {modes.map(({ mode, icon: Icon }) => {
        const info = MODE_DESCRIPTIONS[mode];
        if (!info) return null;
        return (
          <Link key={mode} href={`/generate/${mode}`}>
            <Card
              variant="elevated"
              className="group cursor-pointer hover:shadow-xl hover:shadow-navy/5 hover:-translate-y-1 transition-all duration-300 h-full"
            >
              <CardContent className="pt-6">
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center mb-4 transition-transform group-hover:scale-110"
                  style={{ backgroundColor: `${info.color}15` }}
                >
                  <Icon size={24} style={{ color: info.color }} />
                </div>
                <h3 className="font-display text-lg font-semibold text-navy mb-2">
                  {info.title}
                </h3>
                <p className="text-sm text-muted mb-4 leading-relaxed">
                  {info.description}
                </p>
                <div className="flex items-center gap-4 text-xs text-muted">
                  <span className="flex items-center gap-1">
                    <Clock size={12} />
                    {info.estimatedTime}
                  </span>
                  <span className="flex items-center gap-1">
                    <TrendingUp size={12} />
                    {info.tokenRange} tokens
                  </span>
                </div>
                <div
                  className="mt-4 h-1 rounded-full opacity-20"
                  style={{ backgroundColor: info.color }}
                />
              </CardContent>
            </Card>
          </Link>
        );
      })}
    </div>
  );
}
