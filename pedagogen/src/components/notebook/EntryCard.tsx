'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import {
  CalendarDays,
  Clock,
  ClipboardCheck,
  Paperclip,
  Palmtree,
  GraduationCap,
  Users,
  FileText,
  MapPin,
  AlertTriangle,
  MoreVertical,
  Edit2,
  Copy,
  Trash2,
  ChevronRight,
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { StatusDropdown } from './StatusDropdown';
import { checkMoroccoHoliday } from '@/lib/curriculum/moroccoSchoolCalendar';
import type { NotebookEntry, Statut, EntryType } from '@/types/notebook';

interface EntryCardProps {
  entry: NotebookEntry;
  selected?: boolean;
  onSelectToggle?: (id: string) => void;
  onEdit: (entry: NotebookEntry) => void;
  onDuplicate: (entry: NotebookEntry) => void;
  onDelete: (id: string, titre: string) => void;
  onStatusChange: (id: string, nextStatus: Statut, prevStatus: Statut) => void;
}

const TYPE_CONFIG: Record<
  EntryType,
  { label: string; icon: typeof GraduationCap; color: string; badge: 'teal' | 'muted' | 'gold' }
> = {
  SESSION: {
    label: 'Séance',
    icon: GraduationCap,
    color: 'text-teal',
    badge: 'teal',
  },
  MEETING: {
    label: 'Réunion',
    icon: Users,
    color: 'text-indigo-600',
    badge: 'muted',
  },
  PUBLICATION: {
    label: 'Publication',
    icon: FileText,
    color: 'text-amber-700',
    badge: 'gold',
  },
};

