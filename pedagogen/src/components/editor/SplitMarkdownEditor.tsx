'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Save,
  Download,
  FileText,
  Columns2,
  Edit3,
  Eye,
  Loader2,
  Check,
  FileType,
  Layers,
} from 'lucide-react';
import { MarkdownRenderer } from '@/components/ui/MarkdownRenderer';
import toast from 'react-hot-toast';

interface SplitMarkdownEditorProps {
  initialContent: string;
  title?: string;
  fileId?: string; // Optional: if editing an existing file from DB
  onSave?: (newContent: string) => Promise<void> | void;
  onClose: () => void;
}

export function SplitMarkdownEditor({
  initialContent,
  title = 'Document Pédagogique',
  fileId,
  onSave,
  onClose,
}: SplitMarkdownEditorProps) {
  const [mounted, setMounted] = useState(false);
  const [content, setContent] = useState(initialContent);
  const [mode, setMode] = useState<'split' | 'edit' | 'preview'>('split');
  const [saving, setSaving] = useState(false);
  const [hasSaved, setHasSaved] = useState(false);
  const [exportingDocx, setExportingDocx] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [exportingHtml, setExportingHtml] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  const handleSave = async () => {
    setSaving(true);
    try {
      if (fileId) {
        const res = await fetch('/api/files/save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fileId, content }),
        });
        if (!res.ok) throw new Error('Échec sauvegarde');
      }

      if (onSave) {
        await onSave(content);
      }

      setHasSaved(true);
      toast.success('Modifications enregistrées');
      setTimeout(() => setHasSaved(false), 2500);
    } catch {
      toast.error('Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  const handleExport = async (format: 'docx' | 'pdf' | 'html') => {
    if (format === 'docx') setExportingDocx(true);
    if (format === 'pdf') setExportingPdf(true);
    if (format === 'html') setExportingHtml(true);

    try {
      const res = await fetch('/api/files/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          markdown: content,
          format,
          title,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Erreur lors de l\'exportation');
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const cleanName = title.replace(/[^a-zA-Z0-9_\-\u0600-\u06FF]/g, '_').substring(0, 40) || 'document';
      a.download = `${cleanName}.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      toast.success(`Document exporté en .${format.toUpperCase()}`);
    } catch (err: any) {
      toast.error(err.message || 'Échec de l\'exportation');
    } finally {
      if (format === 'docx') setExportingDocx(false);
      if (format === 'pdf') setExportingPdf(false);
      if (format === 'html') setExportingHtml(false);
    }
  };

  if (!mounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 backdrop-blur-sm animate-fade-in"
      style={{ backgroundColor: 'rgba(24, 28, 40, 0.65)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-7xl h-[92vh] flex flex-col overflow-hidden border border-border">
        {/* Header Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-3.5 border-b border-border bg-slate-50 flex-shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-teal/10 flex items-center justify-center flex-shrink-0">
              <FileText size={18} className="text-teal" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-navy truncate">{title}</h2>
                <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-teal/10 text-teal-dark">
                  Éditeur Markdown & Export MEN
                </span>
              </div>
              <p className="text-xs text-muted">
                {content.split(/\s+/).filter(Boolean).length} mots · {content.length} caractères
              </p>
            </div>
          </div>

          {/* Controls */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Mode Switcher */}
            <div className="flex items-center bg-white border border-border rounded-lg p-0.5 shadow-sm">
              <button
                onClick={() => setMode('split')}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  mode === 'split' ? 'bg-navy text-white shadow-sm' : 'text-muted hover:text-navy'
                }`}
                title="Vue Partagée"
              >
                <Columns2 size={13} />
                <span className="hidden sm:inline">Split</span>
              </button>
              <button
                onClick={() => setMode('edit')}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  mode === 'edit' ? 'bg-navy text-white shadow-sm' : 'text-muted hover:text-navy'
                }`}
                title="Éditeur Seul"
              >
                <Edit3 size={13} />
                <span className="hidden sm:inline">Éditer</span>
              </button>
              <button
                onClick={() => setMode('preview')}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  mode === 'preview' ? 'bg-navy text-white shadow-sm' : 'text-muted hover:text-navy'
                }`}
                title="Aperçu Seul"
              >
                <Eye size={13} />
                <span className="hidden sm:inline">Aperçu</span>
              </button>
            </div>

            {/* Quick Exporters */}
            <div className="flex items-center gap-1 bg-white border border-border rounded-lg p-0.5">
              <button
                onClick={() => handleExport('docx')}
                disabled={exportingDocx}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium text-blue hover:bg-blue/10 transition-colors disabled:opacity-50"
                title="Exporter avec en-tête officiel Word"
              >
                {exportingDocx ? <Loader2 size={13} className="animate-spin" /> : <FileType size={13} />}
                <span>DOCX</span>
              </button>

              <button
                onClick={() => handleExport('pdf')}
                disabled={exportingPdf}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium text-red hover:bg-red/10 transition-colors disabled:opacity-50"
                title="Exporter avec en-tête officiel PDF"
              >
                {exportingPdf ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
                <span>PDF</span>
              </button>

              <button
                onClick={() => handleExport('html')}
                disabled={exportingHtml}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium text-orange hover:bg-orange/10 transition-colors disabled:opacity-50"
                title="Exporter HTML interactif offline"
              >
                {exportingHtml ? <Loader2 size={13} className="animate-spin" /> : <Layers size={13} />}
                <span>HTML</span>
              </button>
            </div>

            {/* Save Button */}
            <button
              onClick={handleSave}
              disabled={saving}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold shadow-sm transition-colors text-white ${
                hasSaved ? 'bg-green-600' : 'bg-teal hover:bg-teal-dark'
              } disabled:opacity-50`}
            >
              {saving ? (
                <Loader2 size={14} className="animate-spin" />
              ) : hasSaved ? (
                <Check size={14} />
              ) : (
                <Save size={14} />
              )}
              <span>{hasSaved ? 'Enregistré !' : 'Enregistrer'}</span>
            </button>

            {/* Close */}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-slate-200 text-muted hover:text-navy transition-colors"
              title="Fermer"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Editor Body */}
        <div
          className="flex-1 overflow-hidden grid grid-cols-1 divide-y md:divide-y-0 md:divide-x divide-border"
          style={{
            gridTemplateColumns: mode === 'split' ? '1fr 1fr' : '1fr',
          }}
        >
          {/* Markdown Text Area */}
          {(mode === 'split' || mode === 'edit') && (
            <div className="h-full flex flex-col bg-white">
              <div className="px-4 py-2 border-b border-border/60 bg-slate-50/50 flex flex-wrap items-center justify-between gap-2 text-xs text-muted">
                <div className="flex items-center gap-1.5">
                  <span className="font-semibold text-navy mr-1">Éditeur Markdown</span>
                  <button
                    type="button"
                    onClick={() => {
                      setContent((prev) => prev + '\n\n### Nouveau Titre\n');
                    }}
                    className="px-2 py-0.5 rounded bg-white border border-border hover:bg-slate-100 text-[11px] font-medium text-navy transition-colors"
                  >
                    + Titre
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setContent((prev) => prev + '\n- Point clé\n');
                    }}
                    className="px-2 py-0.5 rounded bg-white border border-border hover:bg-slate-100 text-[11px] font-medium text-navy transition-colors"
                  >
                    + Liste
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setContent((prev) => prev + '\n| Étape | Durée | Activité |\n|---|---|---|\n| Découverte | 10 min | Situation problème |\n| Analyse | 20 min | Travail en sous-groupes |\n');
                    }}
                    className="px-2 py-0.5 rounded bg-white border border-border hover:bg-slate-100 text-[11px] font-medium text-navy transition-colors"
                  >
                    + Tableau
                  </button>
                </div>
                <span>Syntaxes: Titres, Tableaux, Listes, Code</span>
              </div>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Rédigez ou collez votre document markdown ici..."
                className="flex-1 p-5 font-mono text-sm leading-relaxed text-navy bg-transparent resize-none focus:outline-none overflow-y-auto selection:bg-teal/20"
                spellCheck={false}
              />
            </div>
          )}

          {/* Live Preview Panel */}
          {(mode === 'split' || mode === 'preview') && (
            <div className="h-full flex flex-col bg-slate-50/40 overflow-hidden">
              <div className="px-4 py-2 border-b border-border/60 bg-slate-50/50 flex items-center justify-between text-xs text-muted">
                <span className="font-semibold text-navy">Aperçu en Direct</span>
                <span className="text-teal font-medium">Mise en page automatique</span>
              </div>
              <div className="flex-1 p-6 md:p-8 overflow-y-auto">
                <div className="bg-white border border-border rounded-xl p-8 max-w-3xl mx-auto shadow-sm">
                  <MarkdownRenderer content={content} />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
