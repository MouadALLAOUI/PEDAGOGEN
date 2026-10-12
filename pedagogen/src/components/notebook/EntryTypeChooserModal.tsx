'use client';

import { Modal } from '@/components/ui/Modal';
import { GraduationCap, Users, FileText, ChevronRight } from 'lucide-react';
import type { EntryType } from '@/types/notebook';

interface EntryTypeChooserModalProps {
  open: boolean;
  onClose: () => void;
  onSelect: (type: EntryType) => void;
}

export function EntryTypeChooserModal({
  open,
  onClose,
  onSelect,
}: EntryTypeChooserModalProps) {
  const options: Array<{
    type: EntryType;
    title: string;
    arabic?: string;
    description: string;
    icon: typeof GraduationCap;
    color: string;
    bg: string;
  }> = [
    {
      type: 'SESSION',
      title: 'Séance de cours',
      arabic: 'حصة دراسية',
      description: 'Déroulement didactique, devoirs, observations et contrôle lié',
      icon: GraduationCap,
      color: 'text-teal',
      bg: 'bg-teal/10 hover:bg-teal/20 border-teal/30',
    },
    {
      type: 'MEETING',
      title: 'Réunion',
      arabic: 'اجتماع / مجلس',
      description: "Conseil de classe, conseil pédagogique, réunion département ou parents",
      icon: Users,
      color: 'text-indigo-600',
      bg: 'bg-indigo-50/70 hover:bg-indigo-100/70 border-indigo-200',
    },
    {
      type: 'PUBLICATION',
      title: 'Publication & Annonce',
      arabic: 'إعلان / مذكرة وزارية',
      description: 'Circulaire, note administrative, convocation ou bulletin d\'alerte',
      icon: FileText,
      color: 'text-amber-700',
      bg: 'bg-amber-50/70 hover:bg-amber-100/70 border-amber-200',
    },
  ];

  return (
    <Modal open={open} onClose={onClose} title="Nouvelle entrée dans le Carnet de Bord">
      <div className="space-y-3 pt-1">
        <p className="text-xs text-muted mb-3">
          Choisissez le type d'événement ou de document à enregistrer :
        </p>

        <div className="grid gap-2.5">
          {options.map((opt) => {
            const Icon = opt.icon;
            return (
              <button
                key={opt.type}
                type="button"
                onClick={() => {
                  onSelect(opt.type);
                  onClose();
                }}
                className={`w-full flex items-center justify-between p-3.5 rounded-xl border text-left transition-all group cursor-pointer ${opt.bg}`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-xl bg-white shadow-xs flex items-center justify-center shrink-0 ${opt.color}`}
                  >
                    <Icon size={20} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-navy group-hover:text-teal transition-colors">
                        {opt.title}
                      </span>
                      {opt.arabic && (
                        <span className="text-[11px] text-muted font-arabic">
                          ({opt.arabic})
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted mt-0.5 line-clamp-1">
                      {opt.description}
                    </p>
                  </div>
                </div>
                <ChevronRight
                  size={16}
                  className="text-muted/60 group-hover:text-teal group-hover:translate-x-0.5 transition-all shrink-0 ml-2"
                />
              </button>
            );
          })}
        </div>
      </div>
    </Modal>
  );
}
