// ============================================================
// SAKSHAM — Vulnerability Detail Page
// ============================================================

'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Bug, FileCode, Shield, Target, Wrench } from 'lucide-react';
import { useRemediations, useVulnerabilities } from '@/hooks/use-firestore-collections';
import { formatRelativeTime } from '@/lib/utils';

export default function VulnerabilityDetailPage() {
  const params = useParams<{ id: string }>();
  const { data: vulnerabilities, loading } = useVulnerabilities();
  const { data: remediations } = useRemediations();
  const vulnerability = vulnerabilities.find((item) => item.id === params.id);
  const remediation = remediations.find((item) => item.vulnerabilityId === params.id);

  if (loading) {
    return <div className="glass-card rounded-xl p-8 text-center text-sm text-text-muted">Loading vulnerability...</div>;
  }

  if (!vulnerability) {
    return (
      <div className="glass-card rounded-2xl p-10 text-center">
        <Bug className="w-10 h-10 text-text-muted mx-auto mb-3" />
        <h1 className="text-lg font-semibold text-text-primary">Vulnerability not found</h1>
        <Link href="/dashboard/vulnerabilities" className="text-sm text-saksham-primary mt-3 inline-block">Back to vulnerabilities</Link>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <Link href="/dashboard/vulnerabilities" className="inline-flex items-center gap-2 text-sm text-text-muted hover:text-saksham-primary">
        <ArrowLeft className="w-4 h-4" />
        Back to vulnerabilities
      </Link>

      <div className="glass-card rounded-2xl p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-text-primary flex items-center gap-3">
              <Bug className="w-6 h-6 text-saksham-accent" />
              {vulnerability.title}
            </h1>
            <p className="text-sm text-text-muted mt-2">{vulnerability.description}</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className={`text-[10px] font-semibold px-2 py-1 rounded-lg uppercase badge-${vulnerability.severity}`}>{vulnerability.severity}</span>
            <span className="text-[10px] px-2 py-1 rounded-lg bg-saksham-primary/10 text-saksham-primary">{vulnerability.exploitability}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mt-6">
          <div className="glass rounded-xl p-4">
            <p className="text-xs text-text-muted">Confidence</p>
            <p className="text-sm font-semibold text-text-primary capitalize mt-1">{vulnerability.confidence}</p>
          </div>
          <div className="glass rounded-xl p-4">
            <p className="text-xs text-text-muted">Category</p>
            <p className="text-sm font-semibold text-text-primary capitalize mt-1">{vulnerability.category.replace(/_/g, ' ')}</p>
          </div>
          <div className="glass rounded-xl p-4">
            <p className="text-xs text-text-muted">Detected</p>
            <p className="text-sm font-semibold text-text-primary mt-1">{formatRelativeTime(vulnerability.createdAt)}</p>
          </div>
          <div className="glass rounded-xl p-4">
            <p className="text-xs text-text-muted">Active Exploit</p>
            <p className="text-sm font-semibold text-text-primary mt-1">{vulnerability.threatIntelligence?.activelyExploited ? 'Yes' : 'No'}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="glass-card rounded-2xl p-5">
          <h2 className="text-sm font-semibold text-text-primary flex items-center gap-2 mb-3">
            <FileCode className="w-4 h-4 text-saksham-primary" />
            Affected Code
          </h2>
          <p className="text-xs text-text-muted mb-3">{vulnerability.filePath}:{vulnerability.lineStart}-{vulnerability.lineEnd}</p>
          <pre className="rounded-xl bg-bg-primary border border-border-default p-4 overflow-auto text-xs text-text-secondary max-h-72">
            <code>{vulnerability.codeSnippet || 'No code snippet stored for this finding.'}</code>
          </pre>
        </div>

        <div className="glass-card rounded-2xl p-5">
          <h2 className="text-sm font-semibold text-text-primary flex items-center gap-2 mb-3">
            <Target className="w-4 h-4 text-saksham-accent" />
            Attack Explanation
          </h2>
          <p className="text-sm text-text-secondary leading-relaxed">{vulnerability.attackVector || 'No attack vector was stored.'}</p>
          <h3 className="text-xs font-semibold text-text-primary mt-5 mb-2">Impact</h3>
          <p className="text-sm text-text-secondary leading-relaxed">{vulnerability.impact || 'No impact statement was stored.'}</p>
          {vulnerability.exploitScenario && (
            <>
              <h3 className="text-xs font-semibold text-text-primary mt-5 mb-2">Exploit Scenario</h3>
              <p className="text-sm text-text-secondary leading-relaxed">{vulnerability.exploitScenario}</p>
            </>
          )}
        </div>
      </div>

      <div className="glass-card rounded-2xl p-5">
        <h2 className="text-sm font-semibold text-text-primary flex items-center gap-2 mb-3">
          <Wrench className="w-4 h-4 text-saksham-success" />
          Remediation
        </h2>
        {remediation ? (
          <div className="space-y-4">
            <p className="text-sm text-text-secondary leading-relaxed">{remediation.explanation}</p>
            {remediation.guidance.length > 0 && (
              <div className="space-y-2">
                {remediation.guidance.map((item, index) => (
                  <div key={index} className="flex gap-3 text-sm text-text-secondary">
                    <span className="text-saksham-primary font-mono">{index + 1}</span>
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            )}
            {remediation.patchDiff && (
              <pre className="rounded-xl bg-bg-primary border border-border-default p-4 overflow-auto text-xs text-text-secondary max-h-96">
                <code>{remediation.patchDiff}</code>
              </pre>
            )}
          </div>
        ) : (
          <p className="text-sm text-text-muted">No remediation has been generated for this finding yet.</p>
        )}
      </div>

      <div className="glass-card rounded-2xl p-5">
        <h2 className="text-sm font-semibold text-text-primary flex items-center gap-2 mb-3">
          <Shield className="w-4 h-4 text-saksham-primary" />
          References
        </h2>
        <div className="flex flex-wrap gap-2">
          {vulnerability.cveIds.map((id) => <span key={id} className="text-xs px-2 py-1 rounded-lg bg-bg-elevated text-saksham-primary">{id}</span>)}
          {vulnerability.cweIds.map((id) => <span key={id} className="text-xs px-2 py-1 rounded-lg bg-bg-elevated text-text-secondary">{id}</span>)}
          {vulnerability.threatIntelligence?.mitreAttackIds.map((id) => <span key={id} className="text-xs px-2 py-1 rounded-lg bg-bg-elevated text-text-secondary">{id}</span>)}
          {vulnerability.cveIds.length === 0 && vulnerability.cweIds.length === 0 && <span className="text-sm text-text-muted">No CVE/CWE references stored.</span>}
        </div>
      </div>
    </div>
  );
}
