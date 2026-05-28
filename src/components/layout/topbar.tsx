// ============================================================
// SAKSHAM — Top Bar Component
// ============================================================

'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Bell, Search, Zap } from 'lucide-react';
import { useScanStore } from '@/lib/store';
import { useNotifications } from '@/hooks/use-firestore-collections';

export function TopBar() {
  const { activeScan, scanProgress } = useScanStore();
  const { data: notifications } = useNotifications();
  const unreadCount = notifications.filter((notification) => !notification.read).length;

  return (
    <header className="h-16 border-b border-border-default glass-strong flex items-center justify-between px-6 sticky top-0 z-30">
      {/* Search */}
      <div className="relative w-full max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
        <input
          type="text"
          placeholder="Search vulnerabilities, repos, agents..."
          className="w-full pl-10 pr-4 py-2 rounded-xl input-cyber text-sm"
        />
        <kbd className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-text-muted bg-bg-elevated px-1.5 py-0.5 rounded border border-border-default">
          ⌘K
        </kbd>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-4 ml-6">
        {/* Active scan indicator */}
        {activeScan && (
          <motion.div
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-saksham-primary/10 border border-saksham-primary/20"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <div className="w-2 h-2 rounded-full bg-saksham-primary animate-pulse" />
            <span className="text-xs font-medium text-saksham-primary">Scanning</span>
            <span className="text-xs text-text-muted">{scanProgress}%</span>
          </motion.div>
        )}

        {/* System status */}
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg glass">
          <Zap className="w-3.5 h-3.5 text-saksham-success" />
          <span className="text-xs text-text-secondary">System Online</span>
        </div>

        {/* Notifications */}
        <button className="relative p-2 rounded-xl hover:bg-white/5 transition-colors">
          <Bell className="w-5 h-5 text-text-secondary" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-saksham-accent text-[10px] font-bold flex items-center justify-center text-white">
              {unreadCount}
            </span>
          )}
        </button>
      </div>
    </header>
  );
}
