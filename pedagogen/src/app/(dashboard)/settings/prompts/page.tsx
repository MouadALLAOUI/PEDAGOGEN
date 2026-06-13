'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Save, RotateCcw, BookOpen, GraduationCap, Users, Compass, Globe, Info, Loader2, Sparkles } from 'lucide-react';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { PageTransition } from '@/components/layout/PageTransition';
import toast from 'react-hot-toast';

const DEFAULT_PROMPTS: Record<string, string> = {
  global: 'Always ensure the content is professional, structured, and follows the Moroccan official syllabus guidelines.',
  context: 'The lessons are taught in Moroccan collège classrooms under the official national education framework.',
  fiche_pedagogique: 'Generate a detailed fiche pédagogique following official guidelines. Establish objectives, prerequisites, and session progression.',
  planification: 'Generate a structured semester planification sequence.',
  cours_complet: 'Generate a complete, rich lesson plan content for the teacher script and student exercises.',
  plan_gestion_classe: 'Generate a classroom management strategy document.',
  resume_eleve: 'Generate a student-facing summary in simple language.',
  presentation_pptx: 'Generate a PPTX outline with bullet points for slides.',
  evaluation: 'Generate an evaluation sheet/test representing the concepts.',
  images_illustratives: 'Generate image illustration prompts.',
};

const DOC_LABELS: Record<string, string> = {
  global: 'Instruction Globale',
  context: 'Contexte Global',
  fiche_pedagogique: 'Fiche Pédagogique',
  planification: 'Planification',
  cours_complet: 'Cours Complet',
  plan_gestion_classe: 'Gestion de Classe',
  resume_eleve: 'Résumé Élève',
  presentation_pptx: 'Présentation PPTX',
  evaluation: 'Évaluation / Test',
  images_illustratives: 'Images Illustratives',
};

interface StudentProp {
  label: string;
  value: string;
  category: 'academic' | 'behavior' | 'social';
}

const STUDENT_PROPS: StudentProp[] = [
  // Academic
  { label: 'Élèves en difficulté', value: 'Les élèves ont d\'importantes difficultés scolaires, privilégiez des explications très simples et très progressives.', category: 'academic' },
  { label: 'Élèves avancés/performants', value: 'Les élèves sont très performants. Proposez des défis supplémentaires et des exercices plus approfondis.', category: 'academic' },
  { label: 'Rythme d\'apprentissage lent', value: 'Le rythme d\'apprentissage est lent. Divisez le cours en très petites étapes avec des exemples répétés.', category: 'academic' },
  { label: 'Besoin de remédiation', value: 'Intégrez des phases de remédiation explicites et des exercices d\'auto-correction.', category: 'academic' },
  { label: 'Apprentissage par la pratique', value: 'Privilégiez les manipulations pratiques, les ateliers sur machine et le concret plutôt que la théorie abstraite.', category: 'academic' },

  // Behavior
  { label: 'Classe très dynamique/active', value: 'Classe très dynamique et agitée. Prévoyez des règles claires de transition et des activités courtes et rythmées.', category: 'behavior' },
  { label: 'Classe calme/réservée', value: 'Classe très réservée et calme. Intégrez des questions interactives et des activités ludiques pour stimuler la participation.', category: 'behavior' },
  { label: 'Esprit de collaboration', value: 'Encouragez le travail en binômes et les mini-projets de groupe.', category: 'behavior' },
  { label: 'Difficulté de concentration', value: 'Les élèves ont du mal à se concentrer plus de 15 minutes. Alternez fréquemment les supports de cours.', category: 'behavior' },

  // Social / Culture
  { label: 'Difficultés en français', value: 'Les élèves ont un faible niveau en langue française. Utilisez un français simplifié, des supports bilingues et des explications claires.', category: 'social' },
  { label: 'Élèves bilingues à l\'aise', value: 'Les élèves sont à l\'aise en français et en arabe. Vous pouvez utiliser des termes techniques avancés.', category: 'social' },
  { label: 'Milieu rural (agricole)', value: 'Élèves issus d\'un milieu rural. Utilisez des exemples pratiques ancrés dans l\'agriculture, la météo locale et l\'artisanat.', category: 'social' },
  { label: 'Milieu urbain (connecté)', value: 'Élèves issus d\'un milieu urbain connecté. Utilisez des exemples axés sur Internet, les smartphones et les réseaux sociaux.', category: 'social' },
  { label: 'Culture marocaine forte', value: 'Intégrez un ancrage culturel marocain fort (contextes locaux, monnaie, événements et fêtes nationales).', category: 'social' },
];

