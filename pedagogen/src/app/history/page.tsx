'use client';

import { useState, useEffect } from 'react';
import { Clock, Download, RefreshCw, Filter } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { PageTransition } from '@/components/layout/PageTransition';
import { MODE_DESCRIPTIONS, type GenerationMode } from '@/types/generation';
import { getHistory, type HistoryEntry } from '@/lib/utils/historyStore';

export default function HistoryPage() {
  const [filter, setFilter] = useState<GenerationMode | 'all'>('all');
  const [history, setHistory] = useState<HistoryEntry[]>([]);

  useEffect(() => {
    setHistory(getHistory());
  }, []);

  const filtered = filter === 'all' ? history : history.filter((h) => h.mode === filter);

  return (
    <PageTransition>
      <div className="max-w-4xl mx-auto space-y-8">
        <div>
          <h1 className="font-display text-2xl font-bold text-navy">
            Historique des Générations
          </h1>
          <p className="text-muted mt-1">
            Consultez et re-téléchargez vos documents générés.
          </p>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 flex-wrap">
          <Filter size={14} className="text-muted" />
          {(['all', 'heavy', 'medium', 'light'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                filter === f
                  ? 'bg-teal text-white'
                  : 'bg-navy-light/5 text-muted hover:bg-navy-light/10'
              }`}
            >
              {f === 'all' ? 'Tous' : MODE_DESCRIPTIONS[f].title}
            </button>
          ))}
        </div>

        {/* Table */}
        {filtered.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center">
              <Clock size={40} className="text-muted/30 mx-auto mb-3" />
              <p className="text-muted font-medium">Aucune génération</p>
              <p className="text-xs text-muted/60 mt-1">
                Vos documents générés apparaîtront ici.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {filtered.map((entry) => {
              const modeInfo = MODE_DESCRIPTIONS[entry.mode as GenerationMode];
              return (
                <Card key={entry.id} variant="elevated">
                  <CardContent className="flex items-center gap-4 py-4">
                    <div
                      className="w-2 h-10 rounded-full flex-shrink-0"
                      style={{ backgroundColor: modeInfo?.color }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-navy truncate">{entry.lecon}</p>
                        <Badge
                          variant={
                            entry.mode === 'heavy'
                              ? 'red'
                              : entry.mode === 'medium'
                              ? 'gold'
                              : 'green'
                          }
                        >
                          {modeInfo?.title}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted mt-0.5">
                        {entry.niveau} • {entry.matiere} • {entry.filesCount} fichier(s) •{' '}
                        {entry.tokensUsed.toLocaleString()} tokens
                      </p>
                    </div>
                    <p className="text-xs text-muted flex-shrink-0 hidden sm:block">
                      {new Date(entry.createdAt).toLocaleDateString('fr-FR')}
                    </p>
                    <div className="flex items-center gap-1">
                      {entry.files.map((file) => (
                        <a
                          key={file.name}
                          href={file.url}
                          download={file.name}
                          className="p-2 rounded-lg hover:bg-teal/10 text-muted hover:text-teal transition-colors"
                        >
                          <Download size={16} />
                        </a>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </PageTransition>
  );
}
