'use client';

import { useEffect, useRef, useState } from 'react';
import { animate, stagger } from 'animejs';
import { X, BookOpen } from 'lucide-react';

interface CurriculumNode {
  id: string;
  label: string;
  type: 'prereq' | 'current' | 'next' | 'related';
  description?: string;
}

interface CurriculumMapProps {
  niveau: string;
  matiere: string;
  lecon: string;
  onClose: () => void;
}

const LESSON_MAP: Record<string, CurriculumNode[]> = {
  '1AC': [
    { id: 'p1', label: 'Nombres entiers', type: 'prereq', description: 'Acquis au primaire' },
    { id: 'p2', label: 'Opérations de base', type: 'prereq', description: 'Addition, soustraction, multiplication' },
    { id: 'c1', label: 'Fractions', type: 'current', description: 'Leçon en cours' },
    { id: 'n1', label: 'Nombres décimaux', type: 'next', description: 'Prochaine leçon' },
    { id: 'n2', label: 'Proportionnalité', type: 'next', description: 'Trimestre 2' },
    { id: 'r1', label: 'Géométrie de base', type: 'related', description: 'Parallèle' },
  ],
  '2AC': [
    { id: 'p1', label: 'Fractions (1AC)', type: 'prereq' },
    { id: 'p2', label: 'Nombers relatifs', type: 'prereq' },
    { id: 'c1', label: 'Équations', type: 'current', description: 'Leçon en cours' },
    { id: 'n1', label: 'Fonctions linéaires', type: 'next' },
    { id: 'n2', label: 'Statistiques', type: 'next' },
    { id: 'r1', label: 'Angles et parallèles', type: 'related' },
  ],
  '3AC': [
    { id: 'p1', label: 'Équations (2AC)', type: 'prereq' },
    { id: 'p2', label: 'Théorème de Pythagore', type: 'prereq' },
    { id: 'c1', label: 'Fonctions affines', type: 'current', description: 'Leçon en cours' },
    { id: 'n1', label: 'Systèmes d\'équations', type: 'next' },
    { id: 'n2', label: 'Trigonométrie', type: 'next' },
    { id: 'r1', label: 'Probabilités', type: 'related' },
  ],
};

