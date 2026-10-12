'use client';

import { useState, useEffect } from 'react';
import {
  Sparkles,
  Plus,
  ChevronDown,
  ChevronUp,
  Loader2,
} from 'lucide-react';
import type { Skill } from '@/types/skills';
import { SkillCard } from './SkillCard';
import { SkillModal } from './SkillModal';
import toast from 'react-hot-toast';

interface SkillSelectorProps {
  matiere: string;
  niveau: string;
  unite: string;
  lecon: string;
  selectedSkillIds: string[];
  onChange: (skillIds: string[]) => void;
}

export function SkillSelector({
  matiere,
  niveau,
  unite,
  lecon,
  selectedSkillIds,
  onChange,
}: SkillSelectorProps) {
  const [recommendedSkills, setRecommendedSkills] = useState<Skill[]>([]);
  const [allSkills, setAllSkills] = useState<Skill[]>([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [manualMode, setManualMode] = useState(false);

  // Charger les skills et résoudre les recommandations contextuelles
  const fetchSkills = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        context: 'resolve',
        matiere: matiere || '',
        niveau: niveau || '',
        unite: unite || '',
        lecon: lecon || '',
      });

      const res = await fetch(`/api/skills?${params.toString()}`);
      if (!res.ok) throw new Error('Erreur chargement skills');
      const data = await res.json();

      setRecommendedSkills(data.recommendedSkills || []);
      setAllSkills(data.allSkills || []);

      // Si l'utilisateur n'a pas encore fait de sélection manuelle, pré-sélectionner les recommandés
      if (!manualMode && (!selectedSkillIds || selectedSkillIds.length === 0)) {
        const autoIds = (data.recommendedSkills || [])
          .filter((s: Skill) => s.is_enabled)
          .map((s: Skill) => s.id);
        onChange(autoIds);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSkills();
  }, [matiere, niveau, unite, lecon]);

  const handleToggleSelect = (skill: Skill) => {
    setManualMode(true);
    const set = new Set(selectedSkillIds);
    if (set.has(skill.id)) {
      set.delete(skill.id);
    } else {
      set.add(skill.id);
    }
    onChange(Array.from(set));
  };

  const handleToggleServerState = async (skillId: string) => {
    try {
      const res = await fetch(`/api/skills/${skillId}/toggle`, { method: 'POST' });
      if (!res.ok) throw new Error();
      fetchSkills();
    } catch {
      toast.error('Échec de la modification du skill');
    }
  };

  const activeCount = selectedSkillIds.length;

  return (
    <div className="rounded-2xl border border-border bg-white shadow-xs overflow-hidden transition-all">
      {/* Header Bar */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between p-4 cursor-pointer hover:bg-slate-50/50 transition-colors select-none"
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-teal/10 flex items-center justify-center text-teal shrink-0">
            <Sparkles size={18} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-bold text-navy">Directives & Skills Pédagogiques</h4>
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-teal/10 text-teal-dark">
                {activeCount} actif{activeCount > 1 ? 's' : ''}
              </span>
            </div>
            <p className="text-xs text-muted truncate">
              {recommendedSkills.length} directive{recommendedSkills.length > 1 ? 's' : ''} recommandée{recommendedSkills.length > 1 ? 's' : ''} pour cette leçon · Cliquez pour personnaliser
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {loading && <Loader2 size={15} className="animate-spin text-teal mr-1" />}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsModalOpen(true);
            }}
            className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-border bg-white text-xs font-semibold text-navy hover:bg-slate-50 transition-colors"
          >
            <Plus size={13} />
            Nouveau Skill
          </button>
          <div className="p-1 text-muted">
            {isOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </div>
        </div>
      </div>

      {/* Accordion Content */}
      {isOpen && (
        <div className="p-4 border-t border-border/70 bg-slate-50/30 space-y-4 animate-fade-in">
          {/* Recommandations contextuelles */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-navy uppercase tracking-wider">
                Recommandés pour cette séance
              </span>
              <span className="text-[11px] text-muted">
                Basé sur : {matiere || 'Matière'} {lecon ? `· ${lecon}` : ''}
              </span>
            </div>

            {recommendedSkills.length === 0 ? (
              <p className="text-xs text-muted italic p-3 bg-white rounded-xl border border-dashed border-border">
                Aucun skill spécifique détecté pour cette leçon. Les compétences globales seront appliquées.
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {recommendedSkills.map((skill) => {
                  const isSelected = selectedSkillIds.includes(skill.id);
                  return (
                    <SkillCard
                      key={skill.id}
                      skill={skill}
                      isCompact
                      isSelected={isSelected}
                      onSelect={handleToggleSelect}
                      onToggle={handleToggleServerState}
                    />
                  );
                })}
              </div>
            )}
          </div>

          {/* Autres skills disponibles */}
          {allSkills.length > recommendedSkills.length && (
            <div className="pt-2 border-t border-border/60">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-muted uppercase tracking-wider">
                  Autres Skills Disponibles (Optionnels)
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {allSkills
                  .filter((s) => !recommendedSkills.some((r) => r.id === s.id))
                  .map((skill) => {
                    const isSelected = selectedSkillIds.includes(skill.id);
                    return (
                      <SkillCard
                        key={skill.id}
                        skill={skill}
                        isCompact
                        isSelected={isSelected}
                        onSelect={handleToggleSelect}
                        onToggle={handleToggleServerState}
                      />
                    );
                  })}
              </div>
            </div>
          )}

          {/* Bouton création rapide mobile */}
          <div className="pt-2 flex sm:hidden justify-center">
            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-white text-xs font-semibold text-navy"
            >
              <Plus size={14} />
              Créer un skill pour cette leçon
            </button>
          </div>
        </div>
      )}

      {/* Modal création rapide */}
      <SkillModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        initialContext={{ matiere, niveau, unite, lecon }}
        onSave={async (skillInput) => {
          try {
            const res = await fetch('/api/skills', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(skillInput),
            });
            if (!res.ok) throw new Error();
            const data = await res.json();
            toast.success('Nouveau skill créé et activé !');
            // Sélectionner immédiatement le nouveau skill
            if (data.skill?.id) {
              onChange([...selectedSkillIds, data.skill.id]);
            }
            fetchSkills();
          } catch {
            toast.error('Erreur lors de la création du skill');
          }
        }}
      />
    </div>
  );
}