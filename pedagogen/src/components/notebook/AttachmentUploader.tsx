'use client';

import { useState } from 'react';
import { useDropzone } from 'react-dropzone';
import {
  Upload,
  Trash2,
  ExternalLink,
  Loader2,
  FileText,
  Image as ImageIcon,
  FileSpreadsheet,
  FileArchive,
} from 'lucide-react';
import toast from 'react-hot-toast';
import type { NotebookAttachment } from '@/types/notebook';

interface AttachmentUploaderProps {
  attachments: NotebookAttachment[];
  onChange: (attachments: NotebookAttachment[]) => void;
  disabled?: boolean;
}

export function AttachmentUploader({
  attachments,
  onChange,
  disabled = false,
}: AttachmentUploaderProps) {
  const [uploading, setUploading] = useState(false);

  const onDrop = async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0 || disabled) return;
    setUploading(true);

    try {
      const newAttachments: NotebookAttachment[] = [];
      let successCount = 0;

      for (const file of acceptedFiles) {
        const formData = new FormData();
        formData.append('file', file);

        const res = await fetch('/api/notebook/attachments', {
          method: 'POST',
          body: formData,
        });
        const data = await res.json();
        if (!res.ok) {
          toast.error(data.error || `Erreur d'envoi pour ${file.name}`);
          continue;
        }

        newAttachments.push({
          id: data.attachment.id,
          name: data.attachment.name,
          size: data.attachment.size,
          mime_type: data.attachment.mime_type,
          url: data.attachment.url,
          created_at: data.attachment.created_at || new Date().toISOString(),
        });
        successCount++;
      }

      if (successCount > 0) {
        onChange([...attachments, ...newAttachments]);
        toast.success(
          successCount === 1
            ? 'Pièce jointe ajoutée avec succès'
            : `${successCount} pièces jointes ajoutées`
        );
      }
    } catch (err) {
      console.error('Upload failed:', err);
      toast.error('Échec du téléversement du fichier');
    } finally {
      setUploading(false);
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    maxSize: 25 * 1024 * 1024,
    disabled: disabled || uploading,
  });

  const handleRemove = (id: string, name: string) => {
    onChange(attachments.filter((a) => a.id !== id));
    toast.success(`"${name}" retiré`);
  };

  const formatSize = (bytes: number) => {
    if (!bytes) return '0 B';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
  };

  const getFileIcon = (mime: string) => {
    if (mime.startsWith('image/')) return <ImageIcon size={14} className="text-teal" />;
    if (mime.includes('sheet') || mime.includes('excel') || mime.includes('csv'))
      return <FileSpreadsheet size={14} className="text-emerald-600" />;
    if (mime.includes('zip') || mime.includes('rar') || mime.includes('tar'))
      return <FileArchive size={14} className="text-amber-600" />;
    return <FileText size={14} className="text-muted" />;
  };

  return (
    <div className="space-y-3">
      <div
        {...getRootProps()}
        className={`p-4 border-2 border-dashed rounded-xl text-center cursor-pointer transition-all ${
          isDragActive
            ? 'border-teal bg-teal-50/50 scale-[0.99]'
            : 'border-border/80 hover:border-teal/50 hover:bg-parchment-dark/30'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center justify-center gap-1.5">
          {uploading ? (
            <Loader2 size={20} className="text-teal animate-spin" />
          ) : (
            <div className="w-8 h-8 rounded-lg bg-teal/10 text-teal flex items-center justify-center">
              <Upload size={16} />
            </div>
          )}
          <div className="text-xs">
            <span className="font-semibold text-teal">Cliquez pour téléverser</span>
            <span className="text-muted"> ou glissez-déposez</span>
          </div>
          <p className="text-[11px] text-muted">
            PDF, Word, Excel, Images, Scans (max 25 Mo)
          </p>
        </div>
      </div>

      {attachments.length > 0 && (
        <div className="space-y-1.5">
          {attachments.map((att) => (
            <div
              key={att.id}
              className="flex items-center justify-between p-2 rounded-lg border border-border/80 bg-white text-xs hover:border-teal/40 transition-colors"
            >
              <div className="flex items-center gap-2 min-w-0 pr-2">
                {getFileIcon(att.mime_type || '')}
                <span className="font-medium text-navy truncate" title={att.name}>
                  {att.name}
                </span>
                <span className="text-[10px] text-muted shrink-0">
                  ({formatSize(att.size)})
                </span>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <a
                  href={att.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1 text-muted hover:text-teal rounded transition-colors"
                  title="Ouvrir le fichier"
                >
                  <ExternalLink size={13} />
                </a>
                <button
                  type="button"
                  onClick={() => handleRemove(att.id, att.name)}
                  className="p-1 text-muted hover:text-red-500 rounded transition-colors"
                  title="Supprimer"
                  disabled={disabled}
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
