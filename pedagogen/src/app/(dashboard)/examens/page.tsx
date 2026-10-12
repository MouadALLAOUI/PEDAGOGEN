'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, ClipboardCheck, Loader2, CalendarDays, Trash2, BarChart3, Copy, GitCompare, BookOpen, FileDown, FileCode } from 'lucide-react';
import toast from 'react-hot-toast';
import { PageTransition } from '@/components/layout/PageTransition';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Pagination } from '@/components/ui/Pagination';

interface Examen {
  id: string;
  titre: string;
  exam_date: string;
  duree: number;
  niveau: string;
  classe_ids: string[];
  total_points: number;
}

const NIVEAU_BADGE: Record<string, 'teal' | 'gold' | 'green'> = {
  '1AC': 'teal', '2AC': 'gold', '3AC': 'green',
};

export default function ExamensPage() {
  const router = useRouter();
  const [examens, setExamens] = useState<Examen[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [perPage] = useState(20);

  const load = () => {
    setLoading(true);
    fetch('/api/examens')
      .then((r) => r.json())
      .then((data) => setExamens(data.examens || []))
      .catch(() => toast.error('Échec du chargement des examens'))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const handleDelete = async (exam: Examen) => {
    if (!window.confirm(`Supprimer l'examen "${exam.titre}" et toutes ses notes ?`)) return;
    try {
      // Sauvegarde pour l'annulation
      const detail = await fetch(`/api/examens/${exam.id}`).then((r) => r.json());
      const res = await fetch(`/api/examens/${exam.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      setExamens((prev) => prev.filter((x) => x.id !== exam.id));
      toast((t) => (
        <span className="flex items-center gap-3 text-sm">
          Examen supprimé
          <button
            onClick={async () => {
              try {
                const q = (detail.questions || []).map((qq: any) => ({ numero: qq.numero, type: qq.type, enonce: qq.enonce, bareme: qq.bareme }));
                await fetch('/api/examens', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ titre: detail.examen.titre, exam_date: detail.examen.exam_date, duree: detail.examen.duree, niveau: detail.examen.niveau, classe_ids: detail.examen.classe_ids, questions: q }),
                });
                toast.dismiss(t.id);
                toast.success('Examen restauré');
                load();
              } catch { toast.error('Restauration impossible'); }
            }}
            className="px-2 py-1 rounded bg-teal text-white text-xs font-medium"
          >Annuler</button>
        </span>
      ), { duration: 8000 });
    } catch {
      toast.error('Échec de la suppression');
    }
  };

  const handleDuplicate = async (exam: Examen) => {
    try {
      const res = await fetch(`/api/examens/${exam.id}/duplicate`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Échec de la duplication');
      toast.success('Examen dupliqué — mettez à jour la date');
      router.push(`/examens/${data.examen.id}/grille`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Échec de la duplication');
    }
  };

  const totalPages = Math.max(1, Math.ceil(examens.length / perPage));
  const paged = examens.slice((page - 1) * perPage, page * perPage);

  return (
    <PageTransition>
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Header */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-teal via-teal-dark to-navy p-6 lg:p-8 text-white">
          <div className="absolute top-0 right-0 w-56 h-56 bg-teal-light/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
          <div className="relative z-10 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-11 h-11 rounded-xl bg-white/15 backdrop-blur flex items-center justify-center shrink-0">
                <ClipboardCheck size={20} />
              </div>
              <div>
                <h1 className="font-display text-2xl lg:text-3xl font-bold tracking-tight">Évaluations</h1>
                <p className="text-white/60 text-sm mt-0.5">Création, grille de notation et analyse de classe</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" onClick={() => router.push('/examens/comparaison')} className="border border-white/30 text-white hover:bg-white/15">
                <GitCompare size={16} />Comparaison
              </Button>
              <Button onClick={() => router.push('/examens/new')}>
                <Plus size={16} />Nouvel Examen
              </Button>
            </div>
          </div>
        </div>

        {/* Pipeline hint */}
        <div className="flex items-center gap-2 text-xs text-muted bg-parchment-dark/50 rounded-lg px-4 py-3">
          <span className="font-medium text-navy">Pipeline :</span>
          <span>1. Création</span><span>→</span>
          <span className="font-semibold text-teal">2. Guide du Professeur & Corrigé</span><span>→</span>
          <span>3. Analyse de classe</span>
        </div>

        {/* List */}
        {loading ? (
          <div className="flex items-center justify-center py-20"><Loader2 size={24} className="animate-spin text-teal" /></div>
        ) : examens.length === 0 ? (
          <div className="rounded-xl border border-border bg-white p-16 text-center">
            <ClipboardCheck size={24} className="text-muted/50 mx-auto mb-3" />
            <p className="text-sm text-muted font-medium">Aucun examen</p>
            <p className="text-xs text-muted/60 mt-1">Créez votre première évaluation pour commencer.</p>
            <Button size="sm" className="mt-5" onClick={() => router.push('/examens/new')}><Plus size={13} />Nouvel Examen</Button>
          </div>
        ) : (
          <div className="rounded-xl border border-border bg-white overflow-hidden">
            {paged.map((exam) => (
              <div key={exam.id} className="flex items-center gap-4 px-4 py-4 border-b border-border/50 last:border-0 hover:bg-parchment-dark/30 transition-colors">
                <div className="w-9 h-9 rounded-lg bg-teal/10 text-teal flex items-center justify-center shrink-0">
                  <ClipboardCheck size={16} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-medium text-navy truncate">{exam.titre}</h3>
                    <Badge variant={NIVEAU_BADGE[exam.niveau] || 'default'}>{exam.niveau}</Badge>
                  </div>
                  <p className="text-xs text-muted mt-0.5">
                    <CalendarDays size={11} className="inline mr-1" />
                    {exam.exam_date} · {exam.duree} min · {exam.total_points} pts · {exam.classe_ids.length} classe(s)
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <a
                    href={`/api/examens/${exam.id}/sujet/export`}
                    download
                    className="p-1.5 rounded-md hover:bg-teal-50 text-muted hover:text-teal transition-colors flex items-center gap-1"
                    title="Télécharger le sujet (PDF)"
                  >
                    <FileDown size={15} />
                    <span className="text-[10px] font-semibold font-mono">PDF</span>
                  </a>
                  <a
                    href={`/api/examens/${exam.id}/sujet/export?format=html`}
                    download
                    className="p-1.5 rounded-md hover:bg-teal-50 text-muted hover:text-teal transition-colors flex items-center gap-1"
                    title="Télécharger le sujet (HTML)"
                  >
                    <FileCode size={15} />
                    <span className="text-[10px] font-semibold font-mono">HTML</span>
                  </a>
                  <button
                    onClick={() => router.push(`/examens/${exam.id}/grille`)}
                    className="p-1.5 rounded-md hover:bg-teal-50 text-muted hover:text-teal transition-colors"
                    title="Guide du Professeur & Corrigé officiel"
                  >
                    <BookOpen size={15} />
                  </button>
                  <button
                    onClick={() => handleDuplicate(exam)}
                    className="p-1.5 rounded-md hover:bg-teal-50 text-muted hover:text-teal transition-colors"
                    title="Dupliquer"
                  >
                    <Copy size={15} />
                  </button>
                  <button
                    onClick={() => router.push(`/examens/${exam.id}/analyse`)}
                    className="p-1.5 rounded-md hover:bg-teal-50 text-muted hover:text-teal transition-colors"
                    title="Analyse de classe"
                  >
                    <BarChart3 size={15} />
                  </button>
                  <button
                    onClick={() => handleDelete(exam)}
                    className="p-1.5 rounded-md hover:bg-red-50 text-muted hover:text-red transition-colors"
                    title="Supprimer"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            ))}
            {totalPages > 1 && (
              <Pagination page={page} totalPages={totalPages} totalItems={examens.length} perPage={perPage} onPageChange={setPage} />
            )}
          </div>
        )}
      </div>
    </PageTransition>
  );
}
