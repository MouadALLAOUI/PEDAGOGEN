'use client';

import { useState } from 'react';
import {
  Sparkles,
  FileCode,
  Clock,
  AlertCircle,
  Wrench,
  Globe,
  BookOpen,
  FolderTree,
  FileText,
  Edit2,
  Trash2,
  CheckCircle,
  Eye,
  ShieldCheck,
} from 'lucide-react';
import type { Skill, SkillCategory, SkillScopeType } from '@/types/skills';

const CATEGORY_CONFIG: Record<SkillCategory, { label: string; icon: any; color: string; bg: string }> = {
  format: { label: 'Format & Builder', icon: FileCode, color: 'text-blue', bg: 'bg-blue/10 border-blue/20' },
  pedagogy: { label: 'Pédagogie & APC', icon: Sparkles, color: 'text-teal', bg: 'bg-teal/10 border-teal/20' },
  conflict_resolution: { label: 'Gestion des Conflits', icon: AlertCircle, color: 'text-amber', bg: 'bg-amber/10 border-amber/20' },
  timing: { label: 'Minutage & Timing', icon: Clock, color: 'text-indigo-600', bg: 'bg-indigo-50 border-indigo-200' },
  custom: { label: 'Personnalisé', icon: Wrench, color: 'text-stone-600', bg: 'bg-stone-100 border-stone-200' },
};

const SCOPE_CONFIG: Record<SkillScopeType, { label: string; icon: any; badgeClass: string }> = {
  global: { label: 'Global (Toutes séances)', icon: Globe, badgeClass: 'bg-slate-100 text-slate-700 border-slate-200' },
  subject: { label: 'Par Matière', icon: BookOpen, badgeClass: 'bg-purple-50 text-purple-700 border-purple-200' },
  unit: { label: 'Par Unité', icon: FolderTree, badgeClass: 'bg-blue-50 text-blue-700 border-blue-200' },
  lesson: { label: 'Spécifique Leçon', icon: FileText, badgeClass: 'bg-amber-50 text-amber-800 border-amber-200' },
};

interface SkillCardProps {
  skill: Skill;
  onToggle: (id: string) => void;
  onEdit?: (skill: Skill) => void;
  onDelete?: (id: string) => void;
  isCompact?: boolean;
  isSelected?: boolean;
  onSelect?: (skill: Skill) => void;
}

