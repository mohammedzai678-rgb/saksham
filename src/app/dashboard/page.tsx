// ============================================================
// SAKSHAM — Dashboard Main Page
// Firestore-backed security overview
// ============================================================

'use client';

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  GitBranch,
  Scan,
  TrendingDown,
  TrendingUp,
  ArrowUpRight,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  Radar,
} from 'recharts';
import Link from 'next/link';
import {
  useAgentLogs,
  useRepositories,
  useRiskScores,
  useScanSessions,
  useVulnerabilities,
} from '@/hooks/use-firestore-collections';
import { formatRelativeTime } from '@/lib/utils';
import type { Severity } from '@/types';

const severityColors: Record<Severity, string> = {
  critical: '#ef4444',
  high: '#f97316',
  medium: '#eab308',
  low: '#06b6d4',
  info: '#22c55e',
};

export default function DashboardPage() {
  const { data: repositories } = useRepositories();
  const { data: scans } = useScanSessions();
  const { data: vulnerabilities } = useVulnerabilities();
  const { data: logs } = useAgentLogs();
  const { data: riskScores } = useRiskScores();

  const activeThreats = vulnerabilities.filter((v) => v.isExploitable && !v.isFalsePositive).length;
  const completedScans = scans.filter((scan) => scan.status === 'completed').length;
  const failedScans = scans.filter((scan) => scan.status === 'failed').length;
  const avgScore = repositories.length
    ? Math.round(repositories.reduce((sum, repo) => sum + repo.securityScore, 0) / repositories.length)
    : 0;

  const stats = [
    { label: 'Repositories', value: repositories.length, icon: GitBranch, color: '#00f0ff', change: `${avgScore}/100 avg` },
    { label: 'Total Scans', value: scans.length, icon: Scan, color: '#a855f7', change: `${completedScans} complete` },
    { label: 'Active Threats', value: activeThreats, icon: AlertTriangle, color: '#f43f5e', change: failedScans ? `${failedScans} failed` : 'live' },
    { label: 'Resolved', value: vulnerabilities.filter((v) => v.isFalsePositive).length, icon: CheckCircle2, color: '#22c55e', change: 'validated' },
  ];

  const severityData = (['critical', 'high', 'medium', 'low', 'info'] as Severity[])
    .map((severity) => ({
      name: severity.charAt(0).toUpperCase() + severity.slice(1),
      value: vulnerabilities.filter((v) => v.severity === severity).length,
      color: severityColors[severity],
    }))
    .filter((item) => item.value > 0);

  const trendData = useMemo(() => {
    const grouped = new Map<string, { date: string; vulnerabilities: number; resolved: number; score: number; count: number }>();
    scans.forEach((scan) => {
      const date = scan.startedAt?.toDate?.() ?? new Date();
      const key = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const row = grouped.get(key) || { date: key, vulnerabilities: 0, resolved: 0, score: 0, count: 0 };
      row.vulnerabilities += scan.findings?.total || 0;
      row.resolved += scan.findings?.falsePositives || 0;
      const repo = repositories.find((r) => r.id === scan.repositoryId);
      row.score += repo?.securityScore || 0;
      row.count += 1;
      grouped.set(key, row);
    });
    return Array.from(grouped.values()).map((row) => ({
      ...row,
      score: row.count ? Math.round(row.score / row.count) : 0,
    })).slice(-8);
  }, [repositories, scans]);

  const latestRisk = riskScores[0];
  const riskRadarData = latestRisk
    ? [
        { category: 'Code Quality', score: latestRisk.breakdown.codeQuality },
        { category: 'Dependencies', score: latestRisk.breakdown.dependencyRisk },
        { category: 'Configuration', score: latestRisk.breakdown.configurationRisk },
        { category: 'Auth', score: latestRisk.breakdown.authenticationRisk },
        { category: 'Data Exposure', score: latestRisk.breakdown.dataExposureRisk },
      ]
    : [];

  const recentFindings = vulnerabilities.slice(0, 6);
  const topRepos = [...repositories].sort((a, b) => a.securityScore - b.securityScore).slice(0, 5);
  const latestLogs = logs.slice(0, 6);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Security Overview</h1>
          <p className="text-sm text-text-muted mt-1">Live Firestore-backed security posture</p>
        </div>
        <Link href="/dashboard/scan" className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium text-sm btn-primary">
          <Scan className="w-4 h-4" />
          New Scan
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, i) => (
          <motion.div
            key={stat.label}
            className="glass-card rounded-xl p-5 hover-lift relative overflow-hidden group"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
          >
            <div className="absolute top-0 right-0 w-20 h-20 rounded-full opacity-10 blur-2xl" style={{ background: stat.color }} />
            <div className="flex items-start justify-between mb-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${stat.color}15`, border: `1px solid ${stat.color}30` }}>
                <stat.icon className="w-5 h-5" style={{ color: stat.color }} />
              </div>
              <div className="flex items-center gap-1 text-xs font-medium text-text-muted">
                {stat.label === 'Active Threats' ? <TrendingDown className="w-3 h-3" /> : <TrendingUp className="w-3 h-3" />}
                {stat.change}
              </div>
            </div>
            <p className="text-2xl font-bold text-text-primary">{stat.value}</p>
            <p className="text-sm text-text-muted mt-1">{stat.label}</p>
          </motion.div>
        ))}
      </div>

      {scans.length === 0 ? (
        <div className="glass-card rounded-2xl p-10 text-center">
          <Scan className="w-10 h-10 text-saksham-primary mx-auto mb-3" />
          <h2 className="text-lg font-semibold text-text-primary">No scans yet</h2>
          <p className="text-sm text-text-muted mt-1">Run your first repository scan to populate dashboards, findings, reports, and attack graphs.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <motion.div className="lg:col-span-2 glass-card rounded-xl p-5" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <h3 className="text-sm font-semibold text-text-primary mb-1">Security Trend</h3>
              <p className="text-xs text-text-muted mb-4">Findings over completed scans</p>
              <ResponsiveContainer width="100%" height={240}>
                <AreaChart data={trendData}>
                  <defs>
                    <linearGradient id="vulnGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="resolvedGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#00f0ff" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#00f0ff" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.06)" />
                  <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ background: 'rgba(15, 23, 42, 0.9)', border: '1px solid rgba(148,163,184,0.1)', borderRadius: '8px', color: '#f1f5f9', fontSize: '12px' }} />
                  <Area type="monotone" dataKey="vulnerabilities" stroke="#f43f5e" fill="url(#vulnGrad)" strokeWidth={2} />
                  <Area type="monotone" dataKey="resolved" stroke="#00f0ff" fill="url(#resolvedGrad)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </motion.div>

            <motion.div className="glass-card rounded-xl p-5" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <h3 className="text-sm font-semibold text-text-primary mb-1">Severity Distribution</h3>
              <p className="text-xs text-text-muted mb-4">Current finding breakdown</p>
              {severityData.length === 0 ? (
                <p className="text-sm text-text-muted py-16 text-center">No vulnerabilities found.</p>
              ) : (
                <>
                  <ResponsiveContainer width="100%" height={180}>
                    <PieChart>
                      <Pie data={severityData} cx="50%" cy="50%" innerRadius={50} outerRadius={75} dataKey="value" stroke="none">
                        {severityData.map((entry) => <Cell key={entry.name} fill={entry.color} />)}
                      </Pie>
                      <Tooltip contentStyle={{ background: 'rgba(15, 23, 42, 0.9)', border: '1px solid rgba(148,163,184,0.1)', borderRadius: '8px', color: '#f1f5f9', fontSize: '12px' }} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    {severityData.map((item) => (
                      <div key={item.name} className="flex items-center gap-2 text-xs">
                        <span className="w-2 h-2 rounded-full" style={{ background: item.color }} />
                        <span className="text-text-muted">{item.name}</span>
                        <span className="text-text-primary font-medium ml-auto">{item.value}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </motion.div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <motion.div className="lg:col-span-2 glass-card rounded-xl p-5" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-semibold text-text-primary">Recent Findings</h3>
                  <p className="text-xs text-text-muted mt-0.5">Latest vulnerabilities detected by agents</p>
                </div>
                <Link href="/dashboard/vulnerabilities" className="text-xs text-saksham-primary hover:underline flex items-center gap-1">
                  View all <ArrowUpRight className="w-3 h-3" />
                </Link>
              </div>
              {recentFindings.length === 0 ? (
                <p className="text-sm text-text-muted py-10 text-center">No findings stored yet.</p>
              ) : (
                <div className="space-y-2">
                  {recentFindings.map((finding) => (
                    <div key={finding.id} className="flex items-center gap-3 p-3 rounded-lg hover:bg-white/[0.02] transition-colors">
                      <div className="w-2 h-2 rounded-full shrink-0" style={{ background: severityColors[finding.severity] }} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-text-primary truncate">{finding.title}</p>
                        <p className="text-xs text-text-muted mt-0.5">{finding.filePath}:{finding.lineStart}</p>
                      </div>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wider badge-${finding.severity}`}>{finding.severity}</span>
                      <span className="text-xs text-text-muted shrink-0 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatRelativeTime(finding.createdAt)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>

            <motion.div className="glass-card rounded-xl p-5" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <h3 className="text-sm font-semibold text-text-primary mb-1">Agent Activity</h3>
              <p className="text-xs text-text-muted mb-4">Latest persisted workflow events</p>
              {latestLogs.length === 0 ? (
                <p className="text-sm text-text-muted py-10 text-center">No agent logs yet.</p>
              ) : (
                <div className="space-y-2">
                  {latestLogs.map((log) => (
                    <div key={log.id} className="p-2.5 rounded-lg hover:bg-white/[0.02] transition-colors">
                      <p className="text-sm text-text-primary font-medium capitalize">{log.agentType.replace(/_/g, ' ')}</p>
                      <p className="text-xs text-text-muted truncate">{log.message}</p>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <motion.div className="glass-card rounded-xl p-5" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <h3 className="text-sm font-semibold text-text-primary mb-1">Risk Analysis Radar</h3>
              <p className="text-xs text-text-muted mb-4">Latest contextual risk score</p>
              {riskRadarData.length === 0 ? (
                <p className="text-sm text-text-muted py-16 text-center">No risk score stored yet.</p>
              ) : (
                <ResponsiveContainer width="100%" height={250}>
                  <RadarChart data={riskRadarData}>
                    <PolarGrid stroke="rgba(148,163,184,0.1)" />
                    <PolarAngleAxis dataKey="category" tick={{ fill: '#64748b', fontSize: 11 }} />
                    <Radar dataKey="score" stroke="#00f0ff" fill="#00f0ff" fillOpacity={0.15} strokeWidth={2} />
                  </RadarChart>
                </ResponsiveContainer>
              )}
            </motion.div>

            <motion.div className="glass-card rounded-xl p-5" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-semibold text-text-primary">Repository Health</h3>
                  <p className="text-xs text-text-muted mt-0.5">Lowest security scores first</p>
                </div>
                <Link href="/dashboard/repositories" className="text-xs text-saksham-primary hover:underline flex items-center gap-1">
                  View all <ArrowUpRight className="w-3 h-3" />
                </Link>
              </div>
              {topRepos.length === 0 ? (
                <p className="text-sm text-text-muted py-10 text-center">No repositories tracked yet.</p>
              ) : (
                <div className="space-y-3">
                  {topRepos.map((repo) => (
                    <div key={repo.id} className="flex items-center gap-4 p-3 rounded-lg hover:bg-white/[0.02] transition-colors">
                      <div className="w-9 h-9 rounded-lg bg-bg-elevated border border-border-default flex items-center justify-center">
                        <GitBranch className="w-4 h-4 text-text-muted" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm text-text-primary font-medium">{repo.name}</p>
                          <span className="text-[10px] text-text-muted px-1.5 py-0.5 rounded bg-bg-elevated">{repo.language}</span>
                        </div>
                        <div className="flex items-center gap-3 mt-1.5">
                          <div className="flex-1 h-1.5 rounded-full bg-bg-elevated overflow-hidden">
                            <div className="h-full rounded-full" style={{ width: `${repo.securityScore}%`, background: repo.securityScore >= 80 ? '#22c55e' : repo.securityScore >= 60 ? '#eab308' : '#ef4444' }} />
                          </div>
                          <span className="text-xs font-mono font-medium">{repo.securityScore}</span>
                        </div>
                      </div>
                      <span className="text-xs text-text-muted">{repo.totalVulnerabilities} findings</span>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          </div>
        </>
      )}
    </div>
  );
}