export function EntryCard({
  entry,
  selected = false,
  onSelectToggle,
  onEdit,
  onDuplicate,
  onDelete,
  onStatusChange,
}: EntryCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    if (menuOpen) {
      document.addEventListener('mousedown', handleOutside);
    }
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [menuOpen]);

  const typeConf = TYPE_CONFIG[entry.entry_type] || TYPE_CONFIG.SESSION;
  const TypeIcon = typeConf.icon;
  const holiday = checkMoroccoHoliday(entry.date);

  const isActionRequired = Boolean(entry.meta?.action_required);
  const deadline = entry.meta?.deadline;

  return (
    <div
      className={`group relative px-4 py-3.5 border-b border-border/50 last:border-0 transition-all ${
        selected
          ? 'bg-teal-50/50 hover:bg-teal-50/70'
          : 'hover:bg-parchment-dark/30 bg-white'
      }`}
    >
      <div className="flex items-start gap-3">
        {/* Bulk select checkbox */}
        {onSelectToggle && (
          <div className="pt-1 shrink-0">
            <input
              type="checkbox"
              checked={selected}
              onChange={() => onSelectToggle(entry.id)}
              aria-label={`Sélectionner ${entry.titre}`}
              className="w-4 h-4 rounded border-border text-teal focus:ring-teal cursor-pointer"
            />
          </div>
        )}

        {/* Main Content Area */}
        <div className="flex-1 min-w-0">
          {/* Header Badges row */}
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mb-1.5">
            {/* Type badge */}
            <span
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border shrink-0 ${
                entry.entry_type === 'MEETING'
                  ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                  : entry.entry_type === 'PUBLICATION'
                  ? 'bg-amber-50 text-amber-800 border-amber-200'
                  : 'bg-teal-50 text-teal border-teal/20'
              }`}
            >
              <TypeIcon size={11} className={typeConf.color} />
              <span>{typeConf.label}</span>
            </span>

            {/* Date */}
            <span className="text-xs text-muted font-mono flex items-center gap-1 shrink-0">
              <CalendarDays size={11} />
              {entry.date}
            </span>

            {/* Holiday indicator */}
            {holiday && (
              <span className="text-[10px] text-amber-800 bg-amber-100/90 px-1.5 py-0.5 rounded border border-amber-300 font-semibold flex items-center gap-1 shrink-0">
                <Palmtree size={10} />
                {holiday.nom}
              </span>
            )}

            {/* Time Slot (if present) */}
            {entry.heure_debut && (
              <span className="text-xs text-teal font-mono flex items-center gap-1 bg-teal-50/80 px-2 py-0.5 rounded-md font-medium shrink-0">
                <Clock size={11} />
                {entry.heure_debut}
                {entry.heure_fin ? ` → ${entry.heure_fin}` : ''}
              </span>
            )}

            {/* Inline Status badge with popover changer */}
            <StatusDropdown
              currentStatus={entry.statut}
              entryType={entry.entry_type}
              onChange={(next) => onStatusChange(entry.id, next, entry.statut)}
            />

            {/* Class name (if assigned) */}
            {entry.classe_nom && (
              <Badge variant="muted" className="shrink-0">
                {entry.classe_nom}
              </Badge>
            )}

            {/* Meeting Kind Badge */}
            {entry.entry_type === 'MEETING' && entry.meta?.meeting_kind && (
              <Badge variant="muted" className="shrink-0 text-indigo-900 border-indigo-200">
                {entry.meta.meeting_kind}
              </Badge>
            )}

            {/* Location for meetings */}
            {entry.entry_type === 'MEETING' && entry.meta?.location && (
              <span className="text-[11px] text-muted flex items-center gap-1 shrink-0">
                <MapPin size={10} className="text-teal" />
                {entry.meta.location}
              </span>
            )}

            {/* Publication Reference & Action required */}
            {entry.entry_type === 'PUBLICATION' && entry.meta?.reference_number && (
              <span className="text-[10px] font-mono px-1.5 py-0.5 bg-slate-100 text-slate-700 rounded border border-slate-200 shrink-0">
                Réf: {entry.meta.reference_number}
              </span>
            )}

            {isActionRequired && (
              <span className="text-[10px] font-semibold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200 flex items-center gap-1 shrink-0 animate-pulse">
                <AlertTriangle size={10} />
                Action requise {deadline ? `avant le ${deadline}` : ''}
              </span>
            )}

            {/* Exam linked (sessions only) */}
            {entry.exam_id && (
              <Badge variant="red" title={entry.exam_titre || ''} className="shrink-0">
                <ClipboardCheck size={10} className="inline mr-1" />
                Examen lié
              </Badge>
            )}

            {/* Tags */}
            {entry.tags.map((t) => (
              <Badge key={t} variant="teal" className="shrink-0">
                {t}
              </Badge>
            ))}

            {/* Attachments */}
            {entry.attachments && entry.attachments.length > 0 && (
              <Badge
                variant="muted"
                title={`${entry.attachments.length} pièce(s) jointe(s)`}
                className="shrink-0"
              >
                <Paperclip size={10} className="inline mr-1 text-teal" />
                {entry.attachments.length}{' '}
                {entry.attachments.length === 1 ? 'fichier' : 'fichiers'}
              </Badge>
            )}
          </div>

          {/* Title */}
          <div className="flex items-start justify-between gap-2">
            <h3
              className="text-sm font-semibold text-navy leading-snug cursor-pointer hover:text-teal transition-colors"
              dir="auto"
              onClick={() => onEdit(entry)}
            >
              {entry.titre}
            </h3>
          </div>

          {/* Resume / Agenda preview */}
          {entry.resume && (
            <p
              className="text-xs text-muted mt-1 line-clamp-2 leading-relaxed"
              dir="auto"
            >
              {entry.resume.replace(/[#*`>\-\[\]]/g, '').slice(0, 220)}
            </p>
          )}

          {/* Decisions preview if meeting */}
          {entry.entry_type === 'MEETING' && entry.meta?.decisions && (
            <div className="mt-1.5 p-2 rounded-lg bg-indigo-50/50 border border-indigo-100 text-[11px] text-indigo-950" dir="auto">
              <strong>Compte rendu : </strong>
              <span className="line-clamp-2">{entry.meta.decisions}</span>
            </div>
          )}
        </div>

        {/* Action buttons (hover desktop & mobile menu) */}
        <div className="relative shrink-0 flex items-center gap-1" ref={menuRef}>
          {/* Desktop quick icon button: Modifier */}
          <button
            type="button"
            onClick={() => onEdit(entry)}
            className="hidden sm:inline-flex p-1.5 rounded-lg text-muted hover:text-teal hover:bg-teal-50 transition-colors cursor-pointer"
            title="Modifier directement l'entrée"
            aria-label="Modifier l'entrée"
          >
            <Edit2 size={14} />
          </button>

          {/* Desktop quick icon button: Dupliquer */}
          <button
            type="button"
            onClick={() => onDuplicate(entry)}
            className="hidden sm:inline-flex p-1.5 rounded-lg text-muted hover:text-navy hover:bg-slate-100 transition-colors cursor-pointer"
            title="Dupliquer"
            aria-label="Dupliquer l'entrée"
          >
            <Copy size={14} />
          </button>

          {/* Mobile / Overflow Menu Button */}
          <button
            type="button"
            onClick={() => setMenuOpen(!menuOpen)}
            className="p-1.5 rounded-lg text-muted hover:text-navy hover:bg-slate-100 transition-colors cursor-pointer"
            aria-label="Actions sur l'entrée"
          >
            <MoreVertical size={16} />
          </button>

          {/* Dropdown Menu */}
          {menuOpen && (
            <div className="absolute right-0 top-full mt-1 w-44 rounded-xl bg-white shadow-xl border border-border/80 py-1 z-30 animate-in fade-in zoom-in-95 duration-100">
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  onEdit(entry);
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs text-navy hover:bg-parchment-dark/50 text-left transition-colors cursor-pointer"
              >
                <Edit2 size={13} className="text-teal" />
                <span>Modifier (tiroir)</span>
              </button>

              {entry.entry_type === 'SESSION' && entry.classe_id && (
                <Link
                  href={`/notebook/${entry.classe_id}/${entry.id}`}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs text-navy hover:bg-parchment-dark/50 text-left transition-colors cursor-pointer"
                  onClick={() => setMenuOpen(false)}
                >
                  <ChevronRight size={13} className="text-muted" />
                  <span>Ouvrir la page</span>
                </Link>
              )}

              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  onDuplicate(entry);
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs text-navy hover:bg-parchment-dark/50 text-left transition-colors cursor-pointer"
              >
                <Copy size={13} className="text-slate-600" />
                <span>Dupliquer</span>
              </button>

              <div className="my-1 border-t border-border/60" />

              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  onDelete(entry.id, entry.titre);
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs text-rose-600 hover:bg-rose-50 text-left transition-colors cursor-pointer"
              >
                <Trash2 size={13} />
                <span>Supprimer</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
