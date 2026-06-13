'use client';

import { useState } from 'react';
import { GripVertical, Plus, Trash2, Save } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

interface BoardSection {
  id: string;
  title: string;
  content: string;
}

interface BoardDesignerProps {
  initialSections?: BoardSection[];
  onSave: (sections: BoardSection[]) => void;
}

export function BoardDesigner({ initialSections, onSave }: BoardDesignerProps) {
  const [sections, setSections] = useState<BoardSection[]>(
    initialSections?.length ? initialSections : [
      { id: 'title', title: 'Titre & Objectif', content: 'Saisir le titre de la séance et les objectifs...' },
      { id: 'rappel', title: 'Rappel', content: 'Questions de rappel sur la séance précédente...' },
      { id: 'decouverte', title: 'Découverte', content: 'Activité de découverte du nouveau concept...' },
      { id: 'cours', title: 'Cours', content: 'Définition, propriétés, exemples...' },
      { id: 'exercices', title: 'Exercices', content: 'Exercices d\'application...' },
      { id: 'synthese', title: 'Synthèse', content: 'Ce qu\'il faut retenir...' },
    ]
  );
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);
  const handleDragStart = (e: React.DragEvent, idx: number) => {
    setDragIndex(idx);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    if (dragIndex === null || dragIndex === idx) return;
    setOverIndex(idx);
    const items = Array.from(sections);
    const dragged = items[dragIndex];
    if (!dragged) return;
    items.splice(dragIndex, 1);
    items.splice(idx, 0, dragged);
    setDragIndex(idx);
    setSections(items);
  };

  const handleDragEnd = () => {
    setDragIndex(null);
    setOverIndex(null);
  };

  const updateSection = (id: string, field: 'title' | 'content', value: string) => {
    setSections((prev) => prev.map((s) => (s.id === id ? { ...s, [field]: value } : s)));
  };

  const addSection = () => {
    const id = `section-${Date.now()}`;
    setSections((prev) => [...prev, { id, title: 'Nouvelle section', content: '' }]);
  };

  const removeSection = (id: string) => {
    if (sections.length <= 1) return;
    setSections((prev) => prev.filter((s) => s.id !== id));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted">
          Glissez-déposez les sections pour réorganiser le tableau.
        </p>
        <div className="flex items-center gap-2">
          <Button onClick={addSection} variant="secondary" size="sm">
            <Plus size={14} /> Ajouter
          </Button>
          <Button onClick={() => onSave(sections)} variant="primary" size="sm">
            <Save size={14} /> Enregistrer
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        {sections.map((section, idx) => (
          <div
            key={section.id}
            draggable
            onDragStart={(e) => handleDragStart(e, idx)}
            onDragOver={(e) => handleDragOver(e, idx)}
            onDragEnd={handleDragEnd}
            className={`transition-all duration-200 ${
              overIndex === idx ? 'translate-y-1' : ''
            } ${dragIndex === idx ? 'opacity-60 scale-[1.02] shadow-lg' : 'opacity-100'}`}
          >
            <Card>
              <CardContent className="flex items-start gap-3 py-3 px-4">
                <div className="mt-1 cursor-grab active:cursor-grabbing text-muted hover:text-navy transition-colors">
                  <GripVertical size={16} />
                </div>
                <div className="flex-1 min-w-0 space-y-2">
                  <input
                    type="text"
                    value={section.title}
                    onChange={(e) => updateSection(section.id, 'title', e.target.value)}
                    className="w-full text-sm font-semibold text-navy bg-transparent border-none focus:outline-none focus:ring-0 p-0"
                    placeholder="Titre de la section"
                  />
                  <textarea
                    value={section.content}
                    onChange={(e) => updateSection(section.id, 'content', e.target.value)}
                    rows={2}
                    className="w-full text-xs text-muted bg-parchment-dark/50 rounded-lg px-3 py-2 border border-border focus:outline-none focus:ring-2 focus:ring-teal/30 focus:border-teal transition-all resize-none placeholder:text-muted/40"
                    placeholder="Contenu de la section..."
                  />
                </div>
                <button
                  onClick={() => removeSection(section.id)}
                  className="p-1.5 rounded-lg hover:bg-red/10 text-muted hover:text-red transition-colors shrink-0 mt-0.5"
                  title="Supprimer"
                >
                  <Trash2 size={14} />
                </button>
              </CardContent>
            </Card>
          </div>
        ))}
      </div>
    </div>
  );
}
