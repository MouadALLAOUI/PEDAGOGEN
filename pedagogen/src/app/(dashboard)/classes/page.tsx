'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Plus, Users, GraduationCap, Upload, BookOpen, Search, CalendarDays, Loader2, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { PageTransition } from '@/components/layout/PageTransition';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Card, CardContent } from '@/components/ui/Card';
import type { CollegeClass } from '@/types/student';

const NIVEAUX = ['1AC', '2AC', '3AC'];

const NIVEAU_BADGE: Record<string, 'teal' | 'gold' | 'green'> = {
  '1AC': 'teal', '2AC': 'gold', '3AC': 'green',
};

export default function ClassesPage() {
  const router = useRouter();
  const [classes, setClasses] = useState<CollegeClass[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [niveauFilter, setNiveauFilter] = useState<string>('all');
  const [showCreate, setShowCreate] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: '', niveau: '1AC', matiere: 'Informatique', room: '' });

  const load = () => {
    setLoading(true);
    fetch('/api/classes')
      .then((r) => r.json())
      .then((data) => setClasses(data.classes || []))
      .catch(() => toast.error('Échec du chargement des classes'))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const handleCreate = async () => {
    if (!form.name.trim()) {
      toast.error('Le nom de la classe est requis');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch('/api/classes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Échec de la création');
      }
      toast.success('Classe créée');
      setShowCreate(false);
      setForm({ name: '', niveau: '1AC', matiere: 'Informatique', room: '' });
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Échec de la création');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (c: CollegeClass) => {
    if (!window.confirm(`Supprimer la classe "${c.name}" et tous ses élèves liés ?`)) return;
    try {
      const res = await fetch(`/api/classes/${c.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      toast.success('Classe supprimée');
      setClasses((prev) => prev.filter((x) => x.id !== c.id));
    } catch {
      toast.error('Échec de la suppression');
    }
  };

  const filtered = classes.filter(
    (c) =>
      (niveauFilter === 'all' || c.niveau === niveauFilter) &&
      (!search.trim() || c.name.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <PageTransition>
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Header */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-teal via-teal-dark to-navy p-6 lg:p-8 text-white">
          <div className="absolute top-0 right-0 w-56 h-56 bg-teal-light/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
          <div className="relative z-10 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-11 h-11 rounded-xl bg-white/15 backdrop-blur flex items-center justify-center shrink-0">
                <GraduationCap size={20} />
              </div>
              <div>
                <h1 className="font-display text-2xl lg:text-3xl font-bold tracking-tight">Gestion des Classes</h1>
                <p className="text-white/60 text-sm mt-0.5">Classes, élèves et import en masse</p>
              </div>
            </div>
            <Button onClick={() => setShowCreate(true)}>
              <Plus size={16} />Nouvelle Classe
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[220px]">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher une classe..."
              className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-border bg-white text-navy text-sm focus:outline-none focus:ring-2 focus:ring-teal/30 focus:border-teal"
            />
          </div>
          <div className="flex gap-1 p-1 bg-parchment-dark rounded-lg">
            {['all', ...NIVEAUX].map((n) => (
              <button
                key={n}
                onClick={() => setNiveauFilter(n)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  niveauFilter === n ? 'bg-white text-teal shadow-sm' : 'text-muted hover:text-navy'
                }`}
              >
                {n === 'all' ? 'Tous' : n}
              </button>
            ))}
          </div>
        </div>

        {/* List */}
        {loading ? (
          <div className="flex items-center justify-center py-20"><Loader2 size={24} className="animate-spin text-teal" /></div>
        ) : filtered.length === 0 ? (
          <div className="rounded-xl border border-border bg-white p-16 text-center">
            <Users size={24} className="text-muted/50 mx-auto mb-3" />
            <p className="text-sm text-muted font-medium">Aucune classe</p>
            <p className="text-xs text-muted/60 mt-1">Créez votre première classe pour commencer.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filtered.map((c) => (
              <Card key={c.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-5 pt-5">
                  <div className="flex items-start justify-between gap-3">
                    <Link href={`/classes/${c.id}`} className="min-w-0 group">
                      <div className="flex items-center gap-2">
                        <h3 className="font-display text-lg font-semibold text-navy truncate group-hover:text-teal transition-colors">{c.name}</h3>
                        <Badge variant={NIVEAU_BADGE[c.niveau] || 'default'}>{c.niveau}</Badge>
                      </div>
                      <p className="text-xs text-muted mt-1">
                        {c.matiere}{c.room ? ` · Salle ${c.room}` : ''} · {c.season_code || ''}
                      </p>
                    </Link>
                    <button
                      onClick={() => handleDelete(c)}
                      className="p-1.5 rounded-md hover:bg-red-50 text-muted hover:text-red transition-colors"
                      title="Supprimer"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>

                  <div className="flex items-center gap-2 mt-4 text-sm text-navy">
                    <Users size={14} className="text-muted" />
                    <span className="font-medium">{c.student_count ?? 0}</span>
                    <span className="text-xs text-muted">élève{(c.student_count ?? 0) > 1 ? 's' : ''}</span>
                  </div>

                  <div className="flex gap-2 mt-4">
                    <Button size="sm" variant="secondary" onClick={() => router.push(`/classes/${c.id}/import`)}>
                      <Upload size={13} />Importer
                    </Button>
                    <Button size="sm" variant="secondary" onClick={() => router.push(`/classes/${c.id}/eleves/new`)}>
                      <Plus size={13} />Élève
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => router.push(`/notebook/${c.id}`)}>
                      <BookOpen size={13} />Carnet
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => router.push(`/classes/${c.id}`)}>
                      Détails
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Create modal */}
        <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Nouvelle Classe">
          <div className="space-y-4">
            <Select
              label="Niveau"
              value={form.niveau}
              onChange={(e) => setForm({ ...form, niveau: e.target.value })}
              options={NIVEAUX.map((n) => ({ value: n, label: n }))}
            />
            <Input label="Nom de la classe" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="ex : 2AC - Classe 3" />
            <Input label="Matière" value={form.matiere} onChange={(e) => setForm({ ...form, matiere: e.target.value })} />
            <Input label="Salle" value={form.room} onChange={(e) => setForm({ ...form, room: e.target.value })} placeholder="optionnel" />
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="secondary" onClick={() => setShowCreate(false)}>Annuler</Button>
              <Button onClick={handleCreate} disabled={saving}>
                {saving ? <Loader2 size={16} className="animate-spin" /> : <CalendarDays size={16} />}
                Créer
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    </PageTransition>
  );
}
