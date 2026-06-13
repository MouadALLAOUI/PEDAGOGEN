'use client';

import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  BookOpen, GraduationCap, HelpCircle, Sparkles, ArrowRight,
  FileText, Calendar, Users, ClipboardCheck, Presentation, Image, Star, Loader2,
  Wifi, WifiOff, Monitor, Terminal
} from 'lucide-react';
import type { ProviderId } from '@/lib/ai/types';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { PageTransition } from '@/components/layout/PageTransition';
import { MATIERES, NIVEAUX, LANGUES } from '@/lib/curriculum/moroccoCollege';
import type { CourseMetadata, DocumentType } from '@/types/generation';

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

const ALL_DOCS = DOC_OPTIONS.map(o => o.key);

const PROVIDERS: { id: ProviderId; label: string; icon: typeof Wifi }[] = [
  { id: 'none', label: 'Aucun', icon: WifiOff },
  { id: 'huggingface', label: 'HuggingFace', icon: Wifi },
  { id: 'lmstudio', label: 'LM Studio', icon: Monitor },
  { id: 'opencode', label: 'OpenCode', icon: Terminal },
];

export default function GeneratePage() {
  const router = useRouter();
  const [showForm, setShowForm] = useState(true);
  const [launching, setLaunching] = useState(false);
  const [provider, setProvider] = useState<ProviderId>('huggingface');

  useEffect(() => {
    fetch('/api/settings')
      .then((r) => r.json())
      .then((data) => {
        const s = data.settings || {};
        if (s.provider) setProvider(s.provider as ProviderId);
      })
      .catch(() => {});
  }, []);
  const [methode, setMethode] = useState("Découverte");
  const [ton, setTon] = useState("Engageant");
  const [niveauxBloom, setNiveauxBloom] = useState<string[]>(["Comprendre", "Appliquer"]);
  const [differentiation, setDifferentiation] = useState<'soutien' | 'standard' | 'defi'>('standard');
  const [imageStyle, setImageStyle] = useState("Illustration");
  const [selectedDocs, setSelectedDocs] = useState<DocumentType[]>(ALL_DOCS);

  const {
    register, handleSubmit, watch, setValue,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      niveau: "1AC", matiere: "Informatique", langue: "fr",
      semestre: 1, duree: 50, profilEleves: "",
    },
  });

  const watchNiveau = watch("niveau");

  const toggleDoc = (doc: DocumentType) => {
    setSelectedDocs(prev =>
      prev.includes(doc) ? prev.filter(d => d !== doc) : [...prev, doc]
    );
  };

  const onFormSubmit = async (data: FormData) => {
    setShowForm(false);
    setLaunching(true);
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
    }
  };

  return (
    <PageTransition>
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-teal via-teal-dark to-navy p-6 lg:p-8 text-white mb-8">
          <div className="absolute top-0 right-0 w-72 h-72 bg-teal-light/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-gold/10 rounded-full blur-2xl translate-y-1/2 -translate-x-1/4" />
          <div className="relative z-10 flex items-center gap-4">
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
        </div>

        {showForm && (
          <form onSubmit={handleSubmit(onFormSubmit)}>
            <div className="grid lg:grid-cols-2 gap-6">
              {/* LEFT COLUMN — INFOS + VISUEL */}
              <div className="space-y-6">
                {/* INFORMATIONS DU COURS */}
                <div className="rounded-xl border border-border bg-white p-5 space-y-4">
                  <div className="flex items-center gap-2 text-navy mb-2">
                    <BookOpen size={18} className="text-teal" />
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
                  <Input label="Unité / Chapitre" placeholder="ex: Les fractions" error={errors.unite?.message} {...register("unite")} />
                  <Input label="Titre de la Leçon" placeholder="ex: Addition et soustraction de fractions" error={errors.lecon?.message} {...register("lecon")} />
                  <div className="grid grid-cols-2 gap-4">
                    <Input label="Durée (min)" type="number" error={errors.duree?.message} {...register("duree", { valueAsNumber: true })} />
                    <Input label="Compétences Visées" placeholder="séparées par des virgules" error={errors.competences?.message} {...register("competences")} />
                  </div>
                </div>

                {/* STYLE VISUEL */}
                <div className="rounded-xl border border-border bg-white p-5 space-y-4">
                  <div className="flex items-center gap-2 text-navy mb-2">
                    <Image size={18} className="text-teal" />
                    <h2 className="font-display font-bold text-lg uppercase tracking-wide">Style Visuel</h2>
                  </div>
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-navy/70 block mb-2">Style d'Image</span>
                    <div className="flex flex-wrap gap-1.5">
                      {IMAGE_STYLES.map(s => (
                        <button key={s} type="button" onClick={() => setImageStyle(s)}
                          className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                            imageStyle === s ? "bg-teal text-white shadow-sm" : "bg-white border border-border text-navy/70 hover:bg-parchment-dark"
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
                    <textarea rows={2} className="w-full rounded-lg border border-border bg-white text-sm text-navy p-2.5 focus:outline-none focus:ring-2 focus:ring-teal/30 focus:border-teal" placeholder="+ Ajouter des instructions officielles..." />
                  </div>
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-navy/70 block mb-1">Autres Fichiers de Support</span>
                    <textarea rows={2} className="w-full rounded-lg border border-border bg-white text-sm text-navy p-2.5 focus:outline-none focus:ring-2 focus:ring-teal/30 focus:border-teal" placeholder="+ Ajouter d'autres fichiers de support..." />
                  </div>
                </div>
              </div>

              {/* RIGHT COLUMN — STRATÉGIE + DOCUMENTS */}
              <div className="space-y-6">
                {/* STRATÉGIE & CONTEXTE */}
                <div className="rounded-xl border border-border bg-white p-5 space-y-4">
                  <div className="flex items-center gap-2 text-navy mb-2">
                    <GraduationCap size={18} className="text-teal" />
                    <h2 className="font-display font-bold text-lg uppercase tracking-wide">Stratégie &amp; Contexte</h2>
                  </div>

                  <Textarea label="Profil &amp; niveau réel des élèves" placeholder="ex: Élèves très dynamiques mais en difficulté avec la langue française..." rows={3} {...register("profilEleves")} />

                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-navy/70 block mb-2">Méthode Pédagogique</span>
                    <div className="flex flex-wrap gap-1.5">
                      {METHODES.map(m => (
                        <button key={m} type="button" onClick={() => setMethode(m)}
                          className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                            methode === m ? "bg-indigo-600 text-white shadow-sm" : "bg-white border border-border text-navy/70 hover:bg-parchment-dark"
                          }`}>{m}</button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-navy/70 block mb-2">Ton du Contenu</span>
                    <div className="flex flex-wrap gap-1.5">
                      {TONS.map(t => (
                        <button key={t} type="button" onClick={() => setTon(t)}
                          className={`px-3 py-1.5 rounded-full text-xs font-semibold uppercase transition-all ${
                            ton === t ? "bg-teal text-white shadow-sm" : "bg-white border border-border text-navy/70 hover:bg-parchment-dark"
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
                            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                              isSelected ? "bg-teal text-white shadow-sm" : "bg-white border border-border text-navy/70 hover:bg-parchment-dark"
                            }`}>{b}</button>
                        );
                      })}
                    </div>
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
                          className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                            differentiation === d.value ? "bg-emerald-600 text-white shadow-sm" : "bg-white border border-border text-navy/70 hover:bg-parchment-dark"
                          }`}>{d.label}</button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* FICHIERS À GÉNÉRER */}
                <div className="rounded-xl border border-border bg-white p-5 space-y-3">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2 text-navy">
                      <FileText size={18} className="text-teal" />
                      <h2 className="font-display font-bold text-lg uppercase tracking-wide">Fichiers à générer</h2>
                    </div>
                    <span className="text-xs text-muted">{selectedDocs.length} sélectionné(s)</span>
                  </div>
                  <div className="grid grid-cols-1 gap-2">
                    {DOC_OPTIONS.map(({ key, label, icon: Icon }) => {
                      const isSelected = selectedDocs.includes(key);
                      return (
                        <button key={key} type="button" onClick={() => toggleDoc(key)}
                          className={`flex items-center gap-3 p-2.5 rounded-lg border text-left transition-all ${
                            isSelected ? "border-teal bg-teal/5 text-navy" : "border-border bg-white text-muted hover:border-navy-lighter/30"
                          }`}>
                          <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${isSelected ? "bg-teal/10 text-teal" : "bg-parchment-dark text-muted"}`}>
                            <Icon size={14} />
                          </div>
                          <span className="text-sm font-medium">{label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <hr className="geometric-divider my-6" />
            <div className="flex flex-wrap items-center justify-between gap-4 pb-8">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-navy/70">Fournisseur IA :</span>
                <div className="flex border border-border rounded-lg overflow-hidden">
                  {PROVIDERS.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setProvider(p.id)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors ${
                        provider === p.id
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
              <Button type="submit" size="lg" className="min-w-[200px]">
                Valider la Génération
                <ArrowRight size={16} />
              </Button>
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
    </PageTransition>
  );
}
