'use client';

import { useState } from 'react';
import { Download, RotateCcw, FileText, Check, Copy, Archive, Eye, Code, Loader2, Monitor, Globe } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { MarkdownRenderer } from '@/components/ui/MarkdownRenderer';
import { FilePreviewModal } from '@/components/ui/FilePreviewModal';
import { FullscreenBoard } from '@/components/generate/FullscreenBoard';
import { generateStandaloneHtml, downloadHtmlFile } from '@/lib/utils/pwaExport';
import type { GenerationResult, GeneratedFile } from '@/types/generation';
import toast from 'react-hot-toast';

interface OutputPreviewProps {
  result: GenerationResult;
  onReset: () => void;
}

export function OutputPreview({ result, onReset }: OutputPreviewProps) {
  const [copied, setCopied] = useState(false);
  const [showRaw, setShowRaw] = useState(false);
  const [previewFile, setPreviewFile] = useState<GeneratedFile | null>(null);
  const [zipUrl, setZipUrl] = useState<string | undefined>(result.zipUrl);
  const [zipping, setZipping] = useState(false);
  const [showBoard, setShowBoard] = useState(false);

  const handleGenerateZip = async () => {
    setZipping(true);
    try {
      const response = await fetch('/api/generate/zip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ generationId: result.id }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Échec de la compression');
      }

      const data = await response.json();
      setZipUrl(data.zipUrl);
      toast.success('Archive ZIP créée avec succès !');

      // Auto trigger download
      const link = document.createElement('a');
      link.href = data.zipUrl;
      link.setAttribute('download', '');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur lors de la compression');
    } finally {
      setZipping(false);
    }
  };

  const handleCopyMarkdown = async () => {
    if ('markdown' in result && result.markdown) {
      await navigator.clipboard.writeText(result.markdown as string);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <>
      <Card className="border-green/20">
        <CardContent className="py-6 space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-green/10 flex items-center justify-center">
              <Check size={20} className="text-green" />
            </div>
            <div>
              <h3 className="font-display font-semibold text-navy">Génération Terminée</h3>
              <p className="text-xs text-muted">
                {result.files.length} fichier(s) • {result.tokensUsed.toLocaleString()} tokens •{' '}
                {(result.durationMs / 1000).toFixed(1)}s
              </p>
            </div>
          </div>

          {/* Markdown preview for light mode */}
          {'markdown' in result && result.markdown ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium text-navy">Aperçu</h4>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowRaw(!showRaw)}
                    className="flex items-center gap-1.5 text-xs text-muted hover:text-navy transition-colors px-2 py-1 rounded-lg hover:bg-navy-light/5"
                  >
                    {showRaw ? <Eye size={12} /> : <Code size={12} />}
                    {showRaw ? 'Rendu' : 'Brut'}
                  </button>
                  <button
                    onClick={handleCopyMarkdown}
                    className="flex items-center gap-1.5 text-xs text-teal hover:text-teal/80 transition-colors"
                  >
                    <Copy size={12} />
                    {copied ? 'Copié !' : 'Copier'}
                  </button>
                </div>
              </div>
              <div className="bg-navy-light/3 border border-border rounded-lg p-4 max-h-96 overflow-y-auto">
                {showRaw ? (
                  <pre className="text-sm text-navy whitespace-pre-wrap font-body leading-relaxed">
                    {result.markdown as string}
                  </pre>
                ) : (
                  <MarkdownRenderer content={result.markdown as string} />
                )}
              </div>
            </div>
          ) : null}

          {/* ZIP download or creation */}
          {result.files.length > 1 && (
            zipUrl ? (
              <a
                href={zipUrl}
                download
                className="flex items-center gap-3 p-4 rounded-lg bg-teal/5 border border-teal/20 hover:bg-teal/10 transition-colors"
              >
                <div className="w-10 h-10 rounded-lg bg-teal/10 flex items-center justify-center flex-shrink-0">
                  <Archive size={20} className="text-teal" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-navy">Télécharger tout (ZIP)</p>
                  <p className="text-xs text-muted">Tous les documents regroupés</p>
                </div>
                <Download size={18} className="text-teal" />
              </a>
            ) : (
              <button
                onClick={handleGenerateZip}
                disabled={zipping}
                type="button"
                className="w-full flex items-center gap-3 p-4 rounded-lg bg-navy-light/5 border border-border hover:bg-navy-light/10 hover:border-navy-lighter/30 transition-colors text-left"
              >
                <div className="w-10 h-10 rounded-lg bg-navy-light/10 flex items-center justify-center flex-shrink-0 text-muted">
                  {zipping ? (
                    <Loader2 size={20} className="text-teal animate-spin" />
                  ) : (
                    <Archive size={20} className="text-teal" />
                  )}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-navy">Créer l'archive ZIP</p>
                  <p className="text-xs text-muted">
                    {zipping ? 'Création de l\'archive en cours...' : 'Regrouper tous les documents dans un fichier ZIP'}
                  </p>
                </div>
                {!zipping && <Download size={18} className="text-muted" />}
              </button>
            )
          )}

          {/* File list */}
          {result.files.length > 0 && (
            <div className="space-y-2">
              {result.files.map((file) => (
                <div
                  key={file.name}
                  className="flex items-center gap-3 p-3 rounded-lg bg-navy-light/3 border border-border"
                >
                  <FileText size={16} className="text-teal flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-navy truncate">{file.name}</p>
                    <p className="text-xs text-muted uppercase">{file.format} • {file.sizeKb} KB</p>
                  </div>
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
                  >
                    <Download size={16} />
                  </a>
                </div>
              ))}
            </div>
          )}

          <Button variant="secondary" onClick={() => setShowBoard(true)} className="w-full">
            <Monitor size={16} />
            Mode Tableau
          </Button>

          <Button
            variant="secondary"
            onClick={() => {
              const html = generateStandaloneHtml({
                title: result.metadata?.lecon || 'Cours',
                metadata: result.metadata || { niveau: '1AC', matiere: '', unite: '', lecon: '', duree: 50, competences: [], langue: 'fr', semestre: 1 },
                files: result.files,
                markdown: result.markdown,
              });
              downloadHtmlFile(html, `cours-${(result.metadata?.lecon || 'document').replace(/\s+/g, '-').toLowerCase()}`);
              toast.success('Export HTML prêt !');
            }}
            className="w-full"
          >
            <Globe size={16} />
            Export HTML Hors-Ligne
          </Button>

          <Button variant="secondary" onClick={onReset} className="w-full">
            <RotateCcw size={16} />
            Nouvelle Génération
          </Button>
        </CardContent>
      </Card>

      {previewFile && previewFile.id && (
        <FilePreviewModal
          fileId={previewFile.id}
          fileName={previewFile.name}
          fileFormat={previewFile.format}
          fileUrl={previewFile.url}
          onClose={() => setPreviewFile(null)}
        />
      )}

      {showBoard && (
        <FullscreenBoard onClose={() => setShowBoard(false)} />
      )}
    </>
  );
}
