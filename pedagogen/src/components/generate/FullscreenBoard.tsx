'use client';

import { useEffect, useCallback, useState } from 'react';
import { X, ArrowLeft, ArrowRight, Maximize2, Edit3, Eye } from 'lucide-react';
import { BoardDesigner } from './BoardDesigner';

interface BoardSection {
  title: string;
  content: string;
}

interface BoardLayout {
  title: string;
  columns: number;
  sections: BoardSection[];
}

const DEFAULT_LAYOUTS: BoardLayout[] = [
  {
    title: "Plan de Séance",
    columns: 3,
    sections: [
      { title: "Date & Objectif", content: "Semaine du [date]\nObjectif : [compétence visée]" },
      { title: "Déroulement", content: "1. Rappel (5 min)\n2. Découverte (15 min)\n3. Exercices (20 min)" },
      { title: "Synthèse", content: "À retenir :\n- Point clé 1\n- Point clé 2\n- Vocabulaire important" },
    ],
  },
  {
    title: "Définitions & Théorèmes",
    columns: 2,
    sections: [
      { title: "Définitions", content: "[Notion] : [définition]\n[Notion] : [définition]" },
      { title: "Propriétés", content: "Propriété 1 : [énoncé]\nPropriété 2 : [énoncé]" },
    ],
  },
  {
    title: "Exercices",
    columns: 3,
    sections: [
      { title: "Niveau ★ Soutien", content: "Exercice 1 :\n[énoncé guidé]" },
      { title: "Niveau ★★ Standard", content: "Exercice 2 :\n[énoncé]" },
      { title: "Niveau ★★★ Défi", content: "Exercice 3 :\n[problème ouvert]" },
    ],
  },
  {
    title: "Évaluation",
    columns: 1,
    sections: [
      { title: "Questions Bilan", content: "1. [question]\n2. [question]\n3. [question]" },
    ],
  },
];

interface FullscreenBoardProps {
  onClose: () => void;
  layouts?: BoardLayout[];
}

export function FullscreenBoard({ onClose, layouts = DEFAULT_LAYOUTS }: FullscreenBoardProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [editMode, setEditMode] = useState(false);
  const [editableLayouts, setEditableLayouts] = useState<BoardLayout[]>(layouts);
  const layout = editableLayouts[currentIndex];

  const goNext = useCallback(() => {
    setCurrentIndex((i) => (i + 1) % editableLayouts.length);
  }, [editableLayouts.length]);

  const goPrev = useCallback(() => {
    setCurrentIndex((i) => (i - 1 + editableLayouts.length) % editableLayouts.length);
  }, [editableLayouts.length]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (!editMode) {
        if (e.key === 'ArrowRight' || e.key === 'ArrowDown') goNext();
        if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') goPrev();
      }
      if (e.key === 'f' || e.key === 'F') {
        if (!document.fullscreenElement) {
          document.documentElement.requestFullscreen().catch(() => {});
        } else {
          document.exitFullscreen().catch(() => {});
        }
      }
    };
    window.addEventListener('keydown', handleKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', handleKey);
      document.body.style.overflow = '';
      if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    };
  }, [onClose, goNext, goPrev, editMode]);

  const handleSaveLayout = (newSections: { id: string; title: string; content: string }[]) => {
    setEditableLayouts((prev) =>
      prev.map((l, i) =>
        i === currentIndex
          ? { ...l, sections: newSections.map((s) => ({ title: s.title, content: s.content })) }
          : l
      )
    );
    setEditMode(false);
  };

  if (!layout) return null;

  const gridCols = layout.columns === 3
    ? 'grid-cols-1 md:grid-cols-3'
    : layout.columns === 2
    ? 'grid-cols-1 md:grid-cols-2'
    : 'grid-cols-1 max-w-2xl mx-auto';

  return (
    <div className="fixed inset-0 z-50 bg-navy text-white flex flex-col">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-6 py-3 bg-navy-light border-b border-white/10 shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-white/10 transition-colors" title="Fermer (Esc)">
            <X size={18} />
          </button>
          <span className="text-sm text-white/50">
            {currentIndex + 1} / {editableLayouts.length}
          </span>
          <button
            onClick={() => setEditMode(!editMode)}
            className={`p-2 rounded-lg transition-colors ${editMode ? 'bg-teal text-white' : 'hover:bg-white/10 text-white/70'}`}
            title={editMode ? 'Mode présentation' : 'Mode édition'}
          >
            {editMode ? <Eye size={16} /> : <Edit3 size={16} />}
          </button>
        </div>

        {!editMode && (
          <div className="flex items-center gap-2">
            <button onClick={goPrev} className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-sm transition-colors flex items-center gap-1.5">
              <ArrowLeft size={14} /> Précédent
            </button>
            <span className="font-display text-lg font-semibold px-4">{layout.title}</span>
            <button onClick={goNext} className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-sm transition-colors flex items-center gap-1.5">
              Suivant <ArrowRight size={14} />
            </button>
          </div>
        )}

        <button
          onClick={() => {
            if (!document.fullscreenElement) {
              document.documentElement.requestFullscreen().catch(() => {});
            } else {
              document.exitFullscreen().catch(() => {});
            }
          }}
          className="p-2 rounded-lg hover:bg-white/10 transition-colors"
          title="Plein écran (F)"
        >
          <Maximize2 size={18} />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12 overflow-auto">
        {editMode ? (
          <div className="w-full max-w-3xl">
            <BoardDesigner
              initialSections={layout.sections.map((s) => ({ id: crypto.randomUUID?.() || s.title, title: s.title, content: s.content }))}
              onSave={handleSaveLayout}
            />
          </div>
        ) : (
          <div className={`w-full max-w-6xl grid ${gridCols} gap-6`}>
            {layout.sections.map((section, i) => (
              <div
                key={i}
                className="bg-white/5 backdrop-blur rounded-2xl border border-white/10 p-6 lg:p-8 min-h-[300px] flex flex-col animate-fade-in-up"
                style={{ animationDelay: `${i * 80}ms`, animationFillMode: 'backwards' }}
              >
                <div className="text-xs uppercase tracking-widest text-teal-light font-semibold mb-3 border-b border-white/10 pb-2">
                  {section.title}
                </div>
                <pre className="font-body text-sm lg:text-base text-white/80 leading-relaxed whitespace-pre-wrap flex-1">
                  {section.content || "Écrivez ici..."}
                </pre>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer hint */}
      <div className="px-6 py-2 bg-navy-light/50 border-t border-white/5 text-center text-xs text-white/30 shrink-0">
        {editMode
          ? 'Glissez-déposez les sections · Esc pour fermer'
          : '← → ou ↑ ↓ pour naviguer · Esc pour fermer · F pour plein écran'}
      </div>
    </div>
  );
}
