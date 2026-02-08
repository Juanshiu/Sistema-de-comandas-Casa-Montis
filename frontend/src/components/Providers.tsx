'use client';

import { AuthProvider } from '../contexts/AuthContext';
import { ImpersonationBanner } from './ImpersonationBanner';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <ImpersonationBanner />
      {children}
    </AuthProvider>
  );
}
