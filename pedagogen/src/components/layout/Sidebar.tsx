'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  Wand2,
  FolderOpen,
  History,
  BookOpen,
  GraduationCap,
  PanelLeftClose,
  PanelLeftOpen,
  LogOut,
  User,
  Bot,
  Files,
  Settings,
  Activity,
} from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { useAuth } from '@/components/auth/AuthProvider';

const NAV_ITEMS = [
  { href: '/', label: 'Tableau de Bord', icon: LayoutDashboard },
  { href: '/generate', label: 'Générer', icon: Wand2 },
  { href: '/generate/status', label: 'Suivi Génération', icon: Activity },
  { href: '/files', label: 'Mes Fichiers', icon: Files },
  { href: '/references', label: 'Références', icon: FolderOpen },
  { href: '/history', label: 'Historique', icon: History },
  { href: '/chatbot', label: 'Chatbot', icon: Bot },
  { href: '/settings', label: 'Paramètres', icon: Settings },
];

const STORAGE_KEY = 'pedagogen_sidebar_collapsed';

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const { profile, signOut, user } = useAuth();

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'true') setCollapsed(true);
  }, []);

  const toggle = () => {
    setCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem(STORAGE_KEY, String(next));
      return next;
    });
  };

  return (
    <aside
      className={cn(
        'hidden lg:flex flex-col bg-white text-navy min-h-screen border-r border-border transition-all duration-300',
        collapsed ? 'w-[68px]' : 'w-64'
      )}
    >
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-border">
        <div className="w-10 h-10 rounded-xl bg-teal flex items-center justify-center flex-shrink-0">
          <BookOpen size={20} className="text-white" />
        </div>
        {!collapsed && (
          <div className="overflow-hidden">
            <h1 className="font-display text-lg font-bold tracking-tight whitespace-nowrap">PEDAGOGEN</h1>
            <p className="text-xs text-muted whitespace-nowrap">Assistant Pédagogique IA</p>
          </div>
        )}
      </div>

      {/* Toggle button */}
      <button
        onClick={toggle}
        className="mx-3 mt-3 flex items-center justify-center gap-2 px-2 py-1.5 rounded-lg text-muted hover:text-navy hover:bg-parchment-dark transition-colors"
        title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        {collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
        {!collapsed && <span className="text-xs">Réduire</span>}
      </button>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {NAV_ITEMS.map((item) => {
          const isActive = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-lg text-sm font-medium transition-all duration-200',
                collapsed ? 'justify-center px-2 py-2.5' : 'px-3 py-2.5',
                isActive
                  ? 'bg-teal-50 text-teal-dark border-l-2 border-teal rounded-l-none'
                  : 'text-muted hover:bg-parchment-dark hover:text-navy'
              )}
              title={collapsed ? item.label : undefined}
            >
              <item.icon size={18} className="flex-shrink-0" />
              {!collapsed && <span className="whitespace-nowrap">{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-4 py-4 border-t border-border">
        {user ? (
          <div className="space-y-2">
            <Link
              href="/profile"
              className={cn(
                'flex items-center gap-3 px-2 py-2 rounded-lg text-sm transition-colors',
                collapsed ? 'justify-center' : '',
                pathname === '/profile'
                  ? 'bg-teal-50 text-teal-dark'
                  : 'text-muted hover:bg-parchment-dark hover:text-navy'
              )}
            >
              <div className="w-8 h-8 rounded-full bg-gold/10 flex items-center justify-center flex-shrink-0">
                <GraduationCap size={16} className="text-gold" />
              </div>
              {!collapsed && (
                <div className="text-xs overflow-hidden">
                  <p className="text-navy font-medium whitespace-nowrap">
                    {profile?.full_name || 'Enseignant'}
                  </p>
                  <p className="text-muted whitespace-nowrap">
                    {profile?.matiere || 'Collège'}
                  </p>
                </div>
              )}
            </Link>
            <button
              onClick={() => signOut()}
              className={cn(
                'flex items-center gap-3 w-full px-2 py-1.5 rounded-lg text-xs transition-colors',
                collapsed ? 'justify-center' : '',
                'text-muted hover:bg-parchment-dark hover:text-navy'
              )}
              title={collapsed ? 'Déconnexion' : undefined}
            >
              <LogOut size={14} />
              {!collapsed && <span>Déconnexion</span>}
            </button>
          </div>
        ) : (
          <Link
            href="/login"
            className={cn(
              'flex items-center gap-3 px-2 py-2 rounded-lg text-sm transition-colors',
              collapsed ? 'justify-center' : '',
              'text-muted hover:bg-parchment-dark hover:text-navy'
            )}
          >
            <div className="w-8 h-8 rounded-full bg-gold/10 flex items-center justify-center flex-shrink-0">
              <User size={16} className="text-gold" />
            </div>
            {!collapsed && <span className="whitespace-nowrap">Connexion</span>}
          </Link>
        )}
      </div>
    </aside>
  );
}
