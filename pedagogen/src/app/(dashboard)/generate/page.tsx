'use client';

import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  BookOpen, GraduationCap, HelpCircle, Sparkles, ArrowRight,
  FileText, Calendar, Users, ClipboardCheck, Presentation, Image, Star, Loader2,
  Wifi, WifiOff, Monitor, Terminal, Palette, RotateCcw, RotateCw, Eye, Bookmark
} from 'lucide-react';
import type { ProviderId } from '@/lib/ai/types';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { Tabs } from '@/components/ui/Tabs';
import { PageTransition } from '@/components/layout/PageTransition';
import {
  MATIERES, NIVEAUX, LANGUES,
  getUnitsFor, getLessonsFor, BLOOM_ACTION_VERBS,
} from '@/lib/curriculum/moroccoCollege';
import { SkillSelector } from '@/components/skills/SkillSelector';
import { PresetModal, type CurrentGenerationConfig } from '@/components/generate/PresetModal';
import type { Preset } from '@/lib/generation/presets';
import type { CourseMetadata, DocumentType } from '@/types/generation';

const LAST_GEN_KEY = 'pedagogen_last_generation';

interface SavedGeneration {
  niveau: string;
  matiere: string;
  unite: string;
  lecon: string;
  duree: number;
  competences: string;
  langue: string;
  semestre: number;
  profilEleves: string;
  methode: string;
  ton: string;
  niveauxBloom: string[];
  differentiation: string;
  imageStyle: string;
  selectedDocs: DocumentType[];
  provider: ProviderId;
  includePrompt: string;
  excludePrompt: string;
  activeSkillIds?: string[];
}

