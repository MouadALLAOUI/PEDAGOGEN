'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Wand2,
  FolderOpen,
  History,
  BookOpen,
  GraduationCap,
} from 'lucide-react';
import { cn } from '@/lib/utils/cn';

const NAV_ITEMS = [
  { href: '/', label: 'Tableau de Bord', icon: LayoutDashboard },
  { href: '/generate', label: 'Générer', icon: Wand2 },
  { href: '/references', label: 'Références', icon: FolderOpen },
  { href: '/history', label: 'Historique', icon: History },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden lg:flex flex-col w-64 bg-navy text-parchment min-h-screen">
      <div className="flex items-center gap-3 px-6 py-5 border-b border-white/10">
        <div className="w-10 h-10 rounded-xl bg-teal flex items-center justify-center">
          <BookOpen size={20} className="text-white" />
        </div>
        <div>
          <h1 className="font-display text-lg font-bold tracking-tight">PEDAGOGEN</h1>
          <p className="text-xs text-parchment/50">Assistant Pédagogique IA</p>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {NAV_ITEMS.map((item) => {
          const isActive = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200',
                isActive
                  ? 'bg-teal/20 text-teal-light'
                  : 'text-parchment/60 hover:bg-white/5 hover:text-parchment'
              )}
            >
              <item.icon size={18} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="px-4 py-4 border-t border-white/10">
        <div className="flex items-center gap-3 px-2">
          <div className="w-8 h-8 rounded-full bg-gold/20 flex items-center justify-center">
            <GraduationCap size={16} className="text-gold-light" />
          </div>
          <div className="text-xs">
            <p className="text-parchment/80 font-medium">Enseignant</p>
            <p className="text-parchment/40">Collège</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
