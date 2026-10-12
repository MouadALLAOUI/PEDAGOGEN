'use client';

import { useState, useEffect } from 'react';
import {
  Printer,
  Calendar,
  Layers,
  FileText,
  UserCheck,
  Check,
  Building,
  GraduationCap,
  Sparkles,
} from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import type { CollegeClass } from '@/types/student';

interface PrintDialogProps {
  open: boolean;
  onClose: () => void;
  classes: CollegeClass[];
  defaultClassId?: string;
}

export function PrintDialog({ open, onClose, classes, defaultClassId }: PrintDialogProps) {
  // Classes selection
  const [selectedClasses, setSelectedClasses] = useState<string[]>([]);
  const [selectAllClasses, setSelectAllClasses] = useState(true);

  // Date range
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Statuses (ALL selected by default per spec!)
  const [statuses, setStatuses] = useState({
    planifiee: true,
    realisee: true,
    absence: true,
    reportee: true,
  });

  // Layout & Detail
  const [layout, setLayout] = useState<'class' | 'chrono'>('class');
  const [detail, setDetail] = useState<'compact' | 'detailed'>('compact');

  // Options
  const [includeRecap, setIncludeRecap] = useState(true);
  const [includeSignatures, setIncludeSignatures] = useState(true);
  const [includeHeader, setIncludeHeader] = useState(true);

  // Types to include (Séances, Réunions, Publications)
  const [entryTypes, setEntryTypes] = useState({
    SESSION: true,
    MEETING: true,
    PUBLICATION: true,
  });

  // Profile fields for official header
  const [teacherName, setTeacherName] = useState('');
  const [school, setSchool] = useState('');
  const [subject, setSubject] = useState('');
  const [academicYear, setAcademicYear] = useState('');
  const [saveToProfile, setSaveToProfile] = useState(false);

  // Initialize selected classes
  useEffect(() => {
    if (classes.length > 0) {
      if (defaultClassId) {
        setSelectedClasses([defaultClassId]);
        setSelectAllClasses(false);
      } else {
        setSelectedClasses(classes.map((c) => c.id));
        setSelectAllClasses(true);
      }
    }
  }, [classes, defaultClassId, open]);

  // Fetch teacher profile when dialog opens
  useEffect(() => {
    if (!open) return;
    fetch('/api/auth/profile')
      .then((r) => r.json())
      .then((data) => {
        if (data.profile) {
          setTeacherName(data.profile.full_name || '');
          setSchool(data.profile.etablissement || '');
          setSubject(data.profile.matiere || '');
        }
      })
      .catch(() => {});

    // Compute academic year default
    const now = new Date();
    const currYear = now.getFullYear();
    const currMonth = now.getMonth();
    const computedYear = currMonth >= 7 ? `${currYear} - ${currYear + 1}` : `${currYear - 1} - ${currYear}`;
    setAcademicYear(computedYear);
  }, [open]);

  const handleToggleSelectAll = () => {
    if (selectAllClasses) {
      setSelectedClasses([]);
      setSelectAllClasses(false);
    } else {
      setSelectedClasses(classes.map((c) => c.id));
      setSelectAllClasses(true);
    }
  };

  const handleToggleClass = (id: string) => {
    let next: string[];
    if (selectedClasses.includes(id)) {
      next = selectedClasses.filter((c) => c !== id);
    } else {
      next = [...selectedClasses, id];
    }
    setSelectedClasses(next);
    setSelectAllClasses(next.length === classes.length);
  };

  const handleStatusChange = (key: keyof typeof statuses) => {
    setStatuses((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Optionally save to profile
    if (saveToProfile) {
      try {
        await fetch('/api/auth/profile', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            full_name: teacherName,
            etablissement: school,
            matiere: subject,
          }),
        });
      } catch (err) {
        console.error('Failed to save profile:', err);
      }
    }

    // Build URL search params
    const sp = new URLSearchParams();

    // Classes
    if (selectAllClasses || selectedClasses.length === classes.length) {
      sp.set('classes', 'all');
    } else if (selectedClasses.length > 0) {
      sp.set('classes', selectedClasses.join(','));
    } else {
      sp.set('classes', 'none');
    }

    if (dateFrom) sp.set('from', dateFrom);
    if (dateTo) sp.set('to', dateTo);

    const activeStatuses = Object.entries(statuses)
      .filter(([, v]) => v)
      .map(([k]) => k);
    sp.set('status', activeStatuses.join(','));

    const activeTypes = Object.entries(entryTypes)
      .filter(([, v]) => v)
      .map(([k]) => k);
    sp.set('types', activeTypes.join(','));

    sp.set('layout', layout);
    sp.set('detail', detail);
    sp.set('recap', includeRecap ? '1' : '0');
    sp.set('signatures', includeSignatures ? '1' : '0');
    sp.set('header', includeHeader ? '1' : '0');

    if (teacherName) sp.set('teacherName', teacherName);
    if (school) sp.set('school', school);
    if (subject) sp.set('subject', subject);
    if (academicYear) sp.set('academicYear', academicYear);

    const printUrl = `/carnet-de-bord/print?${sp.toString()}`;
    window.open(printUrl, '_blank');
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Imprimer / Exporter le Cahier de Textes"
      className="max-w-2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Classes Selector */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted flex items-center gap-1.5">
              <GraduationCap size={14} className="text-teal" />
              Classes à inclure
            </label>
            <button
              type="button"
              onClick={handleToggleSelectAll}
              className="text-xs text-teal hover:underline font-medium cursor-pointer"
            >
              {selectAllClasses ? 'Tout désélectionner' : 'Toutes les classes'}
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-36 overflow-y-auto p-2 bg-parchment/30 rounded-xl border border-border">
            {classes.map((c) => {
              const checked = selectedClasses.includes(c.id);
              return (
                <button
                  type="button"
                  key={c.id}
                  onClick={() => handleToggleClass(c.id)}
                  className={`flex items-center gap-2 p-2 rounded-lg text-xs font-medium text-left border transition-all cursor-pointer ${
                    checked
                      ? 'bg-white border-teal text-navy shadow-xs ring-1 ring-teal/20'
                      : 'bg-white/60 border-border text-muted hover:bg-white'
                  }`}
                >
                  <div
                    className={`w-4 h-4 rounded flex items-center justify-center shrink-0 transition-colors ${
                      checked ? 'bg-teal text-white' : 'border border-muted/30'
                    }`}
                  >
                    {checked && <Check size={12} strokeWidth={3} />}
                  </div>
                  <span className="truncate">
                    {c.name} <span className="text-[10px] text-muted">({c.niveau})</span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Date Range & Status Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Date range */}
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted flex items-center gap-1.5">
              <Calendar size={14} className="text-teal" />
              Période (Optionnelle)
            </label>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="text-[10px] text-muted block mb-0.5">Du</span>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-border bg-white text-navy focus:outline-none focus:ring-1 focus:ring-teal"
                />
              </div>
              <div>
                <span className="text-[10px] text-muted block mb-0.5">Au</span>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-border bg-white text-navy focus:outline-none focus:ring-1 focus:ring-teal"
                />
              </div>
            </div>
            <p className="text-[10px] text-muted">Laisser vide pour inclure toute l'année scolaire.</p>
          </div>

          {/* Status filter (All checked by default) */}
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted flex items-center gap-1.5">
              <UserCheck size={14} className="text-teal" />
              Statuts des séances
            </label>
            <div className="grid grid-cols-2 gap-1.5">
              {[
                { key: 'planifiee' as const, label: 'Planifiée' },
                { key: 'realisee' as const, label: 'Réalisée' },
                { key: 'absence' as const, label: 'Absence (✗)' },
                { key: 'reportee' as const, label: 'Reportée (↻)' },
              ].map(({ key, label }) => {
                const checked = statuses[key];
                return (
                  <label
                    key={key}
                    className="flex items-center gap-2 p-1.5 rounded-lg border border-border bg-white text-xs cursor-pointer hover:bg-parchment/20"
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => handleStatusChange(key)}
                      className="rounded border-border text-teal focus:ring-teal"
                    />
                    <span className="text-navy">{label}</span>
                  </label>
                );
              })}
            </div>
          </div>
        </div>

        {/* Layout & Detail level */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Layout Mode */}
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted flex items-center gap-1.5">
              <Layers size={14} className="text-teal" />
              Disposition des pages
            </label>
            <div className="space-y-1.5">
              <label
                className={`flex items-start gap-2.5 p-2.5 rounded-xl border cursor-pointer transition-all ${
                  layout === 'class'
                    ? 'border-teal bg-teal-50/50 ring-1 ring-teal/30'
                    : 'border-border bg-white hover:bg-parchment/20'
                }`}
              >
                <input
                  type="radio"
                  name="layout"
                  value="class"
                  checked={layout === 'class'}
                  onChange={() => setLayout('class')}
                  className="mt-0.5 text-teal focus:ring-teal"
                />
                <div>
                  <div className="text-xs font-semibold text-navy">Par classe</div>
                  <div className="text-[11px] text-muted leading-tight mt-0.5">
                    Une section par classe, commençant chacune sur une nouvelle page (idéal pour classeur).
                  </div>
                </div>
              </label>

              <label
                className={`flex items-start gap-2.5 p-2.5 rounded-xl border cursor-pointer transition-all ${
                  layout === 'chrono'
                    ? 'border-teal bg-teal-50/50 ring-1 ring-teal/30'
                    : 'border-border bg-white hover:bg-parchment/20'
                }`}
              >
                <input
                  type="radio"
                  name="layout"
                  value="chrono"
                  checked={layout === 'chrono'}
                  onChange={() => setLayout('chrono')}
                  className="mt-0.5 text-teal focus:ring-teal"
                />
                <div>
                  <div className="text-xs font-semibold text-navy">Chronologique (séances groupées)</div>
                  <div className="text-[11px] text-muted leading-tight mt-0.5">
                    Tableau unifié. Les leçons communes à plusieurs classes sont fusionnées sur une seule ligne.
                  </div>
                </div>
              </label>
            </div>
          </div>

          {/* Detail level */}
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted flex items-center gap-1.5">
              <FileText size={14} className="text-teal" />
              Niveau de détail
            </label>
            <div className="space-y-1.5">
              <label
                className={`flex items-start gap-2.5 p-2.5 rounded-xl border cursor-pointer transition-all ${
                  detail === 'compact'
                    ? 'border-teal bg-teal-50/50 ring-1 ring-teal/30'
                    : 'border-border bg-white hover:bg-parchment/20'
                }`}
              >
                <input
                  type="radio"
                  name="detail"
                  value="compact"
                  checked={detail === 'compact'}
                  onChange={() => setDetail('compact')}
                  className="mt-0.5 text-teal focus:ring-teal"
                />
                <div>
                  <div className="text-xs font-semibold text-navy">Compact</div>
                  <div className="text-[11px] text-muted leading-tight mt-0.5">
                    Titre et résumé condensé (~1 ligne). Économise le papier pour impression dense.
                  </div>
                </div>
              </label>

              <label
                className={`flex items-start gap-2.5 p-2.5 rounded-xl border cursor-pointer transition-all ${
                  detail === 'detailed'
                    ? 'border-teal bg-teal-50/50 ring-1 ring-teal/30'
                    : 'border-border bg-white hover:bg-parchment/20'
                }`}
              >
                <input
                  type="radio"
                  name="detail"
                  value="detailed"
                  checked={detail === 'detailed'}
                  onChange={() => setDetail('detailed')}
                  className="mt-0.5 text-teal focus:ring-teal"
                />
                <div>
                  <div className="text-xs font-semibold text-navy">Détaillé</div>
                  <div className="text-[11px] text-muted leading-tight mt-0.5">
                    Description intégrale des activités, objectifs et liste des fichiers joints.
                  </div>
                </div>
              </label>
            </div>
          </div>
        </div>

        {/* Types to include */}
        <div className="space-y-2 p-3 bg-parchment/30 rounded-xl border border-border">
          <label className="text-xs font-semibold uppercase tracking-wider text-muted flex items-center gap-1.5 mb-1">
            <Layers size={14} className="text-teal" />
            Types d'entrées à inclure
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <label className="flex items-center gap-2 text-xs text-navy cursor-pointer">
              <input
                type="checkbox"
                checked={entryTypes.SESSION}
                onChange={(e) => setEntryTypes({ ...entryTypes, SESSION: e.target.checked })}
                className="rounded border-border text-teal focus:ring-teal"
              />
              Séances de cours
            </label>
            <label className="flex items-center gap-2 text-xs text-navy cursor-pointer">
              <input
                type="checkbox"
                checked={entryTypes.MEETING}
                onChange={(e) => setEntryTypes({ ...entryTypes, MEETING: e.target.checked })}
                className="rounded border-border text-teal focus:ring-teal"
              />
              Réunions
            </label>
            <label className="flex items-center gap-2 text-xs text-navy cursor-pointer">
              <input
                type="checkbox"
                checked={entryTypes.PUBLICATION}
                onChange={(e) => setEntryTypes({ ...entryTypes, PUBLICATION: e.target.checked })}
                className="rounded border-border text-teal focus:ring-teal"
              />
              Publications & Annonces
            </label>
          </div>
        </div>

        {/* Document Structure Options */}
        <div className="space-y-2 p-3 bg-parchment/30 rounded-xl border border-border">
          <label className="text-xs font-semibold uppercase tracking-wider text-muted flex items-center gap-1.5 mb-1">
            <Sparkles size={14} className="text-teal" />
            Éléments du document
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <label className="flex items-center gap-2 text-xs text-navy cursor-pointer">
              <input
                type="checkbox"
                checked={includeHeader}
                onChange={(e) => setIncludeHeader(e.target.checked)}
                className="rounded border-border text-teal focus:ring-teal"
              />
              En-tête officiel
            </label>
            <label className="flex items-center gap-2 text-xs text-navy cursor-pointer">
              <input
                type="checkbox"
                checked={includeRecap}
                onChange={(e) => setIncludeRecap(e.target.checked)}
                className="rounded border-border text-teal focus:ring-teal"
              />
              Bilan mensuel
            </label>
            <label className="flex items-center gap-2 text-xs text-navy cursor-pointer">
              <input
                type="checkbox"
                checked={includeSignatures}
                onChange={(e) => setIncludeSignatures(e.target.checked)}
                className="rounded border-border text-teal focus:ring-teal"
              />
              Visa & Signatures
            </label>
          </div>
        </div>

        {/* Official Header Fields (Editable) */}
        {includeHeader && (
          <div className="space-y-3 p-3.5 rounded-xl border border-border/80 bg-white">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-navy flex items-center gap-1.5">
                <Building size={14} className="text-teal" />
                Informations administratives de l'en-tête
              </span>
              <span className="text-[10px] text-muted">Pré-rempli depuis votre profil</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label className="block text-[11px] text-muted mb-0.5">Nom de l'enseignant(e)</label>
                <input
                  type="text"
                  value={teacherName}
                  onChange={(e) => setTeacherName(e.target.value)}
                  placeholder="Ex: Pr. Mohamed Alami"
                  className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-border bg-white text-navy focus:outline-none focus:ring-1 focus:ring-teal"
                />
              </div>
              <div>
                <label className="block text-[11px] text-muted mb-0.5">Établissement</label>
                <input
                  type="text"
                  value={school}
                  onChange={(e) => setSchool(e.target.value)}
                  placeholder="Ex: Collège Ibn Khaldoun"
                  className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-border bg-white text-navy focus:outline-none focus:ring-1 focus:ring-teal"
                />
              </div>
              <div>
                <label className="block text-[11px] text-muted mb-0.5">Matière</label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Ex: Mathématiques / Informatique"
                  className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-border bg-white text-navy focus:outline-none focus:ring-1 focus:ring-teal"
                />
              </div>
              <div>
                <label className="block text-[11px] text-muted mb-0.5">Année scolaire</label>
                <input
                  type="text"
                  value={academicYear}
                  onChange={(e) => setAcademicYear(e.target.value)}
                  placeholder="Ex: 2025 - 2026"
                  className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-border bg-white text-navy focus:outline-none focus:ring-1 focus:ring-teal"
                />
              </div>
            </div>

            <label className="flex items-center gap-2 text-xs text-muted pt-1 cursor-pointer">
              <input
                type="checkbox"
                checked={saveToProfile}
                onChange={(e) => setSaveToProfile(e.target.checked)}
                className="rounded border-border text-teal focus:ring-teal"
              />
              Mémoriser ces modifications dans mon profil enseignant
            </label>
          </div>
        )}

        {/* Footer Actions */}
        <div className="sticky -bottom-6 bg-white/95 backdrop-blur-xs pt-3 pb-2 -mb-2 border-t border-border flex items-center justify-end gap-3 z-10">
          <Button type="button" variant="ghost" onClick={onClose}>
            Annuler
          </Button>
          <Button
            type="submit"
            variant="primary"
            className="gap-2 shadow-sm"
            disabled={selectedClasses.length === 0}
          >
            <Printer size={16} />
            Aperçu avant impression
          </Button>
        </div>
      </form>
    </Modal>
  );
}
