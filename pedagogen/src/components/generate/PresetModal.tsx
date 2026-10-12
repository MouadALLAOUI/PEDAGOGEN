'use client';

import { useState, useEffect } from 'react';
import {
  Bookmark,
  Plus,
  Trash2,
  Check,
  Sparkles,
  BookOpen,
  FileText,
  Loader2,
  Calendar,
  Star,
  Users,
  Presentation,
  Image,
  ClipboardCheck,
} from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import type { Preset } from '@/lib/generation/presets';
import type { DocumentType } from '@/types/generation';
import toast from 'react-hot-toast';

const DOC_ICONS: Record<string, typeof FileText> = {
  fiche_pedagogique: FileText,
  planification: Calendar,
  cours_complet: BookOpen,
  plan_gestion_classe: Users,
  resume_eleve: Star,
  evaluation: ClipboardCheck,
  presentation_pptx: Presentation,
  images_illustratives: Image,
};

const DOC_SHORT_LABELS: Record<string, string> = {
  fiche_pedagogique: 'Fiche',
  planification: 'Déroulement',
  cours_complet: 'Leçon',
  plan_gestion_classe: 'Support',
  resume_eleve: 'Carte',
  evaluation: 'Quiz',
  presentation_pptx: 'Slides',
  images_illustratives: 'Images',
};

export interface CurrentGenerationConfig {
  niveau: string;
  matiere: string;
  semestre: number;
  duree: number;
  langue: string;
  methode: string;
  ton: string;
  niveauxBloom: string[];
  differentiation: string;
  imageStyle: string;
  selectedDocs: DocumentType[];
  includePrompt?: string;
  excludePrompt?: string;
  competences?: string;
  profilEleves?: string;
  activeSkillIds?: string[];
}

interface PresetModalProps {
  open: boolean;
  onClose: () => void;
  currentConfig: CurrentGenerationConfig;
  onApplyPreset: (preset: Preset) => void;
}

