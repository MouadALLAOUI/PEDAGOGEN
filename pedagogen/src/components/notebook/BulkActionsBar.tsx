'use client';

import { useState } from 'react';
import { CheckCircle2, Calendar, Trash2, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';

interface BulkActionsBarProps {
  selectedCount: number;
  onClear: () => void;
  onMarkDone: () => Promise<void>;
  onChangeDate: (newDate: string) => Promise<void>;
  onDelete: () => Promise<void>;
  loading?: boolean;
}

export function BulkActionsBar({
  selectedCount,
  onClear,
  onMarkDone,
  onChangeDate,
  onDelete,
  loading = false,
}: BulkActionsBarProps) {
  const [dateModalOpen, setDateModalOpen] = useState(false);
  const [newDate, setNewDate] = useState(new Date().toISOString().slice(0, 10));
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

  if (selectedCount === 0) return null;

  return (
    <>
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 w-[95%] max-w-2xl bg-navy/95 backdrop-blur-md text-white p-3 rounded-2xl shadow-2xl border border-white/20 flex flex-wrap items-center justify-between gap-3 animate-in fade-in slide-in-from-bottom-4 duration-200">
        <div className="flex items-center gap-2.5 pl-2">
          <span className="w-6 h-6 rounded-full bg-teal text-white text-xs font-bold flex items-center justify-center shrink-0">
            {selectedCount}
          </span>
          <span className="text-xs font-medium text-white/90">
            {selectedCount === 1 ? 'élément sélectionné' : 'éléments sélectionnés'}
          </span>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onMarkDone}
            disabled={loading}
            className="text-xs text-white hover:bg-white/15 h-8 gap-1.5"
            title="Marquer comme réalisée ou tenue"
          >
            <CheckCircle2 size={14} className="text-emerald-400" />
            <span className="hidden sm:inline">Marquer réalisée</span>
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setDateModalOpen(true)}
            disabled={loading}
            className="text-xs text-white hover:bg-white/15 h-8 gap-1.5"
            title="Changer la date pour toute la sélection"
          >
            <Calendar size={14} className="text-teal-light" />
            <span className="hidden sm:inline">Changer date</span>
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setConfirmDeleteOpen(true)}
            disabled={loading}
            className="text-xs text-rose-300 hover:bg-rose-500/20 hover:text-rose-200 h-8 gap-1.5"
            title="Supprimer la sélection"
          >
            <Trash2 size={14} />
            <span className="hidden sm:inline">Supprimer</span>
          </Button>

          <div className="h-4 w-px bg-white/20 mx-1" />

          <button
            type="button"
            onClick={onClear}
            className="p-1.5 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            title="Annuler la sélection"
          >
            <X size={15} />
          </button>
        </div>
      </div>

      {/* Date change modal */}
      <Modal
        open={dateModalOpen}
        onClose={() => setDateModalOpen(false)}
        title="Changer la date de la sélection"
        className="max-w-sm"
      >
        <div className="space-y-4 pt-1">
          <p className="text-xs text-muted">
            Appliquer cette nouvelle date aux {selectedCount} entrée(s) sélectionnée(s) :
          </p>
          <Input
            type="date"
            value={newDate}
            onChange={(e) => setNewDate(e.target.value)}
            className="text-xs"
          />
          <div className="flex justify-end gap-2 pt-2 border-t border-border">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setDateModalOpen(false)}
            >
              Annuler
            </Button>
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={async () => {
                await onChangeDate(newDate);
                setDateModalOpen(false);
              }}
              disabled={loading}
            >
              Appliquer
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete confirmation modal */}
      <Modal
        open={confirmDeleteOpen}
        onClose={() => setConfirmDeleteOpen(false)}
        title="Confirmer la suppression groupée"
        className="max-w-sm"
      >
        <div className="space-y-4 pt-1">
          <p className="text-xs text-navy leading-relaxed">
            Êtes-vous sûr de vouloir supprimer définitivement ces{' '}
            <strong>{selectedCount}</strong> entrée(s) ? Cette action est irréversible.
          </p>
          <div className="flex justify-end gap-2 pt-2 border-t border-border">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setConfirmDeleteOpen(false)}
              disabled={loading}
            >
              Annuler
            </Button>
            <Button
              type="button"
              variant="danger"
              size="sm"
              onClick={async () => {
                await onDelete();
                setConfirmDeleteOpen(false);
              }}
              disabled={loading}
            >
              {loading ? <Loader2 size={13} className="animate-spin" /> : 'Supprimer définitivement'}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
