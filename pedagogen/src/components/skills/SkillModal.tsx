'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Sparkles,
  Save,
  Globe,
  BookOpen,
  FolderTree,
  FileText,
  Clock,
  AlertCircle,
  FileCode,
  Wrench,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import type { Skill, SkillCategory, SkillScopeType, CreateSkillInput } from '@/types/skills';
import { MATIERES, NIVEAUX } from '@/lib/curriculum/moroccoCollege';

interface SkillModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (skillData: CreateSkillInput | (CreateSkillInput & { id: string })) => Promise<void>;
  editingSkill?: Skill | null;
  initialContext?: {
    matiere?: string;
    niveau?: string;
    unite?: string;
    lecon?: string;
  };
}

export function SkillModal({
  isOpen,
  onClose,
  onSave,
  editingSkill,
  initialContext,
}: SkillModalProps) {
  const [mounted, setMounted] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<SkillCategory>('pedagogy');
  const [promptInstruction, setPromptInstruction] = useState('');
  const [scopeType, setScopeType] = useState<SkillScopeType>('global');
  const [scopeSubject, setScopeSubject] = useState('');
  const [scopeLevel, setScopeLevel] = useState('');
  const [scopeUnit, setScopeUnit] = useState('');
  const [scopeLesson, setScopeLesson] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  useEffect(() => {
    if (editingSkill) {
      setName(editingSkill.name);
      setDescription(editingSkill.description);
      setCategory(editingSkill.category);
      setPromptInstruction(editingSkill.prompt_instruction);
      setScopeType(editingSkill.scope_type);
      setScopeSubject(editingSkill.scope_subject);
      setScopeLevel(editingSkill.scope_level);
      setScopeUnit(editingSkill.scope_unit);
      setScopeLesson(editingSkill.scope_lesson);
    } else {
      setName('');
      setDescription('');
      setCategory('pedagogy');
      setPromptInstruction('');

      // Si du contexte initial est fourni (ex: depuis /generate)
      if (initialContext) {
        if (initialContext.lecon) {
          setScopeType('lesson');
          setScopeLesson(initialContext.lecon);
        } else if (initialContext.unite) {
          setScopeType('unit');
          setScopeUnit(initialContext.unite);
        } else if (initialContext.matiere) {
          setScopeType('subject');
        } else {
          setScopeType('global');
        }

        setScopeSubject(initialContext.matiere || 'Informatique');
        setScopeLevel(initialContext.niveau || '1AC');
        setScopeUnit(initialContext.unite || '');
        setScopeLesson(initialContext.lecon || '');
      } else {
        setScopeType('global');
        setScopeSubject('Informatique');
        setScopeLevel('1AC');
        setScopeUnit('');
        setScopeLesson('');
      }
    }
  }, [editingSkill, initialContext, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e?: React.FormEvent | React.MouseEvent) => {
    if (e) e.preventDefault();
    if (!name.trim() || !promptInstruction.trim()) return;

    setSaving(true);
    try {
      const payload: CreateSkillInput = {
        name: name.trim(),
        description: description.trim(),
        category,
        prompt_instruction: promptInstruction.trim(),
        scope_type: scopeType,
        scope_subject: scopeType !== 'global' ? scopeSubject : '',
        scope_level: (scopeType === 'subject' || scopeType === 'unit' || scopeType === 'lesson') ? scopeLevel : '',
        scope_unit: (scopeType === 'unit' || scopeType === 'lesson') ? scopeUnit : '',
        scope_lesson: scopeType === 'lesson' ? scopeLesson : '',
      };

      if (editingSkill) {
        await onSave({ ...payload, id: editingSkill.id });
      } else {
        await onSave(payload);
      }
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.target as HTMLElement).tagName !== 'TEXTAREA') {
      e.preventDefault();
      handleSubmit();
    }
  };

  const matieresList = MATIERES.map((s) => s.nom);

  if (!isOpen || !mounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto backdrop-blur-sm animate-fade-in transition-all"
      style={{ backgroundColor: 'rgba(24, 28, 40, 0.65)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden border border-border my-auto animate-in fade-in zoom-in-95">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-slate-50 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-teal/10 flex items-center justify-center text-teal">
              <Sparkles size={18} />
            </div>
            <div>
              <h2 className="text-base font-bold text-navy">
                {editingSkill ? 'Modifier la Directive / Skill' : 'Créer un Nouveau Skill Pédagogique'}
              </h2>
              <p className="text-xs text-muted">
                Enrichit les compétences du générateur pour une leçon, matière ou format précis.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-200 text-muted hover:text-navy transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div onKeyDown={handleKeyDown} className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* Nom du Skill */}
          <div>
            <label className="block text-xs font-bold text-navy mb-1">
              Nom du Skill <span className="text-red">*</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Règle des 55 min, Scratch Décomposition, Tableau Word Pro..."
              className="w-full px-3.5 py-2 rounded-xl border border-border bg-white text-sm text-navy focus:outline-none focus:ring-2 focus:ring-teal/30 focus:border-teal"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-bold text-navy mb-1">
              Description courte
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ce que ce skill accomplit lors de la génération pédagogique..."
              className="w-full px-3.5 py-2 rounded-xl border border-border bg-white text-sm text-navy focus:outline-none focus:ring-2 focus:ring-teal/30 focus:border-teal"
            />
          </div>

          {/* Catégorie */}
          <div>
            <label className="block text-xs font-bold text-navy mb-1">Catégorie du Skill</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {[
                { id: 'pedagogy', label: 'Pédagogie & APC', icon: Sparkles },
                { id: 'format', label: 'Format & Builder', icon: FileCode },
                { id: 'conflict_resolution', label: 'Gestion des Conflits', icon: AlertCircle },
                { id: 'timing', label: 'Minutage & Temps', icon: Clock },
                { id: 'custom', label: 'Personnalisé', icon: Wrench },
              ].map((c) => {
                const Icon = c.icon;
                const active = category === c.id;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setCategory(c.id as SkillCategory)}
                    className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs font-semibold transition-all text-left ${
                      active
                        ? 'border-teal bg-teal/10 text-teal shadow-xs'
                        : 'border-border bg-white text-navy/70 hover:border-stone-300'
                    }`}
                  >
                    <Icon size={14} />
                    <span>{c.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Portée (Scope) */}
          <div className="pt-2 border-t border-border/70">
            <label className="block text-xs font-bold text-navy mb-1.5">
              Portée d&apos;Application (Quand ce skill s&apos;active-t-il ?)
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
              {[
                { id: 'global', label: 'Global', desc: 'Toutes séances', icon: Globe },
                { id: 'subject', label: 'Matière', desc: 'Ex: Info, Maths', icon: BookOpen },
                { id: 'unit', label: 'Unité', desc: 'Ex: Tableur', icon: FolderTree },
                { id: 'lesson', label: 'Leçon', desc: 'Leçon précise', icon: FileText },
              ].map((s) => {
                const Icon = s.icon;
                const active = scopeType === s.id;
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setScopeType(s.id as SkillScopeType)}
                    className={`p-2.5 rounded-xl border text-center transition-all ${
                      active
                        ? 'border-teal bg-teal/10 text-teal font-semibold shadow-xs'
                        : 'border-border bg-white text-navy/70 hover:border-stone-300'
                    }`}
                  >
                    <Icon size={16} className="mx-auto mb-1" />
                    <p className="text-xs font-bold">{s.label}</p>
                    <p className="text-[10px] text-muted">{s.desc}</p>
                  </button>
                );
              })}
            </div>

            {/* Scope Details Inputs */}
            {scopeType !== 'global' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 rounded-xl bg-slate-50 border border-border animate-fade-in">
                <div>
                  <label className="block text-[11px] font-bold text-navy mb-1">Matière</label>
                  <select
                    value={scopeSubject}
                    onChange={(e) => setScopeSubject(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg border border-border bg-white text-xs text-navy focus:outline-none focus:ring-1 focus:ring-teal"
                  >
                    {matieresList.map((m) => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-navy mb-1">Niveau (Optionnel)</label>
                  <select
                    value={scopeLevel}
                    onChange={(e) => setScopeLevel(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg border border-border bg-white text-xs text-navy focus:outline-none focus:ring-1 focus:ring-teal"
                  >
                    <option value="">Tous les niveaux (1AC, 2AC, 3AC)</option>
                    {NIVEAUX.map((n) => (
                      <option key={n} value={n}>{n}</option>
                    ))}
                  </select>
                </div>

                {(scopeType === 'unit' || scopeType === 'lesson') && (
                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-bold text-navy mb-1">Nom de l&apos;Unité / Chapitre</label>
                    <input
                      type="text"
                      value={scopeUnit}
                      onChange={(e) => setScopeUnit(e.target.value)}
                      placeholder="Ex: Système d'exploitation, Algorithmique..."
                      className="w-full px-3 py-1.5 rounded-lg border border-border bg-white text-xs text-navy focus:outline-none focus:ring-1 focus:ring-teal"
                    />
                  </div>
                )}

                {scopeType === 'lesson' && (
                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-bold text-navy mb-1">Titre de la Leçon Ciblée</label>
                    <input
                      type="text"
                      value={scopeLesson}
                      onChange={(e) => setScopeLesson(e.target.value)}
                      placeholder="Ex: Introduction aux fichiers et dossiers, Notion de boucle..."
                      className="w-full px-3 py-1.5 rounded-lg border border-border bg-white text-xs text-navy focus:outline-none focus:ring-1 focus:ring-teal"
                    />
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Instructions du Prompt */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-bold text-navy">
                Instructions pour le Modèle IA (Prompt Pédagogique) <span className="text-red">*</span>
              </label>
              <span className="text-[11px] text-muted">Injecté dans le prompt système</span>
            </div>
            <textarea
              required
              rows={5}
              value={promptInstruction}
              onChange={(e) => setPromptInstruction(e.target.value)}
              placeholder="Rédigez les consignes impératives que l'IA doit suivre lorsqu'elle génère ce cours ou ce document..."
              className="w-full p-3.5 rounded-xl border border-border bg-white text-xs font-mono text-navy leading-relaxed focus:outline-none focus:ring-2 focus:ring-teal/30 focus:border-teal resize-none"
            />
          </div>

          {/* Footer Submit */}
          <div className="pt-4 border-t border-border flex items-center justify-end gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={onClose}>
              Annuler
            </Button>
            <Button type="button" onClick={handleSubmit} size="sm" disabled={saving}>
              {saving ? (
                <>
                  <Loader2 size={14} className="animate-spin mr-1.5" />
                  Enregistrement...
                </>
              ) : (
                <>
                  <Save size={14} className="mr-1.5" />
                  {editingSkill ? 'Mettre à jour' : 'Créer le Skill'}
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}