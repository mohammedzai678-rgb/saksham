// ============================================================
// SAKSHAM — Scan History Page with Delete
// ============================================================

'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { History, Clock, GitBranch, CheckCircle2, XCircle, Loader2, AlertTriangle, Eye, Trash2, Download } from 'lucide-react';
import { useScanSessions } from '@/hooks/use-firestore-collections';
import { deleteDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import toast from 'react-hot-toast';
import Link from 'next/link';

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

function formatDuration(seconds: number | undefined): string {
  if (!seconds) return '—';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m ${s}s`;
}

export default function HistoryPage() {
  const { data: scans, loading } = useScanSessions();

  const deleteScan = async (id: string) => {
    if (!confirm('Delete this scan record?')) return;
    try {
      await deleteDoc(doc(db, 'scan_sessions', id));
      toast.success('Scan record deleted');
    } catch {
      toast.error('Failed to delete');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text-primary flex items-center gap-3">
          <History className="w-6 h-6 text-saksham-primary" />
          Scan History
        </h1>
        <p className="text-sm text-text-muted mt-1">{scans.length} scans performed</p>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="w-6 h-6 border-2 border-saksham-primary/30 border-t-saksham-primary rounded-full animate-spin mx-auto" />
          <p className="text-xs text-text-muted mt-3">Loading scan history...</p>
        </div>
      ) : scans.length === 0 ? (
        <div className="text-center py-16">
          <History className="w-12 h-12 text-text-muted mx-auto mb-3 opacity-20" />
          <p className="text-sm text-text-muted">No scans yet</p>
          <Link href="/dashboard/scan" className="text-xs text-saksham-primary hover:underline mt-1 inline-block">
            Start your first scan →
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          {scans.map((scan, i) => (
            <motion.div
              key={scan.id}
              className="glass-card rounded-xl p-4 hover-lift group"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  scan.status === 'completed' ? 'bg-saksham-success/10 border border-saksham-success/20' :
                  scan.status === 'failed' ? 'bg-saksham-accent/10 border border-saksham-accent/20' :
                  'bg-saksham-primary/10 border border-saksham-primary/20'
                }`}>
                  {scan.status === 'completed' ? <CheckCircle2 className="w-5 h-5 text-saksham-success" /> :
                   scan.status === 'failed' ? <XCircle className="w-5 h-5 text-saksham-accent" /> :
                   <Loader2 className="w-5 h-5 text-saksham-primary animate-spin" />}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-text-primary">{scan.repositoryId?.split('_').slice(1).join('/') || 'Unknown repo'}</h3>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-bg-elevated text-text-muted">{scan.depth || 'standard'}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded capitalize ${
                      scan.status === 'completed' ? 'bg-saksham-success/10 text-saksham-success' :
                      scan.status === 'failed' ? 'bg-saksham-accent/10 text-saksham-accent' :
                      'bg-saksham-primary/10 text-saksham-primary'
                    }`}>{scan.status}</span>
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-xs text-text-muted">
                    <span className="flex items-center gap-1"><GitBranch className="w-3 h-3" />{scan.branch || 'main'}</span>
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{formatDuration(scan.duration as number | undefined)}</span>
                    <span>{timeAgo(scan.createdAt)}</span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {scan.status === 'completed' && scan.findings && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-text-secondary">{scan.findings.total} findings</span>
                      {scan.findings.critical > 0 && (
                        <span className="text-[10px] badge-critical px-1.5 py-0.5 rounded font-semibold flex items-center gap-1">
                          <AlertTriangle className="w-2.5 h-2.5" />{scan.findings.critical}
                        </span>
                      )}
                    </div>
                  )}
                  <Link href="/dashboard/vulnerabilities">
                    <button className="p-2 rounded-lg hover:bg-white/5 text-text-muted hover:text-saksham-primary transition-colors" title="View findings">
                      <Eye className="w-4 h-4" />
                    </button>
                  </Link>
                  <button
                    onClick={() => deleteScan(scan.id)}
                    className="p-2 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-saksham-accent/10 text-text-muted hover:text-saksham-accent transition-all"
                    title="Delete scan"
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
