// ============================================================
// SAKSHAM — Notifications Page
// With delete individual + delete all + mark read
// ============================================================

'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Bell, CheckCheck, AlertTriangle, Shield, Scan, Trash2, X } from 'lucide-react';
import { useNotifications } from '@/hooks/use-firestore-collections';
import { deleteDoc, doc, updateDoc, writeBatch } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import toast from 'react-hot-toast';

const typeIcons: Record<string, React.ReactNode> = {
  critical_threat: <AlertTriangle className="w-5 h-5 text-saksham-accent" />,
  scan_complete: <Scan className="w-5 h-5 text-saksham-primary" />,
  remediation_ready: <Shield className="w-5 h-5 text-saksham-success" />,
  system: <Bell className="w-5 h-5 text-saksham-secondary" />,
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

export default function NotificationsPage() {
  const { data: notifications, loading } = useNotifications();
  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAllRead = async () => {
    try {
      const batch = writeBatch(db);
      notifications.filter((n) => !n.read).forEach((n) => {
        batch.update(doc(db, 'notifications', n.id), { read: true });
      });
      await batch.commit();
      toast.success('All marked as read');
    } catch {
      toast.error('Failed to update');
    }
  };

  const deleteNotification = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'notifications', id));
      toast.success('Notification deleted');
    } catch {
      toast.error('Failed to delete');
    }
  };

  const deleteAll = async () => {
    if (!confirm('Delete all notifications? This cannot be undone.')) return;
    try {
      const batch = writeBatch(db);
      notifications.forEach((n) => {
        batch.delete(doc(db, 'notifications', n.id));
      });
      await batch.commit();
      toast.success('All notifications deleted');
    } catch {
      toast.error('Failed to delete');
    }
  };

  const markAsRead = async (id: string) => {
    try {
      await updateDoc(doc(db, 'notifications', id), { read: true });
    } catch { /* silent */ }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary flex items-center gap-3">
            <Bell className="w-6 h-6 text-saksham-primary" />
            Notifications
          </h1>
          <p className="text-sm text-text-muted mt-1">{unreadCount} unread · {notifications.length} total</p>
        </div>
        <div className="flex items-center gap-3">
          {unreadCount > 0 && (
            <button onClick={markAllRead} className="flex items-center gap-2 text-sm text-saksham-primary hover:underline">
              <CheckCheck className="w-4 h-4" />
              Mark all read
            </button>
          )}
          {notifications.length > 0 && (
            <button onClick={deleteAll} className="flex items-center gap-2 text-sm text-saksham-accent hover:underline">
              <Trash2 className="w-4 h-4" />
              Delete all
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="w-6 h-6 border-2 border-saksham-primary/30 border-t-saksham-primary rounded-full animate-spin mx-auto" />
          <p className="text-xs text-text-muted mt-3">Loading notifications...</p>
        </div>
      ) : notifications.length === 0 ? (
        <div className="text-center py-16">
          <Bell className="w-12 h-12 text-text-muted mx-auto mb-3 opacity-20" />
          <p className="text-sm text-text-muted">No notifications yet</p>
          <p className="text-xs text-text-muted mt-1">Run a security scan to start receiving alerts</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map((n, i) => (
            <motion.div
              key={n.id}
              className={`glass-card rounded-xl p-4 hover-lift group ${!n.read ? 'border-l-2 border-l-saksham-primary' : ''}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
              onClick={() => !n.read && markAsRead(n.id)}
            >
              <div className="flex items-start gap-3">
                <div className="mt-0.5 shrink-0">{typeIcons[n.type] || <Bell className="w-5 h-5 text-text-muted" />}</div>
                <div className="flex-1 min-w-0">
                  <h3 className={`text-sm font-semibold ${!n.read ? 'text-text-primary' : 'text-text-secondary'}`}>{n.title}</h3>
                  <p className="text-xs text-text-muted mt-0.5">{n.message}</p>
                  <span className="text-[10px] text-text-muted mt-1 block">{timeAgo(n.createdAt)}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {!n.read && <div className="w-2 h-2 rounded-full bg-saksham-primary" />}
                  <button
                    onClick={(e) => { e.stopPropagation(); deleteNotification(n.id); }}
                    className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-saksham-accent/10 text-text-muted hover:text-saksham-accent transition-all"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
