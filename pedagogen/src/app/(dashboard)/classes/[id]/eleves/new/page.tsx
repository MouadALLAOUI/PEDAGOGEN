'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, UserPlus, Loader2, Save } from 'lucide-react';
import toast from 'react-hot-toast';
import { PageTransition } from '@/components/layout/PageTransition';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Badge } from '@/components/ui/Badge';

export default function NouvelElevePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [classe, setClasse] = useState<{ name: string; niveau: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ nom: '', prenom: '', cne: '', genre: 'M', birth_date: '', guardian_name: '', guardian_phone: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!id) return;
    fetch(`/api/classes/${id}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        setClasse({ name: data.classe.name, niveau: data.classe.niveau });
      })
      .catch((e) => toast.error(e.message || 'Échec du chargement'));
  }, [id]);

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!form.nom.trim()) errs.nom = 'Le nom est requis';
    if (!form.prenom.trim()) errs.prenom = 'Le prénom est requis';
    if (form.cne && !/^[A-Za-z]{1,2}\d{4,10}$|^\d{5,12}$/.test(form.cne.trim())) {
      // CNE marocain : format souple — lettres/chiffres, 5 à 12 caractères
      if (form.cne.trim().length < 5) errs.cne = 'CNE trop court (min 5 caractères)';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/classes/${id}/eleves`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nom: form.nom,
          prenom: form.prenom,
          cne: form.cne,
          genre: form.genre,
          birth_date: form.birth_date,
          guardian_name: form.guardian_name,
          guardian_phone: form.guardian_phone,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Échec de l\'ajout');
      toast.success(`${form.prenom} ${form.nom} ajouté à la classe`);
      router.push(`/classes/${id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Échec de l\'ajout');
    } finally {
      setSaving(false);
    }
  };

  return (
    <PageTransition>
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-teal via-teal-dark to-navy p-6 lg:p-8 text-white">
          <div className="absolute top-0 right-0 w-56 h-56 bg-teal-light/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
          <div className="relative z-10">
            <button onClick={() => router.push(`/classes/${id}`)} className="flex items-center gap-1.5 text-white/60 text-xs mb-3 hover:text-white transition-colors">
              <ArrowLeft size={13} />Retour à la classe
            </button>
            <div className="flex items-center gap-4">
              <div className="w-11 h-11 rounded-xl bg-white/15 backdrop-blur flex items-center justify-center shrink-0">
                <UserPlus size={20} />
              </div>
              <div>
                <h1 className="font-display text-2xl lg:text-3xl font-bold tracking-tight">Nouvel Élève</h1>
                <p className="text-white/60 text-sm mt-0.5">
                  {classe ? (
                    <>Ajout manuel dans <span className="text-white">{classe.name}</span> <Badge variant="teal">{classe.niveau}</Badge></>
                  ) : '...'}
                </p>
              </div>
            </div>
          </div>
        </div>

        <Card>
          <CardContent className="p-6 pt-6">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <Input label="Nom *" value={form.nom} error={errors.nom} onChange={(e) => setForm({ ...form, nom: e.target.value })} placeholder="Nom de famille" />
                <Input label="Prénom *" value={form.prenom} error={errors.prenom} onChange={(e) => setForm({ ...form, prenom: e.target.value })} placeholder="Prénom" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Input label="CNE / Code Massar" value={form.cne} error={errors.cne} onChange={(e) => setForm({ ...form, cne: e.target.value })} placeholder="Optionnel — unique" />
                <Select
                  label="Genre"
                  value={form.genre}
                  onChange={(e) => setForm({ ...form, genre: e.target.value })}
                  options={[{ value: 'M', label: 'M (Masculin)' }, { value: 'F', label: 'F (Féminin)' }]}
                />
              </div>
              <Input label="Date de naissance" type="date" value={form.birth_date} onChange={(e) => setForm({ ...form, birth_date: e.target.value })} />
              <div className="grid grid-cols-2 gap-4">
                <Input label="Nom du tuteur" value={form.guardian_name} onChange={(e) => setForm({ ...form, guardian_name: e.target.value })} placeholder="Optionnel" />
                <Input label="Téléphone du tuteur" value={form.guardian_phone} onChange={(e) => setForm({ ...form, guardian_phone: e.target.value })} placeholder="Optionnel" />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="secondary" onClick={() => router.push(`/classes/${id}`)}>Annuler</Button>
                <Button type="submit" disabled={saving}>
                  {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                  Ajouter l'élève
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </PageTransition>
  );
}