export function PresetModal({
  open,
  onClose,
  currentConfig,
  onApplyPreset,
}: PresetModalProps) {
  const [presets, setPresets] = useState<Preset[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'list' | 'save'>('list');

  // Form to save new preset
  const [newPresetName, setNewPresetName] = useState('');
  const [includeCompetences, setIncludeCompetences] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchPresets = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/presets');
      if (!res.ok) throw new Error('Échec du chargement');
      const data = await res.json();
      setPresets(data.presets || []);
    } catch {
      toast.error('Impossible de charger les modèles');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      fetchPresets();
      setNewPresetName('');
      setActiveTab('list');
    }
  }, [open]);

  const handleSavePreset = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newPresetName.trim();
    if (!trimmed) {
      toast.error('Veuillez saisir un nom pour le modèle');
      return;
    }

    try {
      setSaving(true);
      const metadataToSave: Record<string, unknown> = {
        niveau: currentConfig.niveau,
        matiere: currentConfig.matiere,
        semestre: currentConfig.semestre,
        duree: currentConfig.duree,
        langue: currentConfig.langue,
        methode: currentConfig.methode,
        ton: currentConfig.ton,
        niveauxBloom: currentConfig.niveauxBloom,
        differentiation: currentConfig.differentiation,
        imageStyle: currentConfig.imageStyle,
        activeSkillIds: currentConfig.activeSkillIds || [],
      };

      if (includeCompetences && currentConfig.competences) {
        metadataToSave.competences = currentConfig.competences;
      }
      if (currentConfig.profilEleves) {
        metadataToSave.profilEleves = currentConfig.profilEleves;
      }

      const res = await fetch('/api/presets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: trimmed,
          metadata: metadataToSave,
          documents: currentConfig.selectedDocs,
          include_prompt: currentConfig.includePrompt || '',
          exclude_prompt: currentConfig.excludePrompt || '',
        }),
      });

      if (!res.ok) throw new Error('Erreur de sauvegarde');
      const data = await res.json();

      toast.success(`Modèle "${trimmed}" enregistré !`, { icon: '✨' });
      setNewPresetName('');
      setPresets((prev) => [data.preset, ...prev]);
      setActiveTab('list');
    } catch {
      toast.error("Erreur lors de l'enregistrement du modèle");
    } finally {
      setSaving(false);
    }
  };

  const handleDeletePreset = async (id: string, name: string) => {
    if (!confirm(`Supprimer définitivement le modèle "${name}" ?`)) return;

    try {
      setDeletingId(id);
      const res = await fetch(`/api/presets?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Erreur suppression');

      setPresets((prev) => prev.filter((p) => p.id !== id));
      toast.success(`Modèle "${name}" supprimé`);
    } catch {
      toast.error('Impossible de supprimer ce modèle');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Modèles de Documents Réutilisables"
      className="max-w-2xl"
    >
      <div className="space-y-4">
        {/* Sub-header navigation */}
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('list')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                activeTab === 'list'
                  ? 'bg-teal text-white shadow-xs'
                  : 'bg-parchment/60 text-muted hover:text-navy hover:bg-parchment'
              }`}
            >
              Modèles enregistrés ({presets.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('save')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                activeTab === 'save'
                  ? 'bg-teal text-white shadow-xs'
                  : 'bg-parchment/60 text-muted hover:text-navy hover:bg-parchment'
              }`}
            >
              <Plus size={14} />
              Enregistrer la config actuelle
            </button>
          </div>
        </div>

        {/* TAB 1: LISTE DES MODÈLES */}
        {activeTab === 'list' && (
          <div className="space-y-3">
            {loading ? (
              <div className="py-12 flex flex-col items-center justify-center text-muted text-xs">
                <Loader2 size={24} className="animate-spin text-teal mb-2" />
                Chargement des modèles...
              </div>
            ) : presets.length === 0 ? (
              <div className="text-center py-10 bg-parchment/30 rounded-xl border border-dashed border-border p-6">
                <Bookmark size={28} className="mx-auto text-muted mb-2 opacity-50" />
                <p className="text-xs font-medium text-navy">Aucun modèle pour le moment.</p>
                <p className="text-[11px] text-muted mt-1 max-w-sm mx-auto">
                  Enregistrez votre configuration actuelle pour la réutiliser en 1 clic pour vos prochaines leçons.
                </p>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => setActiveTab('save')}
                  className="mt-4 gap-1.5 text-xs"
                >
                  <Plus size={14} />
                  Créer mon premier modèle
                </Button>
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[420px] overflow-y-auto pr-1">
                {presets.map((preset) => {
                  const meta = preset.metadata || {};
                  const isOwner = Boolean(preset.is_owner);

                  return (
                    <div
                      key={preset.id}
                      className="group border border-border hover:border-teal/50 bg-white hover:bg-teal-50/20 rounded-xl p-3.5 transition-all shadow-2xs hover:shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="space-y-1.5 min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-semibold text-sm text-navy truncate">
                            {preset.name}
                          </h4>
                          {isOwner ? (
                            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-teal/10 text-teal border border-teal/20">
                              Mon modèle
                            </span>
                          ) : (
                            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                              Officiel MEN
                            </span>
                          )}
                        </div>

                        {/* Metadata summary chips */}
                        <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-muted">
                          {Boolean(meta.matiere) && (
                            <span className="font-medium text-navy/80">
                              {String(meta.matiere)} ({String(meta.niveau || '1AC')})
                            </span>
                          )}
                          <span>•</span>
                          <span>Méthode : <strong className="text-navy">{String(meta.methode || 'Standard')}</strong></span>
                          <span>•</span>
                          <span>Ton : {String(meta.ton || 'Engageant')}</span>
                        </div>

                        {/* Document types badges */}
                        {preset.documents && preset.documents.length > 0 && (
                          <div className="flex flex-wrap gap-1 pt-1">
                            {preset.documents.map((docKey) => {
                              const IconComponent = DOC_ICONS[docKey] || FileText;
                              const shortLabel = DOC_SHORT_LABELS[docKey] || docKey;
                              return (
                                <span
                                  key={docKey}
                                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-parchment/60 text-navy border border-border/60"
                                >
                                  <IconComponent size={10} className="text-teal shrink-0" />
                                  {shortLabel}
                                </span>
                              );
                            })}
                          </div>
                        )}

                        {/* Instructions preview if present */}
                        {preset.include_prompt && (
                          <p className="text-[10px] text-muted italic line-clamp-1 pt-0.5">
                            « {preset.include_prompt} »
                          </p>
                        )}
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center gap-2 shrink-0 justify-end pt-1 sm:pt-0 border-t sm:border-t-0 border-border/40">
                        {isOwner && (
                          <button
                            type="button"
                            onClick={() => handleDeletePreset(preset.id, preset.name)}
                            disabled={deletingId === preset.id}
                            className="p-1.5 rounded-lg text-muted hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                            title="Supprimer ce modèle"
                          >
                            <Trash2 size={15} />
                          </button>
                        )}
                        <Button
                          type="button"
                          variant="primary"
                          size="sm"
                          onClick={() => {
                            onApplyPreset(preset);
                            onClose();
                          }}
                          className="gap-1.5 text-xs shadow-xs"
                        >
                          <Check size={14} />
                          Appliquer
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: SAUVEGARDER LA CONFIGURATION ACTUELLE */}
        {activeTab === 'save' && (
          <form onSubmit={handleSavePreset} className="space-y-4">
            <div className="p-3.5 bg-teal-50/50 rounded-xl border border-teal/20 text-xs space-y-2">
              <div className="flex items-center gap-2 font-bold text-teal-dark">
                <Sparkles size={16} className="text-teal" />
                Configuration prête à être sauvegardée
              </div>
              <p className="text-muted leading-relaxed">
                Ce modèle enregistrera votre méthode (<strong>{currentConfig.methode}</strong>), votre ton (<strong>{currentConfig.ton}</strong>),
                les <strong>{currentConfig.selectedDocs.length} documents</strong> cochés, vos niveaux de Bloom et vos consignes de prompt.
                La semaine prochaine, vous pourrez appliquer cette structure exacte pour n'importe quelle nouvelle leçon !
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-navy">
                Nom du modèle <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={newPresetName}
                onChange={(e) => setNewPresetName(e.target.value)}
                placeholder="ex: Fiche Investigation Réseaux & Télécoms"
                className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-white text-navy focus:outline-none focus:ring-2 focus:ring-teal/30 focus:border-teal"
                autoFocus
              />
            </div>

            <div className="space-y-2 pt-1">
              <label className="flex items-center gap-2 text-xs text-navy cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeCompetences}
                  onChange={(e) => setIncludeCompetences(e.target.checked)}
                  className="rounded border-border text-teal focus:ring-teal"
                />
                Conserver également les compétences cibles actuelles dans ce modèle
              </label>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setActiveTab('list')}
                disabled={saving}
              >
                Retour à la liste
              </Button>
              <Button
                type="submit"
                variant="primary"
                disabled={saving || !newPresetName.trim()}
                className="gap-2 shadow-xs"
              >
                {saving ? (
                  <>
                    <Loader2 size={14} className="animate-spin" /> Enregistrement...
                  </>
                ) : (
                  <>
                    <Bookmark size={14} /> Enregistrer ce modèle
                  </>
                )}
              </Button>
            </div>
          </form>
        )}
      </div>
    </Modal>
  );
}
