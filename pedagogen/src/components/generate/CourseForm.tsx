'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { MATIERES, NIVEAUX, LANGUES } from '@/lib/curriculum/moroccoCollege';
import type { CourseMetadata } from '@/types/generation';
import { GraduationCap, HelpCircle } from 'lucide-react';

const schema = z.object({
  niveau: z.enum(['1AC', '2AC', '3AC']),
  matiere: z.string().min(1, 'Matière requise'),
  unite: z.string().min(1, 'Unité requise'),
  lecon: z.string().min(1, 'Titre de la leçon requis'),
  duree: z.number().min(15, 'Durée minimale 15 min').max(120, 'Durée maximale 120 min'),
  competences: z.string().min(1, 'Au moins une compétence requise'),
  langue: z.enum(['fr', 'ar', 'fr+ar']),
  semestre: z.union([z.literal(1), z.literal(2)]),
  profilEleves: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

interface CourseFormProps {
  onSubmit: (data: CourseMetadata) => void;
}

const METHODES = [
  "Méthode expositive (Lecture/Presentation)",
  "Méthode démonstrative (Show-Do-Say)",
  "Méthode interrogative (Questioning/Diagnostic)",
  "Méthode de découverte (Trial and Error)",
  "Méthode de résolution de problèmes (PBL)",
  "Méthode de projet (Project-Based)",
];

const TONS = ["Formal", "Engaging", "Modern", "Academic"];

const BLOOM_LEVELS = ["Remember", "Understand", "Apply", "Analyze", "Evaluate", "Create"];

export function CourseForm({ onSubmit }: CourseFormProps) {
  const [methode, setMethode] = useState(METHODES[3]);
  const [ton, setTon] = useState("Engaging");
  const [niveauxBloom, setNiveauxBloom] = useState<string[]>(["Understand", "Apply"]);
  const [differentiation, setDifferentiation] = useState<'soutien' | 'standard' | 'defi'>('standard');

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      niveau: "1AC",
      matiere: "Informatique",
      langue: "fr",
      semestre: 1,
      duree: 50,
      profilEleves: "",
    },
  });

  const watchNiveau = watch("niveau");
  const watchSemestre = watch("semestre");

  const onFormSubmit = (data: FormData) => {
    onSubmit({
      ...data,
      competences: data.competences.split(",").map((c) => c.trim()).filter(Boolean),
      methodePedagogique: methode,
      ton,
      niveauxBloom,
      differentiationLevel: differentiation,
    });
  };

  const filteredMatieres = MATIERES.filter(
    (m) => m.id === "info" && m.niveaux.includes(watchNiveau as "1AC" | "2AC" | "3AC"),
  );

  return (
    <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Select
          label="Niveau"
          value={watchNiveau}
          onChange={(e) => setValue("niveau", e.target.value as "1AC" | "2AC" | "3AC")}
          options={NIVEAUX.map((n) => ({ value: n, label: n }))}
          error={errors.niveau?.message}
        />

        <Select
          label="Semestre"
          value={String(watchSemestre)}
          onChange={(e) => setValue("semestre", Number(e.target.value) as 1 | 2)}
          options={[
            { value: "1", label: "Semestre 1" },
            { value: "2", label: "Semestre 2" },
          ]}
        />

        <Select
          label="Matière"
          value={watch("matiere")}
          onChange={(e) => setValue("matiere", e.target.value)}
          options={[
            { value: "", label: "Sélectionner..." },
            ...filteredMatieres.map((m) => ({ value: m.nom, label: m.nom })),
          ]}
          error={errors.matiere?.message}
        />

        <Select
          label="Langue"
          value={watch("langue")}
          onChange={(e) => setValue("langue", e.target.value as "fr" | "ar" | "fr+ar")}
          options={LANGUES.map((l) => ({ value: l.value, label: l.label }))}
        />

        <Input
          label="Unité / Chapitre"
          placeholder="ex: Les fractions"
          error={errors.unite?.message}
          {...register("unite")}
        />

        <Input
          label="Titre de la Leçon"
          placeholder="ex: Addition et soustraction de fractions"
          error={errors.lecon?.message}
          {...register("lecon")}
        />

        <Input
          label="Durée (minutes)"
          type="number"
          error={errors.duree?.message}
          {...register("duree", { valueAsNumber: true })}
        />

        <Input
          label="Compétences Visées"
          placeholder="séparées par des virgules"
          error={errors.competences?.message}
          {...register("competences")}
        />
      </div>

      <Textarea
        label="Profil & niveau réel des élèves"
        placeholder="ex: Élèves très dynamiques mais en difficulté avec la langue française..."
        rows={3}
        {...register("profilEleves")}
      />

      {/* Strategy Section */}
      <div className="border-t border-border pt-5 space-y-4">
        <div className="flex items-center gap-2 text-navy">
          <GraduationCap className="text-indigo-600" size={20} />
          <h3 className="font-display font-bold text-lg uppercase tracking-wide">Stratégie</h3>
        </div>

        <div className="space-y-4">
          {/* Différenciation */}
          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-navy/70">Niveau de Différenciation</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {[
                { value: 'soutien' as const, label: '★ Soutien', desc: 'Guidé pas à pas' },
                { value: 'standard' as const, label: '★★ Standard', desc: 'Niveau programme' },
                { value: 'defi' as const, label: '★★★ Défi', desc: 'Problèmes ouverts' },
              ].map((d) => (
                <button
                  key={d.value}
                  type="button"
                  onClick={() => setDifferentiation(d.value)}
                  className={`px-4 py-2 rounded-full text-xs font-medium transition-all ${
                    differentiation === d.value
                      ? "bg-emerald-600 text-white shadow-md"
                      : "bg-white border border-border text-navy/70 hover:bg-parchment-dark"
                  }`}
                >
                  {d.label}
                  <span className="ml-1.5 opacity-70">{d.desc}</span>
                </button>
              ))}
            </div>
          </div>
          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-navy/70">Méthode Pédagogique</span>
              <HelpCircle size={14} className="text-muted/60" />
            </div>
            <div className="flex flex-wrap gap-2">
              {METHODES.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMethode(m)}
                  className={`px-4 py-2 rounded-full text-xs font-medium transition-all ${
                    methode === m
                      ? "bg-indigo-600 text-white shadow-md"
                      : "bg-white border border-border text-navy/70 hover:bg-navy-light/5"
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-navy/70">Ton</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {TONS.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTon(t)}
                  className={`px-4 py-2 rounded-full text-xs font-medium transition-all ${
                    ton === t
                      ? "bg-indigo-600 text-white shadow-md"
                      : "bg-white border border-border text-navy/70 hover:bg-navy-light/5"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-navy/70">Niveaux de Bloom</span>
              <HelpCircle size={14} className="text-muted/60" />
            </div>
            <div className="flex flex-wrap gap-2">
              {BLOOM_LEVELS.map((b) => {
                const isSelected = niveauxBloom.includes(b);
                return (
                  <button
                    key={b}
                    type="button"
                    onClick={() => {
                      setNiveauxBloom(
                        isSelected
                          ? niveauxBloom.filter((item) => item !== b)
                          : [...niveauxBloom, b],
                      );
                    }}
                    className={`px-4 py-2 rounded-full text-xs font-medium transition-all ${
                      isSelected
                        ? "bg-indigo-600 text-white shadow-md"
                        : "bg-white border border-border text-navy/70 hover:bg-navy-light/5"
                    }`}
                  >
                    {b}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <Button type="submit" size="lg" className="w-full md:w-auto">
        Valider les Informations
      </Button>
    </form>
  );
}
