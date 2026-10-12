'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Upload, UserPlus, BookOpen, Users, Loader2, Search } from 'lucide-react';
import toast from 'react-hot-toast';
import { PageTransition } from '@/components/layout/PageTransition';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import type { CollegeClass } from '@/types/student';

interface EleveRow {
  id: string;
  last_name?: string;
  first_name?: string;
  cne_massar?: string;
  gender?: string;
  student_number?: number | null;
  average_grade?: number | null;
  absence_count?: number | null;
}

export default function ClasseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [classe, setClasse] = useState<CollegeClass | null>(null);
  const [eleves, setEleves] = useState<EleveRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    fetch(`/api/classes/${id}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        setClasse(data.classe);
        setEleves(data.eleves || []);
      })
      .catch((e) => toast.error(e.message || 'Échec du chargement'))
      .finally(() => setLoading(false));
  }, [id]);

  const filtered = eleves.filter(
    (e) =>
      !search.trim() ||
      `${e.last_name || ''} ${e.first_name || ''}`.toLowerCase().includes(search.toLowerCase()) ||
      (e.cne_massar || '').toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <PageTransition>
        <div className="flex items-center justify-center py-20"><Loader2 size={24} className="animate-spin text-teal" /></div>
      </PageTransition>
    );
  }

  if (!classe) {
    return (
      <PageTransition>
        <div className="max-w-5xl mx-auto py-20 text-center">
          <p className="text-muted">Classe introuvable.</p>
          <Link href="/classes" className="text-teal text-sm mt-2 inline-block">← Retour aux classes</Link>
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Header */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-teal via-teal-dark to-navy p-6 lg:p-8 text-white">
          <div className="absolute top-0 right-0 w-56 h-56 bg-teal-light/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
          <div className="relative z-10">
            <button onClick={() => router.push('/classes')} className="flex items-center gap-1.5 text-white/60 text-xs mb-3 hover:text-white transition-colors">
              <ArrowLeft size={13} />Toutes les classes
            </button>
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-11 h-11 rounded-xl bg-white/15 backdrop-blur flex items-center justify-center shrink-0">
                  <Users size={20} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="font-display text-2xl lg:text-3xl font-bold tracking-tight">{classe.name}</h1>
                    <span className="px-2 py-0.5 rounded-full bg-white/15 text-xs font-medium">{classe.niveau}</span>
                  </div>
                  <p className="text-white/60 text-sm mt-0.5">{classe.matiere}{classe.room ? ` · Salle ${classe.room}` : ''}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="secondary" size="sm" onClick={() => router.push(`/classes/${id}/import`)}>
                  <Upload size={13} />Importer CSV/XLSX
                </Button>
                <Button variant="secondary" size="sm" onClick={() => router.push(`/classes/${id}/eleves/new`)}>
                  <UserPlus size={13} />Ajouter élève
                </Button>
                <Button variant="ghost" size="sm" className="text-white hover:bg-white/15" onClick={() => router.push(`/notebook/${id}`)}>
                  <BookOpen size={13} />Carnet de Bord
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Roster */}
        <div>
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <h2 className="font-display text-xl font-semibold text-navy">
              Élèves <span className="text-muted text-sm font-normal">({eleves.length})</span>
            </h2>
            <div className="relative w-64">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Rechercher un élève..."
                className="w-full pl-9 pr-4 py-2 rounded-lg border border-border bg-white text-navy text-sm focus:outline-none focus:ring-2 focus:ring-teal/30 focus:border-teal"
              />
            </div>
          </div>

          {filtered.length === 0 ? (
            <div className="rounded-xl border border-border bg-white p-16 text-center">
              <Users size={24} className="text-muted/50 mx-auto mb-3" />
              <p className="text-sm text-muted font-medium">Aucun élève</p>
              <p className="text-xs text-muted/60 mt-1">Importez une liste CSV/XLSX ou ajoutez les élèves manuellement.</p>
              <div className="flex justify-center gap-2 mt-5">
                <Button size="sm" onClick={() => router.push(`/classes/${id}/import`)}><Upload size={13} />Importer</Button>
                <Button size="sm" variant="secondary" onClick={() => router.push(`/classes/${id}/eleves/new`)}><UserPlus size={13} />Ajouter</Button>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-border bg-white overflow-hidden">
              <div className="grid grid-cols-[40px_1fr_140px_60px_60px_80px] gap-3 px-4 py-2.5 border-b border-border text-xs font-medium text-muted bg-parchment-dark/50">
                <span>N°</span>
                <span>Élève</span>
                <span>CNE</span>
                <span>Genre</span>
                <span className="text-center">Moy.</span>
                <span className="text-right">Dossier</span>
              </div>
              {filtered.map((e, i) => (
                <div key={e.id} className="grid grid-cols-[40px_1fr_140px_60px_60px_80px] gap-3 px-4 py-3 items-center border-b border-border/50 last:border-0 hover:bg-parchment-dark/30 transition-colors">
                  <span className="text-xs text-muted">{e.student_number ?? i + 1}</span>
                  <Link href={`/students/${e.id}`} className="text-sm font-medium text-navy truncate hover:text-teal transition-colors">
                    {e.last_name} {e.first_name}
                  </Link>
                  <span className="text-xs text-muted font-mono">{e.cne_massar || '—'}</span>
                  <Badge variant={e.gender === 'F' ? 'gold' : 'teal'}>{e.gender || 'M'}</Badge>
                  <span className="text-xs text-center font-medium text-navy">
                    {e.average_grade != null ? `${Math.round(e.average_grade)}/20` : '—'}
                  </span>
                  <div className="text-right">
                    <Link href={`/students/${e.id}`} className="text-xs text-teal hover:underline">Voir 360°</Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </PageTransition>
  );
}
