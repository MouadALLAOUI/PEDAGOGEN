'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Menu,
  X,
  BookOpen,
  LayoutDashboard,
  Wand2,
  FolderOpen,
  History,
  Globe,
  User,
  LogOut,
} from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils/cn';
import { useLanguage } from '@/components/layout/LanguageProvider';
import { useAuth } from '@/components/auth/AuthProvider';

const MOBILE_NAV_ITEMS = [
  { href: '/', label: 'Accueil', labelAr: 'الرئيسية', icon: LayoutDashboard },
  { href: '/generate', label: 'Générer', labelAr: 'إنشاء', icon: Wand2 },
  { href: '/references', label: 'Références', labelAr: 'المراجع', icon: FolderOpen },
  { href: '/history', label: 'Historique', labelAr: 'السجل', icon: History },
];

export function TopBar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();
  const { lang, toggle } = useLanguage();
  const { user, profile, signOut } = useAuth();

  return (
    <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-border">
      <div className="flex items-center justify-between h-14 px-4 lg:px-8">
        <div className="flex items-center gap-3 lg:hidden">
          <div className="w-8 h-8 rounded-lg bg-teal flex items-center justify-center">
            <BookOpen size={16} className="text-white" />
          </div>
          <span className="font-display font-bold text-navy">PEDAGOGEN</span>
        </div>

        <div className="hidden lg:block">
          <h2 className="text-sm font-medium text-muted">
            {lang === 'fr'
              ? 'Assistant Pédagogique IA pour Enseignants du Collège'
              : 'مساعد تعلمي ذكي لمدرسي الإعدادية'}
          </h2>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={toggle}
            className="p-2 rounded-lg hover:bg-navy-light/5 text-muted hover:text-navy transition-colors"
            title={lang === 'fr' ? 'Passer en arabe' : 'Switch to French'}
          >
            <Globe size={18} />
            <span className="sr-only">
              {lang === 'fr' ? 'العربية' : 'Français'}
            </span>
          </button>

          {user ? (
            <div className="hidden sm:flex items-center gap-2">
              <Link
                href="/profile"
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm text-muted hover:bg-navy-light/5 hover:text-navy transition-colors"
              >
                <User size={16} />
                <span className="max-w-[100px] truncate">{profile?.full_name || user.email}</span>
              </Link>
              <button
                onClick={() => signOut()}
                className="p-2 rounded-lg hover:bg-navy-light/5 text-muted hover:text-navy transition-colors"
                title="Déconnexion"
              >
                <LogOut size={16} />
              </button>
            </div>
          ) : (
            <Link
              href="/login"
              className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm text-teal font-medium hover:bg-teal/5 transition-colors"
            >
              <User size={16} />
              Connexion
            </Link>
          )}

          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-2 rounded-lg hover:bg-navy-light/5 text-navy"
          >
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-border bg-white">
          <nav className="px-4 py-3 space-y-1">
            {MOBILE_NAV_ITEMS.map((item) => {
              const isActive = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-teal/10 text-teal-dark'
                      : 'text-muted hover:bg-navy-light/5 hover:text-navy'
                  )}
                >
                  <item.icon size={18} />
                  {lang === 'ar' ? item.labelAr : item.label}
                </Link>
              );
            })}
          </nav>
        </div>
      )}
    </header>
  );
}
