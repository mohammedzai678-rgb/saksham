// ============================================================
// SAKSHAM — Scan History Page
// Firestore-backed scan sessions
// ============================================================

'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { History, Clock, GitBranch, CheckCircle2, XCircle, Loader2, AlertTriangle, Eye } from 'lucide-react';
import { useRepositories, useScanSessions } from '@/hooks/use-firestore-collections';
import { formatDate } from '@/lib/utils';

export default function HistoryPage() {
  const { data: scans, loading } = useScanSessions();
  const { data: repositories } = useRepositories();

  const repoName = (id: string) => repositories.find((repo) => repo.id === id)?.name || id;

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
        <div className="glass-card rounded-xl p-8 text-center text-sm text-text-muted">Loading scan history...</div>
      ) : scans.length === 0 ? (
        <div className="glass-card rounded-2xl p-10 text-center">
          <History className="w-10 h-10 text-text-muted mx-auto mb-3" />
          <h2 className="text-lg font-semibold text-text-primary">No scans yet</h2>
          <p className="text-sm text-text-muted mt-1">Completed and failed scans will appear here.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {scans.map((scan, i) => (
            <motion.div
              key={scan.id}
              className="glass-card rounded-xl p-4 hover-lift"
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
                    <h3 className="text-sm font-semibold text-text-primary">{repoName(scan.repositoryId)}</h3>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-bg-elevated text-text-muted">{scan.depth}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-bg-elevated text-text-muted capitalize">{scan.status}</span>
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-xs text-text-muted">
                    <span className="flex items-center gap-1"><GitBranch className="w-3 h-3" />{scan.branch}</span>
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{scan.duration ? `${scan.duration}s` : `${scan.progress}%`}</span>
                    <span>{formatDate(scan.startedAt)}</span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {scan.status === 'completed' && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-text-secondary">{scan.findings.total} findings</span>
                      {scan.findings.critical > 0 && (
                        <span className="text-[10px] badge-critical px-1.5 py-0.5 rounded font-semibold flex items-center gap-1">
                          <AlertTriangle className="w-2.5 h-2.5" />{scan.findings.critical}
                        </span>
                      )}
                    </div>
                  )}
                  <Link href="/dashboard/vulnerabilities" className="p-2 rounded-lg hover:bg-white/5 text-text-muted hover:text-saksham-primary transition-colors">
                    <Eye className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
