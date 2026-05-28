// ============================================================
// SAKSHAM — Reports Page
// Firebase Storage-backed PDF reports
// ============================================================

'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  FileText,
  Download,
  Calendar,
  GitBranch,
  Eye,
  FileBarChart,
  FileCheck,
  FileClock,
  Loader2,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '@/lib/auth/auth-context';
import { useReports, useRepositories } from '@/hooks/use-firestore-collections';
import { formatDate, formatFileSize } from '@/lib/utils';

const reportTypeIcons: Record<string, React.ReactNode> = {
  full: <FileBarChart className="w-5 h-5" />,
  executive: <FileText className="w-5 h-5" />,
  remediation: <FileCheck className="w-5 h-5" />,
  compliance: <FileClock className="w-5 h-5" />,
};

const reportTypeLabels: Record<string, string> = {
  full: 'Full Assessment',
  executive: 'Executive Summary',
  remediation: 'Remediation Plan',
  compliance: 'Compliance Audit',
};

export default function ReportsPage() {
  const [generating, setGenerating] = useState<string | null>(null);
  const [repositoryId, setRepositoryId] = useState('all');
  const { user } = useAuth();
  const { data: reports, loading } = useReports();
  const { data: repositories } = useRepositories();

  const generateReport = async (type: string) => {
    if (!user) return;
    setGenerating(type);
    try {
      const token = await user.getIdToken();
      const response = await fetch('/api/reports', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ type, repositoryId }),
      });
      const payload = await response.json();
      if (!response.ok || !payload.success) {
        throw new Error(payload.error || 'Failed to generate report');
      }
      toast.success('Report generated successfully');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to generate report');
    } finally {
      setGenerating(null);
    }
  };

  const repoName = (id: string) => {
    if (id === 'all') return 'All Repositories';
    return repositories.find((repo) => repo.id === id)?.name || id;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary flex items-center gap-3">
            <FileText className="w-6 h-6 text-saksham-primary" />
            Reports
          </h1>
          <p className="text-sm text-text-muted mt-1">Generate and download Firebase Storage-backed PDF reports</p>
        </div>
        <select value={repositoryId} onChange={(e) => setRepositoryId(e.target.value)} className="px-3 py-2 rounded-xl input-cyber text-sm">
          <option value="all">All repositories</option>
          {repositories.map((repo) => <option key={repo.id} value={repo.id}>{repo.fullName}</option>)}
        </select>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {Object.entries(reportTypeLabels).map(([type, label], i) => (
          <motion.button
            key={type}
            onClick={() => generateReport(type)}
            disabled={Boolean(generating)}
            className="glass-card rounded-xl p-4 text-left hover-lift disabled:opacity-60"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-saksham-primary/10 border border-saksham-primary/20 flex items-center justify-center text-saksham-primary">
                {generating === type ? <Loader2 className="w-5 h-5 animate-spin" /> : reportTypeIcons[type]}
              </div>
              <div>
                <h3 className="text-sm font-semibold text-text-primary">{label}</h3>
                <p className="text-[10px] text-text-muted">{generating === type ? 'Generating...' : 'Generate PDF'}</p>
              </div>
            </div>
          </motion.button>
        ))}
      </div>

      <div>
        <h2 className="text-sm font-semibold text-text-primary mb-3">Saved Reports</h2>
        {loading ? (
          <div className="glass-card rounded-xl p-8 text-center text-sm text-text-muted">Loading reports...</div>
        ) : reports.length === 0 ? (
          <div className="glass-card rounded-2xl p-10 text-center">
            <FileText className="w-10 h-10 text-text-muted mx-auto mb-3" />
            <h2 className="text-lg font-semibold text-text-primary">No reports yet</h2>
            <p className="text-sm text-text-muted mt-1">Generate a PDF report from persisted scan data.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {reports.map((report, i) => (
              <motion.div
                key={report.id}
                className="glass-card rounded-xl p-4 hover-lift"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-bg-elevated border border-border-default flex items-center justify-center text-text-muted">
                    {reportTypeIcons[report.type]}
                  </div>

                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold text-text-primary truncate">{report.title}</h3>
                    <div className="flex items-center gap-3 mt-1 text-xs text-text-muted">
                      <span className="flex items-center gap-1"><GitBranch className="w-3 h-3" />{repoName(report.repositoryId)}</span>
                      <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{formatDate(report.generatedAt)}</span>
                      <span>{formatFileSize(report.fileSize)}</span>
                    </div>
                  </div>

                  <div className="hidden md:flex items-center gap-2">
                    {report.findings.critical > 0 && <span className="text-[10px] badge-critical px-1.5 py-0.5 rounded">{report.findings.critical} Critical</span>}
                    {report.findings.high > 0 && <span className="text-[10px] badge-high px-1.5 py-0.5 rounded">{report.findings.high} High</span>}
                    <span className="text-xs text-text-muted">{report.findings.total} total</span>
                  </div>

                  <div className="flex items-center gap-1">
                    <a href={report.storageUrl} target="_blank" rel="noopener noreferrer" className="p-2 rounded-lg hover:bg-white/5 text-text-muted hover:text-saksham-primary transition-colors">
                      <Eye className="w-4 h-4" />
                    </a>
                    <a href={report.storageUrl} className="p-2 rounded-lg hover:bg-white/5 text-text-muted hover:text-saksham-primary transition-colors">
                      <Download className="w-4 h-4" />
                    </a>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
