'use client';

import { type ReactNode } from 'react';
import { AuthProvider } from '@/components/auth/AuthProvider';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { LanguageProvider } from '@/components/layout/LanguageProvider';

export function Providers({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <LanguageProvider>
        <AuthGuard>
          {children}
        </AuthGuard>
      </LanguageProvider>
    </AuthProvider>
  );
}
