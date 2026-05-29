// ============================================================
// SAKSHAM — Scan API Route
// Runs and persists the multi-agent repository security pipeline
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { OrchestratorAgent, type AgentContext, type AgentResult } from '@/lib/agents/orchestrator';
import { FieldValue, getAdminDb, isFirebaseAdminConfigured, verifyRequestUser } from '@/lib/firebase/admin';
import type { AgentType, Confidence, ExploitabilityLevel, Severity, VulnerabilityCategory } from '@/types';

export const maxDuration = 60;

interface GitHubTreeItem {
  path: string;
  type: string;
}

interface ParsedRepository {
  owner: string;
  name: string;
  fullName: string;
}

interface VulnerabilityDraft {
  title?: string;
  category?: string;
  severity?: string;
  confidence?: string;
  filePath?: string;
  lineStart?: number;
  lineEnd?: number;
  codeSnippet?: string;
  description?: string;
  attackVector?: string;
  impact?: string;
  exploitability?: string;
  exploitScenario?: string;
  isExploitable?: boolean;
  cveIds?: string[];
  cweIds?: string[];
  activelyExploited?: boolean;
  cisaKev?: boolean;
  mitreAttackIds?: string[];
  exploitDbIds?: string[];
  knownPoCs?: string[];
  packageName?: string;
  currentVersion?: string;
  safeVersion?: string;
  cvssScore?: number;
}

interface RemediationDraft {
  vulnerabilityTitle?: string;
  explanation?: string;
  patchDiff?: string;
  patchedCode?: string;
  originalCode?: string;
  filePath?: string;
  guidance?: string[];
  references?: string[];
  estimatedEffort?: string;
  breakingChange?: boolean;
}

interface RiskScoreDraft {
  overallScore?: number;
  exploitabilityScore?: number;
  reachabilityScore?: number;
  activeExploitationScore?: number;
  businessImpactScore?: number;
  breakdown?: {
    codeQuality?: number;
    dependencyRisk?: number;
    configurationRisk?: number;
    authenticationRisk?: number;
    dataExposureRisk?: number;
  };
  trend?: string;
  summary?: string;
  topRecommendations?: string[];
}

const severityRank: Record<Severity, number> = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
  info: 0,
};

const categories: VulnerabilityCategory[] = [
  'sql_injection',
  'xss',
  'ssrf',
  'rce',
  'path_traversal',
  'auth_bypass',
  'insecure_crypto',
  'command_injection',
  'hardcoded_secrets',
  'insecure_jwt',
  'insecure_deserialization',
  'open_redirect',
  'idor',
  'xxe',
  'csrf',
  'dependency_vuln',
  'misconfiguration',
  'information_disclosure',
  'other',
];

