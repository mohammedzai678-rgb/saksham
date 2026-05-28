// ============================================================
// SAKSHAM — Vulnerabilities List Page
// Firestore-backed findings
// ============================================================

'use client';

import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Bug,
  Search,
  ChevronRight,
  AlertTriangle,
  FileCode,
  Clock,
  Target,
} from 'lucide-react';
import Link from 'next/link';
import { useVulnerabilities } from '@/hooks/use-firestore-collections';
import { formatRelativeTime } from '@/lib/utils';
import type { Severity } from '@/types';

const severityOrder: Record<Severity, number> = { critical: 0, high: 1, medium: 2, low: 3, info: 4 };

export default function VulnerabilitiesPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [exploitableOnly, setExploitableOnly] = useState(false);
  const { data: vulnerabilities, loading } = useVulnerabilities();

  const filtered = useMemo(() => vulnerabilities
    .filter((v) => {
      if (searchQuery && !`${v.title} ${v.filePath} ${v.category}`.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      if (severityFilter !== 'all' && v.severity !== severityFilter) return false;
      if (exploitableOnly && !v.isExploitable) return false;
      return true;
    })
    .sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]), [exploitableOnly, searchQuery, severityFilter, vulnerabilities]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary flex items-center gap-3">
            <Bug className="w-6 h-6 text-saksham-accent" />
            Vulnerabilities
          </h1>
          <p className="text-sm text-text-muted mt-1">{filtered.length} persisted findings</p>
        </div>
        <span className="text-xs text-text-muted">
          {vulnerabilities.filter((v) => v.isExploitable).length} exploitable
        </span>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
          <input
            type="text"
            placeholder="Search vulnerabilities..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl input-cyber text-sm"
          />
        </div>

        {['all', 'critical', 'high', 'medium', 'low', 'info'].map((severity) => (
          <button
            key={severity}
            onClick={() => setSeverityFilter(severity)}
            className={`px-3 py-2 rounded-lg text-xs font-medium transition-all ${
              severityFilter === severity
                ? severity === 'all'
                  ? 'bg-saksham-primary/15 border border-saksham-primary/30 text-saksham-primary'
                  : `badge-${severity}`
                : 'glass text-text-secondary hover:text-text-primary'
            }`}
          >
            {severity === 'all' ? 'All' : severity.charAt(0).toUpperCase() + severity.slice(1)}
          </button>
        ))}

        <button
          onClick={() => setExploitableOnly(!exploitableOnly)}
          className={`px-3 py-2 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all ${
            exploitableOnly ? 'bg-saksham-accent/15 border border-saksham-accent/30 text-saksham-accent' : 'glass text-text-secondary'
          }`}
        >
          <Target className="w-3 h-3" />
          Exploitable Only
        </button>
      </div>

      {loading ? (
        <div className="glass-card rounded-xl p-8 text-center text-sm text-text-muted">Loading findings...</div>
      ) : filtered.length === 0 ? (
        <div className="glass-card rounded-2xl p-10 text-center">
          <Bug className="w-10 h-10 text-text-muted mx-auto mb-3" />
          <h2 className="text-lg font-semibold text-text-primary">No vulnerabilities stored</h2>
          <p className="text-sm text-text-muted mt-1">Run a repository scan to persist validated findings here.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((vuln, i) => (
            <Link key={vuln.id} href={`/dashboard/vulnerabilities/${vuln.id}`}>
              <motion.div
                className="glass-card rounded-xl p-4 hover-lift cursor-pointer group"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
              >
                <div className="flex items-start gap-4">
                  <div className={`w-1 h-full min-h-[60px] rounded-full shrink-0 ${
                    vuln.severity === 'critical' ? 'bg-red-500' :
                    vuln.severity === 'high' ? 'bg-orange-500' :
                    vuln.severity === 'medium' ? 'bg-yellow-500' :
                    vuln.severity === 'low' ? 'bg-cyan-500' : 'bg-green-500'
                  }`} />

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-sm font-semibold text-text-primary group-hover:text-saksham-primary transition-colors truncate">
                        {vuln.title}
                      </h3>
                      {vuln.threatIntelligence?.activelyExploited && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-500/20 text-red-400 border border-red-500/30 font-semibold shrink-0 flex items-center gap-1">
                          <AlertTriangle className="w-2.5 h-2.5" />
                          ACTIVE
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-3 text-xs text-text-muted">
                      <span className="flex items-center gap-1"><FileCode className="w-3 h-3" />{vuln.filePath}:{vuln.lineStart}</span>
                      <span>{vuln.category.replace(/_/g, ' ')}</span>
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{formatRelativeTime(vuln.createdAt)}</span>
                      {vuln.cveIds.length > 0 && <span className="text-saksham-primary">{vuln.cveIds.join(', ')}</span>}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`text-[10px] font-semibold px-2 py-1 rounded-lg uppercase tracking-wider badge-${vuln.severity}`}>
                      {vuln.severity}
                    </span>
                    <span className={`text-[10px] px-2 py-1 rounded-lg ${
                      vuln.exploitability === 'confirmed' ? 'text-red-400 bg-red-500/10' :
                      vuln.exploitability === 'likely' ? 'text-orange-400 bg-orange-500/10' :
                      'text-yellow-400 bg-yellow-500/10'
                    }`}>
                      {vuln.exploitability}
                    </span>
                    <ChevronRight className="w-4 h-4 text-text-muted group-hover:text-saksham-primary transition-colors" />
                  </div>
                </div>
              </motion.div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
