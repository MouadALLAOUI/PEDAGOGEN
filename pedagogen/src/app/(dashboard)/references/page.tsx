'use client';

import { useState, useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import {
  Upload,
  FileText,
  Trash2,
  FolderOpen,
  Calendar,
  HardDrive,
  Lock,
  Image as ImageIcon,
  Save,
  Check,
  Plus,
  Minus,
} from 'lucide-react';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { PageTransition } from '@/components/layout/PageTransition';
import {
  REFERENCE_CATEGORY_LABELS,
  type ReferenceCategory,
  type ReferenceFile,
} from '@/types/references';

export default function ReferencesPage() {
  const [files, setFiles] = useState<ReferenceFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<ReferenceCategory>('custom');
  const [cachedImages, setCachedImages] = useState<any[]>([]);
  const [includePrompt, setIncludePrompt] = useState('');
  const [excludePrompt, setExcludePrompt] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    // Load saved prompts from localStorage
    setIncludePrompt(localStorage.getItem('pedagogen_include_prompt') || '');
    setExcludePrompt(localStorage.getItem('pedagogen_exclude_prompt') || '');

    fetch('/api/references')
      .then((res) => res.json())
      .then((data) => {
        if (data.files) setFiles(data.files);
      })
      .catch(() => {});

    fetch('/api/images')
      .then((res) => res.json())
      .then((data) => {
        if (data.images) setCachedImages(data.images);
      })
      .catch(() => {});
  }, []);

  const savePrompts = () => {
    localStorage.setItem('pedagogen_include_prompt', includePrompt);
    localStorage.setItem('pedagogen_exclude_prompt', excludePrompt);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    setUploading(true);
    for (const file of acceptedFiles) {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('category', selectedCategory);

      try {
        const res = await fetch('/api/references', {
          method: 'POST',
          body: formData,
        });
        if (res.ok) {
          const data = await res.json();
          setFiles((prev) => [data.file, ...prev]);
        }
      } catch (err) {
        console.error('Upload failed:', err);
      }
    }
    setUploading(false);
  }, [selectedCategory]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'text/plain': ['.txt'],
      'text/markdown': ['.md'],
    },
  });

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/references?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        setFiles((prev) => prev.filter((f) => f.id !== id));
      }
    } catch (err) {
      console.error('Delete failed:', err);
    }
  };

  const handleToggle = async (id: string, enabled: boolean) => {
    try {
      await fetch('/api/references', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, enabled }),
      });
      setFiles((prev) =>
        prev.map((f) => (f.id === id ? { ...f, enabled } : f))
      );
    } catch (err) {
      console.error('Toggle failed:', err);
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1048576).toFixed(1)} MB`;
  };

  return (
    <PageTransition>
      <div className="max-w-4xl mx-auto space-y-8">
        <div>
          <h1 className="font-display text-2xl font-bold text-navy">
            Fichiers de Référence
          </h1>
          <p className="text-muted mt-1">
            Uploadez et gérez les documents de référence pour enrichir les générations IA.
          </p>
        </div>

        {/* Category selector */}
        <Card>
          <CardContent className="py-4">
            <label className="block text-sm font-medium text-navy mb-2">
              Catégorie du fichier
            </label>
            <div className="flex flex-wrap gap-2">
              {(Object.entries(REFERENCE_CATEGORY_LABELS) as [ReferenceCategory, string][]).map(
                ([key, label]) => (
                  <button
                    key={key}
                    onClick={() => setSelectedCategory(key)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      selectedCategory === key
                        ? 'bg-teal text-white'
                        : 'bg-navy-light/5 text-muted hover:bg-navy-light/10'
                    }`}
                  >
                    {label}
                  </button>
                )
              )}
            </div>
          </CardContent>
        </Card>

        {/* Upload zone */}
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
            isDragActive
              ? 'border-teal bg-teal/5'
              : 'border-border hover:border-teal/50 hover:bg-navy-light/2'
          }`}
        >
          <input {...getInputProps()} />
          <div className="flex flex-col items-center gap-3">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
              isDragActive ? 'bg-teal/10 text-teal' : 'bg-navy-light/5 text-muted'
            }`}>
              <Upload size={24} />
            </div>
            <div>
              <p className="font-medium text-navy">
                {isDragActive ? 'Déposez vos fichiers ici' : 'Glissez-déposez vos fichiers'}
              </p>
              <p className="text-sm text-muted mt-1">
                PDF, DOCX, TXT ou MD — Max 10 MB
              </p>
            </div>
            {uploading && (
              <p className="text-sm text-teal font-medium">Upload en cours...</p>
            )}
          </div>
        </div>

        {/* File list */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-lg font-semibold text-navy">
              Fichiers de Référence
            </h2>
            <Badge variant="muted">{files.length} fichier(s)</Badge>
          </div>

          {files.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <FolderOpen size={40} className="text-muted/30 mx-auto mb-3" />
                <p className="text-muted">Aucun fichier de référence.</p>
                <p className="text-xs text-muted/60 mt-1">
                  Uploadez des documents pour les inclure dans vos générations.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-3">
              {files.map((file) => (
                <Card key={file.id}>
                  <CardContent className="flex items-center gap-4 py-4">
                    <div className="w-10 h-10 rounded-lg bg-teal/10 flex items-center justify-center flex-shrink-0">
                      <FileText size={18} className="text-teal" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-navy truncate">{file.name}</p>
                        {file.builtin && (
                          <Badge variant="gold">
                            <Lock size={10} className="mr-1" />
                            Par défaut
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-muted">
                        <Badge variant="teal">
                          {REFERENCE_CATEGORY_LABELS[file.category]}
                        </Badge>
                        <span className="flex items-center gap-1">
                          <HardDrive size={10} />
                          {formatSize(file.size)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar size={10} />
                          {new Date(file.uploadedAt).toLocaleDateString('fr-FR')}
                        </span>
                      </div>
                    </div>

                    {/* Toggle switch */}
                    <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
                      <input
                        type="checkbox"
                        checked={file.enabled}
                        onChange={(e) => handleToggle(file.id, e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-10 h-5 rounded-full bg-border peer-checked:bg-teal transition-colors" />
                      <div className="absolute left-0.5 top-0.5 w-4 h-4 rounded-full bg-white shadow peer-checked:translate-x-5 transition-transform" />
                    </label>

                    {/* Delete button (only for non-builtin) */}
                    {!file.builtin && (
                      <button
                        onClick={() => handleDelete(file.id)}
                        className="p-2 rounded-lg hover:bg-red/10 text-muted hover:text-red transition-colors flex-shrink-0"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Cached Images Section */}
        {cachedImages.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-lg font-semibold text-navy">
                Images Générées (Cache)
              </h2>
              <Badge variant="muted">{cachedImages.length} image(s)</Badge>
            </div>
            <p className="text-xs text-muted mb-3">
              Ces images sont réutilisables entre les cours pour économiser vos tokens.
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {cachedImages.map((img) => (
                <Card key={img.id}>
                  <CardContent className="p-3">
                    <div className="aspect-square rounded-lg bg-navy-light/5 overflow-hidden mb-2">
                      <img
                        src={img.url}
                        alt={img.prompt}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <p className="text-xs text-muted line-clamp-2">{img.prompt}</p>
                    <p className="text-xs text-teal mt-1">{img.tokensUsed} tokens économisés</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Include / Exclude Prompt Directives */}
        <Card>
          <CardHeader>
            <h2 className="font-display font-semibold text-navy">
              Instructions de Génération
            </h2>
            <p className="text-xs text-muted mt-1">
              Définissez ce que l&apos;IA doit inclure ou exclure dans ses générations.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Include */}
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-navy mb-2">
                <div className="w-6 h-6 rounded bg-green/10 flex items-center justify-center">
                  <Plus size={14} className="text-green" />
                </div>
                Inclure dans la génération
              </label>
              <textarea
                value={includePrompt}
                onChange={(e) => setIncludePrompt(e.target.value)}
                placeholder="Ex: Utilise le vocabulaire technique approprié, ajoute des exemples concrets du programme marocain, inclut des activités pratiques..."
                rows={4}
                className="w-full px-4 py-3 rounded-lg border border-border bg-white text-navy text-sm focus:outline-none focus:ring-2 focus:ring-teal/30 focus:border-teal transition-all resize-none placeholder:text-muted/50"
              />
              <p className="text-xs text-muted mt-1.5">
                Ces instructions seront envoyées à l&apos;IA pour orienter la génération.
              </p>
            </div>

            {/* Exclude */}
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-navy mb-2">
                <div className="w-6 h-6 rounded bg-red/10 flex items-center justify-center">
                  <Minus size={14} className="text-red" />
                </div>
                Exclure de la génération
              </label>
              <textarea
                value={excludePrompt}
                onChange={(e) => setExcludePrompt(e.target.value)}
                placeholder="Ex: Pas de blabla inutile, pas de contenu hors programme, évite les répétitions, pas de phrases vides..."
                rows={4}
                className="w-full px-4 py-3 rounded-lg border border-border bg-white text-navy text-sm focus:outline-none focus:ring-2 focus:ring-red/30 focus:border-red transition-all resize-none placeholder:text-muted/50"
              />
              <p className="text-xs text-muted mt-1.5">
                L&apos;IA évitera ces éléments dans sa réponse.
              </p>
            </div>

            {/* Save button */}
            <div className="flex items-center gap-3 pt-2">
              <Button onClick={savePrompts} variant="secondary">
                <Save size={16} />
                Sauvegarder
              </Button>
              {saved && (
                <span className="text-sm text-green font-medium flex items-center gap-1">
                  <Check size={14} />
                  Sauvegardé
                </span>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Info card */}
        <Card>
          <CardContent className="py-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-teal/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <ImageIcon size={16} className="text-teal" />
              </div>
              <div>
                <p className="text-sm font-medium text-navy">
                  Comment ça marche ?
                </p>
                <p className="text-xs text-muted mt-1">
                  Activez/désactivez chaque fichier avec le bouton à côté. Seuls les fichiers
                  <strong> activés </strong>
                  seront inclus dans la génération IA. Les fichiers marqués
                  <strong> &ldquo;Par défaut&rdquo;</strong>
                  sont les programmes officiels du ministère.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </PageTransition>
  );
}