export async function POST(request: NextRequest) {
  if (!isFirebaseAdminConfigured) {
    return NextResponse.json(
      { success: false, error: 'Firebase Admin is not configured, so scans cannot be persisted.' },
      { status: 503 }
    );
  }

  let scanDb: ReturnType<typeof getAdminDb> | null = null;
  let scanSessionId = '';

  try {
    const db = getAdminDb();
    scanDb = db;
    const authUser = await verifyRequestUser(request);
    const body = await request.json();
    const {
      repositoryUrl,
      branch = 'main',
      depth = 'standard',
      scanSessionId: requestedScanId,
    } = body;

    if (!repositoryUrl || typeof repositoryUrl !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Repository URL is required' },
        { status: 400 }
      );
    }

    const repository = parseGitHubRepository(repositoryUrl);
    if (!repository) {
      return NextResponse.json(
        { success: false, error: 'Invalid GitHub repository URL' },
        { status: 400 }
      );
    }

    scanSessionId = typeof requestedScanId === 'string' && requestedScanId
      ? requestedScanId
      : db.collection('scan_sessions').doc().id;
    const repositoryId = `${authUser.uid}_${repository.owner}_${repository.name}`.replace(/[^a-zA-Z0-9_-]/g, '_');
    const startedAt = new Date();

    await db.collection('scan_sessions').doc(scanSessionId).set({
      id: scanSessionId,
      repositoryId,
      userId: authUser.uid,
      status: 'initializing',
      depth,
      branch,
      progress: 2,
      agentsActive: ['orchestrator'],
      agentsCompleted: [],
      findings: emptyFindings(),
      startedAt,
      createdAt: startedAt,
    });

    const fileContents = await fetchRepositoryFiles(repository, branch, depth);
    const language = detectLanguage(fileContents);
    const framework = detectFramework(fileContents);

    await db.collection('repositories').doc(repositoryId).set({
      id: repositoryId,
      userId: authUser.uid,
      name: repository.name,
      fullName: repository.fullName,
      url: `https://github.com/${repository.fullName}`,
      cloneUrl: `https://github.com/${repository.fullName}.git`,
      defaultBranch: branch,
      language,
      languages: detectLanguages(fileContents),
      framework: framework || null,
      description: '',
      isPrivate: false,
      securityScore: 0,
      lastScannedAt: startedAt,
      totalVulnerabilities: 0,
      criticalCount: 0,
      highCount: 0,
      mediumCount: 0,
      lowCount: 0,
      status: 'scanning',
      createdAt: startedAt,
      updatedAt: startedAt,
    }, { merge: true });

    const context: AgentContext = {
      repositoryUrl,
      repositoryName: repository.fullName,
      language,
      framework,
      branch,
      fileContents,
      previousResults: [],
      scanSessionId,
      userId: authUser.uid,
    };

    const logs: Array<{ agent: string; message: string; level: string; timestamp: string }> = [];
    const writePromises: Promise<unknown>[] = [];
    const completedAgents = new Set<AgentType>();

    const orchestrator = new OrchestratorAgent(
      context,
      (agent, message, level = 'info') => {
        const timestamp = new Date();
        logs.push({ agent, message, level, timestamp: timestamp.toISOString() });
        const agentType = agentNameToType(agent);
        if (message.toLowerCase().includes('completed')) {
          completedAgents.add(agentType);
        }

        writePromises.push(
          db.collection('agent_logs').add({
            scanSessionId,
            userId: authUser.uid,
            agentType,
            status: level === 'error' ? 'error' : message.toLowerCase().includes('starting') ? 'running' : 'completed',
            message,
            level,
            timestamp,
          })
        );
      },
      (progress) => {
        writePromises.push(
          db.collection('scan_sessions').doc(scanSessionId).set({
            progress,
            status: progress >= 95 ? 'validating' : 'scanning',
            agentsCompleted: Array.from(completedAgents),
          }, { merge: true })
        );
      }
    );

    const results = await orchestrator.execute();
    const persistence = await persistScanResults({
      db,
      results,
      authUserId: authUser.uid,
      repositoryId,
      repository,
      scanSessionId,
      depth,
      branch,
      language,
      framework,
      repositoryUrl,
      startedAt,
      filesAnalyzed: Object.keys(fileContents).length,
    });

    await Promise.allSettled(writePromises);

    return NextResponse.json({
      success: true,
      data: {
        scanSessionId,
        repositoryId,
        results,
        logs,
        progress: 100,
        filesAnalyzed: Object.keys(fileContents).length,
        repositoryName: repository.fullName,
        language,
        persisted: persistence,
      },
    });
  } catch (error) {
    console.error('Scan error:', error);
    if (scanSessionId && scanDb) {
      try {
        await scanDb.collection('scan_sessions').doc(scanSessionId).set({
          status: 'failed',
          error: error instanceof Error ? error.message : 'Internal server error',
          completedAt: new Date(),
          updatedAt: new Date(),
        }, { merge: true });
      } catch (persistenceError) {
        console.error('Failed to persist scan failure:', persistenceError);
      }
    }

    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Internal server error' },
      { status: error instanceof Error && error.message.includes('authorization') ? 401 : 500 }
    );
  }
}

