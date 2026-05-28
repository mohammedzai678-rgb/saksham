// ============================================================
// SAKSHAM — Repositories Page
// Firestore-backed repository inventory
// ============================================================

'use client';

import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  GitBranch,
  Plus,
  Search,
  ExternalLink,
  Scan,
  Clock,
  Code2,
} from 'lucide-react';
import Link from 'next/link';
import { useRepositories } from '@/hooks/use-firestore-collections';
import { formatRelativeTime } from '@/lib/utils';

export default function RepositoriesPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const { data: repositories, loading } = useRepositories();

  const filtered = useMemo(() => repositories.filter((repo) =>
    `${repo.name} ${repo.fullName} ${repo.language} ${repo.framework || ''}`.toLowerCase().includes(searchQuery.toLowerCase())
  ), [repositories, searchQuery]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary flex items-center gap-3">
            <GitBranch className="w-6 h-6 text-saksham-primary" />
            Repositories
          </h1>
          <p className="text-sm text-text-muted mt-1">{repositories.length} repositories tracked from completed scans</p>
        </div>
        <Link href="/dashboard/scan" className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium text-sm btn-primary">
          <Plus className="w-4 h-4" />
          Add Repository
        </Link>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
        <input
          type="text"
          placeholder="Search repositories..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 rounded-xl input-cyber text-sm"
        />
      </div>

      {loading ? (
        <div className="glass-card rounded-xl p-8 text-center text-sm text-text-muted">Loading repositories...</div>
      ) : filtered.length === 0 ? (
        <div className="glass-card rounded-2xl p-10 text-center">
          <GitBranch className="w-10 h-10 text-text-muted mx-auto mb-3" />
          <h2 className="text-lg font-semibold text-text-primary">No repositories yet</h2>
          <p className="text-sm text-text-muted mt-1">Run a scan to create the first repository record.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filtered.map((repo, i) => (
            <motion.div
              key={repo.id}
              className="glass-card rounded-xl p-5 hover-lift group"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-bg-elevated border border-border-default flex items-center justify-center">
                    <GitBranch className="w-5 h-5 text-text-muted" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-text-primary group-hover:text-saksham-primary transition-colors">{repo.name}</h3>
                    <p className="text-xs text-text-muted">{repo.fullName}</p>
                  </div>
                </div>
                <a href={repo.url} target="_blank" rel="noopener noreferrer" className="text-text-muted hover:text-saksham-primary transition-colors">
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>

              <div className="flex items-center gap-2 mb-4">
                <span className="text-[10px] px-2 py-1 rounded-lg bg-saksham-primary/10 text-saksham-primary border border-saksham-primary/20 flex items-center gap-1">
                  <Code2 className="w-3 h-3" />{repo.language}
                </span>
                {repo.framework && (
                  <span className="text-[10px] px-2 py-1 rounded-lg bg-bg-elevated text-text-secondary border border-border-default">
                    {repo.framework}
                  </span>
                )}
                <span className="text-[10px] text-text-muted flex items-center gap-1 ml-auto">
                  <Clock className="w-3 h-3" />{repo.lastScannedAt ? formatRelativeTime(repo.lastScannedAt) : 'never'}
                </span>
              </div>

              <div className="flex items-center gap-3 mb-3">
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-text-muted">Security Score</span>
                    <span className="text-xs font-mono font-bold" style={{
                      color: repo.securityScore >= 80 ? '#22c55e' : repo.securityScore >= 60 ? '#eab308' : '#ef4444',
                    }}>
                      {repo.securityScore}/100
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-bg-elevated overflow-hidden">
                    <motion.div
                      className="h-full rounded-full"
                      style={{
                        background: repo.securityScore >= 80
                          ? 'linear-gradient(90deg, #22c55e, #10b981)'
                          : repo.securityScore >= 60
                          ? 'linear-gradient(90deg, #eab308, #f59e0b)'
                          : 'linear-gradient(90deg, #ef4444, #f43f5e)',
                      }}
                      initial={{ width: 0 }}
                      animate={{ width: `${repo.securityScore}%` }}
                      transition={{ delay: 0.3 + i * 0.1, duration: 0.8 }}
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {repo.criticalCount > 0 && <span className="text-[10px] badge-critical px-1.5 py-0.5 rounded font-semibold">{repo.criticalCount} Critical</span>}
                {repo.highCount > 0 && <span className="text-[10px] badge-high px-1.5 py-0.5 rounded font-semibold">{repo.highCount} High</span>}
                {repo.mediumCount > 0 && <span className="text-[10px] badge-medium px-1.5 py-0.5 rounded font-semibold">{repo.mediumCount} Med</span>}
                {repo.lowCount > 0 && <span className="text-[10px] badge-low px-1.5 py-0.5 rounded font-semibold">{repo.lowCount} Low</span>}
                <Link href="/dashboard/scan" className="ml-auto flex items-center gap-1 text-xs text-saksham-primary hover:underline">
                  <Scan className="w-3 h-3" /> Rescan
                </Link>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
