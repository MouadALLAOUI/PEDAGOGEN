'use client';

import { Printer, ArrowLeft, FileText, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';

interface PrintToolbarProps {
  totalSessions: number;
  totalClasses: number;
  layout: 'class' | 'chrono';
  detail: 'compact' | 'detailed';
}

export function PrintToolbar({
  totalSessions,
  totalClasses,
  layout,
  detail,
}: PrintToolbarProps) {
  const handlePrint = () => {
    window.print();
  };

  return (
    <aside
      aria-label="Barre d'outils d'impression"
      className="print:hidden sticky top-0 z-50 bg-navy text-white border-b border-navy-light shadow-md"
    >
      <div className="max-w-7xl mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-4">
        {/* Left: Back button & Title */}
        <div className="flex items-center gap-3">
          <Link
            href="/notebook"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-medium transition-colors cursor-pointer"
          >
            <ArrowLeft size={14} />
            <span>Retour au Carnet</span>
          </Link>
          <div className="hidden sm:block h-4 w-px bg-white/20" />
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm">Aperçu du Cahier de Textes</span>
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-teal/20 text-teal-light font-medium border border-teal/30">
              {layout === 'class' ? 'Par classe' : 'Chronologique groupé'} •{' '}
              {detail === 'compact' ? 'Compact' : 'Détaillé'}
            </span>
          </div>
        </div>

        {/* Center: Stats */}
        <div className="hidden md:flex items-center gap-4 text-xs text-white/70">
          <div className="flex items-center gap-1.5">
            <FileText size={14} className="text-teal-light" />
            <span>
              <strong className="text-white">{totalSessions}</strong> séance{totalSessions > 1 ? 's' : ''}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <CheckCircle2 size={14} className="text-teal-light" />
            <span>
              <strong className="text-white">{totalClasses}</strong> classe{totalClasses > 1 ? 's' : ''}
            </span>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-2 px-5 py-2 rounded-lg bg-teal hover:bg-teal-dark text-white text-sm font-semibold shadow-sm transition-all cursor-pointer active:scale-95 ring-2 ring-teal/30"
          >
            <Printer size={16} />
            <span>Imprimer / Exporter PDF</span>
          </button>
        </div>
      </div>
    </aside>
  );
}
