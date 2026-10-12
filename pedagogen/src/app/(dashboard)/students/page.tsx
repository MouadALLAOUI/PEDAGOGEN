'use client';

import { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import {
  GraduationCap,
  Users,
  Plus,
  Calendar,
  Search,
  BookOpen,
  ArrowRight,
  Sparkles,
  ChevronDown,
  X,
  Loader2,
  Layers,
  Trash2,
  CheckCircle2,
} from 'lucide-react';
import { PageTransition } from '@/components/layout/PageTransition';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import toast from 'react-hot-toast';
import type { AcademicSeason, CollegeClass, NiveauCollege } from '@/types/student';

export default function StudentsPage() {
  const [seasons, setSeasons] = useState<AcademicSeason[]>([]);
  const [activeSeason, setActiveSeason] = useState<AcademicSeason | null>(null);
  const [classes, setClasses] = useState<CollegeClass[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter & Search
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedNiveau, setSelectedNiveau] = useState<NiveauCollege | 'ALL'>('ALL');

  // Modals
  const [mounted, setMounted] = useState(false);
  const [showCreateClassModal, setShowCreateClassModal] = useState(false);
  const [showSeasonModal, setShowSeasonModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isAnyModalOpen = showCreateClassModal || showSeasonModal;

  useEffect(() => {
    if (!isAnyModalOpen) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowCreateClassModal(false);
        setShowSeasonModal(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isAnyModalOpen]);

  // New Class Form State
  const [newClassNiveau, setNewClassNiveau] = useState<NiveauCollege>('2AC');
  const [newClassName, setNewClassName] = useState('');
  const [newClassSubject, setNewClassSubject] = useState('Informatique');
  const [newClassRoom, setNewClassRoom] = useState('');

  // New Season Form State
  const [newSeasonCode, setNewSeasonCode] = useState('2026/2027');
  const [newSeasonLabel, setNewSeasonLabel] = useState('Année Scolaire 2026/2027');

  // Load Seasons & Classes
  const loadData = async (seasonId?: string) => {
    try {
      setLoading(true);
      const resSeasons = await fetch('/api/students/seasons');
      const dataSeasons = await resSeasons.json();

      if (dataSeasons.seasons) {
        setSeasons(dataSeasons.seasons);
        const current = seasonId
          ? dataSeasons.seasons.find((s: AcademicSeason) => s.id === seasonId)
          : dataSeasons.currentSeason || dataSeasons.seasons[0];
        setActiveSeason(current);

        if (current) {
          const resClasses = await fetch(`/api/students/classes?seasonId=${current.id}`);
          const dataClasses = await resClasses.json();
          setClasses(dataClasses.classes || []);
        }
      }
    } catch (err) {
      toast.error('Erreur de chargement des données');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSelectSeason = async (season: AcademicSeason) => {
    setActiveSeason(season);
    setLoading(true);
    try {
      const res = await fetch(`/api/students/classes?seasonId=${season.id}`);
      const data = await res.json();
      setClasses(data.classes || []);
    } catch {
      toast.error('Erreur chargement des classes');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeSeason) {
      toast.error('Aucune saison active sélectionnée');
      return;
    }
    if (!newClassName.trim()) {
      toast.error('Le nom de la classe est requis');
      return;
    }

    setSubmitting(true);
    try {
      const fullName = newClassName.startsWith(newClassNiveau)
        ? newClassName.trim()
        : `${newClassNiveau} ${newClassName.trim()}`;

      const res = await fetch('/api/students/classes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          season_id: activeSeason.id,
          niveau: newClassNiveau,
          name: fullName,
          matiere: newClassSubject,
          room: newClassRoom,
        }),
      });

      if (!res.ok) throw new Error('Échec de la création');
      const data = await res.json();
      toast.success(`Classe "${data.class.name}" créée avec succès`);
      setShowCreateClassModal(false);
      setNewClassName('');
      setNewClassRoom('');
      loadData(activeSeason.id);
    } catch (err: any) {
      toast.error(err.message || 'Erreur lors de la création');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateSeason = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch('/api/students/seasons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: newSeasonCode.trim(),
          label: newSeasonLabel.trim(),
          is_current: true,
        }),
      });

      if (!res.ok) throw new Error('Échec de la création');
      const data = await res.json();
      toast.success(`Saison "${data.season.code}" configurée`);
      setShowSeasonModal(false);
      loadData(data.season.id);
    } catch (err: any) {
      toast.error(err.message || 'Erreur création année');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteClass = async (classId: string, className: string) => {
    if (!confirm(`Supprimer la classe "${className}" et tous ses élèves associés ?`)) return;
    try {
      const res = await fetch(`/api/students/classes/${classId}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success(`Classe "${className}" supprimée`);
        setClasses(prev => prev.filter(c => c.id !== classId));
      } else {
        toast.error('Erreur lors de la suppression');
      }
    } catch {
      toast.error('Erreur serveur');
    }
  };

  // Filtered Classes
  const filteredClasses = useMemo(() => {
    return classes.filter(c => {
      const matchesSearch = c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.niveau.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.matiere.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesNiveau = selectedNiveau === 'ALL' || c.niveau === selectedNiveau;
      return matchesSearch && matchesNiveau;
    });
  }, [classes, searchTerm, selectedNiveau]);

  // Aggregate Stats
  const totalStudents = useMemo(() => {
    return classes.reduce((sum, c) => sum + (c.student_count || 0), 0);
  }, [classes]);

  return (
    <PageTransition>
      <div className="space-y-6 max-w-7xl mx-auto">
        
        {/* Top Header Banner */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-navy via-navy-light to-teal p-6 lg:p-8 text-white shadow-lg">
          <div className="absolute top-0 right-0 w-80 h-80 bg-teal-light/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none" />
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-widest text-teal-light px-2.5 py-0.5 rounded-full bg-white/10 flex items-center gap-1.5">
                  <GraduationCap size={14} />
                  Suivi Pédagogique & Didactique Collège
                </span>
                {activeSeason && (
                  <span className="text-xs font-mono font-bold bg-gold/20 text-gold-light px-2 py-0.5 rounded-md border border-gold/30">
                    {activeSeason.code}
                  </span>
                )}
              </div>
              <h1 className="font-display text-2xl lg:text-3xl font-bold tracking-tight">
                Gestion des Classes & Élèves
              </h1>
              <p className="text-white/70 text-xs max-w-2xl leading-relaxed">
                Tableau de bord centralisé pour le suivi personnalisé : assiduité, notes, états émotionnels, besoins de remédiation TaRL et analyse psycho-pédagogique par IA.
              </p>
            </div>

            {/* Actions & Season Switcher */}
            <div className="flex flex-wrap items-center gap-2.5">
              {/* Season Selector */}
              <div className="relative inline-block text-left">
                <div className="flex items-center bg-white/10 backdrop-blur-md rounded-xl p-1 border border-white/20">
                  <Calendar size={15} className="text-teal-light ml-2 mr-1.5" />
                  <select
                    value={activeSeason?.id || ''}
                    onChange={(e) => {
                      const found = seasons.find(s => s.id === e.target.value);
                      if (found) handleSelectSeason(found);
                    }}
                    className="bg-transparent text-xs font-bold text-white pr-7 pl-1 py-1 focus:outline-none cursor-pointer appearance-none"
                  >
                    {seasons.map(s => (
                      <option key={s.id} value={s.id} className="text-navy bg-white">
                        {s.code} {s.is_current ? '(En cours)' : ''}
                      </option>
                    ))}
                  </select>
                  <ChevronDown size={14} className="text-white/60 -ml-5 mr-2 pointer-events-none" />
                </div>
              </div>

              <Button
                variant="secondary"
                size="sm"
                onClick={() => setShowSeasonModal(true)}
                className="bg-white/10 hover:bg-white/20 text-white border-white/20 text-xs"
              >
                <Plus size={14} className="mr-1" />
                Année Scolaire
              </Button>

              <Button
                size="sm"
                onClick={() => setShowCreateClassModal(true)}
                className="bg-teal hover:bg-teal-dark text-white font-bold text-xs shadow-md"
              >
                <Plus size={15} className="mr-1" />
                Nouvelle Classe
              </Button>
            </div>
          </div>
        </div>

        {/* Metric Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="border-border shadow-sm hover:border-teal/50 transition-colors">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Élèves Inscrits</span>
                <span className="text-2xl font-black text-navy">{totalStudents}</span>
                <span className="text-[10px] text-muted block mt-0.5">Dans {classes.length} classe(s)</span>
              </div>
              <div className="w-10 h-10 rounded-xl bg-teal/10 flex items-center justify-center text-teal">
                <Users size={20} />
              </div>
            </CardContent>
          </Card>

          <Card className="border-border shadow-sm hover:border-teal/50 transition-colors">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Classes Actives</span>
                <span className="text-2xl font-black text-navy">{classes.length}</span>
                <span className="text-[10px] text-muted block mt-0.5">Collège (1AC / 2AC / 3AC)</span>
              </div>
              <div className="w-10 h-10 rounded-xl bg-navy/10 flex items-center justify-center text-navy">
                <Layers size={20} />
              </div>
            </CardContent>
          </Card>

          <Card className="border-border shadow-sm hover:border-teal/50 transition-colors">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Année Scolaire</span>
                <span className="text-2xl font-black text-teal">{activeSeason?.code || '2026/2027'}</span>
                <span className="text-[10px] text-muted block mt-0.5">Saison didactique active</span>
              </div>
              <div className="w-10 h-10 rounded-xl bg-gold/10 flex items-center justify-center text-gold-600">
                <Calendar size={20} />
              </div>
            </CardContent>
          </Card>

          <Card className="border-border shadow-sm hover:border-teal/50 transition-colors">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Conseiller IA</span>
                <span className="text-base font-black text-navy flex items-center gap-1">
                  <Sparkles size={16} className="text-teal" />
                  Actif
                </span>
                <span className="text-[10px] text-emerald-600 font-bold block mt-0.5">Prêt pour diagnostic</span>
              </div>
              <div className="w-10 h-10 rounded-xl bg-teal/10 flex items-center justify-center text-teal">
                <Sparkles size={20} />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filter & Search Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-border shadow-sm">
          {/* Level tabs */}
          <div className="flex items-center gap-1 w-full sm:w-auto overflow-x-auto">
            {(['ALL', '1AC', '2AC', '3AC'] as const).map((lvl) => (
              <button
                key={lvl}
                onClick={() => setSelectedNiveau(lvl)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                  selectedNiveau === lvl
                    ? 'bg-navy text-parchment shadow-sm'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                {lvl === 'ALL' ? 'Toutes les classes' : lvl}
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-64">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Rechercher une classe..."
              className="pl-9 text-xs h-9"
            />
          </div>
        </div>

        {/* Classes Grid */}
        {loading ? (
          <div className="p-12 text-center text-muted flex flex-col items-center justify-center gap-2">
            <Loader2 size={24} className="animate-spin text-teal" />
            <span className="text-xs">Chargement des classes...</span>
          </div>
        ) : filteredClasses.length === 0 ? (
          <div className="p-12 bg-white rounded-2xl border border-dashed border-border text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-teal/10 text-teal flex items-center justify-center mx-auto">
              <Layers size={24} />
            </div>
            <div>
              <h3 className="text-base font-display font-bold text-navy">Aucune classe trouvée</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                {searchTerm
                  ? 'Aucun résultat ne correspond à votre recherche.'
                  : `Créez votre première classe pour l'année ${activeSeason?.code || '2026/2027'} pour commencer le suivi.`}
              </p>
            </div>
            <Button
              onClick={() => setShowCreateClassModal(true)}
              className="bg-teal hover:bg-teal-dark text-white font-bold text-xs"
            >
              <Plus size={14} className="mr-1.5" />
              Créer une classe
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredClasses.map((cls) => (
              <div
                key={cls.id}
                className="bg-white rounded-2xl border border-border hover:border-teal hover:shadow-md transition-all duration-200 overflow-hidden flex flex-col justify-between"
              >
                <div>
                  {/* Card Header */}
                  <div className="p-5 border-b border-border/60 bg-gradient-to-r from-slate-50/70 to-white flex items-start justify-between gap-2">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-navy text-white font-mono">
                          {cls.niveau}
                        </span>
                        {cls.room && (
                          <span className="text-[10px] text-slate-500 font-medium bg-slate-100 px-2 py-0.5 rounded">
                            {cls.room}
                          </span>
                        )}
                      </div>
                      <h3 className="text-base font-bold text-navy tracking-tight">{cls.name}</h3>
                      <p className="text-xs text-slate-500 flex items-center gap-1">
                        <BookOpen size={12} className="text-teal" />
                        <span>{cls.matiere}</span>
                      </p>
                    </div>

                    <button
                      onClick={() => handleDeleteClass(cls.id, cls.name)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                      title="Supprimer la classe"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>

                  {/* Card Body stats */}
                  <div className="p-5 space-y-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500 flex items-center gap-1.5">
                        <Users size={14} className="text-slate-400" />
                        Effectif élèves
                      </span>
                      <span className="font-bold text-navy font-mono">
                        {cls.student_count || 0} élève(s)
                      </span>
                    </div>

                    {cls.description && (
                      <p className="text-xs text-slate-600 line-clamp-2 bg-slate-50 p-2.5 rounded-lg border border-border/40">
                        {cls.description}
                      </p>
                    )}
                  </div>
                </div>

                {/* Card Footer Actions */}
                <div className="p-4 bg-slate-50 border-t border-border flex items-center justify-between gap-2">
                  <span className="text-[11px] font-mono text-slate-400">
                    Saison {activeSeason?.code}
                  </span>
                  <Link
                    href={`/students/classes/${cls.id}`}
                    className="px-3 py-1.5 rounded-lg bg-teal text-white hover:bg-teal-dark font-bold text-xs flex items-center gap-1.5 shadow-sm transition-colors"
                  >
                    <span>Ouvrir Classe</span>
                    <ArrowRight size={13} />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ─── MODAL : CRÉER UNE CLASSE ─── */}
        {mounted && showCreateClassModal && createPortal(
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto bg-navy/60 backdrop-blur-sm transition-all"
            onClick={(e) => { if (e.target === e.currentTarget) setShowCreateClassModal(false); }}
          >
            <div className="bg-white rounded-2xl shadow-2xl border border-border w-full max-w-md max-h-[90vh] flex flex-col overflow-hidden my-auto animate-in fade-in zoom-in-95">
              <div className="bg-navy text-white px-6 py-4 flex items-center justify-between border-b-2 border-teal shrink-0">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-teal/20 flex items-center justify-center text-teal-light">
                    <Layers size={18} />
                  </div>
                  <h3 className="font-bold text-sm">Nouvelle Classe de Collège</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowCreateClassModal(false)}
                  className="p-1 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleCreateClass} className="flex flex-col flex-1 overflow-hidden">
                <div className="p-6 space-y-4 text-xs overflow-y-auto flex-1">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Niveau Collégial</label>
                    <div className="grid grid-cols-3 gap-2">
                      {(['1AC', '2AC', '3AC'] as const).map(n => (
                        <button
                          type="button"
                          key={n}
                          onClick={() => setNewClassNiveau(n)}
                          className={`p-2.5 rounded-xl border text-center font-bold font-mono transition-colors ${
                            newClassNiveau === n
                              ? 'bg-navy text-white border-navy shadow-sm'
                              : 'bg-slate-50 text-slate-700 border-border hover:bg-slate-100'
                          }`}
                        >
                          {n}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">
                      Identifiant / Nom de la classe
                    </label>
                    <Input
                      value={newClassName}
                      onChange={(e) => setNewClassName(e.target.value)}
                      placeholder="Ex: Classe 3, Groupe 1..."
                      required
                      className="h-9 text-xs"
                    />
                    <span className="text-[10px] text-slate-400 mt-1 block">
                      Sera affiché comme : <strong>{newClassNiveau} {newClassName || 'Classe X'}</strong>
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="font-bold text-slate-700 block mb-1">Matière</label>
                      <Input
                        value={newClassSubject}
                        onChange={(e) => setNewClassSubject(e.target.value)}
                        placeholder="Informatique, Maths..."
                        className="h-9 text-xs"
                      />
                    </div>
                    <div>
                      <label className="font-bold text-slate-700 block mb-1">Salle / Labo (optionnel)</label>
                      <Input
                        value={newClassRoom}
                        onChange={(e) => setNewClassRoom(e.target.value)}
                        placeholder="Ex: Salle Multimédia 1"
                        className="h-9 text-xs"
                      />
                    </div>
                  </div>

                  <div className="p-3 bg-teal/5 border border-teal/20 rounded-xl text-teal-800 space-y-1">
                    <div className="flex items-center gap-1.5 font-bold">
                      <Calendar size={13} />
                      <span>Rattachement : Année {activeSeason?.code}</span>
                    </div>
                    <p className="text-[11px]">
                      Cette classe sera automatiquement rattachée à la saison active.
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 p-4 border-t border-border bg-slate-50/50 shrink-0">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => setShowCreateClassModal(false)}
                  >
                    Annuler
                  </Button>
                  <Button
                    type="submit"
                    size="sm"
                    disabled={submitting}
                    className="bg-teal hover:bg-teal-dark text-white font-bold"
                  >
                    {submitting ? <Loader2 size={14} className="animate-spin mr-1" /> : <CheckCircle2 size={14} className="mr-1" />}
                    Créer la Classe
                  </Button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}

        {/* ─── MODAL : NOUVELLE ANNÉE SCOLAIRE ─── */}
        {mounted && showSeasonModal && createPortal(
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto bg-navy/60 backdrop-blur-sm transition-all"
            onClick={(e) => { if (e.target === e.currentTarget) setShowSeasonModal(false); }}
          >
            <div className="bg-white rounded-2xl shadow-2xl border border-border w-full max-w-md max-h-[90vh] flex flex-col overflow-hidden my-auto animate-in fade-in zoom-in-95">
              <div className="bg-navy text-white px-6 py-4 flex items-center justify-between border-b-2 border-gold shrink-0">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-gold/20 flex items-center justify-center text-gold-light">
                    <Calendar size={18} />
                  </div>
                  <h3 className="font-bold text-sm">Nouvelle Année Scolaire</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowSeasonModal(false)}
                  className="p-1 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleCreateSeason} className="flex flex-col flex-1 overflow-hidden">
                <div className="p-6 space-y-4 text-xs overflow-y-auto flex-1">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Code de la saison</label>
                    <Input
                      value={newSeasonCode}
                      onChange={(e) => setNewSeasonCode(e.target.value)}
                      placeholder="Ex: 2026/2027, 2027/2028..."
                      required
                      className="h-9 text-xs font-mono"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Libellé</label>
                    <Input
                      value={newSeasonLabel}
                      onChange={(e) => setNewSeasonLabel(e.target.value)}
                      placeholder="Ex: Année Scolaire 2026-2027"
                      required
                      className="h-9 text-xs"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 p-4 border-t border-border bg-slate-50/50 shrink-0">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => setShowSeasonModal(false)}
                  >
                    Annuler
                  </Button>
                  <Button
                    type="submit"
                    size="sm"
                    disabled={submitting}
                    className="bg-navy hover:bg-navy-light text-white font-bold"
                  >
                    {submitting ? <Loader2 size={14} className="animate-spin mr-1" /> : <CheckCircle2 size={14} className="mr-1" />}
                    Ajouter & Activer
                  </Button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}

      </div>
    </PageTransition>
  );
}
