'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Upload, FileSpreadsheet, AlertTriangle, CheckCircle2, Loader2, Save, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { PageTransition } from '@/components/layout/PageTransition';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Card, CardContent } from '@/components/ui/Card';
import { Select } from '@/components/ui/Select';

interface ImportRow {
  ligne: number;
  nom: string;
  prenom: string;
  cne: string;
  classe: string;
  niveau: string;
  genre: string;
}

interface ImportError {
  ligne: number;
  type: string;
  message: string;
}

interface PreviewData {
  fileName: string;
  rows: ImportRow[];
  errors: ImportError[];
  validRows: ImportRow[];
  classesManquantes: string[];
  total: number;
  classe: { id: string; name: string; niveau: string };
}

const ERROR_VARIANTS: Record<string, 'red' | 'gold' | 'default'> = {
  doublon_base: 'gold',
  doublon_fichier: 'gold',
  champ_manquant: 'red',
  niveau_invalide: 'red',
  genre_invalide: 'red',
};

export default function ClasseImportPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [classe, setClasse] = useState<{ id: string; name: string; niveau: string } | null>(null);
  const [encoding, setEncoding] = useState('auto');
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<PreviewData | null>(null);
  const [createMissing, setCreateMissing] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/classes/${id}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        setClasse({ id: data.classe.id, name: data.classe.name, niveau: data.classe.niveau });
      })
      .catch((e) => toast.error(e.message || 'Échec du chargement'));
  }, [id]);

  const handleFile = async (file: File) => {
    setUploading(true);
    setPreview(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('encoding', encoding);
      const res = await fetch(`/api/classes/${id}/import`, { method: 'POST', body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Échec de la lecture du fichier');
      setPreview(data);
      if (data.validRows.length === 0) {
        toast.error('Aucune ligne valide détectée');
      } else {
        toast.success(`${data.validRows.length} ligne(s) valide(s) sur ${data.total}`);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Échec de l\'import');
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!preview || preview.validRows.length === 0) return;
    if (!window.confirm(`Importer ${preview.validRows.length} élève(s) dans la base ?`)) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/classes/${id}/import/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows: preview.validRows, createMissingClasses: createMissing }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Échec de l\'import');
      toast.success(`${data.created} élève(s) importé(s)`);
      if (data.skipped?.length) toast.error(`${data.skipped.length} ligne(s) ignorée(s)`);
      router.push(`/classes/${id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Échec de l\'import');
    } finally {
      setSaving(false);
    }
  };

  return (
    <PageTransition>
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Header */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-teal via-teal-dark to-navy p-6 lg:p-8 text-white">
          <div className="absolute top-0 right-0 w-56 h-56 bg-teal-light/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
          <div className="relative z-10">
            <button onClick={() => router.push(`/classes/${id}`)} className="flex items-center gap-1.5 text-white/60 text-xs mb-3 hover:text-white transition-colors">
              <ArrowLeft size={13} />Retour à la classe
            </button>
            <div className="flex items-center gap-4">
              <div className="w-11 h-11 rounded-xl bg-white/15 backdrop-blur flex items-center justify-center shrink-0">
                <Upload size={20} />
              </div>
              <div>
                <h1 className="font-display text-2xl lg:text-3xl font-bold tracking-tight">Import d'Élèves</h1>
                <p className="text-white/60 text-sm mt-0.5">
                  Classe cible : {classe ? `${classe.name} (${classe.niveau})` : '...'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Upload zone */}
        {!preview && (
          <Card>
            <CardContent className="p-6 pt-6 space-y-4">
              <p className="text-sm text-muted">
                Colonnes reconnues : <strong className="text-navy">nom, prenom, CNE, classe, niveau</strong> (requises sauf classe/niveau si cible fixe) · <strong className="text-navy">genre</strong> (optionnel, M/F).
                Séparateurs acceptés : <code className="text-xs bg-parchment-dark px-1 rounded">,;</code> — Encodages : UTF-8, Windows-1256.
                <a href="/api/classes/import/template" download className="text-teal hover:underline ml-1">Télécharger le modèle CSV</a>
              </p>
              <div className="w-56">
                <Select
                  label="Encodage du fichier CSV"
                  value={encoding}
                  onChange={(e) => setEncoding(e.target.value)}
                  options={[
                    { value: 'auto', label: 'Détection automatique' },
                    { value: 'utf-8', label: 'UTF-8' },
                    { value: 'windows-1256', label: 'Windows-1256 (Arabe)' },
                  ]}
                />
              </div>
              <label
                className="block border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all border-border hover:border-teal/50 hover:bg-parchment-dark/50"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleFile(f);
                  }}
                />
                {uploading ? (
                  <Loader2 size={28} className="text-teal mx-auto animate-spin" />
                ) : (
                  <FileSpreadsheet size={28} className="text-muted mx-auto mb-3" />
                )}
                <p className="text-sm font-medium text-navy">{uploading ? 'Analyse du fichier...' : 'Cliquez pour choisir un fichier CSV ou XLSX'}</p>
                <p className="text-xs text-muted mt-1">Première feuille du classeur XLSX utilisée par défaut · max 5 Mo</p>
              </label>
            </CardContent>
          </Card>
        )}

        {/* Preview */}
        {preview && (
          <>
            {/* Error report */}
            {preview.errors.length > 0 && (
              <Card>
                <CardContent className="p-5 pt-5">
                  <div className="flex items-center gap-2 mb-3">
                    <AlertTriangle size={16} className="text-gold" />
                    <h3 className="font-semibold text-navy text-sm">Rapport d'erreurs — {preview.errors.length} problème(s)</h3>
                  </div>
                  <div className="max-h-48 overflow-y-auto space-y-1.5">
                    {preview.errors.map((e, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs">
                        <Badge variant={ERROR_VARIANTS[e.type] || 'default'}>{e.type.replace(/_/g, ' ')}</Badge>
                        <span className="text-muted">{e.message}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {preview.classesManquantes.length > 0 && (
              <Card>
                <CardContent className="p-5 pt-5">
                  <div className="flex items-start gap-3">
                    <AlertTriangle size={16} className="text-gold mt-0.5" />
                    <div>
                      <h3 className="font-semibold text-navy text-sm">Classes introuvables dans la base</h3>
                      <p className="text-xs text-muted mt-0.5">{preview.classesManquantes.join(', ')}</p>
                      <label className="flex items-center gap-2 mt-2 text-xs text-navy cursor-pointer">
                        <input type="checkbox" checked={createMissing} onChange={(e) => setCreateMissing(e.target.checked)} className="accent-teal" />
                        Créer ces classes automatiquement (niveau déduit du fichier)
                      </label>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Valid rows table */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={16} className="text-green" />
                  <h3 className="font-semibold text-navy text-sm">
                    Aperçu avant enregistrement — {preview.validRows.length} élève(s) valide(s) sur {preview.total}
                  </h3>
                </div>
                <div className="flex gap-2">
                  <Button variant="secondary" size="sm" onClick={() => setPreview(null)}><X size={13} />Annuler</Button>
                  <Button size="sm" onClick={handleSave} disabled={saving || preview.validRows.length === 0}>
                    {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
                    Importer {preview.validRows.length} élève(s)
                  </Button>
                </div>
              </div>

              <div className="rounded-xl border border-border bg-white overflow-hidden overflow-x-auto">
                <div className="min-w-[640px]">
                  <div className="grid grid-cols-[50px_1fr_1fr_140px_1fr_70px_70px] gap-3 px-4 py-2.5 border-b border-border text-xs font-medium text-muted bg-parchment-dark/50">
                    <span>Ligne</span><span>Nom</span><span>Prénom</span><span>CNE</span><span>Classe</span><span>Niveau</span><span>Genre</span>
                  </div>
                  {preview.validRows.map((r) => (
                    <div key={r.ligne} className="grid grid-cols-[50px_1fr_1fr_140px_1fr_70px_70px] gap-3 px-4 py-2.5 items-center border-b border-border/50 last:border-0 text-xs">
                      <span className="text-muted">{r.ligne}</span>
                      <span className="font-medium text-navy truncate">{r.nom}</span>
                      <span className="text-navy truncate">{r.prenom}</span>
                      <span className="font-mono text-muted">{r.cne}</span>
                      <span className="text-muted truncate">{r.classe}</span>
                      <Badge variant="teal">{r.niveau}</Badge>
                      <span className="text-muted">{r.genre || '—'}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </PageTransition>
  );
}
