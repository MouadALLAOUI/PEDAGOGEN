'use client';

import { useState, useEffect, useRef } from 'react';
import { X, Loader2, FileText, Download, ChevronLeft, ChevronRight } from 'lucide-react';
import { MarkdownRenderer } from '@/components/ui/MarkdownRenderer';

interface FilePreviewModalProps {
  fileId: string;
  fileName: string;
  fileFormat: string;
  fileUrl: string;
  onClose: () => void;
}

export function FilePreviewModal({
  fileId,
  fileName,
  fileFormat,
  fileUrl,
  onClose,
}: FilePreviewModalProps) {
  const [loading, setLoading] = useState(true);
  const [textContent, setTextContent] = useState<string | null>(null);
  const [rawUrl, setRawUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const docxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchPreview() {
      try {
        const res = await fetch(`/api/generated/preview?id=${fileId}`);
        if (!res.ok) throw new Error('Failed to load');
        const data = await res.json();

        if (cancelled) return;

        if (data.type === 'text') {
          setTextContent(data.content);
        } else {
          setRawUrl(data.rawUrl);
        }
        setLoading(false);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load');
          setLoading(false);
        }
      }
    }

    fetchPreview();
    return () => { cancelled = true; };
  }, [fileId]);

  // Render DOCX using docx-preview
  useEffect(() => {
    if (loading || error || fileFormat !== 'docx' || !rawUrl || !docxRef.current) return;

    let cancelled = false;

    async function renderDocx() {
      try {
        const response = await fetch(rawUrl!);
        const blob = await response.blob();
        if (cancelled || !docxRef.current) return;

        const { renderAsync } = await import('docx-preview');
        docxRef.current.innerHTML = '';
        await renderAsync(blob, docxRef.current, undefined, {
          className: 'docx-rendered',
          inWrapper: false,
          ignoreLastRenderedPageBreak: false,
          trimXmlDeclaration: true,
        });
      } catch {
        if (docxRef.current) {
          docxRef.current.innerHTML = '<p class="text-sm text-muted text-center py-8">Impossible d\'afficher ce fichier DOCX</p>';
        }
      }
    }

    renderDocx();
    return () => { cancelled = true; };
  }, [loading, error, fileFormat, rawUrl]);

  const handleClose = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm p-4 animate-fade-in"
      style={{ backgroundColor: 'rgba(15, 23, 42, 0.6)' }}
      onClick={handleClose}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl h-[85vh] flex flex-col overflow-hidden animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-slate-50 flex-shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-teal/10 flex items-center justify-center flex-shrink-0">
              <FileText size={16} className="text-teal" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-navy truncate">{fileName}</p>
              <p className="text-xs text-muted uppercase">{fileFormat}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <a
              href={fileUrl}
              download={fileName}
              className="p-2 rounded-lg hover:bg-teal/10 text-teal transition-colors"
              title="Télécharger"
            >
              <Download size={16} />
            </a>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-navy-light/5 text-muted hover:text-navy transition-colors"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          {loading && (
            <div className="flex items-center justify-center py-20">
              <Loader2 size={24} className="animate-spin text-teal" />
            </div>
          )}

          {error && (
            <div className="text-center py-20 text-red text-sm">{error}</div>
          )}

          {/* Markdown */}
          {!loading && !error && textContent !== null && (
            <div className="p-8 h-full overflow-y-auto bg-slate-100/40">
              <div className="bg-white border border-border rounded-xl p-8 max-w-3xl mx-auto shadow-md">
                <MarkdownRenderer content={textContent} />
              </div>
            </div>
          )}

          {/* PDF via iframe */}
          {!loading && !error && textContent === null && fileFormat === 'pdf' && rawUrl && (
            <iframe
              src={rawUrl}
              className="w-full h-full border-0"
              title={fileName}
            />
          )}

          {/* DOCX via docx-preview */}
          {!loading && !error && textContent === null && fileFormat === 'docx' && (
            <div className="h-full overflow-y-auto bg-slate-100/50">
              <div
                ref={docxRef}
                className="docx-wrapper"
              />
            </div>
          )}

          {/* PPTX — not renderable */}
          {!loading && !error && textContent === null && fileFormat === 'pptx' && rawUrl && (
            <div className="flex flex-col items-center justify-center h-full">
              <FileText size={48} className="mb-4 text-navy-light/30" />
              <p className="text-sm text-muted mb-1">Aperçu PPTX non disponible en ligne</p>
              <p className="text-xs text-muted mb-4">Téléchargez le fichier pour le visualiser</p>
              <a
                href={fileUrl}
                download={fileName}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-teal text-white text-sm font-medium hover:bg-teal/90 transition-colors"
              >
                <Download size={14} />
                Télécharger
              </a>
            </div>
          )}

          {/* Fallback */}
          {!loading && !error && textContent === null && !rawUrl && (
            <div className="flex flex-col items-center justify-center h-full">
              <FileText size={48} className="mb-4 text-navy-light/30" />
              <p className="text-sm text-muted mb-4">Aperçu non disponible</p>
              <a
                href={fileUrl}
                download={fileName}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-teal text-white text-sm font-medium hover:bg-teal/90 transition-colors"
              >
                <Download size={14} />
                Télécharger
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
