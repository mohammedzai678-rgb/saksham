// ============================================================
// SAKSHAM — Notifications Page
// Firestore-backed notifications
// ============================================================

'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Bell, AlertTriangle, Shield, Scan, CheckCheck } from 'lucide-react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { useNotifications } from '@/hooks/use-firestore-collections';
import { formatRelativeTime } from '@/lib/utils';

const typeIcons: Record<string, React.ReactNode> = {
  critical_threat: <AlertTriangle className="w-5 h-5 text-saksham-accent" />,
  scan_complete: <Scan className="w-5 h-5 text-saksham-primary" />,
  remediation_ready: <Shield className="w-5 h-5 text-saksham-success" />,
  pr_review: <Shield className="w-5 h-5 text-saksham-secondary" />,
  system: <Bell className="w-5 h-5 text-saksham-secondary" />,
};

export default function NotificationsPage() {
  const { data: notifications, loading } = useNotifications();
  const unread = notifications.filter((n) => !n.read);

  const markAllRead = async () => {
    await Promise.all(unread.map((notification) =>
      updateDoc(doc(db, 'notifications', notification.id), { read: true })
    ));
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary flex items-center gap-3">
            <Bell className="w-6 h-6 text-saksham-primary" />
            Notifications
          </h1>
          <p className="text-sm text-text-muted mt-1">{unread.length} unread</p>
        </div>
        {unread.length > 0 && (
          <button onClick={markAllRead} className="flex items-center gap-2 text-sm text-saksham-primary hover:underline">
            <CheckCheck className="w-4 h-4" />
            Mark all read
          </button>
        )}
      </div>

      {loading ? (
        <div className="glass-card rounded-xl p-8 text-center text-sm text-text-muted">Loading notifications...</div>
      ) : notifications.length === 0 ? (
        <div className="glass-card rounded-2xl p-10 text-center">
          <Bell className="w-10 h-10 text-text-muted mx-auto mb-3" />
          <h2 className="text-lg font-semibold text-text-primary">No notifications</h2>
          <p className="text-sm text-text-muted mt-1">Scan completion and critical threat alerts will appear here.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map((notification, i) => (
            <motion.div
              key={notification.id}
              className={`glass-card rounded-xl p-4 hover-lift ${!notification.read ? 'border-l-2 border-l-saksham-primary' : ''}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <div className="flex items-start gap-3">
                <div className="mt-0.5">{typeIcons[notification.type] || typeIcons.system}</div>
                <div className="flex-1">
                  <h3 className={`text-sm font-semibold ${!notification.read ? 'text-text-primary' : 'text-text-secondary'}`}>{notification.title}</h3>
                  <p className="text-xs text-text-muted mt-0.5">{notification.message}</p>
                  <span className="text-[10px] text-text-muted mt-1 block">{formatRelativeTime(notification.createdAt)}</span>
                </div>
                {!notification.read && <div className="w-2 h-2 rounded-full bg-saksham-primary shrink-0 mt-2" />}
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