export function CurriculumMap({ niveau, matiere, lecon, onClose }: CurriculumMapProps) {
  const nodesRef = useRef<HTMLDivElement>(null);
  const [selectedNode, setSelectedNode] = useState<CurriculumNode | null>(null);

  const nodes: CurriculumNode[] = LESSON_MAP[niveau] || LESSON_MAP['1AC'] || [];

  useEffect(() => {
    if (nodesRef.current) {
      animate(nodesRef.current.querySelectorAll('[data-node]'), {
        scale: [0, 1],
        opacity: [0, 1],
        delay: stagger(80),
        ease: 'outBack',
        duration: 500,
      });
    }
    if (nodesRef.current) {
      animate(nodesRef.current.querySelectorAll('[data-edge]'), {
        strokeDashoffset: [100, 0],
        ease: 'linear',
        duration: 800,
        delay: 200,
      });
    }
  }, []);

  const typeConfig = {
    prereq: { bg: 'bg-amber/10', border: 'border-amber/30', text: 'text-amber', label: 'Prérequis' },
    current: { bg: 'bg-teal/10', border: 'border-teal/40 ring-2 ring-teal/30', text: 'text-teal', label: 'En cours' },
    next: { bg: 'bg-green/10', border: 'border-green/30', text: 'text-green', label: 'À venir' },
    related: { bg: 'bg-navy/5', border: 'border-border', text: 'text-muted', label: 'Lié' },
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy/40 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-4xl rounded-2xl bg-white shadow-2xl animate-slide-up overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-teal/10 flex items-center justify-center">
              <BookOpen size={18} className="text-teal" />
            </div>
            <div>
              <h2 className="font-display text-lg font-semibold text-navy">Cartographie du Programme</h2>
              <p className="text-xs text-muted">{matiere} · {niveau} · {lecon}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-parchment-dark text-muted transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="p-8">
          <div ref={nodesRef} className="grid grid-cols-3 gap-6 max-w-3xl mx-auto">
            {/* Prérequis - left column */}
            <div className="space-y-4">
              <div className="text-[10px] uppercase tracking-wider text-amber font-semibold text-center mb-2">Prérequis</div>
              {nodes.filter(n => n.type === 'prereq').map((node) => {
                const cfg = typeConfig[node.type];
                return (
                  <div
                    key={node.id} data-node
                    onClick={() => setSelectedNode(node)}
                    className={`p-4 rounded-xl border ${cfg.border} ${cfg.bg} cursor-pointer hover:shadow-md transition-all`}
                  >
                    <p className={`text-xs font-bold uppercase ${cfg.text}`}>{cfg.label}</p>
                    <p className="text-sm font-medium text-navy mt-1">{node.label}</p>
                  </div>
                );
              })}
            </div>

            {/* Current + Related - center column */}
            <div className="space-y-4">
              <div className="text-[10px] uppercase tracking-wider text-teal font-semibold text-center mb-2">Leçon en cours</div>
              {nodes.filter(n => n.type === 'current').map((node) => {
                const cfg = typeConfig[node.type];
                return (
                  <div
                    key={node.id} data-node
                    onClick={() => setSelectedNode(node)}
                    className={`p-5 rounded-xl border ${cfg.border} ${cfg.bg} cursor-pointer hover:shadow-lg transition-all`}
                  >
                    <p className={`text-xs font-bold uppercase ${cfg.text}`}>{cfg.label}</p>
                    <p className="text-base font-semibold text-navy mt-1">{node.label}</p>
                    {node.description && <p className="text-xs text-muted mt-1">{node.description}</p>}
                  </div>
                );
              })}
              <div className="pt-4 border-t border-border/50">
                <div className="text-[10px] uppercase tracking-wider text-muted font-semibold text-center mb-3">Lié</div>
                {nodes.filter(n => n.type === 'related').map((node) => {
                  const cfg = typeConfig[node.type];
                  return (
                    <div
                      key={node.id} data-node
                      onClick={() => setSelectedNode(node)}
                      className={`p-3 rounded-xl border ${cfg.border} ${cfg.bg} cursor-pointer hover:shadow-md transition-all mb-3`}
                    >
                      <p className="text-sm font-medium text-navy">{node.label}</p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* À venir - right column */}
            <div className="space-y-4">
              <div className="text-[10px] uppercase tracking-wider text-green font-semibold text-center mb-2">À venir</div>
              {nodes.filter(n => n.type === 'next').map((node) => {
                const cfg = typeConfig[node.type];
                return (
                  <div
                    key={node.id} data-node
                    onClick={() => setSelectedNode(node)}
                    className={`p-4 rounded-xl border ${cfg.border} ${cfg.bg} cursor-pointer hover:shadow-md transition-all`}
                  >
                    <p className={`text-xs font-bold uppercase ${cfg.text}`}>{cfg.label}</p>
                    <p className="text-sm font-medium text-navy mt-1">{node.label}</p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Connection edges (CSS arrows) */}
          <div className="relative h-8 max-w-3xl mx-auto mt-2">
            <svg className="absolute inset-0 w-full h-full" viewBox="0 0 600 32" preserveAspectRatio="none">
              <defs>
                <marker id="arrowhead" markerWidth="6" markerHeight="4" refX="5" refY="2" orient="auto">
                  <polygon points="0 0, 6 2, 0 4" fill="#059669" />
                </marker>
              </defs>
              <line x1="100" y1="8" x2="200" y2="8" stroke="#059669" strokeWidth="1.5" strokeDasharray="4,3" markerEnd="url(#arrowhead)" data-edge />
              <line x1="300" y1="8" x2="400" y2="8" stroke="#059669" strokeWidth="1.5" strokeDasharray="4,3" markerEnd="url(#arrowhead)" data-edge />
              <line x1="200" y1="18" x2="300" y2="18" stroke="#D97706" strokeWidth="1" strokeDasharray="3,3" strokeOpacity="0.4" data-edge />
            </svg>
          </div>

          {/* Selected node info */}
          {selectedNode && (
            <div className="mt-6 p-4 rounded-xl bg-parchment-dark/50 border border-border max-w-lg mx-auto text-center animate-fade-in">
              <p className="text-xs font-bold uppercase text-muted">{typeConfig[selectedNode.type].label}</p>
              <p className="font-semibold text-navy mt-1">{selectedNode.label}</p>
              {selectedNode.description && (
                <p className="text-sm text-muted mt-0.5">{selectedNode.description}</p>
              )}
            </div>
          )}
        </div>

        <div className="px-6 py-3 bg-parchment-dark/30 border-t border-border text-center text-[10px] text-muted">
          Carte conceptuelle interactive — cliquez sur un nœud pour voir les détails
        </div>
      </div>
    </div>
  );
}
