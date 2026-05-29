// ============================================================
// SAKSHAM — Top Bar with Notification Dropdown
// ============================================================

'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, Search, Zap, X, CheckCheck, AlertTriangle, Scan, Shield, Trash2, ExternalLink } from 'lucide-react';
import { useScanStore } from '@/lib/store';
import { useNotifications } from '@/hooks/use-firestore-collections';
import { deleteDoc, doc, updateDoc, writeBatch } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import Link from 'next/link';
import toast from 'react-hot-toast';

const typeIcons: Record<string, React.ReactNode> = {
  critical_threat: <AlertTriangle className="w-4 h-4 text-saksham-accent" />,
  scan_complete: <Scan className="w-4 h-4 text-saksham-primary" />,
  remediation_ready: <Shield className="w-4 h-4 text-saksham-success" />,
  system: <Bell className="w-4 h-4 text-saksham-secondary" />,
};

function timeAgo(date: unknown): string {
  if (!date) return '';
  const d = typeof date === 'object' && 'toDate' in date && typeof (date as any).toDate === 'function'
    ? (date as any).toDate()
    : date instanceof Date ? date : new Date();
  const seconds = Math.floor((Date.now() - d.getTime()) / 1000);
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

export function TopBar() {
  const { activeScan, scanProgress } = useScanStore();
  const { data: notifications } = useNotifications();
  const unreadCount = notifications.filter((n) => !n.read).length;
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Request browser notification permission on mount
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  // Send browser notification for new unread notifications
  useEffect(() => {
    if (unreadCount > 0 && 'Notification' in window && Notification.permission === 'granted') {
      const latest = notifications.find((n) => !n.read);
      if (latest) {
        try {
          new Notification('SAKSHAM Security Alert', {
            body: latest.title || 'New notification',
            icon: '/favicon.ico',
            tag: latest.id, // Prevents duplicate browser notifications
          });
        } catch {
          // Silent fail for environments that don't support Notification constructor
        }
      }
    }
  }, [unreadCount, notifications]);

  const markAllRead = async () => {
    try {
      const batch = writeBatch(db);
      notifications.filter((n) => !n.read).forEach((n) => {
        batch.update(doc(db, 'notifications', n.id), { read: true });
      });
      await batch.commit();
      toast.success('All notifications marked as read');
    } catch {
      toast.error('Failed to update notifications');
    }
  };

  const deleteNotification = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'notifications', id));
      toast.success('Notification deleted');
    } catch {
      toast.error('Failed to delete notification');
    }
  };

  const markAsRead = async (id: string) => {
    try {
      await updateDoc(doc(db, 'notifications', id), { read: true });
    } catch {
      // Silent fail
    }
  };

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
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="relative p-2 rounded-xl hover:bg-white/5 transition-colors"
          >
            <Bell className="w-5 h-5 text-text-secondary" />
            {unreadCount > 0 && (
              <motion.span
                className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-saksham-accent text-[10px] font-bold flex items-center justify-center text-white"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 500 }}
              >
                {unreadCount > 9 ? '9+' : unreadCount}
              </motion.span>
            )}
          </button>

          {/* Dropdown */}
          <AnimatePresence>
            {isOpen && (
              <motion.div
                className="absolute right-0 top-full mt-2 w-96 rounded-2xl glass-strong border border-border-default shadow-2xl overflow-hidden z-50"
                initial={{ opacity: 0, y: -10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.95 }}
                transition={{ duration: 0.15 }}
              >
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-border-default">
                  <h3 className="text-sm font-semibold text-text-primary">Notifications</h3>
                  <div className="flex items-center gap-2">
                    {unreadCount > 0 && (
                      <button
                        onClick={markAllRead}
                        className="text-[10px] text-saksham-primary hover:underline flex items-center gap-1"
                      >
                        <CheckCheck className="w-3 h-3" />
                        Mark all read
                      </button>
                    )}
                    <button onClick={() => setIsOpen(false)} className="text-text-muted hover:text-text-primary">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Notification list */}
                <div className="max-h-80 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="px-4 py-8 text-center">
                      <Bell className="w-8 h-8 text-text-muted mx-auto mb-2 opacity-30" />
                      <p className="text-xs text-text-muted">No notifications yet</p>
                      <p className="text-[10px] text-text-muted mt-1">Run a scan to receive security alerts</p>
                    </div>
                  ) : (
                    notifications.slice(0, 10).map((n) => (
                      <div
                        key={n.id}
                        className={`flex items-start gap-3 px-4 py-3 hover:bg-white/3 transition-colors border-b border-border-default/50 last:border-0 ${!n.read ? 'bg-saksham-primary/3' : ''}`}
                        onClick={() => !n.read && markAsRead(n.id)}
                      >
                        <div className="mt-0.5 shrink-0">
                          {typeIcons[n.type] || <Bell className="w-4 h-4 text-text-muted" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-xs font-medium ${!n.read ? 'text-text-primary' : 'text-text-secondary'} truncate`}>
                            {n.title}
                          </p>
                          <p className="text-[10px] text-text-muted mt-0.5 line-clamp-2">{n.message}</p>
                          <span className="text-[10px] text-text-muted mt-1 block">{timeAgo(n.createdAt)}</span>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          {!n.read && <div className="w-2 h-2 rounded-full bg-saksham-primary" />}
                          <button
                            onClick={(e) => { e.stopPropagation(); deleteNotification(n.id); }}
                            className="p-1 rounded hover:bg-saksham-accent/10 text-text-muted hover:text-saksham-accent transition-colors"
                            title="Delete notification"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Footer */}
                {notifications.length > 0 && (
                  <div className="px-4 py-2 border-t border-border-default">
                    <Link
                      href="/dashboard/notifications"
                      onClick={() => setIsOpen(false)}
                      className="text-xs text-saksham-primary hover:underline flex items-center gap-1 justify-center"
                    >
                      View all notifications
                      <ExternalLink className="w-3 h-3" />
                    </Link>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  );
}
