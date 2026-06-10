'use client';

import {
  DOCUMENT_TYPE_LABELS,
  type DocumentType,
} from '@/types/generation';
import {
  FileText,
  Calendar,
  Users,
  ClipboardCheck,
  BookOpen,
  GraduationCap,
  Presentation,
  Image,
} from 'lucide-react';
import toast from 'react-hot-toast';

const DOC_ICONS: Record<DocumentType, typeof FileText> = {
  fiche_pedagogique: FileText,
  planification: Calendar,
  plan_gestion_classe: Users,
  evaluation: ClipboardCheck,
  cours_complet: BookOpen,
  resume_eleve: GraduationCap,
  presentation_pptx: Presentation,
  images_illustratives: Image,
};

interface DocumentPickerProps {
  selected: DocumentType[];
  onChange: (docs: DocumentType[]) => void;
  maxSelected?: number;
}

export function DocumentPicker({ selected, onChange, maxSelected }: DocumentPickerProps) {
  const toggle = (doc: DocumentType) => {
    if (selected.includes(doc)) {
      onChange(selected.filter((d) => d !== doc));
    } else {
      if (maxSelected && selected.length >= maxSelected) {
        toast.error(`Le mode sélectif est limité à ${maxSelected} documents maximum. Pour générer plus de documents, veuillez utiliser le Mode Complet (Heavy).`);
        return;
      }
      onChange([...selected, doc]);
    }
  };

  const selectAll = () => {
    onChange(Object.keys(DOCUMENT_TYPE_LABELS) as DocumentType[]);
  };

  const clearAll = () => {
    onChange([]);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3 mb-2">
        {!maxSelected && (
          <>
            <button
              type="button"
              onClick={selectAll}
              className="text-xs text-teal hover:underline font-medium"
            >
              Tout sélectionner
            </button>
            <span className="text-muted text-xs">|</span>
          </>
        )}
        <button
          type="button"
          onClick={clearAll}
          className="text-xs text-muted hover:underline"
        >
          Tout déselectionner
        </button>
        <span className="text-xs text-muted ml-auto">
          {selected.length} sélectionné(s)
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {(Object.keys(DOCUMENT_TYPE_LABELS) as DocumentType[]).map((doc) => {
          const Icon = DOC_ICONS[doc];
          const isSelected = selected.includes(doc);
          return (
            <button
              key={doc}
              type="button"
              onClick={() => toggle(doc)}
              className={`flex items-center gap-3 p-3 rounded-lg border-2 text-left transition-all ${
                isSelected
                  ? 'border-teal bg-teal/5 text-navy'
                  : 'border-border bg-white text-muted hover:border-navy-lighter/30'
              }`}
            >
              <div
                className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                  isSelected ? 'bg-teal/10 text-teal' : 'bg-navy-light/5 text-muted'
                }`}
              >
                <Icon size={16} />
              </div>
              <span className="text-sm font-medium">{DOCUMENT_TYPE_LABELS[doc]}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
