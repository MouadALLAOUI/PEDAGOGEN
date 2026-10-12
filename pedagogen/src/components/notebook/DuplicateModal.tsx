'use client';

import { useState, useEffect } from 'react';
import { Copy, Calendar, Loader2 } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import type { NotebookEntry } from '@/types/notebook';
import type { CollegeClass } from '@/types/student';

interface DuplicateModalProps {
  open: boolean;
  onClose: () => void;
  entry: NotebookEntry | null;
  classes: CollegeClass[];
  onDuplicate: (id: string, newDate: string, newClasseId?: string) => Promise<void>;
}

export function DuplicateModal({
  open,
  onClose,
  entry,
  classes,
  onDuplicate,
}: DuplicateModalProps) {
  const [newDate, setNewDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().slice(0, 10);
  });
  const [targetClasseId, setTargetClasseId] = useState<string>(
    entry?.classe_id || ''
  );
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (entry) {
      setTargetClasseId(entry.classe_id || (classes[0]?.id ?? ''));
    }
  }, [entry, classes]);

  if (!entry) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDate) return;
    setLoading(true);
    try {
      await onDuplicate(entry.id, newDate, targetClasseId || undefined);
      onClose();
    } catch {
      /* handled in parent */
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Dupliquer l'entrée"
      className="max-w-md"
    >
      <form onSubmit={handleSubmit} className="space-y-4 pt-1">
        <div className="p-3 bg-parchment-dark/50 rounded-xl border border-border text-xs text-navy space-y-1">
          <span className="font-semibold text-muted text-[10px] uppercase tracking-wider block">
            Entrée source
          </span>
          <p className="font-medium truncate">{entry.titre}</p>
          <span className="text-muted block text-[11px]">
            Date initiale : {entry.date} {entry.heure_debut ? `(${entry.heure_debut})` : ''}
          </span>
        </div>

        <div>
          <label className="block text-xs font-semibold text-navy mb-1 flex items-center gap-1.5">
            <Calendar size={13} className="text-teal" /> Nouvelle date d'exécution *
          </label>
          <Input
            type="date"
            value={newDate}
            onChange={(e) => setNewDate(e.target.value)}
            className="text-xs"
            required
          />
        </div>

        {entry.entry_type === 'SESSION' && (
          <div>
            <label className="block text-xs font-semibold text-navy mb-1">
              Classe de destination
            </label>
            <select
              value={targetClasseId}
              onChange={(e) => setTargetClasseId(e.target.value)}
              className="w-full rounded-lg border border-border bg-white px-3 py-2 text-xs text-navy focus:outline-none focus:ring-2 focus:ring-teal/30 focus:border-teal"
            >
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.niveau})
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
          <Button type="button" variant="ghost" onClick={onClose} disabled={loading}>
            Annuler
          </Button>
          <Button type="submit" variant="primary" disabled={loading} className="gap-1.5">
            {loading ? <Loader2 size={14} className="animate-spin" /> : <Copy size={14} />}
            Dupliquer
          </Button>
        </div>
      </form>
    </Modal>
  );
}
