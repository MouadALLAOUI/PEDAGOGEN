'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Plus, FileText, History, RefreshCw, X } from 'lucide-react';

const ACTIONS = [
  {
    label: 'Nouveau cours',
    desc: 'Lancer une génération',
    icon: FileText,
    href: '/generate/heavy',
    color: 'bg-teal text-white',
  },
  {
    label: 'Dernier document',
    desc: 'Voir l\'historique',
    icon: History,
    href: '/history',
    color: 'bg-amber text-white',
  },
  {
    label: 'Reprendre',
    desc: 'Génération en cours',
    icon: RefreshCw,
    href: '/generate/status',
    color: 'bg-green text-white',
  },
];

export function QuickActionFab() {
  const [open, setOpen] = useState(false);

  return (
    <div className="fixed bottom-6 right-6 z-40 flex flex-col items-end gap-3">
      {open && (
        <div className="flex flex-col gap-2 animate-fade-in-up" style={{ animationDuration: '0.2s' }}>
          {ACTIONS.map((action) => (
            <Link key={action.label} href={action.href} onClick={() => setOpen(false)}>
              <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white border border-border shadow-lg hover:shadow-xl hover:-translate-x-1 transition-all cursor-pointer group min-w-[220px]">
                <div className={`w-9 h-9 rounded-lg ${action.color} flex items-center justify-center shrink-0 shadow-sm`}>
                  <action.icon size={16} />
                </div>
                <div>
                  <p className="text-sm font-medium text-navy">{action.label}</p>
                  <p className="text-[11px] text-muted">{action.desc}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      <button
        onClick={() => setOpen(!open)}
        className={`w-14 h-14 rounded-full shadow-xl transition-all duration-300 flex items-center justify-center ${
          open
            ? 'bg-red text-white rotate-45 shadow-red/20'
            : 'bg-teal text-white shadow-teal/30 hover:shadow-teal/40 hover:scale-105'
        }`}
        aria-label={open ? 'Fermer' : 'Actions rapides'}
      >
        {open ? <X size={22} /> : <Plus size={22} />}
      </button>
    </div>
  );
}
