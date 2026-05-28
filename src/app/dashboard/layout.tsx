// ============================================================
// SAKSHAM — Dashboard Layout
// Protected layout with sidebar and topbar
// ============================================================

'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/auth-context';
import { useUIStore } from '@/lib/store';
import { Sidebar } from '@/components/layout/sidebar';
import { TopBar } from '@/components/layout/topbar';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { Shield } from 'lucide-react';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading } = useAuth();
  const { sidebarCollapsed } = useUIStore();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/');
    }
  }, [user, loading, router]);

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-bg-primary flex items-center justify-center">
        <motion.div
          className="flex flex-col items-center gap-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <div className="relative">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-saksham-primary/20 to-saksham-secondary/20 border border-saksham-primary/30 flex items-center justify-center">
              <Shield className="w-8 h-8 text-saksham-primary" />
            </div>
            <div className="absolute inset-0 rounded-2xl border-2 border-saksham-primary/20 animate-ping" />
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-saksham-primary animate-pulse" />
            <span className="text-sm text-text-secondary font-mono">Initializing SAKSHAM...</span>
          </div>
        </motion.div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-bg-primary cyber-bg">
      <Sidebar />
      <div
        className={cn(
          'transition-all duration-300 ease-in-out',
          sidebarCollapsed ? 'ml-[72px]' : 'ml-[260px]'
        )}
      >
        <TopBar />
        <main className="p-6 min-h-[calc(100vh-64px)]">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            {children}
          </motion.div>
        </main>
      </div>
    </div>
  );
}
