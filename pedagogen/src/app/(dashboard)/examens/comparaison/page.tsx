'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, GitCompare, Loader2, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { PageTransition } from '@/components/layout/PageTransition';
import { Badge } from '@/components/ui/Badge';
import { Select } from '@/components/ui/Select';
import type { CollegeClass } from '@/types/student';

interface ComparaisonData {
  exams: Array<{ id: string; titre: string; exam_date: string; total_points: number }>;
  students: Array<{
    id: string;
    nom: string;
    prenom: string;
    cne: string;
    notes: Array<{ examId: string; norm20: number | null }>;
    evolution: number | null;
  }>;
}

function noteColor(norm20: number | null): string {
  if (norm20 === null) return 'text-muted';
  if (norm20 < 5) return 'text-red';
  if (norm20 < 10) return 'text-amber';
  return 'text-green';
}

export default function ComparaisonPage() {
  const router = useRouter();
  const [classes, setClasses] = useState<CollegeClass[]>([]);
  const [classeId, setClasseId] = useState('');
  const [data, setData] = useState<ComparaisonData | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch('/api/classes')
      .then((r) => r.json())
      .then((d) => setClasses(d.classes || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!classeId) { setData(null); return; }
    setLoading(true);
    fetch(`/api/examens/comparaison?classeId=${classeId}`)
      .then((r) => r.json())
      .then((d) => setData(d.error ? { exams: [], students: [] } : d))
      .catch(() => setData({ exams: [], students: [] }))
      .finally(() => setLoading(false));
  }, [classeId]);

  return (
    <PageTransition>
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Header */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-teal via-teal-dark to-navy p-6 lg:p-8 text-white">
          <div className="absolute top-0 right-0 w-56 h-56 bg-teal-light/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
          <div className="relative z-10">
            <button onClick={() => router.push('/examens')} className="flex items-center gap-1.5 text-white/60 text-xs mb-3 hover:text-white transition-colors">
              <ArrowLeft size={13} />Retour aux examens
            </button>
            <div className="flex items-center gap-4">
              <div className="w-11 h-11 rounded-xl bg-white/15 backdrop-blur flex items-center justify-center shrink-0">
                <GitCompare size={20} />
              </div>
              <div>
                <h1 className="font-display text-2xl lg:text-3xl font-bold tracking-tight">Comparaison des Évaluations</h1>
                <p className="text-white/60 text-sm mt-0.5">Progression des élèves à travers les examens d&apos;une classe</p>
              </div>
            </div>
          </div>
        </div>

        {/* Class selector */}
        <div className="max-w-xs">
          <Select
            label="Classe"
            value={classeId}
            onChange={(e) => setClasseId(e.target.value)}
            placeholder="Choisir une classe"
            options={classes.map((c) => ({ value: c.id, label: `${c.name} (${c.niveau})` }))}
          />
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20"><Loader2 size={24} className="animate-spin text-teal" /></div>
        ) : !classeId ? (
          <div className="rounded-xl border border-border bg-white p-16 text-center">
            <GitCompare size={24} className="text-muted/50 mx-auto mb-3" />
            <p className="text-sm text-muted font-medium">Choisissez une classe pour voir la progression</p>
          </div>
        ) : !data || data.exams.length === 0 ? (
          <div className="rounded-xl border border-border bg-white p-16 text-center">
            <p className="text-sm text-muted font-medium">Aucun examen lié à cette classe</p>
          </div>
        ) : (
          <div className="rounded-xl border border-border bg-white overflow-x-auto">
            <table className="w-full text-sm min-w-[600px]">
              <thead>
                <tr className="bg-parchment-dark/50 border-b border-border text-xs text-muted">
                  <th className="text-left font-medium px-4 py-2.5">Élève</th>
                  {data.exams.map((e) => (
                    <th key={e.id} className="font-medium px-2 py-2.5 text-center" title={e.titre}>
                      {e.titre.length > 22 ? e.titre.slice(0, 22) + '…' : e.titre}
                      <span className="block text-[10px] opacity-60">{e.exam_date}</span>
                    </th>
                  ))}
                  <th className="font-medium px-3 py-2.5 text-center">Évolution</th>
                </tr>
              </thead>
              <tbody>
                {data.students.map((s) => (
                  <tr key={s.id} className="border-b border-border/50 last:border-0 hover:bg-parchment-dark/20 transition-colors">
                    <td className="px-4 py-2">
                      <Link href={`/students/${s.id}`} className="text-xs font-medium text-navy hover:text-teal transition-colors">
                        {s.nom} {s.prenom}
                      </Link>
                    </td>
                    {s.notes.map((n, i) => (
                      <td key={i} className={`px-2 py-2 text-center text-xs font-bold ${noteColor(n.norm20)}`}>
                        {n.norm20 ?? '—'}
                      </td>
                    ))}
                    <td className="px-3 py-2 text-center">
                      {s.evolution === null ? (
                        <span className="text-xs text-muted">—</span>
                      ) : s.evolution > 0 ? (
                        <Badge variant="green"><TrendingUp size={10} className="inline mr-1" />+{s.evolution}</Badge>
                      ) : s.evolution < 0 ? (
                        <Badge variant="red"><TrendingDown size={10} className="inline mr-1" />{s.evolution}</Badge>
                      ) : (
                        <Badge variant="muted"><Minus size={10} className="inline mr-1" />0</Badge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </PageTransition>
  );
}