const schema = z.object({
  niveau: z.enum(['1AC', '2AC', '3AC']),
  matiere: z.string().min(1, 'Matière requise'),
  unite: z.string().min(1, 'Unité requise'),
  lecon: z.string().min(1, 'Titre de la leçon requis'),
  duree: z.number().min(15, 'Min 15 min').max(120, 'Max 120 min'),
  competences: z.string().min(1, 'Au moins une compétence requise'),
  langue: z.enum(['fr', 'ar', 'fr+ar']),
  semestre: z.union([z.literal(1), z.literal(2)]),
  profilEleves: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

const TABS = [
  { value: 'cours', label: 'Cours' },
  { value: 'pedagogie', label: 'Pédagogie' },
  { value: 'style', label: 'Style' },
  { value: 'documents', label: 'Documents' },
];

const METHODES = [
  "Expositive", "Démonstrative", "Interrogative",
  "Découverte", "Résolution de Problèmes", "Projet",
];

const TONS = ["Formel", "Engageant", "Moderne", "Académique"];

const BLOOM_LEVELS = ["Mémoriser", "Comprendre", "Appliquer", "Analyser", "Évaluer", "Créer"];

const IMAGE_STYLES = ["Réaliste", "Illustration", "3D", "Dessin animé", "Esquisse", "Minimaliste"];

const DOC_OPTIONS: { key: DocumentType; label: string; icon: typeof FileText }[] = [
  { key: 'fiche_pedagogique', label: 'Fiche Pédagogique', icon: FileText },
  { key: 'planification', label: 'Déroulement de Séance', icon: Calendar },
  { key: 'cours_complet', label: 'Contenu de Leçon', icon: BookOpen },
  { key: 'plan_gestion_classe', label: 'Support Didactique', icon: Users },
  { key: 'resume_eleve', label: 'Carte Mentale', icon: Star },
  { key: 'evaluation', label: 'Quiz / Évaluation', icon: ClipboardCheck },
  { key: 'presentation_pptx', label: 'Diapositives', icon: Presentation },
  { key: 'images_illustratives', label: 'Images', icon: Image },
];

const DOC_LABELS: Record<DocumentType, string> = Object.fromEntries(
  DOC_OPTIONS.map(o => [o.key, o.label])
) as Record<DocumentType, string>;

const DEFAULTS = {
  niveau: '1AC' as const,
  matiere: 'Informatique',
  unite: '',
  lecon: '',
  duree: 50,
  competences: '',
  langue: 'fr' as const,
  semestre: 1 as const,
  profilEleves: '',
  methode: 'Découverte',
  ton: 'Engageant',
  niveauxBloom: ['Comprendre', 'Appliquer'] as string[],
  differentiation: 'standard' as const,
  imageStyle: 'Illustration',
  selectedDocs: ['fiche_pedagogique'] as DocumentType[],
  provider: 'huggingface' as ProviderId,
};

// const ALL_DOCS = DOC_OPTIONS.map(o => o.key);

const PROVIDERS: { id: ProviderId; label: string; icon: typeof Wifi }[] = [
  { id: 'none', label: 'Aucun', icon: WifiOff },
  { id: 'huggingface', label: 'HuggingFace', icon: Wifi },
  { id: 'lmstudio', label: 'LM Studio', icon: Monitor },
  { id: 'opencode', label: 'OpenCode', icon: Terminal },
];

function PreviewPanel({
  watch, methode, ton, niveauxBloom, differentiation, imageStyle, selectedDocs, provider,
}: {
  watch: ReturnType<typeof useForm<FormData>>['watch'];
  methode: string;
  ton: string;
  niveauxBloom: string[];
  differentiation: string;
  imageStyle: string;
  selectedDocs: DocumentType[];
  provider: ProviderId;
}) {
  const niveau = watch('niveau');
  const matiere = watch('matiere');
  const unite = watch('unite');
  const lecon = watch('lecon');
  const duree = watch('duree');
  const competences = watch('competences');
  const langue = watch('langue');
  const semestre = watch('semestre');
  const profilEleves = watch('profilEleves');

  const [includePrompt, setIncludePrompt] = useState('');
  const [excludePrompt, setExcludePrompt] = useState('');

  useEffect(() => {
    try {
      setIncludePrompt(localStorage.getItem('pedagogen_include_prompt') || '');
      setExcludePrompt(localStorage.getItem('pedagogen_exclude_prompt') || '');
    } catch {}
  }, []);

  const hasData = lecon || unite || competences || profilEleves;

  return (
    <div className="rounded-xl border border-border bg-white overflow-hidden">
      <div className="px-4 py-3 bg-navy text-parchment text-xs font-bold uppercase tracking-wider flex items-center gap-2">
        <Eye size={13} />
        Aperçu des paramètres
      </div>

      {!hasData ? (
        <div className="p-6 text-center text-xs text-muted">
          Remplissez le formulaire pour voir l&apos;aperçu.
        </div>
      ) : (
        <div className="divide-y divide-border text-xs">
          {/* Cours */}
          <div className="p-4 space-y-2">
            <span className="font-bold text-navy uppercase tracking-wider text-[10px]">Cours</span>
            <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
              <Row label="Niveau" value={niveau} />
              <Row label="Semestre" value={`S${semestre}`} />
              <Row label="Matière" value={matiere} />
              <Row label="Langue" value={langue === 'fr' ? 'Français' : langue === 'ar' ? 'Arabe' : 'FR/AR'} />
              {unite && <Row label="Unité" value={unite} full />}
              {lecon && <Row label="Leçon" value={lecon} full />}
              <Row label="Durée" value={`${duree} min`} />
              {competences && <Row label="Compétences" value={competences} full />}
            </div>
          </div>

          {/* Pédagogie */}
          <div className="p-4 space-y-2">
            <span className="font-bold text-navy uppercase tracking-wider text-[10px]">Pédagogie</span>
            <div className="space-y-1.5">
              <Row label="Méthode" value={methode} />
              <Row label="Ton" value={ton} />
              <Row label="Bloom" value={niveauxBloom.join(', ') || '—'} />
              <Row label="Différenciation" value={differentiation} />
              {profilEleves && <Row label="Profil" value={profilEleves} full />}
            </div>
          </div>

          {/* Style */}
          <div className="p-4 space-y-2">
            <span className="font-bold text-navy uppercase tracking-wider text-[10px]">Style</span>
            <Row label="Image" value={imageStyle} />
          </div>

          {/* Documents */}
          <div className="p-4 space-y-2">
            <span className="font-bold text-navy uppercase tracking-wider text-[10px]">Documents ({selectedDocs.length})</span>
            <div className="flex flex-wrap gap-1">
              {selectedDocs.map(d => (
                <span key={d} className="px-2 py-0.5 rounded bg-teal/10 text-teal font-medium">
                  {DOC_LABELS[d] || d}
                </span>
              ))}
            </div>
          </div>

          {/* Provider */}
          <div className="p-4 space-y-2">
            <span className="font-bold text-navy uppercase tracking-wider text-[10px]">Fournisseur</span>
            <Row label="IA" value={PROVIDERS.find(p => p.id === provider)?.label || provider} />
          </div>

          {/* Instructions */}
          {(includePrompt || excludePrompt) && (
            <div className="p-4 space-y-2">
              <span className="font-bold text-navy uppercase tracking-wider text-[10px]">Instructions</span>
              {includePrompt && <Row label="Inclure" value={includePrompt} full />}
              {excludePrompt && <Row label="Exclure" value={excludePrompt} full />}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Row({ label, value, full }: { label: string; value: string; full?: boolean }) {
  return (
    <div className={full ? 'col-span-2' : ''}>
      <span className="text-muted">{label} : </span>
      <span className="text-navy font-medium">{value || '—'}</span>
    </div>
  );
}

export default function GeneratePage() {
  const router = useRouter();
  const [showForm, setShowForm] = useState(true);
  const [launching, setLaunching] = useState(false);
  const [provider, setProvider] = useState<ProviderId>('huggingface');
  const [activeTab, setActiveTab] = useState('cours');
  const [hasSaved, setHasSaved] = useState(false);
  const [showPreview, setShowPreview] = useState(true);
  const [reviewMode, setReviewMode] = useState(false);
  const [presetModalOpen, setPresetModalOpen] = useState(false);

  useEffect(() => {
    fetch('/api/settings')
      .then((r) => r.json())
      .then((data) => {
        const s = data.settings || {};
        if (s.provider) setProvider(s.provider as ProviderId);
      })
      .catch(() => { });
  }, []);
  const [methode, setMethode] = useState("Résolution de Problèmes");
  const [ton, setTon] = useState("Engageant");
  const [niveauxBloom, setNiveauxBloom] = useState<string[]>(["Appliquer"]);
  const [differentiation, setDifferentiation] = useState<'soutien' | 'standard' | 'defi'>('standard');
  const [imageStyle, setImageStyle] = useState("Illustration");
  const [selectedDocs, setSelectedDocs] = useState<DocumentType[]>(['fiche_pedagogique']);
  const [selectedSkillIds, setSelectedSkillIds] = useState<string[]>([]);

  const {
    register, handleSubmit, watch, setValue, reset,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      niveau: "1AC", matiere: "Informatique", langue: "fr",
      semestre: 1, duree: 50, profilEleves: "",
    },
  });

  const handleApplyPreset = (preset: Preset) => {
    const meta = (preset.metadata || {}) as Record<string, any>;
    if (meta.niveau) setValue('niveau', meta.niveau as '1AC' | '2AC' | '3AC');
    if (meta.matiere) setValue('matiere', String(meta.matiere));
    if (meta.semestre) setValue('semestre', Number(meta.semestre) as 1 | 2);
    if (meta.duree) setValue('duree', Number(meta.duree));
    if (meta.langue) setValue('langue', meta.langue as 'fr' | 'ar' | 'fr+ar');
    if (meta.competences) setValue('competences', String(meta.competences));
    if (meta.profilEleves) setValue('profilEleves', String(meta.profilEleves));
    if (meta.unite && !watch('unite')) setValue('unite', String(meta.unite));

    if (meta.methode) setMethode(String(meta.methode));
    if (meta.ton) setTon(String(meta.ton));
    if (Array.isArray(meta.niveauxBloom) && meta.niveauxBloom.length > 0) {
      setNiveauxBloom(meta.niveauxBloom);
    }
    if (meta.differentiation) setDifferentiation(meta.differentiation as 'soutien' | 'standard' | 'defi');
    if (meta.imageStyle) setImageStyle(String(meta.imageStyle));
    if (Array.isArray(meta.activeSkillIds)) setSelectedSkillIds(meta.activeSkillIds);

    if (Array.isArray(preset.documents) && preset.documents.length > 0) {
      setSelectedDocs(preset.documents as DocumentType[]);
    }

    try {
      if (preset.include_prompt !== undefined) {
        localStorage.setItem('pedagogen_include_prompt', preset.include_prompt || '');
      }
      if (preset.exclude_prompt !== undefined) {
        localStorage.setItem('pedagogen_exclude_prompt', preset.exclude_prompt || '');
      }
    } catch {}

    toast.success(`Modèle "${preset.name}" appliqué avec succès !`, { icon: '🎯' });
  };

  useEffect(() => {
    try {
      const raw = localStorage.getItem(LAST_GEN_KEY);
      if (!raw) return;
      const saved: SavedGeneration = JSON.parse(raw);
      setHasSaved(true);
      reset({
        niveau: (saved.niveau as '1AC' | '2AC' | '3AC') || '1AC',
        matiere: saved.matiere || 'Informatique',
        unite: saved.unite || '',
        lecon: saved.lecon || '',
        duree: saved.duree || 50,
        competences: saved.competences || '',
        langue: (saved.langue as 'fr' | 'ar' | 'fr+ar') || 'fr',
        semestre: (saved.semestre as 1 | 2) || 1,
        profilEleves: saved.profilEleves || '',
      });
      if (saved.methode) setMethode(saved.methode);
      if (saved.ton) setTon(saved.ton);
      if (saved.niveauxBloom?.length) setNiveauxBloom(saved.niveauxBloom);
      if (saved.differentiation) setDifferentiation(saved.differentiation as 'soutien' | 'standard' | 'defi');
      if (saved.imageStyle) setImageStyle(saved.imageStyle);
      if (saved.selectedDocs?.length) setSelectedDocs(saved.selectedDocs);
      if (saved.activeSkillIds?.length) setSelectedSkillIds(saved.activeSkillIds);
      if (saved.provider) setProvider(saved.provider);
    } catch { }
  }, [reset]);

  const watchNiveau = watch("niveau");
  const watchMatiere = watch("matiere");
  const watchSemestre = watch("semestre");
  const watchUnite = watch("unite");
  const watchLecon = watch("lecon");

  // Autocomplete official curriculum data
  const officialUnits = getUnitsFor(watchMatiere, watchNiveau, watchSemestre);
  const officialLessons = getLessonsFor(watchMatiere, watchNiveau, watchSemestre, watchUnite);

  // Lesson Feedback from Previous Sessions (Closed-loop pedagogy)
  const [lessonFeedback, setLessonFeedback] = useState<{
    hasData: boolean;
    feedbacksCount: number;
    totalObserved: number;
    difficultyPct: number;
    topDifficulty: string;
    breakdown: {
      maitrise: number;
      avecAide: number;
      difficulte: number;
    };
    latestFeedback?: {
      date: string;
      difficulte_principale?: string;
      a_reprendre?: string;
      objectif_atteint?: string;
      comprehension_globale?: string;
    } | null;
    suggestedAdaptation: string;
  } | null>(null);
  const [feedbackDismissed, setFeedbackDismissed] = useState(false);

  useEffect(() => {
    if (!watchLecon || watchLecon.trim().length < 3) {
      setLessonFeedback(null);
      return;
    }
    let isMounted = true;
    const fetchFeedback = async () => {
      try {
        const params = new URLSearchParams({
          matiere: watchMatiere || '',
          niveau: watchNiveau || '',
          lecon: watchLecon || '',
        });
        const res = await fetch(`/api/students/lesson-feedback?${params.toString()}`);
        if (!res.ok) return;
        const data = await res.json();
        if (isMounted) {
          if (data.hasData) {
            setLessonFeedback(data);
            setFeedbackDismissed(false);
          } else {
            setLessonFeedback(null);
          }
        }
      } catch {
        // silent fail
      }
    };
    const timer = setTimeout(fetchFeedback, 350);
    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [watchMatiere, watchNiveau, watchLecon]);

  const handleApplyAdaptation = () => {
    if (!lessonFeedback) return;
    setDifferentiation('soutien');
    setMethode('Résolution de Problèmes');
    const currentProfil = watch('profilEleves') || '';
    const note = `[Remédiation & Différenciation APC] : ${lessonFeedback.difficultyPct}% d'élèves ont rencontré des difficultés lors des séances précédentes sur cette leçon (Obstacle principal : ${lessonFeedback.topDifficulty}). ${lessonFeedback.latestFeedback?.a_reprendre ? `À reprendre en priorité : ${lessonFeedback.latestFeedback.a_reprendre}.` : ''} ${lessonFeedback.suggestedAdaptation}`;
    
    if (!currentProfil.includes('[Remédiation')) {
      setValue('profilEleves', currentProfil ? `${currentProfil}\n\n${note}` : note);
    }
    toast.success('Paramètres adaptés pour la séance (Différenciation Soutien & Méthode ciblée) !', {
      icon: '🎯',
    });
  };

  // Bloom action verbs based on selected levels
  const activeBloomVerbs = Array.from(
    new Set(
      niveauxBloom.flatMap((lvl) => BLOOM_ACTION_VERBS[lvl] || [])
    )
  );

  const insertBloomVerb = (verb: string) => {
    const current = watch("competences") || "";
    const trimmed = current.trim();
    if (!trimmed) {
      setValue("competences", `${verb} `);
    } else if (trimmed.endsWith(',') || trimmed.endsWith(';')) {
      setValue("competences", `${trimmed} ${verb} `);
    } else {
      setValue("competences", `${trimmed}, ${verb} `);
    }
  };

  const toggleDoc = (doc: DocumentType) => {
    setSelectedDocs(prev => {
      const has = prev.includes(doc);
      if (has) {
        const next = prev.filter(d => d !== doc);
        // Deselect planification if fiche_pedagogique is removed
        if (doc === 'fiche_pedagogique') return next.filter(d => d !== 'planification');
        return next;
      }
      // planification requires fiche_pedagogique
      if (doc === 'planification' && !prev.includes('fiche_pedagogique')) return [...prev, 'fiche_pedagogique', doc];
      return [...prev, doc];
    });
  };

  const handleReset = () => {
    reset(DEFAULTS);
    setMethode(DEFAULTS.methode);
    setTon(DEFAULTS.ton);
    setNiveauxBloom([...DEFAULTS.niveauxBloom]);
    setDifferentiation(DEFAULTS.differentiation);
    setImageStyle(DEFAULTS.imageStyle);
    setSelectedDocs([...DEFAULTS.selectedDocs]);
    setSelectedSkillIds([]);
    setProvider(DEFAULTS.provider);
    setHasSaved(false);
    try { localStorage.removeItem(LAST_GEN_KEY); } catch { }
  };

  const onFormSubmit = async (data: FormData) => {
    setShowForm(false);
    setLaunching(true);

    const includePrompt = localStorage.getItem('pedagogen_include_prompt') || '';
    const excludePrompt = localStorage.getItem('pedagogen_exclude_prompt') || '';

    const saved: SavedGeneration = {
      niveau: data.niveau,
      matiere: data.matiere,
      unite: data.unite,
      lecon: data.lecon,
      duree: data.duree,
      competences: data.competences,
      langue: data.langue,
      semestre: data.semestre,
      profilEleves: data.profilEleves || '',
      methode,
      ton,
      niveauxBloom,
      differentiation,
      imageStyle,
      selectedDocs,
      provider,
      includePrompt,
      excludePrompt,
      activeSkillIds: selectedSkillIds,
    };
    try { localStorage.setItem(LAST_GEN_KEY, JSON.stringify(saved)); } catch { }

    const metadata: CourseMetadata = {
      ...data,
      competences: data.competences.split(",").map(c => c.trim()).filter(Boolean),
      methodePedagogique: methode,
      ton,
      niveauxBloom: niveauxBloom.map(b => {
        const map: Record<string, string> = {
          'Mémoriser': 'Remember', 'Comprendre': 'Understand', 'Appliquer': 'Apply',
          'Analyser': 'Analyze', 'Évaluer': 'Evaluate', 'Créer': 'Create',
        };
        return map[b] || b;
      }),
      differentiationLevel: differentiation,
    };
    try {
      const res = await fetch('/api/generate/heavy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'heavy',
          metadata,
          documentsToGenerate: selectedDocs,
          outputFormat: 'md',
          useReferences: false,
          debugMode: provider === 'none',
          provider,
          includePrompt: includePrompt || undefined,
          excludePrompt: excludePrompt || undefined,
          reviewMode: provider !== 'none' && reviewMode,
          activeSkillIds: selectedSkillIds,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Generation failed');
      }
      const { generationId } = await res.json();
      router.push(`/generate/status?id=${generationId}`);
    } catch (err) {
      setShowForm(true);
      setLaunching(false);
      toast.error(err instanceof Error ? err.message : 'Erreur lors du lancement de la génération');
    }
  };

  const currentConfig: CurrentGenerationConfig = {
    niveau: watchNiveau,
    matiere: watchMatiere,
    semestre: Number(watchSemestre),
    duree: Number(watch('duree')),
    langue: watch('langue'),
    methode,
    ton,
    niveauxBloom,
    differentiation,
    imageStyle,
    selectedDocs,
    includePrompt: typeof window !== 'undefined' ? (localStorage.getItem('pedagogen_include_prompt') || '') : '',
    excludePrompt: typeof window !== 'undefined' ? (localStorage.getItem('pedagogen_exclude_prompt') || '') : '',
    competences: watch('competences'),
    profilEleves: watch('profilEleves'),
    activeSkillIds: selectedSkillIds,
  };

  return (
    <PageTransition>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-teal via-teal-dark to-navy p-6 lg:p-8 text-white mb-8">
          <div className="absolute top-0 right-0 w-72 h-72 bg-teal-light/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-gold/10 rounded-full blur-2xl translate-y-1/2 -translate-x-1/4" />
          <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-11 h-11 rounded-xl bg-white/15 backdrop-blur flex items-center justify-center shrink-0">
                <Sparkles size={20} className="text-white" />
              </div>
              <div>
                <h1 className="font-display text-2xl lg:text-3xl font-bold tracking-tight">Génération de Documents</h1>
                <p className="text-white/60 text-sm mt-0.5">
                  Génération intégrale : fiche, planification, cours, exercices, présentation et visuels.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPresetModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white/20 hover:bg-white/30 text-white transition-colors cursor-pointer shadow-xs border border-white/20"
                title="Gérer ou charger des modèles de documents réutilisables"
              >
                <Bookmark size={14} />
                <span>Modèles réutilisables</span>
              </button>
              <button
                type="button"
                onClick={() => setShowPreview(!showPreview)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${showPreview ? 'bg-white/20 text-white' : 'bg-white/10 text-white/50 hover:text-white'
                  }`}
              >
                <Eye size={14} />
                Aperçu
              </button>
            </div>
          </div>
        </div>

        <div className="flex gap-6 items-start">
          {/* Form */}
          <div className="flex-1 min-w-0">
            {showForm && (
              <form onSubmit={handleSubmit(onFormSubmit)}>
                {hasSaved && (
                  <div className="flex items-center gap-2 px-4 py-2.5 mb-4 rounded-lg bg-teal/5 border border-teal/15 text-sm text-teal">
                    <RotateCcw size={14} />
                    <span>Formulaire pré-rempli avec la dernière génération.</span>
                  </div>
                )}
                {/* Tabs */}
                <Tabs tabs={TABS} activeTab={activeTab} onChange={setActiveTab} className="mb-6" />

                {/* Tab Content */}
                <div className="rounded-xl border border-border bg-white p-6">

                  {/* TAB: Cours */}
                  {activeTab === 'cours' && (
                    <div className="space-y-5">
                      <div className="flex items-center gap-2 text-navy mb-4">
                        <BookOpen size={20} className="text-teal" />
                        <h2 className="font-display font-bold text-lg uppercase tracking-wide">Informations du Cours</h2>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <Select label="Niveau" value={watchNiveau}
                          onChange={(e) => setValue("niveau", e.target.value as "1AC" | "2AC" | "3AC")}
                          options={NIVEAUX.map(n => ({ value: n, label: n }))}
                          error={errors.niveau?.message} />
                        <Select label="Semestre" value={String(watch("semestre"))}
                          onChange={(e) => setValue("semestre", Number(e.target.value) as 1 | 2)}
                          options={[{ value: "1", label: "Semestre 1" }, { value: "2", label: "Semestre 2" }]} />
                        <Select label="Matière" value={watch("matiere")}
                          onChange={(e) => setValue("matiere", e.target.value)}
                          options={[{ value: "", label: "Sélectionner..." }, ...MATIERES.map(m => ({ value: m.nom, label: m.nom }))]}
                          error={errors.matiere?.message} />
                        <Select label="Langue" value={watch("langue")}
                          onChange={(e) => setValue("langue", e.target.value as "fr" | "ar" | "fr+ar")}
                          options={LANGUES.map(l => ({ value: l.value, label: l.label }))} />
                      </div>
                      <div>
                        <Input
                          label="Unité / Chapitre"
                          placeholder="ex: Les fractions ou choisir une unité officielle"
                          list="official-units-datalist"
                          error={errors.unite?.message}
                          {...register("unite")}
                        />
                        <datalist id="official-units-datalist">
                          {officialUnits.map(u => (
                            <option key={u.id} value={u.titre} />
                          ))}
                        </datalist>
                        {officialUnits.length > 0 && (
                          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                            <span className="text-[10px] uppercase font-bold text-navy/60 tracking-wider">
                              Programme MEN ({watchNiveau} S{watchSemestre}) :
                            </span>
                            {officialUnits.map(u => (
                              <button
                                key={u.id}
                                type="button"
                                onClick={() => {
                                  setValue("unite", u.titre);
                                  const firstLesson = u.lecons[0];
                                  if (firstLesson) {
                                    setValue("lecon", firstLesson.titre);
                                  }
                                }}
                                className={`px-2.5 py-1 text-xs rounded-md transition-all border font-medium ${
                                  watchUnite === u.titre
                                    ? 'bg-teal text-white border-teal shadow-xs'
                                    : 'bg-parchment-dark/50 text-navy border-border hover:bg-teal/10 hover:border-teal/40'
                                }`}
                              >
                                {u.titre}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      <div>
                        <Input
                          label="Titre de la Leçon"
                          placeholder="ex: Addition et soustraction de fractions"
                          list="official-lessons-datalist"
                          error={errors.lecon?.message}
                          {...register("lecon")}
                        />
                        <datalist id="official-lessons-datalist">
                          {officialLessons.map((l) => (
                            <option key={l.id} value={l.titre} />
                          ))}
                        </datalist>
                        {officialLessons.length > 0 && (
                          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                            <span className="text-[10px] uppercase font-bold text-navy/60 tracking-wider">
                              Leçons suggérées :
                            </span>
                            {officialLessons.map((l) => (
                              <button
                                key={l.id}
                                type="button"
                                onClick={() => setValue("lecon", l.titre)}
                                className={`px-2.5 py-0.5 text-xs rounded-md transition-all border font-medium ${
                                  watchLecon === l.titre
                                    ? 'bg-teal text-white border-teal shadow-xs'
                                    : 'bg-white text-navy/80 border-border hover:bg-teal/10 hover:border-teal/40'
                                }`}
                              >
                                {l.titre}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Historical Classroom Feedback Alert Banner */}
                      {lessonFeedback && !feedbackDismissed && (
                        <div className="rounded-xl border border-amber-300 bg-amber-50/80 p-4 text-xs text-amber-950 transition-all shadow-xs">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-start gap-3">
                              <div className="p-2 rounded-lg bg-amber-200/80 text-amber-900 mt-0.5 shrink-0">
                                <BookOpen size={18} />
                              </div>
                              <div className="space-y-1.5">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="font-bold text-navy text-xs">
                                    📊 Retour didactique de vos séances précédentes sur cette leçon :
                                  </span>
                                  {lessonFeedback.totalObserved > 0 && (
                                    <span className="px-2 py-0.5 rounded-full bg-amber-200 text-amber-900 font-semibold text-[10px]">
                                      {lessonFeedback.totalObserved} observation(s) analysée(s)
                                    </span>
                                  )}
                                </div>
                                <p className="text-slate-700 leading-relaxed text-xs">
                                  <strong className="text-rose-700 font-bold">{lessonFeedback.difficultyPct}% d&apos;élèves en difficulté</strong> constatés sur ce contenu.
                                  {lessonFeedback.topDifficulty && (
                                    <span> Obstacle didactique récurrent : <strong className="text-navy font-semibold">{lessonFeedback.topDifficulty}</strong>.</span>
                                  )}
                                  {lessonFeedback.latestFeedback?.a_reprendre && (
                                    <span> Point à reprendre impérativement : &laquo;&nbsp;{lessonFeedback.latestFeedback.a_reprendre}&nbsp;&raquo;.</span>
                                  )}
                                </p>
                                <div className="pt-1 flex flex-wrap items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={handleApplyAdaptation}
                                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-teal text-white font-semibold text-xs hover:bg-teal-dark transition-colors shadow-xs"
                                  >
                                    <Sparkles size={14} className="text-amber-200" />
                                    👉 Adapter ma prochaine séance
                                  </button>
                                  <span className="text-[11px] text-muted italic">
                                    Active le mode Soutien TaRL et intègre l&apos;étayage ciblé
                                  </span>
                                </div>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => setFeedbackDismissed(true)}
                              className="text-amber-800/60 hover:text-amber-900 p-1 rounded hover:bg-amber-200/60"
                              title="Masquer"
                            >
                              ✕
                            </button>
                          </div>
                        </div>
                      )}

                      <div className="grid grid-cols-2 gap-4">
                        <Input label="Durée (min)" type="number" error={errors.duree?.message} {...register("duree", { valueAsNumber: true })} />
                        <Input label="Compétences Visées" placeholder="séparées par des virgules" error={errors.competences?.message} {...register("competences")} />
                      </div>

                      {/* Helper verbes Bloom */}
                      <div className="p-3 rounded-lg bg-teal/5 border border-teal/15">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-xs font-bold uppercase tracking-wider text-teal">
                            Verbes d&apos;action APC (Taxonomie de Bloom) — Cliquer pour insérer :
                          </span>
                          <span className="text-[10px] text-muted">
                            Niveau Bloom : {niveauxBloom.join(', ') || 'Tous'}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {(activeBloomVerbs.length > 0 ? activeBloomVerbs : Object.values(BLOOM_ACTION_VERBS).flat().slice(0, 16)).map((v) => (
                            <button
                              key={v}
                              type="button"
                              onClick={() => insertBloomVerb(v)}
                              className="px-2.5 py-1 text-xs rounded-md bg-white border border-teal/25 text-navy font-medium hover:bg-teal hover:text-white transition-all shadow-2xs"
                            >
                              + {v}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* TAB: Pédagogie */}
                  {activeTab === 'pedagogie' && (
                    <div className="space-y-5">
                      <div className="flex items-center gap-2 text-navy mb-4">
                        <GraduationCap size={20} className="text-teal" />
                        <h2 className="font-display font-bold text-lg uppercase tracking-wide">Stratégie &amp; Contexte</h2>
                      </div>

                      <Textarea label="Profil &amp; niveau réel des élèves" placeholder="ex: Élèves très dynamiques mais en difficulté avec la langue française..." rows={3} {...register("profilEleves")} />

                      <div>
                        <span className="text-xs font-bold uppercase tracking-wider text-navy/70 block mb-2">Méthode Pédagogique</span>
                        <div className="flex flex-wrap gap-1.5">
                          {METHODES.map(m => (
                            <button key={m} type="button" onClick={() => setMethode(m)}
                              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${methode === m ? "bg-indigo-600 text-white shadow-sm" : "bg-white border border-border text-navy/70 hover:bg-parchment-dark"
                                }`}>{m}</button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <span className="text-xs font-bold uppercase tracking-wider text-navy/70 block mb-2">Ton du Contenu</span>
                        <div className="flex flex-wrap gap-1.5">
                          {TONS.map(t => (
                            <button key={t} type="button" onClick={() => setTon(t)}
                              className={`px-3 py-1.5 rounded-full text-xs font-semibold uppercase transition-all ${ton === t ? "bg-teal text-white shadow-sm" : "bg-white border border-border text-navy/70 hover:bg-parchment-dark"
                                }`}>{t}</button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <span className="text-xs font-bold uppercase tracking-wider text-navy/70 block mb-2">
                          Niveaux de Bloom <span className="font-normal normal-case text-muted">(sélection multiple)</span>
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {BLOOM_LEVELS.map(b => {
                            const isSelected = niveauxBloom.includes(b);
                            return (
                              <button key={b} type="button" onClick={() => setNiveauxBloom(isSelected ? niveauxBloom.filter(x => x !== b) : [...niveauxBloom, b])}
                                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${isSelected ? "bg-teal text-white shadow-sm" : "bg-white border border-border text-navy/70 hover:bg-parchment-dark"
                                  }`}>{b}</button>
                            );
                          })}
                        </div>
                        {activeBloomVerbs.length > 0 && (
                          <div className="mt-3 p-3 rounded-lg bg-teal/5 border border-teal/15">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-teal block mb-1.5">
                              Verbes d&apos;action associés (cliquer pour insérer dans Compétences) :
                            </span>
                            <div className="flex flex-wrap gap-1.5">
                              {activeBloomVerbs.map((v) => (
                                <button
                                  key={v}
                                  type="button"
                                  onClick={() => {
                                    insertBloomVerb(v);
                                    toast.success(`"${v}" ajouté aux compétences !`, { duration: 1500 });
                                  }}
                                  className="px-2.5 py-1 text-xs rounded-md bg-white border border-teal/20 text-navy font-medium hover:bg-teal hover:text-white transition-all shadow-2xs"
                                >
                                  + {v}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      <div>
                        <span className="text-xs font-bold uppercase tracking-wider text-navy/70 block mb-2">Différenciation</span>
                        <div className="flex flex-wrap gap-1.5">
                          {[
                            { value: 'soutien' as const, label: 'Soutien ★' },
                            { value: 'standard' as const, label: 'Standard ★★' },
                            { value: 'defi' as const, label: 'Défi ★★★' },
                          ].map(d => (
                            <button key={d.value} type="button" onClick={() => setDifferentiation(d.value)}
                              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${differentiation === d.value ? "bg-emerald-600 text-white shadow-sm" : "bg-white border border-border text-navy/70 hover:bg-parchment-dark"
                                }`}>{d.label}</button>
                          ))}
                        </div>
                      </div>

                      {/* Directive & Skills Selector */}
                      <div className="pt-2">
                        <SkillSelector
                          matiere={watchMatiere}
                          niveau={watchNiveau}
                          unite={watchUnite}
                          lecon={watchLecon}
                          selectedSkillIds={selectedSkillIds}
                          onChange={setSelectedSkillIds}
                        />
                      </div>
                    </div>
                  )}

                  {/* TAB: Style */}
                  {activeTab === 'style' && (
                    <div className="space-y-5">
                      <div className="flex items-center gap-2 text-navy mb-4">
                        <Palette size={20} className="text-teal" />
                        <h2 className="font-display font-bold text-lg uppercase tracking-wide">Style Visuel</h2>
                      </div>
                      <div>
                        <span className="text-xs font-bold uppercase tracking-wider text-navy/70 block mb-2">Style d&apos;Image</span>
                        <div className="flex flex-wrap gap-1.5">
                          {IMAGE_STYLES.map(s => (
                            <button key={s} type="button" onClick={() => setImageStyle(s)}
                              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${imageStyle === s ? "bg-teal text-white shadow-sm" : "bg-white border border-border text-navy/70 hover:bg-parchment-dark"
                                }`}>{s}</button>
                          ))}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted bg-parchment-dark/50 rounded-lg px-3 py-2">
                        <HelpCircle size={12} />
                        Support optionnel — préférer Markdown pour les images
                      </div>
                      <div>
                        <span className="text-xs font-bold uppercase tracking-wider text-navy/70 block mb-1">Instructions Officielles</span>
                        <textarea rows={3} className="w-full rounded-lg border border-border bg-white text-sm text-navy p-2.5 focus:outline-none focus:ring-2 focus:ring-teal/30 focus:border-teal" placeholder="+ Ajouter des instructions officielles..." />
                      </div>
                      <div>
                        <span className="text-xs font-bold uppercase tracking-wider text-navy/70 block mb-1">Autres Fichiers de Support</span>
                        <textarea rows={3} className="w-full rounded-lg border border-border bg-white text-sm text-navy p-2.5 focus:outline-none focus:ring-2 focus:ring-teal/30 focus:border-teal" placeholder="+ Ajouter d'autres fichiers de support..." />
                      </div>
                    </div>
                  )}

                  {/* TAB: Documents */}
                  {activeTab === 'documents' && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2 text-navy">
                          <FileText size={20} className="text-teal" />
                          <h2 className="font-display font-bold text-lg uppercase tracking-wide">Fichiers à générer</h2>
                        </div>
                        <span className="text-xs text-muted">{selectedDocs.length} sélectionné(s)</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {DOC_OPTIONS.map(({ key, label, icon: Icon }) => {
                          const isSelected = selectedDocs.includes(key);
                          const requiresFiche = key === 'planification' && !selectedDocs.includes('fiche_pedagogique');
                          return (
                            <button key={key} type="button" onClick={() => toggleDoc(key)} disabled={requiresFiche && !isSelected}
                              className={`flex items-center gap-3 p-3 rounded-lg border text-left transition-all ${isSelected ? "border-teal bg-teal/5 text-navy"
                                : requiresFiche ? "border-border bg-parchment-dark/30 text-muted/40 cursor-not-allowed"
                                  : "border-border bg-white text-muted hover:border-navy-lighter/30"
                                }`}>
                              <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${isSelected ? "bg-teal/10 text-teal" : "bg-parchment-dark text-muted"}`}>
                                <Icon size={16} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <span className="text-sm font-medium block">{label}</span>
                                {requiresFiche && !isSelected && (
                                  <span className="text-[10px] text-muted/60 block mt-0.5">Nécessite la Fiche Pédagogique</span>
                                )}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {/* Footer — always visible */}
                <div className="flex flex-wrap items-center justify-between gap-4 mt-6 pb-8">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-navy/70">Fournisseur IA :</span>
                      <div className="flex border border-border rounded-lg overflow-hidden">
                        {PROVIDERS.map((p) => (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => setProvider(p.id)}
                            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors ${provider === p.id
                              ? 'bg-navy text-parchment'
                              : 'bg-white text-muted hover:bg-parchment-dark/50'
                              }`}
                          >
                            <p.icon size={14} />
                            {p.label}
                          </button>
                        ))}
                      </div>
                      {provider === 'none' && (
                        <span className="text-xs text-amber font-medium">(Aperçu du prompt uniquement)</span>
                      )}
                    </div>
                    {provider !== 'none' && (
                      <label className="flex items-center gap-2 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={reviewMode}
                          onChange={(e) => setReviewMode(e.target.checked)}
                          className="w-4 h-4 rounded border-border text-teal focus:ring-teal/30"
                        />
                        <span className="text-xs font-medium text-navy/70">Révision avant compilation</span>
                      </label>
                    )}
                    {hasSaved && (
                      <button
                        type="button"
                        onClick={() => {
                          localStorage.removeItem(LAST_GEN_KEY);
                          setHasSaved(false);
                        }}
                        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-muted hover:text-navy hover:bg-parchment-dark/50 transition-colors"
                        title="Effacer la sauvegarde"
                      >
                        <RotateCcw size={12} />
                        Effacer la mémoire
                      </button>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => setPresetModalOpen(true)}
                      className="gap-1.5 text-xs"
                      title="Sauvegarder ou charger un modèle de document"
                    >
                      <Bookmark size={14} />
                      Modèles
                    </Button>
                    <Button type="button" variant="ghost" onClick={handleReset} className="text-muted">
                      <RotateCw size={14} />
                      Réinitialiser
                    </Button>
                    <Button type="submit" size="lg" className="min-w-[200px]">
                      Valider la Génération
                      <ArrowRight size={16} />
                    </Button>
                  </div>
                </div>
              </form>
            )}

            {launching && (
              <div className="flex items-center justify-center py-20">
                <div className="text-center space-y-4">
                  <Loader2 size={36} className="animate-spin text-teal mx-auto" />
                  <p className="text-navy font-medium">Lancement de la génération...</p>
                  <p className="text-sm text-muted">Vous serez redirigé vers la page de suivi.</p>
                </div>
              </div>
            )}
          </div>

          {/* Side Preview Panel */}
          {showPreview && !launching && (
            <div className="w-80 shrink-0 hidden lg:block">
              <div className="sticky top-24 space-y-4">
                <PreviewPanel
                  watch={watch}
                  methode={methode}
                  ton={ton}
                  niveauxBloom={niveauxBloom}
                  differentiation={differentiation}
                  imageStyle={imageStyle}
                  selectedDocs={selectedDocs}
                  provider={provider}
                />
              </div>
            </div>
          )}
        </div>

        {/* Reusable Templates / Presets Modal */}
        <PresetModal
          open={presetModalOpen}
          onClose={() => setPresetModalOpen(false)}
          currentConfig={currentConfig}
          onApplyPreset={handleApplyPreset}
        />
      </div>
    </PageTransition>
  );
}