async function fetchRepositoryFiles(repository: ParsedRepository, branch: string, depth: string) {
  const fileContents: Record<string, string> = {};
  const repoName = repository.name.replace('.git', '');
  const headers = {
    Accept: 'application/vnd.github.v3+json',
    ...(process.env.GITHUB_TOKEN ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` } : {}),
  };

  const treeResponse = await fetch(
    `https://api.github.com/repos/${repository.owner}/${repoName}/git/trees/${branch}?recursive=1`,
    { headers }
  );

  if (!treeResponse.ok) {
    throw new Error(`GitHub API error: ${treeResponse.status}`);
  }

  const treeData = await treeResponse.json();
  const limit = depth === 'deep' ? 60 : depth === 'standard' ? 35 : 18;
  const codeFiles = ((treeData.tree as GitHubTreeItem[] | undefined) ?? [])
    .filter((f) => {
      if (f.type !== 'blob') return false;
      const ext = f.path.split('.').pop()?.toLowerCase();
      const filename = f.path.split('/').pop()?.toLowerCase() || '';
      return ['ts', 'tsx', 'js', 'jsx', 'py', 'java', 'go', 'rb', 'rs', 'php', 'cs', 'json', 'yaml', 'yml', 'toml', 'xml', 'env', 'md', 'txt'].includes(ext || '') || filename.includes('.env');
    })
    .filter((f) => !f.path.includes('node_modules/') && !f.path.includes('dist/') && !f.path.includes('build/'))
    .slice(0, limit);

  await Promise.all(codeFiles.map(async (file) => {
    const contentResponse = await fetch(
      `https://api.github.com/repos/${repository.owner}/${repoName}/contents/${file.path}?ref=${branch}`,
      { headers }
    );

    if (contentResponse.ok) {
      const contentData = await contentResponse.json();
      if (contentData.content && contentData.encoding === 'base64') {
        fileContents[file.path] = Buffer.from(contentData.content, 'base64').toString('utf-8');
      }
    }
  }));

  return fileContents;
}

async function persistScanResults(input: {
  db: ReturnType<typeof getAdminDb>;
  results: AgentResult[];
  authUserId: string;
  repositoryId: string;
  repository: ParsedRepository;
  scanSessionId: string;
  depth: string;
  branch: string;
  language: string;
  framework?: string;
  repositoryUrl: string;
  startedAt: Date;
  filesAnalyzed: number;
}) {
  const {
    db,
    results,
    authUserId,
    repositoryId,
    repository,
    scanSessionId,
    depth,
    branch,
    language,
    framework,
    repositoryUrl,
    startedAt,
    filesAnalyzed,
  } = input;

  const completedAt = new Date();
  const vulnerabilities = normalizeVulnerabilities(results);
  const findings = summarizeFindings(vulnerabilities);
  const securityScore = computeSecurityScore(findings);
  const riskScore = normalizeRiskScore(results);
  const batch = db.batch();
  const vulnIdByTitle = new Map<string, string>();

  vulnerabilities.forEach((vuln, index) => {
    const id = `${scanSessionId}_vuln_${index + 1}`;
    vulnIdByTitle.set((vuln.title || '').toLowerCase(), id);
    batch.set(db.collection('vulnerabilities').doc(id), {
      id,
      scanSessionId,
      repositoryId,
      userId: authUserId,
      title: safeString(vuln.title, 'Security finding'),
      description: safeString(vuln.description, 'No description provided.'),
      category: toCategory(vuln.category),
      severity: toSeverity(vuln.severity),
      confidence: toConfidence(vuln.confidence),
      exploitability: toExploitability(vuln.exploitability),
      cvssScore: typeof vuln.cvssScore === 'number' ? vuln.cvssScore : null,
      cveIds: Array.isArray(vuln.cveIds) ? vuln.cveIds : [],
      cweIds: Array.isArray(vuln.cweIds) ? vuln.cweIds : [],
      filePath: safeString(vuln.filePath, vuln.packageName ? 'package manifest' : 'unknown'),
      lineStart: Number(vuln.lineStart || 1),
      lineEnd: Number(vuln.lineEnd || vuln.lineStart || 1),
      codeSnippet: safeString(vuln.codeSnippet, ''),
      attackVector: safeString(vuln.attackVector, ''),
      impact: safeString(vuln.impact, ''),
      exploitScenario: safeString(vuln.exploitScenario, ''),
      isExploitable: vuln.isExploitable !== false,
      isFalsePositive: vuln.isExploitable === false,
      threatIntelligence: {
        activelyExploited: vuln.activelyExploited === true,
        cisaKev: vuln.cisaKev === true,
        mitreAttackIds: Array.isArray(vuln.mitreAttackIds) ? vuln.mitreAttackIds : [],
        exploitDbIds: Array.isArray(vuln.exploitDbIds) ? vuln.exploitDbIds : [],
        knownPoCs: Array.isArray(vuln.knownPoCs) ? vuln.knownPoCs : [],
      },
      detectedBy: toCategory(vuln.category) === 'dependency_vuln' ? 'dependency_security' : 'static_analysis',
      validatedBy: 'exploitability_validation',
      createdAt: completedAt,
      updatedAt: completedAt,
    });
  });

  normalizeRemediations(results).forEach((remediation, index) => {
    const vulnTitle = safeString(remediation.vulnerabilityTitle, '');
    const vulnerabilityId = vulnIdByTitle.get(vulnTitle.toLowerCase()) || `${scanSessionId}_vuln_${index + 1}`;
    const id = `${scanSessionId}_rem_${index + 1}`;
    batch.set(db.collection('remediations').doc(id), {
      id,
      vulnerabilityId,
      repositoryId,
      userId: authUserId,
      title: vulnTitle || `Remediation ${index + 1}`,
      explanation: safeString(remediation.explanation, ''),
      patchDiff: safeString(remediation.patchDiff, ''),
      patchedCode: safeString(remediation.patchedCode, ''),
      originalCode: safeString(remediation.originalCode, ''),
      filePath: safeString(remediation.filePath, ''),
      guidance: Array.isArray(remediation.guidance) ? remediation.guidance : [],
      references: Array.isArray(remediation.references) ? remediation.references : [],
      estimatedEffort: toEffort(remediation.estimatedEffort),
      breakingChange: remediation.breakingChange === true,
      generatedBy: 'remediation',
      status: 'pending',
      createdAt: completedAt,
    });
  });

  batch.set(db.collection('risk_scores').doc(`${scanSessionId}_risk`), {
    id: `${scanSessionId}_risk`,
    userId: authUserId,
    repositoryId,
    scanSessionId,
    overallScore: securityScore,
    exploitabilityScore: numberOrDefault(riskScore.exploitabilityScore, 100 - findings.exploitable * 12),
    reachabilityScore: numberOrDefault(riskScore.reachabilityScore, 75),
    activeExploitationScore: numberOrDefault(riskScore.activeExploitationScore, 100 - vulnerabilities.filter((v) => v.activelyExploited).length * 25),
    businessImpactScore: numberOrDefault(riskScore.businessImpactScore, 70),
    breakdown: {
      codeQuality: numberOrDefault(riskScore.breakdown?.codeQuality, securityScore),
      dependencyRisk: numberOrDefault(riskScore.breakdown?.dependencyRisk, securityScore),
      configurationRisk: numberOrDefault(riskScore.breakdown?.configurationRisk, securityScore),
      authenticationRisk: numberOrDefault(riskScore.breakdown?.authenticationRisk, securityScore),
      dataExposureRisk: numberOrDefault(riskScore.breakdown?.dataExposureRisk, securityScore),
    },
    trend: ['improving', 'stable', 'degrading'].includes(String(riskScore.trend)) ? riskScore.trend : 'stable',
    calculatedAt: completedAt,
  });

  const attackGraph = buildAttackGraph(vulnerabilities, repositoryId, scanSessionId, authUserId, completedAt);
  if (attackGraph) {
    batch.set(db.collection('attack_graphs').doc(attackGraph.id), attackGraph);
  }

  const repoIntel = extractRepositoryIntelligence(results);
  batch.set(db.collection('repository_memory').doc(repositoryId), {
    id: repositoryId,
    repositoryId,
    userId: authUserId,
    architecture: safeString(repoIntel.architecture, `${repository.fullName} uses ${language}${framework ? ` with ${framework}` : ''}.`),
    frameworks: Array.isArray(repoIntel.frameworks) ? repoIntel.frameworks : framework ? [framework] : [],
    entryPoints: Array.isArray(repoIntel.entryPoints) ? repoIntel.entryPoints : [],
    authPatterns: Array.isArray(repoIntel.authPatterns) ? repoIntel.authPatterns : [],
    dataFlows: Array.isArray(repoIntel.dataFlows) ? repoIntel.dataFlows : [],
    envVariables: Array.isArray(repoIntel.envVariables) ? repoIntel.envVariables : [],
    setupInstructions: safeString(repoIntel.setupInstructions, ''),
    knownIssues: vulnerabilities.slice(0, 10).map((v) => safeString(v.title, 'Security finding')),
    scanHistory: FieldValue.arrayUnion({
      scanSessionId,
      date: completedAt,
      findingsCount: findings.total,
      criticalCount: findings.critical,
      resolvedCount: 0,
    }),
    lastAnalyzedAt: completedAt,
    createdAt: startedAt,
    updatedAt: completedAt,
  }, { merge: true });

  batch.set(db.collection('scan_sessions').doc(scanSessionId), {
    id: scanSessionId,
    repositoryId,
    userId: authUserId,
    status: 'completed',
    depth,
    branch,
    progress: 100,
    agentsActive: [],
    agentsCompleted: results.map((r) => r.agentType),
    findings,
    startedAt,
    completedAt,
    duration: Math.round((completedAt.getTime() - startedAt.getTime()) / 1000),
    createdAt: startedAt,
    updatedAt: completedAt,
  }, { merge: true });

  batch.set(db.collection('repositories').doc(repositoryId), {
    securityScore,
    lastScannedAt: completedAt,
    totalVulnerabilities: findings.total,
    criticalCount: findings.critical,
    highCount: findings.high,
    mediumCount: findings.medium,
    lowCount: findings.low,
    status: 'active',
    updatedAt: completedAt,
  }, { merge: true });

  batch.set(db.collection('notifications').doc(`${scanSessionId}_complete`), {
    id: `${scanSessionId}_complete`,
    userId: authUserId,
    type: findings.critical > 0 ? 'critical_threat' : 'scan_complete',
    title: findings.critical > 0 ? `Critical findings in ${repository.name}` : `Scan complete — ${repository.name}`,
    message: `${findings.total} findings detected across ${filesAnalyzed} files. Security score: ${securityScore}/100.`,
    read: false,
    actionUrl: '/dashboard/vulnerabilities',
    metadata: { scanSessionId, repositoryId, repositoryUrl },
    createdAt: completedAt,
  });

  await batch.commit();

  return {
    vulnerabilities: vulnerabilities.length,
    remediations: normalizeRemediations(results).length,
    attackGraph: Boolean(attackGraph),
    securityScore,
  };
}

function normalizeVulnerabilities(results: AgentResult[]) {
  const sources = ['enrichedVulnerabilities', 'validatedVulnerabilities', 'vulnerabilities'];
  const seen = new Map<string, VulnerabilityDraft>();

  // Process from oldest to newest so newer agents overwrite/enrich older findings
  for (const result of results) {
    if (!result.data || typeof result.data !== 'object') continue;
    const data = result.data as Record<string, unknown>;
    
    let foundArray: VulnerabilityDraft[] | undefined;
    for (const key of sources) {
      if (Array.isArray(data[key])) {
        foundArray = data[key] as VulnerabilityDraft[];
        break;
      }
    }
    
    if (foundArray) {
      for (const draft of foundArray) {
        // Use a loose key for deduplication to prevent near-duplicates
        const titleMatch = safeString(draft.title, '').toLowerCase().replace(/[^a-z0-9]/g, '');
        const fileMatch = safeString(draft.filePath, '').toLowerCase();
        const pkgMatch = safeString(draft.packageName, '').toLowerCase();
        
        // Key: file/pkg + first 20 chars of title to catch slight variations
        const key = `${fileMatch}|${pkgMatch}|${titleMatch.substring(0, 20)}`;
        
        if (key === '||') continue;
        
        const existing = seen.get(key) || {};
        
        // Merge, preferring truthy new values
        const merged: any = { ...existing };
        for (const [k, v] of Object.entries(draft)) {
          if (v !== undefined && v !== null && v !== '') {
             merged[k] = v;
          }
        }
        seen.set(key, merged);
      }
    }
  }

  return Array.from(seen.values()).filter(d => Boolean(d.title || d.description || d.packageName));
}

function normalizeRemediations(results: AgentResult[]) {
  const remediationResult = [...results].reverse().find((result) => {
    const data = result.data as Record<string, unknown> | null;
    return data && Array.isArray(data.remediations);
  });
  const data = remediationResult?.data as Record<string, unknown> | undefined;
  return Array.isArray(data?.remediations) ? data.remediations as RemediationDraft[] : [];
}

function normalizeRiskScore(results: AgentResult[]): RiskScoreDraft {
  const riskResult = [...results].reverse().find((result) => {
    const data = result.data as Record<string, unknown> | null;
    return data && typeof data.riskScore === 'object';
  });
  const data = riskResult?.data as Record<string, unknown> | undefined;
  return (data?.riskScore || {}) as RiskScoreDraft;
}

function extractRepositoryIntelligence(results: AgentResult[]) {
  const repoResult = results.find((result) => result.agentType === 'repository_intelligence');
  const data = repoResult?.data as Record<string, unknown> | undefined;
  return (data?.repositoryIntelligence || {}) as Record<string, unknown>;
}

function buildAttackGraph(
  vulnerabilities: VulnerabilityDraft[],
  repositoryId: string,
  scanSessionId: string,
  userId: string,
  createdAt: Date
) {
  const exploitable = vulnerabilities
    .filter((v) => v.isExploitable !== false)
    .sort((a, b) => severityRank[toSeverity(b.severity)] - severityRank[toSeverity(a.severity)])[0];

  if (!exploitable) return null;

  const severity = toSeverity(exploitable.severity);
  return {
    id: `${scanSessionId}_attack_graph_1`,
    userId,
    repositoryId,
    scanSessionId,
    title: `${safeString(exploitable.title, 'Finding')} attack chain`,
    riskLevel: severity,
    description: safeString(exploitable.exploitScenario || exploitable.attackVector, 'Potential exploit path generated from scan findings.'),
    nodes: [
      { id: 'entry', label: 'User-controlled input', type: 'entry_point', metadata: { filePath: exploitable.filePath } },
      { id: 'vuln', label: safeString(exploitable.title, 'Vulnerability'), type: 'vulnerability', severity, metadata: { category: exploitable.category } },
      { id: 'asset', label: safeString(exploitable.filePath, 'Application asset'), type: 'asset', metadata: { repositoryId } },
      { id: 'impact', label: safeString(exploitable.impact, 'Security impact'), type: 'impact', severity },
    ],
    edges: [
      { id: 'edge-1', source: 'entry', target: 'vuln', label: 'reaches vulnerable code', exploitability: toExploitability(exploitable.exploitability) },
      { id: 'edge-2', source: 'vuln', target: 'asset', label: 'compromises asset', exploitability: toExploitability(exploitable.exploitability) },
      { id: 'edge-3', source: 'asset', target: 'impact', label: 'causes impact', exploitability: toExploitability(exploitable.exploitability) },
    ],
    createdAt,
  };
}

function parseGitHubRepository(url: string): ParsedRepository | null {
  const match = url.match(/github\.com\/([^/]+)\/([^/#?]+)/);
  if (!match) return null;
  const owner = match[1];
  const name = match[2].replace('.git', '');
  return { owner, name, fullName: `${owner}/${name}` };
}

function detectLanguage(files: Record<string, string>): string {
  const languages = detectLanguages(files);
  const top = Object.entries(languages).sort((a, b) => b[1] - a[1])[0]?.[0];
  return top || 'Unknown';
}

function detectLanguages(files: Record<string, string>) {
  const counts: Record<string, number> = {};
  for (const [path, content] of Object.entries(files)) {
    const ext = path.split('.').pop()?.toLowerCase() || '';
    const language = {
      ts: 'TypeScript', tsx: 'TypeScript', js: 'JavaScript', jsx: 'JavaScript',
      py: 'Python', java: 'Java', go: 'Go', rb: 'Ruby', rs: 'Rust',
      php: 'PHP', cs: 'C#', cpp: 'C++', c: 'C', swift: 'Swift', kt: 'Kotlin',
      yml: 'YAML', yaml: 'YAML', json: 'JSON',
    }[ext];
    if (language) counts[language] = (counts[language] || 0) + content.length;
  }
  return counts;
}

function detectFramework(files: Record<string, string>) {
  const packageJson = files['package.json'];
  if (packageJson) {
    try {
      const pkg = JSON.parse(packageJson);
      const deps = { ...pkg.dependencies, ...pkg.devDependencies };
      if (deps.next) return 'Next.js';
      if (deps.react) return 'React';
      if (deps.express) return 'Express.js';
      if (deps.fastify) return 'Fastify';
      if (deps.vue) return 'Vue';
      if (deps.angular || deps['@angular/core']) return 'Angular';
    } catch {}
  }
  if (files['requirements.txt']?.includes('django')) return 'Django';
  if (files['requirements.txt']?.includes('flask')) return 'Flask';
  if (files['go.mod']) return 'Go module';
  return undefined;
}

function emptyFindings() {
  return { total: 0, critical: 0, high: 0, medium: 0, low: 0, info: 0, exploitable: 0, falsePositives: 0 };
}

function summarizeFindings(vulnerabilities: VulnerabilityDraft[]) {
  const findings = emptyFindings();
  for (const vuln of vulnerabilities) {
    const severity = toSeverity(vuln.severity);
    findings.total += 1;
    findings[severity] += 1;
    if (vuln.isExploitable !== false) findings.exploitable += 1;
    if (vuln.isExploitable === false) findings.falsePositives += 1;
  }
  return findings;
}

function computeSecurityScore(findings: ReturnType<typeof emptyFindings>) {
  const penalty =
    findings.critical * 18 +
    findings.high * 11 +
    findings.medium * 6 +
    findings.low * 2 +
    findings.exploitable * 4;
  return Math.max(0, Math.min(100, 100 - penalty));
}

function safeString(value: unknown, fallback: string) {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

function toSeverity(value: unknown): Severity {
  return ['critical', 'high', 'medium', 'low', 'info'].includes(String(value)) ? value as Severity : 'info';
}

function toConfidence(value: unknown): Confidence {
  return ['high', 'medium', 'low'].includes(String(value)) ? value as Confidence : 'medium';
}

function toExploitability(value: unknown): ExploitabilityLevel {
  return ['confirmed', 'likely', 'possible', 'unlikely'].includes(String(value)) ? value as ExploitabilityLevel : 'possible';
}

function toCategory(value: unknown): VulnerabilityCategory {
  return categories.includes(value as VulnerabilityCategory) ? value as VulnerabilityCategory : 'other';
}

function toEffort(value: unknown) {
  return ['trivial', 'low', 'medium', 'high'].includes(String(value)) ? value : 'medium';
}

function numberOrDefault(value: unknown, fallback: number) {
  return typeof value === 'number' && Number.isFinite(value)
    ? Math.max(0, Math.min(100, Math.round(value)))
    : Math.max(0, Math.min(100, Math.round(fallback)));
}

function agentNameToType(agent: string): AgentType {
  const key = agent.toLowerCase();
  if (key.includes('static')) return 'static_analysis';
  if (key.includes('dependency')) return 'dependency_security';
  if (key.includes('exploit')) return 'exploitability_validation';
  if (key.includes('threat')) return 'threat_intelligence';
  if (key.includes('risk')) return 'risk_scoring';
  if (key.includes('remediation')) return 'remediation';
  if (key.includes('repo')) return 'repository_intelligence';
  return 'orchestrator';
}