export default function PromptsPage() {
  const router = useRouter();
  const [prompts, setPrompts] = useState<Record<string, string>>({});
  const [activeDoc, setActiveDoc] = useState<string>('fiche_pedagogique');
  const [toolboxTarget, setToolboxTarget] = useState<'global' | 'context' | 'active_doc'>('global');
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);

  useEffect(() => {
    fetch('/api/settings/prompts')
      .then((res) => res.json())
      .then((data) => {
        const loaded: Record<string, string> = {};
        for (const key of Object.keys(DEFAULT_PROMPTS)) {
          loaded[key] = data.prompts?.[key] !== undefined ? data.prompts[key] : DEFAULT_PROMPTS[key];
        }
        setPrompts(loaded);
        setLoading(false);
      })
      .catch(() => {
        const loaded: Record<string, string> = {};
        for (const key of Object.keys(DEFAULT_PROMPTS)) {
          const value = DEFAULT_PROMPTS[key];
          if (value !== undefined) loaded[key] = value;
        }
        setPrompts(loaded);
        setLoading(false);
        toast.error('Erreur lors du chargement des prompts depuis la BDD');
      });
  }, []);

  const handlePromptChange = (key: string, value: string) => {
    setPrompts((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/settings/prompts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompts }),
      });
      if (!res.ok) throw new Error();
      toast.success('Prompts enregistrés dans la base de données !');
    } catch {
      toast.error('Erreur lors de l\'enregistrement des prompts');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    if (confirm('Voulez-vous réinitialiser tous les prompts aux valeurs par défaut ?')) {
      setSaving(true);
      try {
        const res = await fetch('/api/settings/prompts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompts: DEFAULT_PROMPTS }),
        });
        if (!res.ok) throw new Error();
        setPrompts({ ...DEFAULT_PROMPTS });
        toast.success('Prompts réinitialisés dans la base de données.');
      } catch {
        toast.error('Erreur lors de la réinitialisation');
      } finally {
        setSaving(false);
      }
    }
  };

  const appendToTargetPrompt = (text: string) => {
    const targetKey = toolboxTarget === 'active_doc' ? activeDoc : toolboxTarget;
    const current = prompts[targetKey] || '';
    const separator = current.endsWith('\n') || current.length === 0 ? '' : '\n';
    const updated = `${current}${separator}- ${text}`;
    handlePromptChange(targetKey, updated);
    toast.success(`Ajouté au champ : "${DOC_LABELS[targetKey]}"`);
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 size={32} className="animate-spin text-teal" />
      </div>
    );
  }

  return (
    <PageTransition>
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-teal via-teal-dark to-navy p-6 lg:p-8 text-white">
          <div className="absolute top-0 right-0 w-56 h-56 bg-teal-light/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
          <div className="relative z-10 flex items-center gap-4">
            <button
              onClick={() => router.push('/settings')}
              className="w-11 h-11 rounded-xl bg-white/15 backdrop-blur flex items-center justify-center shrink-0 text-white hover:bg-white/25 transition-colors"
            >
              <ArrowLeft size={20} />
            </button>
            <div className="w-11 h-11 rounded-xl bg-white/15 backdrop-blur flex items-center justify-center shrink-0">
              <Sparkles size={20} className="text-white" />
            </div>
            <div>
              <h1 className="font-display text-2xl lg:text-3xl font-bold tracking-tight">Personnalisation des Prompts</h1>
              <p className="text-white/60 text-sm mt-0.5">Modifiez les consignes d&apos;IA stockées en base de données et intégrez des profils d&apos;élèves.</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main prompt editing area */}
          <div className="lg:col-span-2 space-y-6">
            {/* Global Prompts Card */}
            <Card className="border-teal/10">
              <CardHeader className="bg-teal/5 py-4 border-b border-teal/10">
                <div className="flex items-center gap-2">
                  <Globe className="text-teal animate-pulse" size={18} />
                  <h2 className="font-display font-semibold text-navy text-sm">Instructions & Contexte Globaux</h2>
                </div>
                <p className="text-xs text-muted mt-0.5">Ces instructions et informations de contexte s&apos;appliquent à tous les documents générés.</p>
              </CardHeader>
              <CardContent className="py-5 space-y-4">
                {/* Global Prompt */}
                <div>
                  <label className="block text-xs font-semibold text-navy uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                    <span>Instruction Globale</span>
                    <span className="text-[10px] text-muted font-normal lowercase">(ex: règles de style, contraintes générales)</span>
                  </label>
                  <textarea
                    value={prompts.global || ''}
                    onChange={(e) => handlePromptChange('global', e.target.value)}
                    rows={3}
                    className="w-full rounded-xl border border-border bg-white p-3 text-sm text-navy placeholder:text-muted/50 focus:outline-none focus:ring-2 focus:ring-teal/30 focus:border-teal leading-relaxed font-mono"
                    placeholder="Instructions globales appliquées à tous les documents..."
                  />
                </div>

                {/* Context Prompt */}
                <div>
                  <label className="block text-xs font-semibold text-navy uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                    <span>Contexte Global de la Classe</span>
                    <span className="text-[10px] text-muted font-normal lowercase">(ex: équipement de l'école, situation géographique)</span>
                  </label>
                  <textarea
                    value={prompts.context || ''}
                    onChange={(e) => handlePromptChange('context', e.target.value)}
                    rows={3}
                    className="w-full rounded-xl border border-border bg-white p-3 text-sm text-navy placeholder:text-muted/50 focus:outline-none focus:ring-2 focus:ring-teal/30 focus:border-teal leading-relaxed font-mono"
                    placeholder="Décrivez ici le contexte général de l'établissement ou de la classe..."
                  />
                </div>
              </CardContent>
            </Card>

            {/* Document Specific Prompts Card */}
            <Card>
              <CardHeader className="py-4 border-b border-border">
                <div className="flex items-center gap-2">
                  <Info className="text-teal" size={18} />
                  <h2 className="font-display font-semibold text-navy text-sm">Instructions Spécifiques par Document</h2>
                </div>
              </CardHeader>
              <CardContent className="py-5">
                <div className="flex flex-wrap gap-2 mb-6">
                  {Object.keys(DEFAULT_PROMPTS).filter(key => key !== 'global' && key !== 'context').map((key) => (
                    <button
                      key={key}
                      onClick={() => setActiveDoc(key)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                        activeDoc === key
                          ? 'bg-teal text-white shadow-sm shadow-teal/20'
                          : 'bg-parchment-dark text-muted hover:bg-parchment-dark'
                      }`}
                    >
                      {DOC_LABELS[key]}
                    </button>
                  ))}
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-navy mb-2">
                      Consigne système pour : <span className="text-teal">{DOC_LABELS[activeDoc]}</span>
                    </label>
                    <textarea
                      value={prompts[activeDoc] || ''}
                      onChange={(e) => handlePromptChange(activeDoc, e.target.value)}
                      rows={8}
                      className="w-full rounded-xl border border-border bg-white p-4 text-sm text-navy placeholder:text-muted/50 focus:outline-none focus:ring-2 focus:ring-teal/30 focus:border-teal leading-relaxed font-mono"
                      placeholder="Saisissez vos instructions personnalisées d'IA ici..."
                    />
                  </div>
                </div>

                <div className="flex items-center gap-3 mt-6 border-t border-border pt-4">
                  <Button onClick={handleSave} disabled={saving}>
                    {saving ? (
                      <>
                        <Loader2 size={16} className="animate-spin mr-2" /> Enregistrement...
                      </>
                    ) : (
                      <>
                        <Save size={16} className="mr-2" /> Enregistrer les Prompts
                      </>
                    )}
                  </Button>
                  <Button onClick={handleReset} variant="secondary" disabled={saving}>
                    <RotateCcw size={16} className="mr-2" />
                    Réinitialiser par défaut
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Student Box Div containing presets */}
          <div className="space-y-4">
            <Card className="border-teal/20">
              <CardHeader className="bg-teal/5 border-b border-teal/10 py-4">
                <div className="flex items-center gap-2">
                  <GraduationCap className="text-teal" size={18} />
                  <h3 className="font-display font-semibold text-navy text-sm">Boîte à Outils Élèves</h3>
                </div>
                <p className="text-[11px] text-muted mt-0.5">Choisissez le champ cible puis cliquez sur un profil pour l&apos;ajouter.</p>
              </CardHeader>
              <CardContent className="py-4 space-y-5">
                {/* Target Selector Dropdown */}
                <div>
                  <label className="block text-xs font-semibold text-navy uppercase tracking-wider mb-2">
                    Ajouter les informations au champ :
                  </label>
                  <select
                    value={toolboxTarget}
                    onChange={(e) => setToolboxTarget(e.target.value as any)}
                    className="w-full rounded-lg border border-border bg-white px-3 py-2 text-xs text-navy focus:outline-none focus:ring-2 focus:ring-teal"
                  >
                    <option value="global">Instruction Globale (Tous les docs)</option>
                    <option value="context">Contexte Global (Classe / Établissement)</option>
                    <option value="active_doc">Document Actif ({DOC_LABELS[activeDoc]})</option>
                  </select>
                </div>

                <hr className="border-border" />

                {/* Academic */}
                <div className="space-y-2">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-navy uppercase tracking-wider">
                    <BookOpen size={12} className="text-teal" />
                    <span>Niveau & Rythme</span>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    {STUDENT_PROPS.filter((p) => p.category === 'academic').map((p) => (
                      <button
                        key={p.label}
                        onClick={() => appendToTargetPrompt(p.value)}
                        className="px-2.5 py-1.5 rounded-lg bg-white border border-border hover:border-teal hover:bg-teal/5 text-xs text-navy transition-all text-left shadow-sm hover:shadow"
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Behavior */}
                <div className="space-y-2">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-navy uppercase tracking-wider">
                    <Users size={12} className="text-gold" />
                    <span>Comportement & Dynamique</span>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    {STUDENT_PROPS.filter((p) => p.category === 'behavior').map((p) => (
                      <button
                        key={p.label}
                        onClick={() => appendToTargetPrompt(p.value)}
                        className="px-2.5 py-1.5 rounded-lg bg-white border border-border hover:border-teal hover:bg-teal/5 text-xs text-navy transition-all text-left shadow-sm hover:shadow"
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Social / Cultural */}
                <div className="space-y-2">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-navy uppercase tracking-wider">
                    <Compass size={12} className="text-red" />
                    <span>Environnement & Culture</span>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    {STUDENT_PROPS.filter((p) => p.category === 'social').map((p) => (
                      <button
                        key={p.label}
                        onClick={() => appendToTargetPrompt(p.value)}
                        className="px-2.5 py-1.5 rounded-lg bg-white border border-border hover:border-teal hover:bg-teal/5 text-xs text-navy transition-all text-left shadow-sm hover:shadow"
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </PageTransition>
  );
}
