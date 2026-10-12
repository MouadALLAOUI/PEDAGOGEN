'use client';

import { useState, useRef, useEffect } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import type { EntryType, Statut } from '@/types/notebook';

interface StatusDropdownProps {
  currentStatus: Statut;
  entryType: EntryType;
  onChange: (nextStatus: Statut) => void;
  disabled?: boolean;
}

const STATUS_CONFIG: Record<
  Statut,
  { label: string; badgeClass: string }
> = {
  planifiee: {
    label: 'Planifiée',
    badgeClass: 'bg-teal-50 text-teal border-teal/20 hover:bg-teal-100/70',
  },
  realisee: {
    label: 'Réalisée',
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100/70',
  },
  tenue: {
    label: 'Tenue',
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100/70',
  },
  reportee: {
    label: 'Reportée',
    badgeClass: 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100/70',
  },
  absence: {
    label: 'Absence / Non assurée',
    badgeClass: 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100/70',
  },
  annulee: {
    label: 'Annulée',
    badgeClass: 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100/70',
  },
};

export function StatusDropdown({
  currentStatus,
  entryType,
  onChange,
  disabled = false,
}: StatusDropdownProps) {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [open]);

  // Status options per entry type
  const options: Array<{ value: Statut; label: string }> =
    entryType === 'MEETING'
      ? [
          { value: 'planifiee', label: 'Planifiée' },
          { value: 'tenue', label: 'Tenue' },
          { value: 'reportee', label: 'Reportée' },
          { value: 'annulee', label: 'Annulée' },
        ]
      : entryType === 'PUBLICATION'
      ? [
          { value: 'realisee', label: 'Diffusée / Traitée' },
          { value: 'planifiee', label: 'En attente' },
          { value: 'reportee', label: 'Reportée' },
          { value: 'annulee', label: 'Classée / Archivée' },
        ]
      : [
          { value: 'planifiee', label: 'Planifiée' },
          { value: 'realisee', label: 'Réalisée' },
          { value: 'reportee', label: 'Reportée' },
          { value: 'absence', label: 'Absence / Annulée' },
        ];

  const currentConf = STATUS_CONFIG[currentStatus] || {
    label: currentStatus,
    badgeClass: 'bg-slate-100 text-slate-700 border-slate-200',
  };

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      <button
        type="button"
        disabled={disabled}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen(!open);
        }}
        title="Cliquer pour changer le statut rapidement"
        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium border transition-all cursor-pointer ${currentConf.badgeClass} ${
          disabled ? 'opacity-50 cursor-not-allowed' : ''
        }`}
      >
        <span>{currentConf.label}</span>
        <ChevronDown size={10} className="opacity-70" />
      </button>

      {open && (
        <div className="absolute left-0 mt-1 w-44 rounded-xl bg-white shadow-lg border border-border/80 py-1 z-30 animate-in fade-in zoom-in-95 duration-100">
          <div className="px-2.5 py-1 text-[10px] font-semibold text-muted uppercase tracking-wider border-b border-border/50">
            Changer le statut
          </div>
          <div className="p-1 space-y-0.5">
            {options.map((opt) => {
              const isSelected = opt.value === currentStatus;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setOpen(false);
                    if (opt.value !== currentStatus) {
                      onChange(opt.value);
                    }
                  }}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 text-xs rounded-lg text-left transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-teal-50 text-teal font-medium'
                      : 'text-navy hover:bg-parchment-dark/50'
                  }`}
                >
                  <span>{opt.label}</span>
                  {isSelected && <Check size={12} className="text-teal" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
