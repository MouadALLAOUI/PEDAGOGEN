'use client';

import { useState } from 'react';
import {
  Calendar, Clock, AlertCircle, ChevronDown, ChevronUp,
  Sparkles, Palmtree
} from 'lucide-react';
import {
  MOROCCO_HOLIDAYS_2025_2026,
  computeClassTeachingVolume,
  type TeachingVolumeStats
} from '@/lib/curriculum/moroccoSchoolCalendar';
import type { CollegeClass } from '@/types/student';

interface SchoolCalendarWidgetProps {
  entries: Array<{
    classe_id?: string | null;
    date: string;
    heure_debut?: string;
    heure_fin?: string;
    statut: string;
  }>;
  classes: CollegeClass[];
  selectedClasseId?: string;
}

export function SchoolCalendarWidget({
  entries,
  classes,
  selectedClasseId,
}: SchoolCalendarWidgetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeClassId, setActiveClassId] = useState<string>(selectedClasseId || (classes[0]?.id || ''));
  const [weeklyHours, setWeeklyHours] = useState<number>(2); // 2h ou 3h par semaine au collège marocain

  // Filter entries for the selected class or all classes
  const filteredEntries = activeClassId
    ? entries.filter((e) => e.classe_id === activeClassId)
    : entries;

  const volumeStats: TeachingVolumeStats = computeClassTeachingVolume(filteredEntries, weeklyHours);

  const todayStr = new Date().toISOString().slice(0, 10);
  const nextHoliday = volumeStats.prochainesVacances;

  return (
    <div className="rounded-xl border border-teal/20 bg-white shadow-xs overflow-hidden transition-all">
      {/* Header bar / accordion toggle */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-5 py-3.5 flex items-center justify-between bg-teal/5 hover:bg-teal/10 transition-colors cursor-pointer text-left"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-teal/15 text-teal flex items-center justify-center shrink-0">
            <Calendar size={17} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-display text-sm font-bold text-navy">
                Calendrier Scolaire Officiel & Volume Horaire MEN
              </h3>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-teal/15 text-teal border border-teal/20">
                Maroc · Collège
              </span>
            </div>
            <p className="text-xs text-muted mt-0.5">
              {volumeStats.semainesActives} semaines enseignées · Volume horaire réel :{' '}
              <strong className="text-teal font-semibold">{volumeStats.heuresRealisees}h</strong> / {volumeStats.volumePrevuAnnuel}h
              {nextHoliday && (
                <span className="ml-2 text-amber-700 font-medium">
                  · Prochaines vacances : {nextHoliday.nom} ({new Date(nextHoliday.dateDebut).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })})
                </span>
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs font-semibold text-teal shrink-0">
          <span>{isOpen ? 'Masquer' : 'Afficher le détail'}</span>
          {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </div>
      </button>

      {/* Expanded details */}
      {isOpen && (
        <div className="p-5 border-t border-teal/15 space-y-6 bg-parchment/10">
          {/* Controls: Class Selector & Hours per week */}
          <div className="flex flex-wrap items-center justify-between gap-4 p-3.5 rounded-xl bg-white border border-border">
            <div className="flex items-center gap-3">
              <label htmlFor="calendar-class-select" className="text-xs font-bold text-navy">Classe analysée :</label>
              <select
                id="calendar-class-select"
                aria-label="Sélectionner une classe"
                value={activeClassId}
                onChange={(e) => setActiveClassId(e.target.value)}
                className="px-3 py-1.5 rounded-lg border border-border bg-white text-xs font-medium text-navy focus:outline-none focus:ring-2 focus:ring-teal/30"
              >
                <option value="">Toutes les classes cumulées</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.niveau})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-3">
              <label htmlFor="calendar-hours-select" className="text-xs font-bold text-navy">Dotation horaire :</label>
              <select
                id="calendar-hours-select"
                aria-label="Dotation horaire hebdomadaire"
                value={weeklyHours}
                onChange={(e) => setWeeklyHours(Number(e.target.value))}
                className="px-3 py-1.5 rounded-lg border border-border bg-white text-xs font-medium text-navy focus:outline-none focus:ring-2 focus:ring-teal/30"
              >
                <option value={1}>1h / semaine (34h annuelles)</option>
                <option value={2}>2h / semaine (68h annuelles - standard Collège)</option>
                <option value={3}>3h / semaine (102h annuelles)</option>
                <option value={4}>4h / semaine (136h annuelles)</option>
              </select>
            </div>
          </div>

          {/* KPI Cards: Heures réalisées, Taux, Semaines restantes */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-xl border border-border bg-white">
              <div className="flex items-center gap-2 text-xs text-muted font-medium mb-1">
                <Clock size={14} className="text-teal" />
                Heures Réalisées
              </div>
              <p className="text-2xl font-bold text-navy">{volumeStats.heuresRealisees}h</p>
              <p className="text-[11px] text-muted mt-0.5">{volumeStats.seancesRealisees} séances effectives</p>
            </div>

            <div className="p-3.5 rounded-xl border border-border bg-white">
              <div className="flex items-center gap-2 text-xs text-muted font-medium mb-1">
                <Sparkles size={14} className="text-amber" />
                Progression Annuelle
              </div>
              <p className="text-2xl font-bold text-teal">{volumeStats.tauxRealisation}%</p>
              <div className="w-full bg-muted/15 rounded-full h-1.5 mt-2 overflow-hidden">
                <div
                  className="bg-teal h-1.5 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, volumeStats.tauxRealisation)}%` }}
                />
              </div>
            </div>

            <div className="p-3.5 rounded-xl border border-border bg-white">
              <div className="flex items-center gap-2 text-xs text-muted font-medium mb-1">
                <Calendar size={14} className="text-navy" />
                Semaines Utiles
              </div>
              <p className="text-2xl font-bold text-navy">34 sem.</p>
              <p className="text-[11px] text-muted mt-0.5">{volumeStats.semainesRestantes} semaines restantes</p>
            </div>

            <div className="p-3.5 rounded-xl border border-border bg-white">
              <div className="flex items-center gap-2 text-xs text-muted font-medium mb-1">
                <AlertCircle size={14} className="text-gold" />
                Planifiées / En attente
              </div>
              <p className="text-2xl font-bold text-navy">{volumeStats.heuresPlanifiees}h</p>
              <p className="text-[11px] text-muted mt-0.5">{volumeStats.seancesPlanifiees} séances à venir</p>
            </div>
          </div>

          {/* Official Moroccan Calendar Grid */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-navy uppercase tracking-wider flex items-center gap-1.5">
                <Palmtree size={14} className="text-teal" />
                Calendrier des Vacances et Jours Fériés Scolaires (Maroc)
              </h4>
              <span className="text-[11px] text-muted">Année scolaire 2025 - 2026</span>
            </div>

            <div className="grid md:grid-cols-2 gap-2.5 max-h-60 overflow-y-auto pr-1">
              {MOROCCO_HOLIDAYS_2025_2026.map((h) => {
                const isPast = h.dateFin < todayStr;
                const isCurrent = todayStr >= h.dateDebut && todayStr <= h.dateFin;
                return (
                  <div
                    key={h.id}
                    className={`p-3 rounded-lg border text-xs flex items-center justify-between gap-3 ${
                      isCurrent
                        ? 'border-amber-400 bg-amber-50/80 shadow-xs ring-1 ring-amber-400'
                        : isPast
                        ? 'border-border/60 bg-white/60 opacity-70'
                        : 'border-border bg-white'
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-navy truncate">{h.nom}</span>
                        {isCurrent && (
                          <span className="px-1.5 py-0.2 rounded bg-amber-200 text-amber-900 font-bold text-[9px]">
                            EN COURS
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-muted font-arabic mt-0.5" dir="rtl">
                        {h.nomArabe}
                      </p>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="font-mono font-medium text-navy block text-[11px]">
                        {new Date(h.dateDebut).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                        {h.dateDebut !== h.dateFin && (
                          <> → {new Date(h.dateFin).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}</>
                        )}
                      </span>
                      <span className="text-[10px] text-teal font-semibold">
                        {h.dureeJours} {h.dureeJours === 1 ? 'jour' : 'jours'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>
      )}
    </div>
  );
}
