'use client';

import { Suspense, useEffect, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, BookOpen, GraduationCap, Users } from 'lucide-react';
import toast from 'react-hot-toast';
import { PageTransition } from '@/components/layout/PageTransition';
import { EntryForm, type EntryFormData, type ClassScheduleConfig } from '@/components/notebook/EntryForm';
import type { CollegeClass } from '@/types/student';

function NouvelleEntreeContent() {
  const params = useParams<{ classeId: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [selectedClasseId, setSelectedClasseId] = useState<string>(params.classeId);
  const [selectedClassIds, setSelectedClassIds] = useState<string[]>(() => {
    const fromQuery = searchParams.get('classes');
    if (fromQuery) {
      const parsed = fromQuery.split(',').filter(Boolean);
      if (parsed.length > 0) return parsed;
    }
    return params.classeId ? [params.classeId] : [];
  });
  const [classeName, setClasseName] = useState<string>('');
  const [classes, setClasses] = useState<CollegeClass[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch('/api/students/classes')
      .then((r) => r.json())
      .then((data) => {
        setClasses(data.classes || []);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!selectedClasseId) return;
    const found = classes.find((c) => c.id === selectedClasseId);
    if (found) {
      setClasseName(`${found.name} (${found.niveau})`);
    } else {
      fetch(`/api/classes/${selectedClasseId}`)
        .then((r) => r.json())
        .then((data) => {
          if (data.classe) {
            setClasseName(`${data.classe.name} (${data.classe.niveau})`);
          }
        })
        .catch(() => {});
    }
  }, [selectedClasseId, classes]);

  const handleClassChange = (newId: string) => {
    setSelectedClasseId(newId);
    setSelectedClassIds([newId]);
    router.replace(`/notebook/${newId}/new`);
  };

  const handleSubmit = async (data: EntryFormData, classSchedules?: ClassScheduleConfig[]) => {
    if (classSchedules && classSchedules.length > 1) {
      setSaving(true);
      try {
        const res = await fetch('/api/notebook', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...data,
            classes: classSchedules.map((cs) => ({
              classe_id: cs.classe_id,
              date: cs.date,
              heure_debut: cs.heure_debut,
              heure_fin: cs.heure_fin,
            })),
          }),
        });
        const resData = await res.json();
        if (!res.ok) throw new Error(resData.error || 'Échec de la création');
        toast.success(`${classSchedules.length} entrées créées avec succès`);
        router.push('/notebook');
      } finally {
        setSaving(false);
      }
      return;
    }

    const singleId = classSchedules?.[0]?.classe_id || selectedClassIds[0] || selectedClasseId;
    if (!singleId) {
      toast.error('Veuillez sélectionner au moins une classe');
      return;
    }
    setSaving(true);
    try {
      const singleSchedule = classSchedules?.[0];
      const res = await fetch('/api/notebook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          classe_id: singleId,
          date: singleSchedule?.date || data.date,
          heure_debut: singleSchedule?.heure_debut !== undefined ? singleSchedule.heure_debut : data.heure_debut,
          heure_fin: singleSchedule?.heure_fin !== undefined ? singleSchedule.heure_fin : data.heure_fin,
        }),
      });
      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error || 'Échec de la création');
      toast.success('Entrée enregistrée');
      router.push(`/notebook/${singleId}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <PageTransition>
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-teal via-teal-dark to-navy p-6 lg:p-8 text-white">
          <div className="absolute top-0 right-0 w-56 h-56 bg-teal-light/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
          <div className="relative z-10">
            <button
              onClick={() => router.push(selectedClasseId ? `/notebook/${selectedClasseId}` : '/notebook')}
              className="flex items-center gap-1.5 text-white/60 text-xs mb-3 hover:text-white transition-colors cursor-pointer"
            >
              <ArrowLeft size={13} />Retour au carnet de bord
            </button>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-11 h-11 rounded-xl bg-white/15 backdrop-blur flex items-center justify-center shrink-0">
                  <BookOpen size={20} />
                </div>
                <div>
                  <h1 className="font-display text-2xl lg:text-3xl font-bold tracking-tight">Nouvelle Entrée</h1>
                  {selectedClassIds.length > 1 ? (
                    <p className="text-white/85 text-xs sm:text-sm mt-0.5 flex items-center gap-1.5">
                      <Users size={14} className="shrink-0" />
                      <span>
                        <strong className="font-semibold text-white">{selectedClassIds.length} classes sélectionnées</strong>
                        {' : '}
                        {classes.filter((c) => selectedClassIds.includes(c.id)).map((c) => c.name).join(', ')}
                      </span>
                    </p>
                  ) : (
                    <p className="text-white/70 text-sm mt-0.5">{classeName || '...'}</p>
                  )}
                </div>
              </div>

              {classes.length > 1 && (
                <div className="flex items-center gap-2 bg-white/15 backdrop-blur border border-white/20 rounded-xl px-3 py-2 shrink-0">
                  <GraduationCap size={16} className="text-white/80 shrink-0" />
                  {selectedClassIds.length > 1 ? (
                    <span className="text-xs text-white font-semibold">
                      {selectedClassIds.length} classes actives
                    </span>
                  ) : (
                    <>
                      <span className="text-xs text-white/80 font-medium">Classe :</span>
                      <select
                        value={selectedClasseId}
                        onChange={(e) => handleClassChange(e.target.value)}
                        className="bg-transparent text-white text-xs font-semibold focus:outline-none cursor-pointer pr-1 [&>option]:text-navy [&>option]:bg-white"
                      >
                        {classes.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name} ({c.niveau})
                          </option>
                        ))}
                      </select>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        <EntryForm
          onSubmit={handleSubmit}
          saving={saving}
          submitLabel="Créer l'entrée"
          availableClasses={classes}
          selectedClassIds={selectedClassIds}
          onSelectedClassesChange={(ids) => {
            setSelectedClassIds(ids);
            if (ids.length === 1 && ids[0]) {
              setSelectedClasseId(ids[0]);
            }
          }}
          allowMultiClass={classes.length > 1}
        />
      </div>
    </PageTransition>
  );
}

export default function NouvelleEntreePage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-muted">Chargement...</div>}>
      <NouvelleEntreeContent />
    </Suspense>
  );
}
