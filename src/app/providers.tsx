// ============================================================
// SAKSHAM — Client Providers
// ============================================================

'use client';

import { AuthProvider } from '@/lib/auth/auth-context';
import { capturePostHog, captureSentryError } from '@/lib/observability/client';
import { usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { Toaster } from 'react-hot-toast';

export function Providers({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  useEffect(() => {
    capturePostHog('$pageview', { path: pathname });
  }, [pathname]);

  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      captureSentryError(event.error || new Error(event.message), { source: 'window.error' });
    };
    const handleRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason instanceof Error ? event.reason : new Error(String(event.reason));
      captureSentryError(reason, { source: 'unhandledrejection' });
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleRejection);
    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleRejection);
    };
  }, []);

  return (
    <AuthProvider>
      {children}
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: 'rgba(15, 23, 42, 0.9)',
            backdropFilter: 'blur(16px)',
            color: '#f1f5f9',
            border: '1px solid rgba(148, 163, 184, 0.1)',
            borderRadius: '12px',
            fontSize: '0.875rem',
            fontFamily: 'var(--font-sans)',
          },
          success: {
            iconTheme: {
              primary: '#00f0ff',
              secondary: '#030712',
            },
          },
          error: {
            iconTheme: {
              primary: '#f43f5e',
              secondary: '#030712',
            },
          },
        }}
      />
    </AuthProvider>
  );
}
