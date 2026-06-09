'use client';

import { useState } from 'react';
import { Download, RotateCcw, FileText, Check, Copy } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import type { GenerationResult } from '@/types/generation';

interface OutputPreviewProps {
  result: GenerationResult;
  onReset: () => void;
}

export function OutputPreview({ result, onReset }: OutputPreviewProps) {
  const [copied, setCopied] = useState(false);

  const handleCopyMarkdown = async () => {
    if ('markdown' in result && result.markdown) {
      await navigator.clipboard.writeText(result.markdown as string);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
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
              <h4 className="text-sm font-medium text-navy">Aperçu Markdown</h4>
              <button
                onClick={handleCopyMarkdown}
                className="flex items-center gap-1.5 text-xs text-teal hover:text-teal/80 transition-colors"
              >
                <Copy size={12} />
                {copied ? 'Copié !' : 'Copier'}
              </button>
            </div>
            <div className="bg-navy-light/3 border border-border rounded-lg p-4 max-h-96 overflow-y-auto">
              <pre className="text-sm text-navy whitespace-pre-wrap font-body leading-relaxed">
                {result.markdown as string}
              </pre>
            </div>
          </div>
        ) : null}

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

        <Button variant="secondary" onClick={onReset} className="w-full">
          <RotateCcw size={16} />
          Nouvelle Génération
        </Button>
      </CardContent>
    </Card>
  );
}
