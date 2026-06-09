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

  useEffect(() => {
    fetch('/api/references')
      .then((res) => res.json())
      .then((data) => {
        if (data.files) setFiles(data.files);
      })
      .catch(() => {});
  }, []);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    setUploading(true);
    for (const file of acceptedFiles) {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('category', 'custom');

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
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'text/plain': ['.txt'],
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
            Uploadez des documents de référence (templates, programmes, circulaires) pour enrichir les générations.
          </p>
        </div>

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
                PDF, DOCX ou TXT — Max 10 MB
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
              Fichiers Uploadés
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
                      <p className="text-sm font-medium text-navy truncate">{file.name}</p>
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
                    <button
                      onClick={() => handleDelete(file.id)}
                      className="p-2 rounded-lg hover:bg-red/10 text-muted hover:text-red transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Global toggle */}
        <Card>
          <CardContent className="py-4">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                defaultChecked
                className="w-4 h-4 rounded border-border text-teal focus:ring-teal"
              />
              <div>
                <p className="text-sm font-medium text-navy">
                  Utiliser les références par défaut
                </p>
                <p className="text-xs text-muted">
                  Inclure automatiquement tous les fichiers de référence dans les générations.
                </p>
              </div>
            </label>
          </CardContent>
        </Card>
      </div>
    </PageTransition>
  );
}
