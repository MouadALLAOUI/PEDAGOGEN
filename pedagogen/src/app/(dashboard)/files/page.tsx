'use client';

import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import {
  FileText,
  Download,
  Trash2,
  Eye,
  Loader2,
  FolderOpen,
  Search,
  Filter,
  CheckSquare,
  Square,
  Trash,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { PageTransition } from '@/components/layout/PageTransition';
import { FilePreviewModal } from '@/components/ui/FilePreviewModal';

const DOC_LABELS: Record<string, string> = {
  fiche_pedagogique: 'Fiche Pédagogique',
  planification: 'Planification',
  plan_gestion_classe: 'Plan de Gestion de Classe',
  evaluation: 'Évaluation',
  cours_complet: 'Cours Complet',
  resume_eleve: 'Résumé Élève',
  presentation_pptx: 'Présentation PPTX',
  images_illustratives: 'Images Illustratives',
};

const FORMAT_COLORS: Record<string, string> = {
  docx: 'bg-blue/10 text-blue',
  pdf: 'bg-red/10 text-red',
  pptx: 'bg-orange/10 text-orange',
  md: 'bg-green/10 text-green',
  zip: 'bg-purple/10 text-purple',
};

interface DbFile {
  id: string;
  generation_id: string | null;
  name: string;
  doc_type: string;
  format: string;
  storage_path: string;
  url: string;
  size_kb: number;
  created_at: string;
}

export default function FilesPage() {
  const [files, setFiles] = useState<DbFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterFormat, setFilterFormat] = useState<string>('all');
  const [previewFile, setPreviewFile] = useState<DbFile | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [batchDeleting, setBatchDeleting] = useState(false);

  const loadFiles = useCallback(async () => {
    try {
      const res = await fetch('/api/generated');
      const data = await res.json();
      setFiles(data.files || []);
    } catch {
      toast.error('Erreur lors du chargement des fichiers');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFiles();
  }, [loadFiles]);

  const filtered = files.filter((f) => {
    const matchSearch = !search || f.name.toLowerCase().includes(search.toLowerCase());
    const matchFormat = filterFormat === 'all' || f.format === filterFormat;
    return matchSearch && matchFormat;
  });

  const formats = [...new Set(files.map((f) => f.format))];

  const allSelected = filtered.length > 0 && filtered.every((f) => selected.has(f.id));
  const someSelected = filtered.some((f) => selected.has(f.id));

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filtered.map((f) => f.id)));
    }
  };

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleDelete = async (id: string) => {
    setDeleting(id);
    try {
      const res = await fetch('/api/generated', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) throw new Error('Failed');
      setFiles((prev) => prev.filter((f) => f.id !== id));
      setSelected((prev) => { const next = new Set(prev); next.delete(id); return next; });
      toast.success('Fichier supprimé');
    } catch {
      toast.error('Erreur lors de la suppression');
    } finally {
      setDeleting(null);
    }
  };

  const handleBatchDelete = async () => {
    const ids = [...selected];
    if (ids.length === 0) return;
    if (!confirm(`Supprimer ${ids.length} fichier(s) ?`)) return;

    setBatchDeleting(true);
    try {
      const res = await fetch('/api/generated', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids }),
      });
      if (!res.ok) throw new Error('Failed');
      setFiles((prev) => prev.filter((f) => !selected.has(f.id)));
      setSelected(new Set());
      toast.success(`${ids.length} fichier(s) supprimé(s)`);
    } catch {
      toast.error('Erreur lors de la suppression');
    } finally {
      setBatchDeleting(false);
    }
  };

  return (
    <PageTransition>
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-teal/10 flex items-center justify-center">
            <FolderOpen size={20} className="text-teal" />
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold text-navy">Mes Fichiers</h1>
            <p className="text-sm text-muted">{files.length} fichier(s) généré(s)</p>
          </div>
        </div>

        {/* Search, Filters & Batch Actions */}
        {files.length > 0 && (
          <div className="flex flex-wrap gap-3 items-center">
            <div className="relative flex-1 min-w-[200px]">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Rechercher un fichier..."
                className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-border bg-white text-navy text-sm focus:outline-none focus:ring-2 focus:ring-teal/30 focus:border-teal"
              />
            </div>
            <div className="flex items-center gap-1.5">
              <Filter size={14} className="text-muted" />
              <button
                onClick={() => setFilterFormat('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  filterFormat === 'all'
                    ? 'bg-navy text-parchment'
                    : 'bg-navy-light/5 text-muted hover:bg-navy-light/10'
                }`}
              >
                Tout
              </button>
              {formats.map((fmt) => (
                <button
                  key={fmt}
                  onClick={() => setFilterFormat(fmt)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors uppercase ${
                    filterFormat === fmt
                      ? 'bg-navy text-parchment'
                      : 'bg-navy-light/5 text-muted hover:bg-navy-light/10'
                  }`}
                >
                  .{fmt}
                </button>
              ))}
            </div>

            {/* Batch actions */}
            {someSelected && (
              <Button
                variant="danger"
                size="sm"
                onClick={handleBatchDelete}
                disabled={batchDeleting}
              >
                {batchDeleting ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Trash size={14} />
                )}
                Supprimer ({selected.size})
              </Button>
            )}
          </div>
        )}

        {/* File list */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={24} className="animate-spin text-teal" />
          </div>
        ) : filtered.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center">
              <FolderOpen size={48} className="mx-auto mb-4 text-navy-light/30" />
              <p className="text-sm text-muted">
                {files.length === 0
                  ? 'Aucun fichier généré. Lancez une génération pour commencer.'
                  : 'Aucun fichier ne correspond à votre recherche.'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {/* Select all header */}
            <div className="flex items-center gap-3 px-4 py-2">
              <button onClick={toggleSelectAll} className="text-muted hover:text-navy transition-colors">
                {allSelected ? <CheckSquare size={18} className="text-teal" /> : <Square size={18} />}
              </button>
              <span className="text-xs text-muted">
                {someSelected ? `${selected.size} sélectionné(s)` : 'Tout sélectionner'}
              </span>
            </div>

            {filtered.map((file) => (
              <div
                key={file.id}
                className={`flex items-center gap-4 p-4 rounded-xl border transition-all ${
                  selected.has(file.id)
                    ? 'bg-teal/5 border-teal/30'
                    : 'bg-white border-border hover:shadow-md'
                }`}
              >
                {/* Checkbox */}
                <button onClick={() => toggleSelect(file.id)} className="flex-shrink-0 text-muted hover:text-navy transition-colors">
                  {selected.has(file.id) ? (
                    <CheckSquare size={18} className="text-teal" />
                  ) : (
                    <Square size={18} />
                  )}
                </button>

                {/* Format badge */}
                <div
                  className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${FORMAT_COLORS[file.format] || 'bg-navy-light/5 text-muted'}`}
                >
                  <FileText size={18} />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-navy truncate">{file.name}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <Badge variant="green" className="text-[10px]">
                      {DOC_LABELS[file.doc_type] || file.doc_type}
                    </Badge>
                    <span className="text-xs text-muted uppercase">.{file.format}</span>
                    <span className="text-xs text-muted">•</span>
                    <span className="text-xs text-muted">{file.size_kb} KB</span>
                    <span className="text-xs text-muted">•</span>
                    <span className="text-xs text-muted">
                      {new Date(file.created_at).toLocaleDateString('fr-FR')}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    onClick={() => setPreviewFile(file)}
                    className="p-2 rounded-lg hover:bg-navy-light/5 text-muted hover:text-navy transition-colors"
                    title="Aperçu"
                  >
                    <Eye size={16} />
                  </button>
                  <a
                    href={file.url}
                    download={file.name}
                    className="p-2 rounded-lg hover:bg-teal/10 text-teal transition-colors"
                    title="Télécharger"
                  >
                    <Download size={16} />
                  </a>
                  <button
                    onClick={() => handleDelete(file.id)}
                    disabled={deleting === file.id}
                    className="p-2 rounded-lg hover:bg-red/10 text-muted hover:text-red transition-colors disabled:opacity-50"
                    title="Supprimer"
                  >
                    {deleting === file.id ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <Trash2 size={16} />
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Preview modal */}
      {previewFile && (
        <FilePreviewModal
          fileId={previewFile.id}
          fileName={previewFile.name}
          fileFormat={previewFile.format}
          fileUrl={previewFile.url}
          onClose={() => setPreviewFile(null)}
        />
      )}
    </PageTransition>
  );
}
