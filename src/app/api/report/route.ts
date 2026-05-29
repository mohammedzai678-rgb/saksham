// ============================================================
// SAKSHAM — PDF Report Generation API
// Generates comprehensive, detailed security assessment reports
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb, isFirebaseAdminConfigured, verifyRequestUser } from '@/lib/firebase/admin';

export const maxDuration = 60;

interface Vulnerability {
  id: string;
  title: string;
  description: string;
  category: string;
  severity: string;
  confidence: string;
  exploitability: string;
  filePath: string;
  lineStart: number;
  lineEnd: number;
  codeSnippet: string;
  attackVector: string;
  impact: string;
  exploitScenario: string;
  isExploitable: boolean;
  cveIds: string[];
  cweIds: string[];
  threatIntelligence: {
    activelyExploited: boolean;
    cisaKev: boolean;
    mitreAttackIds: string[];
  };
}

interface Remediation {
  id: string;
  vulnerabilityId: string;
  title: string;
  explanation: string;
  patchDiff: string;
  patchedCode: string;
  originalCode: string;
  filePath: string;
  guidance: string[];
  references: string[];
  estimatedEffort: string;
  breakingChange: boolean;
}

interface RiskScore {
  overallScore: number;
  exploitabilityScore: number;
  reachabilityScore: number;
  activeExploitationScore: number;
  businessImpactScore: number;
  breakdown: Record<string, number>;
}

export async function POST(request: NextRequest) {
  if (!isFirebaseAdminConfigured) {
    return NextResponse.json({ success: false, error: 'Firebase Admin not configured' }, { status: 503 });
  }

  try {
    const db = getAdminDb();
    const authUser = await verifyRequestUser(request);
    const body = await request.json();
    const { scanSessionId, reportType = 'full' } = body;

    if (!scanSessionId) {
      return NextResponse.json({ success: false, error: 'Scan session ID is required' }, { status: 400 });
    }

    // Fetch scan session
    const scanDoc = await db.collection('scan_sessions').doc(scanSessionId).get();
    if (!scanDoc.exists) {
      return NextResponse.json({ success: false, error: 'Scan session not found' }, { status: 404 });
    }
    const scan = scanDoc.data()!;

    // Verify ownership
    if (scan.userId !== authUser.uid) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 403 });
    }

    // Fetch all related data
    const [vulnSnapshot, remSnapshot, riskSnapshot, repoSnapshot] = await Promise.all([
      db.collection('vulnerabilities').where('scanSessionId', '==', scanSessionId).get(),
      db.collection('remediations').where('userId', '==', authUser.uid).get(),
      db.collection('risk_scores').where('scanSessionId', '==', scanSessionId).get(),
      scan.repositoryId ? db.collection('repositories').doc(scan.repositoryId).get() : Promise.resolve(null),
    ]);

    const vulnerabilities = vulnSnapshot.docs.map(d => ({ id: d.id, ...d.data() })) as unknown as Vulnerability[];
    const allRemediations = remSnapshot.docs.map(d => ({ id: d.id, ...d.data() })) as unknown as Remediation[];
    const riskScore = riskSnapshot.docs[0]?.data() as unknown as RiskScore | undefined;
    const repo = repoSnapshot && 'exists' in repoSnapshot && repoSnapshot.exists ? repoSnapshot.data() : null;

    // Match remediations to vulnerabilities
    const vulnIds = new Set(vulnerabilities.map(v => v.id));
    const remediations = allRemediations.filter(r => vulnIds.has(r.vulnerabilityId));

    // Sort by severity
    const severityOrder: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3, info: 4 };
    vulnerabilities.sort((a, b) => (severityOrder[a.severity] ?? 5) - (severityOrder[b.severity] ?? 5));

    // Generate the report HTML
    const html = generateDetailedReport({
      scan,
      repo,
      vulnerabilities,
      remediations,
      riskScore,
      reportType,
      generatedAt: new Date(),
    });

    // Save report to Firestore
    const reportId = `report_${scanSessionId}_${Date.now()}`;
    await db.collection('saved_reports').doc(reportId).set({
      id: reportId,
      userId: authUser.uid,
      scanSessionId,
      repositoryId: scan.repositoryId || '',
      type: reportType,
      title: `${reportType === 'executive' ? 'Executive Summary' : 'Full Security Assessment'} — ${repo?.name || 'Repository'}`,
      findings: scan.findings || { total: vulnerabilities.length, critical: 0, high: 0, medium: 0, low: 0 },
      generatedAt: new Date(),
      createdAt: new Date(),
    });

    return new NextResponse(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Content-Disposition': `inline; filename="saksham-report-${scanSessionId}.html"`,
      },
    });
  } catch (error) {
    console.error('Report generation error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to generate report' },
      { status: 500 }
    );
  }
}

