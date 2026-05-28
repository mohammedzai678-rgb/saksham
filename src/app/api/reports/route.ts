// ============================================================
// SAKSHAM — PDF Report API
// Generates React PDF reports and stores them in Firebase Storage
// ============================================================

import React from 'react';
import { NextRequest, NextResponse } from 'next/server';
import { Document, Page, StyleSheet, Text, View, renderToBuffer } from '@react-pdf/renderer';
import { getAdminDb, getAdminStorage, isFirebaseAdminConfigured, verifyRequestUser } from '@/lib/firebase/admin';

export const maxDuration = 60;

const styles = StyleSheet.create({
  page: { padding: 32, fontSize: 10, color: '#111827', fontFamily: 'Helvetica' },
  title: { fontSize: 24, marginBottom: 6, color: '#0f172a' },
  subtitle: { fontSize: 10, marginBottom: 18, color: '#475569' },
  section: { marginBottom: 16 },
  heading: { fontSize: 14, marginBottom: 8, color: '#0f172a' },
  row: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  card: { flex: 1, padding: 10, border: '1px solid #e2e8f0', borderRadius: 6 },
  label: { fontSize: 8, color: '#64748b', marginBottom: 4 },
  value: { fontSize: 14, color: '#0f172a' },
  finding: { padding: 8, border: '1px solid #e2e8f0', borderRadius: 4, marginBottom: 6 },
  muted: { color: '#64748b' },
});

export async function POST(request: NextRequest) {
  if (!isFirebaseAdminConfigured) {
    return NextResponse.json(
      { success: false, error: 'Firebase Admin is not configured, so reports cannot be generated.' },
      { status: 503 }
    );
  }

  try {
    const authUser = await verifyRequestUser(request);
    const { type = 'full', repositoryId = 'all' } = await request.json();
    const db = getAdminDb();

    const [repoSnap, scanSnap, vulnSnap, riskSnap] = await Promise.all([
      db.collection('repositories').where('userId', '==', authUser.uid).get(),
      db.collection('scan_sessions').where('userId', '==', authUser.uid).get(),
      db.collection('vulnerabilities').where('userId', '==', authUser.uid).get(),
      db.collection('risk_scores').where('userId', '==', authUser.uid).get(),
    ]);

    const repositories = repoSnap.docs.map((doc) => doc.data()).filter((repo) => repositoryId === 'all' || repo.id === repositoryId);
    const scans = scanSnap.docs.map((doc) => doc.data()).filter((scan) => repositoryId === 'all' || scan.repositoryId === repositoryId);
    const vulnerabilities = vulnSnap.docs.map((doc) => doc.data()).filter((vuln) => repositoryId === 'all' || vuln.repositoryId === repositoryId);
    const riskScores = riskSnap.docs.map((doc) => doc.data()).filter((risk) => repositoryId === 'all' || risk.repositoryId === repositoryId);

    const totals = {
      repositories: repositories.length,
      scans: scans.length,
      vulnerabilities: vulnerabilities.length,
      critical: vulnerabilities.filter((v) => v.severity === 'critical').length,
      high: vulnerabilities.filter((v) => v.severity === 'high').length,
      exploitable: vulnerabilities.filter((v) => v.isExploitable).length,
      averageScore: repositories.length
        ? Math.round(repositories.reduce((sum, repo) => sum + Number(repo.securityScore || 0), 0) / repositories.length)
        : 0,
    };

    const title = `${typeLabel(type)} — ${repositoryId === 'all' ? 'All Repositories' : repositories[0]?.name || repositoryId}`;
    const pdf = React.createElement(ReportDocument, {
      title,
      type: String(type),
      generatedAt: new Date(),
      totals,
      repositories,
      vulnerabilities: vulnerabilities.slice(0, 20),
      riskScores: riskScores.slice(0, 5),
    });
    const buffer = await renderToBuffer(pdf);
    const reportId = db.collection('saved_reports').doc().id;
    const filePath = `reports/${authUser.uid}/${reportId}.pdf`;
    const bucket = getAdminStorage().bucket();
    const file = bucket.file(filePath);

    await file.save(buffer, {
      contentType: 'application/pdf',
      metadata: {
        cacheControl: 'private, max-age=0, no-transform',
      },
    });

    const [signedUrl] = await file.getSignedUrl({
      action: 'read',
      expires: Date.now() + 1000 * 60 * 60 * 24 * 7,
    });

    const now = new Date();
    await db.collection('saved_reports').doc(reportId).set({
      id: reportId,
      userId: authUser.uid,
      repositoryId,
      scanSessionId: scans[0]?.id || '',
      title,
      type,
      storageUrl: signedUrl,
      storagePath: filePath,
      findings: {
        total: totals.vulnerabilities,
        critical: totals.critical,
        high: totals.high,
        medium: vulnerabilities.filter((v) => v.severity === 'medium').length,
        low: vulnerabilities.filter((v) => v.severity === 'low').length,
        info: vulnerabilities.filter((v) => v.severity === 'info').length,
        exploitable: totals.exploitable,
        falsePositives: vulnerabilities.filter((v) => v.isFalsePositive).length,
      },
      generatedAt: now,
      fileSize: buffer.byteLength,
    });

    await db.collection('notifications').doc(`${reportId}_notification`).set({
      id: `${reportId}_notification`,
      userId: authUser.uid,
      type: 'system',
      title: 'Report generated',
      message: `${title} is ready to download.`,
      read: false,
      actionUrl: '/dashboard/reports',
      metadata: { reportId, storagePath: filePath },
      createdAt: now,
    });

    return NextResponse.json({ success: true, reportId, storageUrl: signedUrl });
  } catch (error) {
    console.error('Report generation error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to generate report' },
      { status: error instanceof Error && error.message.includes('authorization') ? 401 : 500 }
    );
  }
}