export function SkillCard({
  skill,
  onToggle,
  onEdit,
  onDelete,
  isCompact = false,
  isSelected = false,
  onSelect,
}: SkillCardProps) {
  const [showFullPrompt, setShowFullPrompt] = useState(false);
  const cat = CATEGORY_CONFIG[skill.category] || CATEGORY_CONFIG.custom;
  const scope = SCOPE_CONFIG[skill.scope_type] || SCOPE_CONFIG.global;
  const CatIcon = cat.icon;
  const ScopeIcon = scope.icon;

  if (isCompact) {
    return (
      <div
        onClick={() => onSelect && onSelect(skill)}
        className={`group relative p-3 rounded-xl border transition-all cursor-pointer ${
          isSelected
            ? 'bg-teal/5 border-teal shadow-xs'
            : 'bg-white border-border hover:border-teal/30 hover:bg-slate-50/50'
        }`}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${cat.bg}`}>
              <CatIcon size={14} className={cat.color} />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-navy truncate">{skill.name}</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className={`text-[10px] font-medium px-1.5 py-0.2 border rounded ${scope.badgeClass}`}>
                  {skill.scope_type === 'global' ? 'Global' : skill.scope_lesson || skill.scope_unit || skill.scope_subject || scope.label}
                </span>
              </div>
            </div>
          </div>

          <div
            onClick={(e) => {
              e.stopPropagation();
              onToggle(skill.id);
            }}
            className={`w-5 h-5 rounded-md flex items-center justify-center transition-colors ${
              skill.is_enabled ? 'bg-teal text-white' : 'bg-slate-200 text-transparent'
            }`}
            title={skill.is_enabled ? 'Activé (cliquer pour désactiver)' : 'Désactivé'}
          >
            {skill.is_enabled && <CheckCircle size={12} />}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`rounded-2xl border transition-all duration-200 bg-white shadow-xs overflow-hidden flex flex-col justify-between ${
        skill.is_enabled ? 'border-border/80 hover:border-teal/40' : 'border-dashed border-border opacity-70'
      }`}
    >
      <div className="p-5 space-y-3.5">
        {/* Top Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${cat.bg}`}>
              <CatIcon size={18} className={cat.color} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm font-bold text-navy">{skill.name}</h3>
                {skill.is_builtin && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-teal/10 text-teal-dark border border-teal/20">
                    <ShieldCheck size={11} />
                    Officiel MEN
                  </span>
                )}
              </div>
              <p className="text-xs text-muted line-clamp-2 mt-1">{skill.description || 'Aucune description fournie.'}</p>
            </div>
          </div>

          {/* Toggle Switch */}
          <button
            type="button"
            onClick={() => onToggle(skill.id)}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
              skill.is_enabled ? 'bg-teal' : 'bg-slate-200'
            }`}
            title={skill.is_enabled ? 'Désactiver ce skill' : 'Activer ce skill'}
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                skill.is_enabled ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {/* Badges Portée & Catégorie */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          <span className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-md border ${scope.badgeClass}`}>
            <ScopeIcon size={12} />
            <span>{scope.label}</span>
            {skill.scope_subject && <strong className="ml-0.5">({skill.scope_subject})</strong>}
          </span>

          {skill.scope_level && (
            <span className="text-[11px] font-bold px-1.5 py-0.5 rounded bg-parchment-dark text-muted border border-border">
              {skill.scope_level}
            </span>
          )}

          {skill.scope_unit && (
            <span className="text-[11px] font-medium px-2 py-0.5 rounded bg-blue-50/80 text-blue-700 border border-blue-200/60 truncate max-w-[180px]" title={skill.scope_unit}>
              Unité: {skill.scope_unit}
            </span>
          )}

          {skill.scope_lesson && (
            <span className="text-[11px] font-medium px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 truncate max-w-[200px]" title={skill.scope_lesson}>
              Leçon: {skill.scope_lesson}
            </span>
          )}
        </div>

        {/* Prompt Instruction Preview */}
        <div className="bg-slate-50 border border-border/70 rounded-xl p-3 text-xs font-mono text-slate-700 relative">
          <div className="flex items-center justify-between text-[11px] font-sans font-semibold text-muted mb-1.5">
            <span>Directives Pédagogiques (Prompt IA)</span>
            <button
              type="button"
              onClick={() => setShowFullPrompt(!showFullPrompt)}
              className="text-teal hover:underline flex items-center gap-0.5"
            >
              <Eye size={11} />
              <span>{showFullPrompt ? 'Réduire' : 'Déplier'}</span>
            </button>
          </div>
          <p className={`whitespace-pre-line leading-relaxed ${showFullPrompt ? '' : 'line-clamp-3'}`}>
            {skill.prompt_instruction}
          </p>
        </div>
      </div>

      {/* Card Footer Actions */}
      <div className="px-5 py-3 border-t border-border/60 bg-slate-50/50 flex items-center justify-between text-xs text-muted">
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${skill.is_enabled ? 'bg-teal' : 'bg-slate-300'}`} />
          <span className="font-medium">{skill.is_enabled ? 'Actif lors de la génération' : 'Inactif'}</span>
        </div>

        <div className="flex items-center gap-1">
          {!skill.is_builtin && onEdit && (
            <button
              type="button"
              onClick={() => onEdit(skill)}
              className="p-1.5 rounded-lg hover:bg-slate-200 text-muted hover:text-navy transition-colors"
              title="Modifier ce skill"
            >
              <Edit2 size={14} />
            </button>
          )}

          {!skill.is_builtin && onDelete && (
            <button
              type="button"
              onClick={() => onDelete(skill.id)}
              className="p-1.5 rounded-lg hover:bg-red/10 text-muted hover:text-red transition-colors"
              title="Supprimer ce skill"
            >
              <Trash2 size={14} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}