function generateDetailedReport(input: {
  scan: any;
  repo: any;
  vulnerabilities: Vulnerability[];
  remediations: Remediation[];
  riskScore?: RiskScore;
  reportType: string;
  generatedAt: Date;
}): string {
  const { scan, repo, vulnerabilities, remediations, riskScore, generatedAt } = input;
  const findings = scan.findings || { total: vulnerabilities.length, critical: 0, high: 0, medium: 0, low: 0 };

  const criticals = vulnerabilities.filter(v => v.severity === 'critical');
  const highs = vulnerabilities.filter(v => v.severity === 'high');
  const mediums = vulnerabilities.filter(v => v.severity === 'medium');
  const lows = vulnerabilities.filter(v => v.severity === 'low' || v.severity === 'info');
  const exploitable = vulnerabilities.filter(v => v.isExploitable);
  const activelyExploited = vulnerabilities.filter(v => v.threatIntelligence?.activelyExploited);
  const securityScore = riskScore?.overallScore ?? (repo?.securityScore ?? 50);

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>SAKSHAM Security Report — ${repo?.name || 'Repository'}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap');
  * { margin: 0; padding: 0; box-sizing: border-box; }
  :root {
    --bg: #0a0e1a; --card: #111827; --border: #1e293b;
    --cyan: #00f0ff; --purple: #a855f7; --red: #f43f5e;
    --orange: #f97316; --yellow: #eab308; --green: #22c55e;
    --text: #e2e8f0; --muted: #94a3b8;
  }
  body { font-family: 'Inter', sans-serif; background: var(--bg); color: var(--text); line-height: 1.7; padding: 0; }
  .page { max-width: 900px; margin: 0 auto; padding: 48px 32px; }
  h1 { font-size: 28px; font-weight: 800; margin-bottom: 8px; }
  h2 { font-size: 22px; font-weight: 700; margin: 40px 0 16px; padding-bottom: 8px; border-bottom: 1px solid var(--border); color: var(--cyan); }
  h3 { font-size: 16px; font-weight: 600; margin: 24px 0 8px; }
  h4 { font-size: 14px; font-weight: 600; margin: 16px 0 6px; color: var(--muted); }
  p { margin-bottom: 12px; color: var(--muted); font-size: 14px; }
  .card { background: var(--card); border: 1px solid var(--border); border-radius: 12px; padding: 20px; margin-bottom: 16px; }
  .stats-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 12px; margin-bottom: 24px; }
  .stat { text-align: center; padding: 16px 8px; border-radius: 10px; border: 1px solid var(--border); }
  .stat-value { font-size: 28px; font-weight: 800; font-family: 'JetBrains Mono', monospace; }
  .stat-label { font-size: 10px; text-transform: uppercase; letter-spacing: 1px; color: var(--muted); margin-top: 4px; }
  .badge { display: inline-block; font-size: 10px; font-weight: 700; padding: 3px 8px; border-radius: 4px; text-transform: uppercase; letter-spacing: 0.5px; }
  .badge-critical { background: rgba(244,63,94,0.15); color: #f43f5e; border: 1px solid rgba(244,63,94,0.3); }
  .badge-high { background: rgba(249,115,22,0.15); color: #f97316; border: 1px solid rgba(249,115,22,0.3); }
  .badge-medium { background: rgba(234,179,8,0.15); color: #eab308; border: 1px solid rgba(234,179,8,0.3); }
  .badge-low { background: rgba(0,240,255,0.15); color: #00f0ff; border: 1px solid rgba(0,240,255,0.3); }
  .badge-info { background: rgba(148,163,184,0.15); color: #94a3b8; border: 1px solid rgba(148,163,184,0.3); }
  .vuln-header { display: flex; align-items: center; gap: 10px; margin-bottom: 12px; }
  .vuln-title { font-size: 15px; font-weight: 600; color: var(--text); }
  .vuln-meta { display: flex; gap: 16px; font-size: 12px; color: var(--muted); margin-bottom: 12px; flex-wrap: wrap; }
  .code-block { background: #0d1117; border: 1px solid var(--border); border-radius: 8px; padding: 12px 16px; font-family: 'JetBrains Mono', monospace; font-size: 12px; line-height: 1.6; overflow-x: auto; white-space: pre-wrap; margin: 8px 0 12px; color: #e6edf3; }
  .section-label { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; color: var(--cyan); margin-bottom: 6px; }
  .remediation-box { background: rgba(34,197,94,0.05); border: 1px solid rgba(34,197,94,0.2); border-radius: 10px; padding: 16px; margin-top: 12px; }
  .remediation-box h4 { color: var(--green); margin: 0 0 8px; }
  .guidance-list { padding-left: 20px; margin: 8px 0; }
  .guidance-list li { font-size: 13px; color: var(--muted); margin-bottom: 6px; }
  .ref-link { color: var(--cyan); text-decoration: none; font-size: 12px; }
  .ref-link:hover { text-decoration: underline; }
  .divider { border: none; border-top: 1px solid var(--border); margin: 32px 0; }
  .score-bar { height: 8px; border-radius: 4px; background: var(--border); overflow: hidden; margin: 8px 0; }
  .score-fill { height: 100%; border-radius: 4px; }
  .print-btn { position: fixed; bottom: 24px; right: 24px; background: var(--cyan); color: #0a0e1a; border: none; padding: 12px 24px; border-radius: 10px; font-weight: 600; font-size: 14px; cursor: pointer; z-index: 100; font-family: 'Inter', sans-serif; }
  .print-btn:hover { opacity: 0.9; }
  .threat-intel { background: rgba(244,63,94,0.05); border: 1px solid rgba(244,63,94,0.15); border-radius: 8px; padding: 12px; margin: 8px 0; }
  .actively-exploited { background: rgba(244,63,94,0.2); border: 1px solid rgba(244,63,94,0.4); border-radius: 4px; padding: 2px 6px; font-size: 10px; font-weight: 700; color: #f43f5e; }
  table { width: 100%; border-collapse: collapse; margin: 12px 0; }
  th { text-align: left; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; padding: 8px 12px; border-bottom: 1px solid var(--border); color: var(--muted); }
  td { font-size: 13px; padding: 10px 12px; border-bottom: 1px solid rgba(30,41,59,0.5); }
  tr:hover { background: rgba(255,255,255,0.02); }
  @media print {
    .print-btn { display: none; }
    body { background: white; color: #1a1a1a; }
    .card { border-color: #ddd; }
    .code-block { background: #f5f5f5; color: #1a1a1a; border-color: #ddd; }
  }
</style>
</head>
<body>
<button class="print-btn" onclick="window.print()">🖨️ Print / Save as PDF</button>
<div class="page">

<!-- ==================== COVER ==================== -->
<div style="text-align: center; padding: 40px 0 32px; border-bottom: 1px solid var(--border); margin-bottom: 32px;">
  <div style="font-size: 12px; letter-spacing: 3px; text-transform: uppercase; color: var(--cyan); margin-bottom: 16px;">SAKSHAM SECURITY PLATFORM</div>
  <h1 style="font-size: 32px;">Security Assessment Report</h1>
  <p style="font-size: 16px; color: var(--text); margin: 8px 0 24px;">${repo?.fullName || repo?.name || 'Repository Analysis'}</p>
  <div style="display: flex; justify-content: center; gap: 24px; font-size: 12px; color: var(--muted);">
    <span>📅 ${generatedAt.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
    <span>🔍 ${scan.depth || 'standard'} scan</span>
    <span>🌿 Branch: ${scan.branch || 'main'}</span>
  </div>
  <div style="margin-top: 16px; font-size: 11px; color: var(--muted);">
    Report ID: ${scan.id || 'N/A'} · Generated by SAKSHAM AI Multi-Agent Pipeline
  </div>
</div>

<!-- ==================== EXECUTIVE SUMMARY ==================== -->
<h2>📋 Executive Summary</h2>
<div class="card">
  <p style="color: var(--text); font-size: 14px; line-height: 1.8;">
    This report presents the findings of an automated security assessment performed on
    <strong>${repo?.fullName || 'the target repository'}</strong> using the SAKSHAM multi-agent AI security pipeline.
    The scan analyzed <strong>${scan.findings?.total !== undefined ? 'multiple files across the codebase' : 'the repository'}</strong>
    and identified <strong>${vulnerabilities.length} security finding${vulnerabilities.length !== 1 ? 's' : ''}</strong>,
    of which <strong>${criticals.length} are critical</strong> and <strong>${highs.length} are high severity</strong>.
    ${exploitable.length > 0 ? `<strong>${exploitable.length} vulnerabilities have been confirmed as exploitable</strong> through automated validation.` : 'No confirmed exploitable vulnerabilities were found.'}
    ${activelyExploited.length > 0 ? `<br/><br/>⚠️ <strong style="color: var(--red);">${activelyExploited.length} finding${activelyExploited.length !== 1 ? 's are' : ' is'} actively being exploited in the wild</strong> according to threat intelligence sources (CISA KEV, Exploit-DB).` : ''}
  </p>
</div>

<!-- ==================== SCORE OVERVIEW ==================== -->
<h2>📊 Security Posture</h2>
<div class="stats-grid">
  <div class="stat" style="background: rgba(255,255,255,0.03);">
    <div class="stat-value" style="color: ${securityScore >= 80 ? 'var(--green)' : securityScore >= 50 ? 'var(--yellow)' : 'var(--red)'};">${securityScore}</div>
    <div class="stat-label">Score /100</div>
  </div>
  <div class="stat" style="background: rgba(244,63,94,0.05);">
    <div class="stat-value" style="color: var(--red);">${criticals.length}</div>
    <div class="stat-label">Critical</div>
  </div>
  <div class="stat" style="background: rgba(249,115,22,0.05);">
    <div class="stat-value" style="color: var(--orange);">${highs.length}</div>
    <div class="stat-label">High</div>
  </div>
  <div class="stat" style="background: rgba(234,179,8,0.05);">
    <div class="stat-value" style="color: var(--yellow);">${mediums.length}</div>
    <div class="stat-label">Medium</div>
  </div>
  <div class="stat" style="background: rgba(0,240,255,0.05);">
    <div class="stat-value" style="color: var(--cyan);">${lows.length}</div>
    <div class="stat-label">Low / Info</div>
  </div>
</div>

${riskScore ? `
<div class="card">
  <h3 style="margin-bottom: 12px;">Risk Breakdown</h3>
  ${Object.entries(riskScore.breakdown || {}).map(([key, value]) => `
    <div style="margin-bottom: 8px;">
      <div style="display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 4px;">
        <span style="color: var(--muted); text-transform: capitalize;">${key.replace(/([A-Z])/g, ' $1').trim()}</span>
        <span style="font-family: 'JetBrains Mono'; color: ${Number(value) >= 70 ? 'var(--green)' : Number(value) >= 40 ? 'var(--yellow)' : 'var(--red)'};">${value}/100</span>
      </div>
      <div class="score-bar"><div class="score-fill" style="width: ${value}%; background: ${Number(value) >= 70 ? 'var(--green)' : Number(value) >= 40 ? 'var(--yellow)' : 'var(--red)'};"></div></div>
    </div>
  `).join('')}
</div>
` : ''}

<!-- ==================== FINDINGS SUMMARY TABLE ==================== -->
<h2>📋 Findings Summary</h2>
<div class="card" style="padding: 0; overflow: hidden;">
  <table>
    <thead>
      <tr><th>#</th><th>Finding</th><th>Severity</th><th>File</th><th>Exploitable</th><th>Category</th></tr>
    </thead>
    <tbody>
      ${vulnerabilities.map((v, i) => `
        <tr>
          <td style="font-family: 'JetBrains Mono'; font-size: 11px; color: var(--muted);">${i + 1}</td>
          <td style="font-weight: 500;">${escapeHtml(v.title)}</td>
          <td><span class="badge badge-${v.severity}">${v.severity}</span></td>
          <td style="font-family: 'JetBrains Mono'; font-size: 11px;">${escapeHtml(v.filePath)}:${v.lineStart}</td>
          <td>${v.isExploitable ? '✅ Yes' : '❌ No'}</td>
          <td style="font-size: 11px; color: var(--muted);">${v.category.replace(/_/g, ' ')}</td>
        </tr>
      `).join('')}
    </tbody>
  </table>
</div>

<!-- ==================== DETAILED FINDINGS ==================== -->
<h2>🔍 Detailed Vulnerability Analysis</h2>
<p>Each finding below includes a full description of the vulnerability, its potential impact, exploitation scenario, affected code, and recommended remediation.</p>

${vulnerabilities.map((vuln, i) => {
  const rem = remediations.find(r => r.vulnerabilityId === vuln.id);
  return `
<div class="card" id="vuln-${i + 1}">
  <div class="vuln-header">
    <span class="badge badge-${vuln.severity}">${vuln.severity}</span>
    <span class="vuln-title">${i + 1}. ${escapeHtml(vuln.title)}</span>
    ${vuln.threatIntelligence?.activelyExploited ? '<span class="actively-exploited">⚠ ACTIVELY EXPLOITED</span>' : ''}
  </div>

  <div class="vuln-meta">
    <span>📁 ${escapeHtml(vuln.filePath)}:${vuln.lineStart}-${vuln.lineEnd}</span>
    <span>🏷️ ${vuln.category.replace(/_/g, ' ')}</span>
    <span>🎯 Confidence: ${vuln.confidence}</span>
    <span>💀 Exploitability: ${vuln.exploitability}</span>
    ${vuln.cveIds?.length > 0 ? `<span>🔗 ${vuln.cveIds.join(', ')}</span>` : ''}
    ${vuln.cweIds?.length > 0 ? `<span>📖 ${vuln.cweIds.join(', ')}</span>` : ''}
  </div>

  <!-- Description -->
  <div class="section-label">What is this vulnerability?</div>
  <p style="color: var(--text);">${escapeHtml(vuln.description || 'No description available.')}</p>

  <!-- Impact -->
  ${vuln.impact ? `
  <div class="section-label">Impact</div>
  <p>${escapeHtml(vuln.impact)}</p>
  ` : ''}

  <!-- Attack Vector -->
  ${vuln.attackVector ? `
  <div class="section-label">Attack Vector</div>
  <p>${escapeHtml(vuln.attackVector)}</p>
  ` : ''}

  <!-- Exploit Scenario -->
  ${vuln.exploitScenario ? `
  <div class="section-label">Exploitation Scenario</div>
  <p style="color: var(--text); background: rgba(244,63,94,0.05); padding: 12px; border-radius: 8px; border-left: 3px solid var(--red);">${escapeHtml(vuln.exploitScenario)}</p>
  ` : ''}

  <!-- Affected Code -->
  ${vuln.codeSnippet ? `
  <div class="section-label">Affected Code</div>
  <div class="code-block">${escapeHtml(vuln.codeSnippet)}</div>
  ` : ''}

  <!-- Threat Intelligence -->
  ${(vuln.threatIntelligence?.activelyExploited || vuln.threatIntelligence?.cisaKev || vuln.threatIntelligence?.mitreAttackIds?.length > 0) ? `
  <div class="threat-intel">
    <div class="section-label" style="color: var(--red);">Threat Intelligence</div>
    <ul style="list-style: none; padding: 0; font-size: 12px;">
      ${vuln.threatIntelligence.activelyExploited ? '<li>🔴 <strong>Actively exploited in the wild</strong></li>' : ''}
      ${vuln.threatIntelligence.cisaKev ? '<li>🏛️ Listed in <strong>CISA Known Exploited Vulnerabilities</strong> catalog</li>' : ''}
      ${vuln.threatIntelligence.mitreAttackIds?.length > 0 ? `<li>🗺️ MITRE ATT&CK: ${vuln.threatIntelligence.mitreAttackIds.join(', ')}</li>` : ''}
    </ul>
  </div>
  ` : ''}

  <!-- Remediation -->
  ${rem ? `
  <div class="remediation-box">
    <h4>✅ Recommended Fix</h4>

    ${rem.explanation ? `<p style="color: var(--text); font-size: 13px;">${escapeHtml(rem.explanation)}</p>` : ''}

    ${rem.patchDiff ? `
    <div class="section-label" style="color: var(--green);">Patch Diff</div>
    <div class="code-block" style="border-color: rgba(34,197,94,0.3);">${escapeHtml(rem.patchDiff)}</div>
    ` : ''}

    ${rem.patchedCode ? `
    <div class="section-label" style="color: var(--green);">Patched Code</div>
    <div class="code-block" style="border-color: rgba(34,197,94,0.3);">${escapeHtml(rem.patchedCode)}</div>
    ` : ''}

    ${rem.guidance?.length > 0 ? `
    <div class="section-label" style="color: var(--green);">Implementation Guidance</div>
    <ul class="guidance-list">
      ${rem.guidance.map(g => `<li>${escapeHtml(g)}</li>`).join('')}
    </ul>
    ` : ''}

    <div style="display: flex; gap: 16px; margin-top: 8px; font-size: 11px; color: var(--muted);">
      <span>⏱️ Effort: ${rem.estimatedEffort}</span>
      ${rem.breakingChange ? '<span style="color: var(--red);">⚠️ Breaking Change</span>' : '<span style="color: var(--green);">✅ Non-breaking</span>'}
    </div>

    ${rem.references?.length > 0 ? `
    <div style="margin-top: 8px;">
      ${rem.references.map(r => `<a href="${escapeHtml(r)}" class="ref-link" target="_blank" rel="noopener">${escapeHtml(r)}</a><br/>`).join('')}
    </div>
    ` : ''}
  </div>
  ` : `
  <div class="remediation-box" style="background: rgba(234,179,8,0.05); border-color: rgba(234,179,8,0.2);">
    <h4 style="color: var(--yellow);">⚠ No Automated Fix Available</h4>
    <p style="font-size: 13px;">A manual review is recommended. Consider consulting OWASP guidelines for ${vuln.category.replace(/_/g, ' ')} remediation patterns.</p>
  </div>
  `}
</div>
<hr class="divider" />
`;
}).join('')}

<!-- ==================== METHODOLOGY ==================== -->
<h2>🧪 Methodology</h2>
<div class="card">
  <p style="color: var(--text); font-size: 13px; line-height: 1.8;">
    This assessment was performed by SAKSHAM's multi-agent AI pipeline, which consists of the following specialized agents:
  </p>
  <table>
    <thead><tr><th>Agent</th><th>Role</th></tr></thead>
    <tbody>
      <tr><td>🎯 Orchestrator</td><td>Coordinates all agents, manages workflow sequencing and data flow</td></tr>
      <tr><td>🧠 Repository Intelligence</td><td>Analyzes repository architecture, frameworks, entry points, and data flows</td></tr>
      <tr><td>🔍 Static Analysis</td><td>Scans source code for vulnerability patterns using 2,800+ detection rules</td></tr>
      <tr><td>📦 Dependency Security</td><td>Checks all dependencies against NVD, GitHub Advisories, and OSV databases</td></tr>
      <tr><td>💀 Exploitability Validation</td><td>Validates whether detected vulnerabilities are truly exploitable in context</td></tr>
      <tr><td>🌐 Threat Intelligence</td><td>Correlates findings with CISA KEV, MITRE ATT&CK, and active exploit databases</td></tr>
      <tr><td>📊 Risk Scoring</td><td>Computes contextual risk scores considering exploitability, reachability, and business impact</td></tr>
      <tr><td>🔧 Remediation</td><td>Generates secure code patches, fix guidance, and implementation plans</td></tr>
    </tbody>
  </table>
</div>

<!-- ==================== DISCLAIMER ==================== -->
<div class="card" style="background: rgba(148,163,184,0.05); margin-top: 40px;">
  <p style="font-size: 11px; color: var(--muted); text-align: center; line-height: 1.6;">
    <strong>Disclaimer:</strong> This report was generated by an AI-powered automated security scanner. While SAKSHAM employs
    multiple validation agents to reduce false positives, this report should not be considered a substitute for a manual
    penetration test or professional security audit. All findings should be verified by a qualified security professional
    before taking action. SAKSHAM does not guarantee the completeness or accuracy of all findings.
  </p>
</div>

<div style="text-align: center; margin-top: 32px; padding: 24px 0; border-top: 1px solid var(--border);">
  <p style="font-size: 11px; color: var(--muted);">
    Generated by <strong style="color: var(--cyan);">SAKSHAM</strong> — AI-Native Autonomous Cybersecurity Platform<br/>
    ${generatedAt.toISOString()}
  </p>
</div>

</div>
</body>
</html>`;
}

function escapeHtml(text: string): string {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
