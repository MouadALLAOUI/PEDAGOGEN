'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/Button';
import { MATIERES, NIVEAUX, LANGUES } from '@/lib/curriculum/moroccoCollege';
import type { CourseMetadata } from '@/types/generation';
import { useState } from 'react';

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

export function CourseForm({ onSubmit }: CourseFormProps) {
  const [niveau, setNiveau] = useState<string>('1AC');

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      niveau: '1AC',
      matiere: 'Informatique',
      langue: 'fr',
      semestre: 1,
      duree: 50,
      profilEleves: '',
    },
  });

  const onFormSubmit = (data: FormData) => {
    onSubmit({
      ...data,
      competences: data.competences.split(',').map((c) => c.trim()).filter(Boolean),
    });
  };

  const filteredMatieres = MATIERES.filter((m) => m.id === 'info' && m.niveaux.includes(niveau as '1AC' | '2AC' | '3AC'));

  return (
    <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Niveau */}
        <div>
          <label className="block text-sm font-medium text-navy mb-1.5">Niveau</label>
          <select
            {...register('niveau')}
            onChange={(e) => setNiveau(e.target.value)}
            className="w-full rounded-lg border border-border bg-white px-3 py-2.5 text-sm text-navy focus:outline-none focus:ring-2 focus:ring-teal focus:border-transparent"
          >
            {NIVEAUX.map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
          {errors.niveau && <p className="text-red text-xs mt-1">{errors.niveau.message}</p>}
        </div>

        {/* Semestre */}
        <div>
          <label className="block text-sm font-medium text-navy mb-1.5">Semestre</label>
          <select
            {...register('semestre', { valueAsNumber: true })}
            className="w-full rounded-lg border border-border bg-white px-3 py-2.5 text-sm text-navy focus:outline-none focus:ring-2 focus:ring-teal focus:border-transparent"
          >
            <option value={1}>Semestre 1</option>
            <option value={2}>Semestre 2</option>
          </select>
        </div>

        {/* Matière */}
        <div>
          <label className="block text-sm font-medium text-navy mb-1.5">Matière</label>
          <select
            {...register('matiere')}
            className="w-full rounded-lg border border-border bg-white px-3 py-2.5 text-sm text-navy focus:outline-none focus:ring-2 focus:ring-teal focus:border-transparent"
          >
            <option value="">Sélectionner...</option>
            {filteredMatieres.map((m) => (
              <option key={m.id} value={m.nom}>{m.nom}</option>
            ))}
          </select>
          {errors.matiere && <p className="text-red text-xs mt-1">{errors.matiere.message}</p>}
        </div>

        {/* Langue */}
        <div>
          <label className="block text-sm font-medium text-navy mb-1.5">Langue</label>
          <select
            {...register('langue')}
            className="w-full rounded-lg border border-border bg-white px-3 py-2.5 text-sm text-navy focus:outline-none focus:ring-2 focus:ring-teal focus:border-transparent"
          >
            {LANGUES.map((l) => (
              <option key={l.value} value={l.value}>{l.label}</option>
            ))}
          </select>
        </div>

        {/* Unité */}
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-navy mb-1.5">Unité / Chapitre</label>
          <input
            {...register('unite')}
            placeholder="ex: Les fractions"
            className="w-full rounded-lg border border-border bg-white px-3 py-2.5 text-sm text-navy placeholder:text-muted/50 focus:outline-none focus:ring-2 focus:ring-teal focus:border-transparent"
          />
          {errors.unite && <p className="text-red text-xs mt-1">{errors.unite.message}</p>}
        </div>

        {/* Leçon */}
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-navy mb-1.5">Titre de la Leçon</label>
          <input
            {...register('lecon')}
            placeholder="ex: Addition et soustraction de fractions"
            className="w-full rounded-lg border border-border bg-white px-3 py-2.5 text-sm text-navy placeholder:text-muted/50 focus:outline-none focus:ring-2 focus:ring-teal focus:border-transparent"
          />
          {errors.lecon && <p className="text-red text-xs mt-1">{errors.lecon.message}</p>}
        </div>

        {/* Durée */}
        <div>
          <label className="block text-sm font-medium text-navy mb-1.5">Durée (minutes)</label>
          <input
            type="number"
            {...register('duree', { valueAsNumber: true })}
            className="w-full rounded-lg border border-border bg-white px-3 py-2.5 text-sm text-navy focus:outline-none focus:ring-2 focus:ring-teal focus:border-transparent"
          />
          {errors.duree && <p className="text-red text-xs mt-1">{errors.duree.message}</p>}
        </div>

        {/* Compétences */}
        <div>
          <label className="block text-sm font-medium text-navy mb-1.5">
            Compétences Visées
          </label>
          <input
            {...register('competences')}
            placeholder="séparées par des virgules"
            className="w-full rounded-lg border border-border bg-white px-3 py-2.5 text-sm text-navy placeholder:text-muted/50 focus:outline-none focus:ring-2 focus:ring-teal focus:border-transparent"
          />
          <p className="text-xs text-muted mt-1">Séparez par des virgules</p>
          {errors.competences && <p className="text-red text-xs mt-1">{errors.competences.message}</p>}
        </div>

        {/* Profil & Niveau réel des élèves */}
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-navy mb-1.5">
            Profil & niveau réel des élèves (comportement en classe, culture sociale, niveau scolaire...)
          </label>
          <textarea
            {...register('profilEleves')}
            placeholder="ex: Élèves très dynamiques mais en difficulté avec la langue française. Ils viennent d'un milieu périurbain, et s'intéressent beaucoup aux applications pratiques."
            rows={3}
            className="w-full rounded-lg border border-border bg-white px-3 py-2.5 text-sm text-navy placeholder:text-muted/50 focus:outline-none focus:ring-2 focus:ring-teal focus:border-transparent"
          />
          {errors.profilEleves && <p className="text-red text-xs mt-1">{errors.profilEleves.message}</p>}
        </div>
      </div>

      <Button type="submit" size="lg" className="w-full md:w-auto">
        Valider les Informations
      </Button>
    </form>
  );
}
