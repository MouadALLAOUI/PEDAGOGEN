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
  LayoutList,
  LayoutGrid,
} from 'lucide-react';
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
  pptx: 'bg-amber/10 text-amber',
  md: 'bg-green/10 text-green',
  html: 'bg-orange/10 text-orange',
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
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');

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

  useEffect(() => { loadFiles(); }, [loadFiles]);

  const filtered = files.filter((f) => {
    const matchSearch = !search || f.name.toLowerCase().includes(search.toLowerCase());
    const matchFormat = filterFormat === 'all' || f.format === filterFormat;
    return matchSearch && matchFormat;
  });

  const formats = [...new Set(files.map((f) => f.format))];
  const allSelected = filtered.length > 0 && filtered.every((f) => selected.has(f.id));
  const someSelected = filtered.some((f) => selected.has(f.id));

  const toggleSelectAll = () => {
    if (allSelected) setSelected(new Set());
    else setSelected(new Set(filtered.map((f) => f.id)));
  };

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
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

        {/* Header */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-teal via-teal-dark to-navy p-6 lg:p-8 text-white">
          <div className="absolute top-0 right-0 w-56 h-56 bg-teal-light/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
          <div className="relative z-10 flex items-center gap-4">
            <div className="w-11 h-11 rounded-xl bg-white/15 backdrop-blur flex items-center justify-center shrink-0">
              <FolderOpen size={20} className="text-white" />
            </div>
            <div>
              <h1 className="font-display text-2xl lg:text-3xl font-bold tracking-tight">Mes Fichiers</h1>
              <p className="text-white/60 text-sm mt-0.5">{files.length} fichier(s) généré(s)</p>
            </div>
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
                  filterFormat === 'all' ? 'bg-navy text-parchment' : 'bg-navy-light/5 text-muted hover:bg-navy-light/10'
                }`}
              >
                Tout
              </button>
              {formats.map((fmt) => (
                <button
                  key={fmt}
                  onClick={() => setFilterFormat(fmt)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors uppercase ${
                    filterFormat === fmt ? 'bg-navy text-parchment' : 'bg-navy-light/5 text-muted hover:bg-navy-light/10'
                  }`}
                >
                  .{fmt}
                </button>
              ))}
            </div>
            <div className="flex items-center border border-border rounded-lg overflow-hidden ml-auto">
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 transition-colors ${viewMode === 'list' ? 'bg-navy text-parchment' : 'bg-white text-muted hover:bg-parchment-dark/50'}`}
                title="Vue liste"
              >
                <LayoutList size={16} />
              </button>
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 transition-colors ${viewMode === 'grid' ? 'bg-navy text-parchment' : 'bg-white text-muted hover:bg-parchment-dark/50'}`}
                title="Vue grille"
              >
                <LayoutGrid size={16} />
              </button>
            </div>
            {someSelected && (
              <Button variant="danger" size="sm" onClick={handleBatchDelete} disabled={batchDeleting}>
                {batchDeleting ? <Loader2 size={14} className="animate-spin" /> : <Trash size={14} />}
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
          <div className="rounded-xl border border-border bg-white p-16 text-center">
            <div className="w-12 h-12 rounded-xl bg-parchment-dark flex items-center justify-center mx-auto mb-3">
              <FolderOpen size={20} className="text-muted/50" />
            </div>
            <p className="text-sm text-muted font-medium">
              {files.length === 0 ? 'Aucun fichier généré.' : 'Aucun résultat.'}
            </p>
          </div>
        ) : viewMode === 'list' ? (
          <div className="rounded-xl border border-border bg-white overflow-hidden">
            <div className="flex items-center gap-3 px-4 py-2.5 border-b border-border text-xs font-medium text-muted bg-parchment-dark/50">
              <button onClick={toggleSelectAll} className="text-muted hover:text-navy transition-colors">
                {allSelected ? <CheckSquare size={16} className="text-teal" /> : <Square size={16} />}
              </button>
              <span>{someSelected ? `${selected.size} sélectionné(s)` : 'Tout sélectionner'}</span>
            </div>
            {filtered.map((file) => (
              <div
                key={file.id}
                className={`flex items-center gap-4 px-4 py-3 border-b border-border/50 last:border-0 transition-colors ${
                  selected.has(file.id) ? 'bg-teal/5' : 'hover:bg-parchment-dark/30'
                }`}
              >
                <button onClick={() => toggleSelect(file.id)} className="text-muted hover:text-navy transition-colors flex-shrink-0">
                  {selected.has(file.id) ? <CheckSquare size={16} className="text-teal" /> : <Square size={16} />}
                </button>
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${FORMAT_COLORS[file.format] || 'bg-navy-light/5 text-muted'}`}>
                  <FileText size={16} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-navy truncate">{file.name}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <Badge variant="teal" className="text-[10px]">{DOC_LABELS[file.doc_type] || file.doc_type}</Badge>
                    <span className="text-xs text-muted uppercase">.{file.format}</span>
                    <span className="text-xs text-muted">·</span>
                    <span className="text-xs text-muted">{file.size_kb} KB</span>
                    <span className="text-xs text-muted">·</span>
                    <span className="text-xs text-muted">{new Date(file.created_at).toLocaleDateString('fr-FR')}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button onClick={() => setPreviewFile(file)} className="p-2 rounded-lg hover:bg-teal-50 text-muted hover:text-teal transition-colors" title="Aperçu">
                    <Eye size={15} />
                  </button>
                  <a href={file.url} download={file.name} className="p-2 rounded-lg hover:bg-teal-50 text-muted hover:text-teal transition-colors" title="Télécharger">
                    <Download size={15} />
                  </a>
                  <button onClick={() => handleDelete(file.id)} disabled={deleting === file.id} className="p-2 rounded-lg hover:bg-red/10 text-muted hover:text-red transition-colors disabled:opacity-50" title="Supprimer">
                    {deleting === file.id ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((file) => (
              <div
                key={file.id}
                className={`rounded-xl border bg-white overflow-hidden transition-all hover:shadow-md ${
                  selected.has(file.id) ? 'border-teal ring-2 ring-teal/20' : 'border-border'
                }`}
              >
                <div className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${FORMAT_COLORS[file.format] || 'bg-parchment-dark text-muted'}`}>
                      <FileText size={18} />
                    </div>
                    <button onClick={() => toggleSelect(file.id)} className="text-muted hover:text-navy transition-colors">
                      {selected.has(file.id) ? <CheckSquare size={16} className="text-teal" /> : <Square size={16} />}
                    </button>
                  </div>
                  <p className="text-sm font-semibold text-navy truncate mb-1">{file.name}</p>
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    <Badge variant="teal" className="text-[10px]">{DOC_LABELS[file.doc_type] || file.doc_type}</Badge>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded uppercase bg-parchment-dark text-muted">.{file.format}</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted">
                    <span>{file.size_kb} KB</span>
                    <span>{new Date(file.created_at).toLocaleDateString('fr-FR')}</span>
                  </div>
                </div>
                <div className="flex items-center border-t border-border divide-x divide-border">
                  <button onClick={() => setPreviewFile(file)} className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium text-muted hover:text-teal hover:bg-teal/5 transition-colors">
                    <Eye size={14} /> Aperçu
                  </button>
                  <a href={file.url} download={file.name} className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium text-muted hover:text-teal hover:bg-teal/5 transition-colors">
                    <Download size={14} /> Télécharger
                  </a>
                  <button onClick={() => handleDelete(file.id)} disabled={deleting === file.id} className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium text-muted hover:text-red hover:bg-red/5 transition-colors disabled:opacity-50">
                    {deleting === file.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />} Supprimer
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

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