function ReportDocument(props: {
  title: string;
  type: string;
  generatedAt: Date;
  totals: Record<string, number>;
  repositories: Record<string, unknown>[];
  vulnerabilities: Record<string, unknown>[];
  riskScores: Record<string, unknown>[];
}) {
  const { title, generatedAt, totals, repositories, vulnerabilities, riskScores } = props;
  return React.createElement(Document, null,
    React.createElement(Page, { size: 'A4', style: styles.page },
      React.createElement(Text, { style: styles.title }, 'SAKSHAM'),
      React.createElement(Text, { style: styles.subtitle }, `${title} • Generated ${generatedAt.toLocaleString()}`),
      React.createElement(View, { style: styles.section },
        React.createElement(Text, { style: styles.heading }, 'Executive Summary'),
        React.createElement(View, { style: styles.row },
          metric('Repositories', totals.repositories),
          metric('Scans', totals.scans),
          metric('Findings', totals.vulnerabilities),
          metric('Security Score', `${totals.averageScore}/100`)
        ),
        React.createElement(View, { style: styles.row },
          metric('Critical', totals.critical),
          metric('High', totals.high),
          metric('Exploitable', totals.exploitable),
          metric('Generated', generatedAt.toLocaleDateString())
        )
      ),
      React.createElement(View, { style: styles.section },
        React.createElement(Text, { style: styles.heading }, 'Repository Health'),
        repositories.length === 0
          ? React.createElement(Text, { style: styles.muted }, 'No repositories available.')
          : repositories.slice(0, 10).map((repo) => React.createElement(Text, { key: String(repo.id), style: styles.muted },
              `${repo.fullName || repo.name}: score ${repo.securityScore ?? 0}/100, findings ${repo.totalVulnerabilities ?? 0}`
            ))
      ),
      React.createElement(View, { style: styles.section },
        React.createElement(Text, { style: styles.heading }, 'Top Findings'),
        vulnerabilities.length === 0
          ? React.createElement(Text, { style: styles.muted }, 'No vulnerabilities detected.')
          : vulnerabilities.map((vuln) => React.createElement(View, { key: String(vuln.id), style: styles.finding },
              React.createElement(Text, null, `${String(vuln.severity || 'info').toUpperCase()} — ${vuln.title || 'Finding'}`),
              React.createElement(Text, { style: styles.muted }, `${vuln.filePath || 'unknown'}:${vuln.lineStart || 1}`),
              React.createElement(Text, { style: styles.muted }, String(vuln.description || ''))
            ))
      ),
      React.createElement(View, { style: styles.section },
        React.createElement(Text, { style: styles.heading }, 'Risk Scores'),
        riskScores.length === 0
          ? React.createElement(Text, { style: styles.muted }, 'No risk scores available.')
          : riskScores.map((risk) => React.createElement(Text, { key: String(risk.id), style: styles.muted },
              `Overall ${risk.overallScore ?? 0}/100 • Exploitability ${risk.exploitabilityScore ?? 0}/100 • Business impact ${risk.businessImpactScore ?? 0}/100`
            ))
      )
    )
  );
}

function metric(label: string, value: string | number) {
  return React.createElement(View, { style: styles.card },
    React.createElement(Text, { style: styles.label }, label),
    React.createElement(Text, { style: styles.value }, String(value))
  );
}

function typeLabel(type: unknown) {
  const labels: Record<string, string> = {
    full: 'Full Security Assessment',
    executive: 'Executive Summary',
    remediation: 'Remediation Plan',
    compliance: 'Compliance Audit',
  };
  return labels[String(type)] || 'Security Report';
}
