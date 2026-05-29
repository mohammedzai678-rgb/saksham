// ============================================================
// SAKSHAM — Reports Page
// Generate detailed PDF reports + delete saved reports
// ============================================================

'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  FileText,
  Download,
  Plus,
  Calendar,
  GitBranch,
  Eye,
  Trash2,
  FileBarChart,
  FileCheck,
  Loader2,
  AlertTriangle,
} from 'lucide-react';
import { useReports, useScanSessions } from '@/hooks/use-firestore-collections';
import { deleteDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { useAuth } from '@/lib/auth/auth-context';
import toast from 'react-hot-toast';

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

export default function ReportsPage() {
  const { data: reports, loading: reportsLoading } = useReports();
  const { data: scans } = useScanSessions();
  const { user } = useAuth();
  const [generating, setGenerating] = useState(false);
  const [selectedScan, setSelectedScan] = useState<string>('');
  const [showGenerator, setShowGenerator] = useState(false);

  const completedScans = scans.filter(s => s.status === 'completed');

  const generateReport = async () => {
    if (!selectedScan) {
      toast.error('Please select a scan to generate a report from');
      return;
    }
    if (!user) {
      toast.error('Please sign in');
      return;
    }

    setGenerating(true);
    try {
      const token = await user.getIdToken();
      const response = await fetch('/api/report', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ scanSessionId: selectedScan, reportType: 'full' }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({ error: 'Failed to generate' }));
        throw new Error(err.error || 'Failed to generate report');
      }

      // Open the HTML report in a new tab
      const html = await response.text();
      const blob = new Blob([html], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
      toast.success('Report generated! Use Print (Ctrl+P) to save as PDF.');
      setShowGenerator(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to generate report');
    } finally {
      setGenerating(false);
    }
  };

  const deleteReport = async (id: string) => {
    if (!confirm('Delete this report?')) return;
    try {
      await deleteDoc(doc(db, 'saved_reports', id));
      toast.success('Report deleted');
    } catch {
      toast.error('Failed to delete');
    }
  };

  const viewReport = async (scanSessionId: string) => {
    if (!user) return;
    try {
      const token = await user.getIdToken();
      const response = await fetch('/api/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ scanSessionId, reportType: 'full' }),
      });
      if (response.ok) {
        const html = await response.text();
        const blob = new Blob([html], { type: 'text/html' });
        window.open(URL.createObjectURL(blob), '_blank');
      } else {
        toast.error('Failed to load report');
      }
    } catch {
      toast.error('Failed to load report');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary flex items-center gap-3">
            <FileText className="w-6 h-6 text-saksham-primary" />
            Reports
          </h1>
          <p className="text-sm text-text-muted mt-1">Generate and manage detailed security assessment reports</p>
        </div>
        <button
          onClick={() => setShowGenerator(!showGenerator)}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium text-sm btn-primary"
        >
          <Plus className="w-4 h-4" />
          Generate Report
        </button>
      </div>

      {/* Report Generator */}
      {showGenerator && (
        <motion.div
          className="glass-card rounded-2xl p-6"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h3 className="text-sm font-semibold text-text-primary mb-4 flex items-center gap-2">
            <FileBarChart className="w-4 h-4 text-saksham-primary" />
            Generate New Report
          </h3>

          {completedScans.length === 0 ? (
            <div className="text-center py-8">
              <AlertTriangle className="w-8 h-8 text-saksham-warning mx-auto mb-2 opacity-50" />
              <p className="text-sm text-text-muted">No completed scans found</p>
              <p className="text-xs text-text-muted mt-1">Run a security scan first, then generate a report from the results</p>
            </div>
          ) : (
            <>
              <label className="text-xs font-medium text-text-muted block mb-2">Select Scan</label>
              <select
                value={selectedScan}
                onChange={(e) => setSelectedScan(e.target.value)}
                className="w-full px-4 py-3 rounded-xl input-cyber text-sm mb-4"
              >
                <option value="">Choose a completed scan...</option>
                {completedScans.map((scan) => (
                  <option key={scan.id} value={scan.id}>
                    {scan.repositoryId?.split('_').slice(1).join('/') || 'Unknown'} — {scan.findings?.total || 0} findings — {timeAgo(scan.createdAt)}
                  </option>
                ))}
              </select>

              <div className="glass rounded-xl p-4 mb-4">
                <p className="text-xs text-text-secondary">
                  <strong className="text-text-primary">Report includes:</strong> Executive summary, security score breakdown,
                  detailed vulnerability analysis with code snippets, exploitation scenarios, threat intelligence data,
                  recommended fixes with patched code, implementation guidance, MITRE ATT&CK mapping, and methodology details.
                </p>
                <p className="text-[10px] text-text-muted mt-2">
                  💡 The report opens as an interactive HTML page. Click "Print / Save as PDF" in the report to export.
                </p>
              </div>

              <button
                onClick={generateReport}
                disabled={generating || !selectedScan}
                className="w-full py-3 rounded-xl font-semibold text-sm btn-primary disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {generating ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Generating...</>
                ) : (
                  <><FileBarChart className="w-4 h-4" /> Generate Detailed Report</>
                )}
              </button>
            </>
          )}
        </motion.div>
      )}

      {/* Saved Reports */}
      <div>
        <h2 className="text-sm font-semibold text-text-primary mb-3">Saved Reports</h2>

        {reportsLoading ? (
          <div className="text-center py-12">
            <div className="w-6 h-6 border-2 border-saksham-primary/30 border-t-saksham-primary rounded-full animate-spin mx-auto" />
          </div>
        ) : reports.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="w-10 h-10 text-text-muted mx-auto mb-2 opacity-20" />
            <p className="text-sm text-text-muted">No reports generated yet</p>
          </div>
        ) : (
          <div className="space-y-2">
            {reports.map((report, i) => (
              <motion.div
                key={report.id}
                className="glass-card rounded-xl p-4 hover-lift group"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-bg-elevated border border-border-default flex items-center justify-center text-text-muted">
                    <FileCheck className="w-5 h-5" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold text-text-primary truncate">{report.title || 'Security Report'}</h3>
                    <div className="flex items-center gap-3 mt-1 text-xs text-text-muted">
                      <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{timeAgo(report.generatedAt || report.createdAt)}</span>
                      <span>{report.type || 'full'}</span>
                    </div>
                  </div>

                  {report.findings && (
                    <div className="hidden md:flex items-center gap-2">
                      {report.findings.critical > 0 && (
                        <span className="text-[10px] badge-critical px-1.5 py-0.5 rounded">{report.findings.critical} Critical</span>
                      )}
                      {report.findings.high > 0 && (
                        <span className="text-[10px] badge-high px-1.5 py-0.5 rounded">{report.findings.high} High</span>
                      )}
                      <span className="text-xs text-text-muted">{report.findings.total} total</span>
                    </div>
                  )}

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => viewReport(report.scanSessionId)}
                      className="p-2 rounded-lg hover:bg-white/5 text-text-muted hover:text-saksham-primary transition-colors"
                      title="View & Download"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => deleteReport(report.id)}
                      className="p-2 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-saksham-accent/10 text-text-muted hover:text-saksham-accent transition-all"
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
    </div>
  );
}
