'use client';

import { type ReactNode } from 'react';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from '@/components/auth/AuthProvider';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { LanguageProvider } from '@/components/layout/LanguageProvider';
import { FavoritesProvider } from '@/components/layout/FavoritesProvider';

export function Providers({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <LanguageProvider>
        <FavoritesProvider>
          <AuthGuard>
            {children}
            <Toaster position="bottom-right" toastOptions={{ duration: 4000 }} />
          </AuthGuard>
        </FavoritesProvider>
      </LanguageProvider>
    </AuthProvider>
  );
}
