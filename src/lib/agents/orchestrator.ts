// ============================================================
// SAKSHAM — AI Agent Orchestrator
// Coordinates all agents in the multi-agent pipeline
// ============================================================

import { GoogleGenerativeAI } from '@google/generative-ai';
import { InferenceClient } from '@huggingface/inference';
import type { AgentType, Vulnerability } from '@/types';

// ============================================================
// AI CLIENTS
// ============================================================

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY || '');
const aiProvider = (process.env.AI_PROVIDER || 'auto').toLowerCase();
const defaultGeminiModel = process.env.GEMINI_MODEL || 'gemini-2.0-flash';
const huggingFaceToken = process.env.HUGGINGFACE_API_TOKEN || '';
const huggingFaceModel = process.env.HUGGINGFACE_MODEL || 'Qwen/Qwen3-32B';
type HuggingFaceChatArgs = Parameters<InferenceClient['chatCompletion']>[0];
const huggingFaceProvider = (process.env.HUGGINGFACE_PROVIDER || 'auto') as HuggingFaceChatArgs['provider'];
const huggingFaceClient = huggingFaceToken ? new InferenceClient(huggingFaceToken) : null;

export function getGeminiModel(modelName: string = defaultGeminiModel) {
  return genAI.getGenerativeModel({ model: modelName });
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

async function callHuggingFace(prompt: string, systemInstruction?: string) {
  if (!huggingFaceClient) {
    throw new Error('HUGGINGFACE_API_TOKEN is not configured.');
  }

  const result = await huggingFaceClient.chatCompletion({
    model: huggingFaceModel,
    provider: huggingFaceProvider,
    messages: [
      ...(systemInstruction ? [{ role: 'system', content: systemInstruction }] : []),
      { role: 'user', content: prompt },
    ],
    temperature: 0.1,
    max_tokens: 2048,
  });

  const content = result.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error('Hugging Face returned an empty response.');
  }

  return content;
}

export async function generateAiText(prompt: string, systemInstruction?: string) {
  if (process.env.GOOGLE_GEMINI_API_KEY && aiProvider !== 'huggingface') {
    try {
      const model = getGeminiModel();
      const result = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        systemInstruction,
      });

      return result.response.text();
    } catch (error) {
      if (!huggingFaceClient) throw error;
      console.warn(`Gemini failed, falling back to Hugging Face: ${errorMessage(error)}`);
    }
  }

  return callHuggingFace(prompt, systemInstruction);
}

// ============================================================
// AGENT BASE CLASS
// ============================================================

export interface AgentResult {
  agentType: AgentType;
  success: boolean;
  data: unknown;
  reasoning: string;
  duration: number;
  tokensUsed?: number;
}

export interface AgentContext {
  repositoryUrl: string;
  repositoryName: string;
  language: string;
  framework?: string;
  branch: string;
  fileContents: Record<string, string>;
  previousResults: AgentResult[];
  scanSessionId: string;
  userId: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

interface DependencyCandidate {
  ecosystem: 'npm' | 'PyPI';
  name: string;
  version: string;
  filePath: string;
}

interface OsvVulnerability {
  id: string;
  aliases?: string[];
  summary?: string;
  details?: string;
  severity?: Array<{ type: string; score: string }>;
  database_specific?: { severity?: string };
  references?: Array<{ type: string; url: string }>;
}

function cleanVersion(version: string) {
  return version.replace(/^[~^<>=\s]+/, '').split(' ')[0].trim();
}

function extractDependencyCandidates(files: Record<string, string>): DependencyCandidate[] {
  const candidates: DependencyCandidate[] = [];
  const packageJson = files['package.json'];

  if (packageJson) {
    try {
      const pkg = JSON.parse(packageJson) as {
        dependencies?: Record<string, string>;
        devDependencies?: Record<string, string>;
      };
      const deps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };
      Object.entries(deps).forEach(([name, version]) => {
        const cleaned = cleanVersion(version);
        if (cleaned) candidates.push({ ecosystem: 'npm', name, version: cleaned, filePath: 'package.json' });
      });
    } catch {
      // Ignore malformed package files. Gemini analysis still receives the raw file.
    }
  }

  const requirements = files['requirements.txt'];
  if (requirements) {
    requirements.split('\n').forEach((line) => {
      const match = line.trim().match(/^([A-Za-z0-9_.-]+)==([A-Za-z0-9_.-]+)/);
      if (match) {
        candidates.push({ ecosystem: 'PyPI', name: match[1], version: match[2], filePath: 'requirements.txt' });
      }
    });
  }

  return candidates.slice(0, 30);
}

async function queryOsv(candidate: DependencyCandidate) {
  const response = await fetch('https://api.osv.dev/v1/query', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      version: candidate.version,
      package: {
        name: candidate.name,
        ecosystem: candidate.ecosystem,
      },
    }),
  });

  if (!response.ok) return [];
  const data = await response.json() as { vulns?: OsvVulnerability[] };
  return data.vulns || [];
}

function severityFromOsv(vulnerability: OsvVulnerability): string {
  const severity = vulnerability.database_specific?.severity?.toLowerCase();
  if (severity && ['critical', 'high', 'medium', 'low'].includes(severity)) return severity;
  const score = vulnerability.severity?.[0]?.score || '';
  if (score.includes('CRITICAL')) return 'critical';
  if (score.includes('HIGH')) return 'high';
  if (score.includes('MEDIUM')) return 'medium';
  if (score.includes('LOW')) return 'low';
  return 'medium';
}

async function runOsvDependencyScan(files: Record<string, string>) {
  const candidates = extractDependencyCandidates(files);
  const findings: unknown[] = [];

  await Promise.all(candidates.map(async (candidate) => {
    try {
      const vulns = await queryOsv(candidate);
      vulns.slice(0, 5).forEach((vulnerability) => {
        const ids = [vulnerability.id, ...(vulnerability.aliases || [])].filter(Boolean);
        findings.push({
          title: `${candidate.name}@${candidate.version} is affected by ${vulnerability.id}`,
          packageName: candidate.name,
          currentVersion: candidate.version,
          safeVersion: 'See OSV affected ranges',
          category: 'dependency_vuln',
          severity: severityFromOsv(vulnerability),
          confidence: 'high',
          cveIds: ids.filter((id) => id.startsWith('CVE-')),
          cweIds: [],
          filePath: candidate.filePath,
          lineStart: 1,
          lineEnd: 1,
          description: vulnerability.summary || vulnerability.details || `OSV reports ${candidate.name} ${candidate.version} as vulnerable.`,
          impact: vulnerability.details || vulnerability.summary || 'Known vulnerable dependency.',
          attackVector: `Attackers may exploit vulnerable ${candidate.name} transitive or direct dependency paths.`,
          references: vulnerability.references?.map((ref) => ref.url) || [],
          source: 'OSV.dev',
        });
      });
    } catch {
      // Per-package network failures should not abort the scan.
    }
  }));

  return findings;
}

async function fetchCisaKevCves() {
  try {
    const response = await fetch('https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json', {
      next: { revalidate: 60 * 60 * 12 },
    });
    if (!response.ok) return new Set<string>();
    const data = await response.json() as { vulnerabilities?: Array<{ cveID?: string }> };
    return new Set((data.vulnerabilities || []).map((item) => item.cveID).filter(Boolean) as string[]);
  } catch {
    return new Set<string>();
  }
}

async function fetchNvdSeverity(cveId: string) {
  try {
    const response = await fetch(`https://services.nvd.nist.gov/rest/json/cves/2.0?cveId=${encodeURIComponent(cveId)}`, {
      headers: process.env.NVD_API_KEY ? { apiKey: process.env.NVD_API_KEY } : {},
      next: { revalidate: 60 * 60 * 12 },
    });
    if (!response.ok) return null;
    const data = await response.json() as {
      vulnerabilities?: Array<{
        cve?: {
          metrics?: {
            cvssMetricV31?: Array<{ cvssData?: { baseScore?: number; baseSeverity?: string } }>;
            cvssMetricV30?: Array<{ cvssData?: { baseScore?: number; baseSeverity?: string } }>;
          };
        };
      }>;
    };
    const metrics = data.vulnerabilities?.[0]?.cve?.metrics;
    const metric = metrics?.cvssMetricV31?.[0] || metrics?.cvssMetricV30?.[0];
    return {
      cvssScore: metric?.cvssData?.baseScore,
      severity: metric?.cvssData?.baseSeverity?.toLowerCase(),
    };
  } catch {
    return null;
  }
}

async function enrichWithThreatFeeds(vulnerabilities: unknown[]) {
  const cisaCves = await fetchCisaKevCves();
  const enriched = await Promise.all(vulnerabilities.map(async (item) => {
    if (!isRecord(item)) return item;
    const cveIds = Array.isArray(item.cveIds) ? item.cveIds.filter((id): id is string => typeof id === 'string') : [];
    const cisaKev = cveIds.some((id) => cisaCves.has(id));
    const nvd = cveIds[0] ? await fetchNvdSeverity(cveIds[0]) : null;
    return {
      ...item,
      severity: nvd?.severity || item.severity,
      cvssScore: nvd?.cvssScore || item.cvssScore,
      cisaKev: Boolean(item.cisaKev) || cisaKev,
      activelyExploited: Boolean(item.activelyExploited) || cisaKev,
      urgency: cisaKev ? 'immediate' : item.urgency || 'medium',
      knownPoCs: Array.isArray(item.knownPoCs) ? item.knownPoCs : [],
      mitreAttackIds: Array.isArray(item.mitreAttackIds) ? item.mitreAttackIds : [],
      exploitDbIds: Array.isArray(item.exploitDbIds) ? item.exploitDbIds : [],
      threatFeeds: ['CISA KEV', 'NVD'].filter((feed) => feed === 'CISA KEV' ? cisaKev : Boolean(nvd)),
    };
  }));
  return enriched;
}

function runSemgrepCompatibleRules(files: Record<string, string>) {
  const findings: Partial<Vulnerability>[] = [];
  const rules = [
    {
      id: 'saksham.hardcoded-secret',
      category: 'hardcoded_secrets',
      severity: 'critical',
      regex: /(aws_access_key_id|aws_secret_access_key|api[_-]?key|secret|token)\s*[:=]\s*['"][A-Za-z0-9/_+=.-]{16,}['"]/i,
      title: 'Hardcoded secret detected',
      impact: 'Credentials committed to source can be used for unauthorized access.',
      attackVector: 'An attacker with repository access can extract and reuse the secret.',
    },
    {
      id: 'saksham.javascript-eval',
      category: 'rce',
      severity: 'high',
      regex: /\beval\s*\(|new Function\s*\(/,
      title: 'Dynamic code execution sink detected',
      impact: 'User-controlled input reaching this sink can become remote code execution.',
      attackVector: 'An attacker can inject JavaScript that the application executes.',
    },
    {
      id: 'saksham.command-exec',
      category: 'command_injection',
      severity: 'high',
      regex: /\b(exec|spawn|execSync|spawnSync)\s*\(/,
      title: 'Command execution sink requires validation',
      impact: 'Unsanitized input can execute arbitrary shell commands.',
      attackVector: 'An attacker can influence command arguments or shell metacharacters.',
    },
    {
      id: 'saksham.react-dangerous-html',
      category: 'xss',
      severity: 'high',
      regex: /dangerouslySetInnerHTML/,
      title: 'Potential XSS through raw HTML rendering',
      impact: 'Untrusted HTML can execute script in a user browser.',
      attackVector: 'An attacker can inject HTML or script into rendered content.',
    },
  ];

  Object.entries(files).forEach(([filePath, content]) => {
    const lines = content.split('\n');
    lines.forEach((line, index) => {
      rules.forEach((rule) => {
        if (rule.regex.test(line)) {
          findings.push({
            title: rule.title,
            category: rule.category as Vulnerability['category'],
            severity: rule.severity as Vulnerability['severity'],
            confidence: 'medium',
            filePath,
            lineStart: index + 1,
            lineEnd: index + 1,
            codeSnippet: line.trim(),
            description: `${rule.title} matched static rule ${rule.id}.`,
            attackVector: rule.attackVector,
            impact: rule.impact,
            cweIds: [],
            cveIds: [],
          });
        }
      });
    });
  });

  return findings;
}

// ============================================================
// ORCHESTRATOR
// ============================================================

export class OrchestratorAgent {
  private agents: Map<AgentType, BaseAgent>;
  private context: AgentContext;
  private onLog: (agent: string, message: string, level?: string) => void;
  private onProgress: (progress: number) => void;

  constructor(
    context: AgentContext,
    onLog: (agent: string, message: string, level?: string) => void,
    onProgress: (progress: number) => void
  ) {
    this.context = context;
    this.onLog = onLog;
    this.onProgress = onProgress;
    this.agents = new Map();

    // Initialize all agents
    this.agents.set('static_analysis', new StaticAnalysisAgent());
    this.agents.set('dependency_security', new DependencySecurityAgent());
    this.agents.set('exploitability_validation', new ExploitabilityValidationAgent());
    this.agents.set('threat_intelligence', new ThreatIntelligenceAgent());
    this.agents.set('risk_scoring', new RiskScoringAgent());
    this.agents.set('remediation', new RemediationAgent());
    this.agents.set('repository_intelligence', new RepositoryIntelligenceAgent());
  }

  async execute(): Promise<AgentResult[]> {
    const results: AgentResult[] = [];
    this.onLog('Orchestrator', '🎯 Initializing multi-agent security pipeline...', 'info');
    this.onProgress(5);

    // Phase 1: Repository Intelligence (understand the codebase)
    this.onLog('Orchestrator', '📂 Phase 1: Understanding repository architecture...', 'info');
    const repoIntelResult = await this.runAgent('repository_intelligence', 10);
    results.push(repoIntelResult);
    this.onProgress(15);

    // Phase 2: Static Analysis + Dependency Security (parallel)
    this.onLog('Orchestrator', '🔍 Phase 2: Running static analysis and dependency checks...', 'info');
    const [staticResult, depResult] = await Promise.all([
      this.runAgent('static_analysis', 25),
      this.runAgent('dependency_security', 25),
    ]);
    results.push(staticResult, depResult);
    this.onProgress(45);

    // Phase 3: Exploitability Validation
    this.onLog('Orchestrator', '💀 Phase 3: Validating exploitability of findings...', 'info');
    const exploitResult = await this.runAgent('exploitability_validation', 55);
    results.push(exploitResult);
    this.onProgress(65);

    // Phase 4: Threat Intelligence Correlation
    this.onLog('Orchestrator', '🌐 Phase 4: Correlating threat intelligence...', 'info');
    const threatResult = await this.runAgent('threat_intelligence', 70);
    results.push(threatResult);
    this.onProgress(75);

    // Phase 5: Risk Scoring
    this.onLog('Orchestrator', '📊 Phase 5: Computing contextual risk scores...', 'info');
    const riskResult = await this.runAgent('risk_scoring', 80);
    results.push(riskResult);
    this.onProgress(85);

    // Phase 6: Remediation Generation
    this.onLog('Orchestrator', '🔧 Phase 6: Generating remediation patches...', 'info');
    const remediationResult = await this.runAgent('remediation', 90);
    results.push(remediationResult);
    this.onProgress(95);

    this.onLog('Orchestrator', '✅ Multi-agent pipeline complete. All findings aggregated.', 'info');
    this.onProgress(100);

    return results;
  }

  private async runAgent(agentType: AgentType, progressTarget: number): Promise<AgentResult> {
    const agent = this.agents.get(agentType);
    if (!agent) {
      throw new Error(`Agent ${agentType} not found`);
    }

    const startTime = Date.now();
    this.onLog(agent.name, `Starting ${agent.name}...`, 'info');

    try {
      const result = await agent.execute(this.context);
      const duration = Date.now() - startTime;

      this.context.previousResults.push(result);
      this.onLog(agent.name, `Completed in ${(duration / 1000).toFixed(1)}s`, 'info');
      this.onProgress(progressTarget);

      return { ...result, duration };
    } catch (error) {
      const duration = Date.now() - startTime;
      this.onLog(agent.name, `Error: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');

      return {
        agentType,
        success: false,
        data: null,
        reasoning: `Agent failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        duration,
      };
    }
  }
}

// ============================================================
// BASE AGENT
// ============================================================

abstract class BaseAgent {
  abstract type: AgentType;
  abstract name: string;
  abstract description: string;

  abstract execute(context: AgentContext): Promise<AgentResult>;

  protected async callGemini(prompt: string, systemInstruction?: string): Promise<string> {
    return generateAiText(prompt, systemInstruction);
  }
}

// ============================================================
// STATIC ANALYSIS AGENT
// ============================================================

class StaticAnalysisAgent extends BaseAgent {
  type: AgentType = 'static_analysis';
  name = 'Static Analysis';
  description = 'Scans source code for vulnerabilities using AI-powered pattern recognition';

  async execute(context: AgentContext): Promise<AgentResult> {
    const fileList = Object.keys(context.fileContents).join('\n');
    const codeSnippets = Object.entries(context.fileContents)
      .slice(0, 20)
      .map(([path, content]) => `--- ${path} ---\n${content.slice(0, 2000)}`)
      .join('\n\n');

    const prompt = `You are an expert static analysis security agent. Analyze the following source code files from a ${context.language} ${context.framework || ''} repository and identify security vulnerabilities.

Repository: ${context.repositoryName}
Files analyzed:
${fileList}

Source code:
${codeSnippets}

For each vulnerability found, provide a JSON array with objects containing:
- title: string (clear vulnerability title)
- category: string (sql_injection | xss | ssrf | rce | path_traversal | auth_bypass | insecure_crypto | command_injection | hardcoded_secrets | insecure_jwt | other)
- severity: string (critical | high | medium | low | info)
- confidence: string (high | medium | low)
- filePath: string
- lineStart: number
- lineEnd: number
- codeSnippet: string (the vulnerable code)
- description: string (detailed explanation)
- attackVector: string (how it can be exploited)
- impact: string (what damage it can cause)

Return ONLY a valid JSON array. If no vulnerabilities found, return [].`;

    const systemInstruction = `You are SAKSHAM's Static Analysis Agent, a world-class code security analyzer. You identify real, actionable security vulnerabilities in source code. Be thorough but avoid false positives. Focus on: SQL injection, XSS, SSRF, RCE, path traversal, auth bypass, insecure crypto, command injection, hardcoded secrets, and insecure JWT handling. Return results as a JSON array.`;

    const response = await this.callGemini(prompt, systemInstruction);

    const ruleFindings = runSemgrepCompatibleRules(context.fileContents);
    let aiVulnerabilities: Partial<Vulnerability>[] = [];
    try {
      const cleaned = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      aiVulnerabilities = JSON.parse(cleaned);
    } catch {
      aiVulnerabilities = [];
    }
    const vulnerabilities = [...ruleFindings, ...aiVulnerabilities];

    return {
      agentType: this.type,
      success: true,
      data: { vulnerabilities },
      reasoning: `Analyzed ${Object.keys(context.fileContents).length} files with Semgrep-compatible rules and AI reasoning. Found ${vulnerabilities.length} potential vulnerabilities.`,
      duration: 0,
    };
  }
}

// ============================================================
// DEPENDENCY SECURITY AGENT
// ============================================================

class DependencySecurityAgent extends BaseAgent {
  type: AgentType = 'dependency_security';
  name = 'Dependency Security';
  description = 'Analyzes dependencies for known vulnerabilities and CVEs';

  async execute(context: AgentContext): Promise<AgentResult> {
    const depFiles = Object.entries(context.fileContents)
      .filter(([path]) =>
        path.includes('package.json') ||
        path.includes('requirements.txt') ||
        path.includes('Gemfile') ||
        path.includes('pom.xml') ||
        path.includes('go.mod') ||
        path.includes('Cargo.toml')
      )
      .map(([path, content]) => `--- ${path} ---\n${content}`)
      .join('\n\n');

    if (!depFiles) {
      return {
        agentType: this.type,
        success: true,
        data: { vulnerabilities: [] },
        reasoning: 'No dependency files found in repository.',
        duration: 0,
      };
    }

    const osvVulnerabilities = await runOsvDependencyScan(context.fileContents);

    const prompt = `You are an expert dependency security analyzer. Analyze these dependency files and identify known vulnerable packages.

${depFiles}

For each vulnerable dependency, provide a JSON array with objects containing:
- title: string (e.g., "Vulnerable lodash version detected")
- packageName: string
- currentVersion: string
- safeVersion: string
- category: "dependency_vuln"
- severity: string (critical | high | medium | low)
- confidence: string (high | medium | low)
- cveIds: string[] (known CVE IDs)
- cweIds: string[]
- description: string
- impact: string
- attackVector: string

Return ONLY a valid JSON array. If no vulnerable dependencies found, return [].`;

    const systemInstruction = `You are SAKSHAM's Dependency Security Agent. You specialize in identifying vulnerable packages, correlating CVEs from NVD/GHSA/OSV.dev, and assessing transitive dependency risks. Return results as a JSON array.`;

    const response = await this.callGemini(prompt, systemInstruction);

    let aiVulnerabilities: unknown[] = [];
    try {
      const cleaned = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      aiVulnerabilities = JSON.parse(cleaned);
    } catch {
      aiVulnerabilities = [];
    }

    const vulnerabilities = [...osvVulnerabilities, ...aiVulnerabilities];

    return {
      agentType: this.type,
      success: true,
      data: { vulnerabilities },
      reasoning: `Analyzed dependency files with OSV.dev and AI validation. Found ${vulnerabilities.length} vulnerable packages.`,
      duration: 0,
    };
  }
}

// ============================================================
// EXPLOITABILITY VALIDATION AGENT
// ============================================================

class ExploitabilityValidationAgent extends BaseAgent {
  type: AgentType = 'exploitability_validation';
  name = 'Exploitability Validator';
  description = 'Validates whether vulnerabilities are truly exploitable to reduce false positives';

  async execute(context: AgentContext): Promise<AgentResult> {
    const previousVulns = context.previousResults
      .filter(r => r.data && typeof r.data === 'object' && 'vulnerabilities' in (r.data as Record<string, unknown>))
      .flatMap(r => ((r.data as Record<string, unknown>).vulnerabilities as unknown[]) || []);

    if (previousVulns.length === 0) {
      return {
        agentType: this.type,
        success: true,
        data: { validatedVulnerabilities: [] },
        reasoning: 'No vulnerabilities to validate.',
        duration: 0,
      };
    }

    const prompt = `You are an expert exploit validation engineer. Given these vulnerabilities found in a ${context.language} ${context.framework || ''} codebase, determine which ones are truly exploitable.

Vulnerabilities to validate:
${JSON.stringify(previousVulns.slice(0, 15), null, 2)}

For each vulnerability, assess:
1. Is user input reachable to the vulnerable code path?
2. Are there existing mitigations (WAF, input validation, parameterized queries)?
3. What is the realistic exploit feasibility?

Return a JSON array of validated vulnerabilities with added fields:
- isExploitable: boolean
- exploitability: string (confirmed | likely | possible | unlikely)
- exploitScenario: string (detailed attack scenario)
- mitigationsFound: string[] (existing mitigations detected)
- reachabilityAnalysis: string

Return ONLY valid JSON array.`;

    const systemInstruction = `You are SAKSHAM's Exploitability Validation Agent — the MOST CRITICAL agent. You think like an attacker to determine if vulnerabilities are truly exploitable. You analyze input reachability, existing mitigations, and realistic exploit feasibility. Your goal is to ELIMINATE FALSE POSITIVES. Be thorough and honest.`;

    const response = await this.callGemini(prompt, systemInstruction);

    let validated: unknown[] = [];
    try {
      const cleaned = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      validated = JSON.parse(cleaned);
    } catch {
      validated = previousVulns;
    }

    return {
      agentType: this.type,
      success: true,
      data: { validatedVulnerabilities: validated },
      reasoning: `Validated ${previousVulns.length} vulnerabilities. ${validated.filter((v) => isRecord(v) && v.isExploitable === true).length} confirmed exploitable.`,
      duration: 0,
    };
  }
}

// ============================================================
// THREAT INTELLIGENCE AGENT
// ============================================================

class ThreatIntelligenceAgent extends BaseAgent {
  type: AgentType = 'threat_intelligence';
  name = 'Threat Intelligence';
  description = 'Correlates findings with live threat intelligence sources';

  async execute(context: AgentContext): Promise<AgentResult> {
    const previousVulns = context.previousResults
      .filter(r => r.data && typeof r.data === 'object' && ('validatedVulnerabilities' in (r.data as Record<string, unknown>) || 'vulnerabilities' in (r.data as Record<string, unknown>)))
      .flatMap(r => {
        const data = r.data as Record<string, unknown>;
        return ((data.validatedVulnerabilities || data.vulnerabilities) as unknown[]) || [];
      });

    const prompt = `You are a threat intelligence analyst. Given these vulnerabilities, correlate them with known threat intelligence:

Vulnerabilities:
${JSON.stringify(previousVulns.slice(0, 10), null, 2)}

For each vulnerability, add threat intelligence data:
- activelyExploited: boolean (is this being exploited in the wild?)
- cisaKev: boolean (is this in CISA's Known Exploited Vulnerabilities catalog?)
- mitreAttackIds: string[] (relevant MITRE ATT&CK technique IDs)
- exploitDbIds: string[] (relevant Exploit-DB IDs)
- knownPoCs: string[] (URLs to known proof-of-concept exploits)
- threatActors: string[] (known threat actors using this vulnerability)
- urgency: string (immediate | high | medium | low)

Return ONLY valid JSON array with the enriched vulnerabilities.`;

    const systemInstruction = `You are SAKSHAM's Threat Intelligence Agent. You correlate vulnerability findings with intelligence from CISA KEV, MITRE ATT&CK, Exploit-DB, and GitHub PoCs. You identify active exploitation campaigns and provide urgency assessments.`;

    const response = await this.callGemini(prompt, systemInstruction);

    let enriched: unknown[] = [];
    try {
      const cleaned = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      enriched = JSON.parse(cleaned);
    } catch {
      enriched = previousVulns;
    }

    enriched = await enrichWithThreatFeeds(enriched);

    return {
      agentType: this.type,
      success: true,
      data: { enrichedVulnerabilities: enriched },
      reasoning: `Correlated ${previousVulns.length} vulnerabilities with CISA KEV, NVD, and AI threat analysis. ${enriched.filter((v) => isRecord(v) && v.activelyExploited === true).length} actively exploited in the wild.`,
      duration: 0,
    };
  }
}

// ============================================================
// RISK SCORING AGENT
// ============================================================

class RiskScoringAgent extends BaseAgent {
  type: AgentType = 'risk_scoring';
  name = 'Risk Scoring';
  description = 'Computes contextual severity and priority scores';

  async execute(context: AgentContext): Promise<AgentResult> {
    const allResults = context.previousResults;

    const prompt = `You are a risk assessment expert. Based on all the security findings from the analysis pipeline, compute a comprehensive risk score.

Analysis results summary:
${JSON.stringify(allResults.map(r => ({ agent: r.agentType, reasoning: r.reasoning })), null, 2)}

Compute and return a JSON object with:
- overallScore: number (0-100, where 100 is most secure)
- exploitabilityScore: number (0-100)
- reachabilityScore: number (0-100)
- activeExploitationScore: number (0-100)
- businessImpactScore: number (0-100)
- breakdown: { codeQuality: number, dependencyRisk: number, configurationRisk: number, authenticationRisk: number, dataExposureRisk: number }
- trend: string (improving | stable | degrading)
- summary: string (executive summary of risk posture)
- topRecommendations: string[] (top 5 priority actions)

Return ONLY valid JSON.`;

    const systemInstruction = `You are SAKSHAM's Risk Scoring Agent. You combine exploitability, reachability, active exploitation data, and business impact to compute contextual risk scores. Provide actionable, prioritized assessments.`;

    const response = await this.callGemini(prompt, systemInstruction);

    let riskData: unknown = {};
    try {
      const cleaned = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      riskData = JSON.parse(cleaned);
    } catch {
      riskData = { overallScore: 50, summary: 'Unable to compute risk score' };
    }

    return {
      agentType: this.type,
      success: true,
      data: { riskScore: riskData },
      reasoning: `Computed comprehensive risk score based on all agent findings.`,
      duration: 0,
    };
  }
}

// ============================================================
// REMEDIATION AGENT
// ============================================================

class RemediationAgent extends BaseAgent {
  type: AgentType = 'remediation';
  name = 'Remediation';
  description = 'Generates secure patches and remediation guidance';

  async execute(context: AgentContext): Promise<AgentResult> {
    const vulnerabilities = context.previousResults
      .filter(r => r.data && typeof r.data === 'object')
      .flatMap(r => {
        const data = r.data as Record<string, unknown>;
        return ((data.enrichedVulnerabilities || data.validatedVulnerabilities || data.vulnerabilities) as unknown[]) || [];
      })
      .filter((v) => !isRecord(v) || v.isExploitable !== false)
      .slice(0, 10);

    if (vulnerabilities.length === 0) {
      return {
        agentType: this.type,
        success: true,
        data: { remediations: [] },
        reasoning: 'No vulnerabilities require remediation.',
        duration: 0,
      };
    }

    const prompt = `You are a security remediation expert. For each vulnerability below, generate a complete remediation plan.

Vulnerabilities:
${JSON.stringify(vulnerabilities, null, 2)}

For each vulnerability, provide a JSON array with objects containing:
- vulnerabilityTitle: string
- explanation: string (explain why this is dangerous, educate the developer)
- patchDiff: string (a minimal diff showing the fix, using unified diff format)
- patchedCode: string (the corrected code)
- originalCode: string (the vulnerable code)
- filePath: string
- guidance: string[] (step-by-step fix instructions)
- references: string[] (relevant security documentation URLs)
- estimatedEffort: string (trivial | low | medium | high)
- breakingChange: boolean

Return ONLY valid JSON array.`;

    const systemInstruction = `You are SAKSHAM's Remediation Agent. You generate production-ready security patches, explain vulnerabilities to developers, and provide clear remediation guidance. Your patches must be minimal, correct, and non-breaking when possible.`;

    const response = await this.callGemini(prompt, systemInstruction);

    let remediations: unknown[] = [];
    try {
      const cleaned = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      remediations = JSON.parse(cleaned);
    } catch {
      remediations = [];
    }

    return {
      agentType: this.type,
      success: true,
      data: { remediations },
      reasoning: `Generated ${remediations.length} remediation patches for exploitable vulnerabilities.`,
      duration: 0,
    };
  }
}

// ============================================================
// REPOSITORY INTELLIGENCE AGENT
// ============================================================

class RepositoryIntelligenceAgent extends BaseAgent {
  type: AgentType = 'repository_intelligence';
  name = 'Repository Intelligence';
  description = 'Understands repository architecture, frameworks, and patterns';

  async execute(context: AgentContext): Promise<AgentResult> {
    const fileList = Object.keys(context.fileContents).join('\n');
    const keyFiles = Object.entries(context.fileContents)
      .filter(([path]) =>
        path.includes('README') ||
        path.includes('package.json') ||
        path.includes('docker') ||
        path.includes('.env.example') ||
        path.includes('config')
      )
      .slice(0, 5)
      .map(([path, content]) => `--- ${path} ---\n${content.slice(0, 1500)}`)
      .join('\n\n');

    const prompt = `You are a repository intelligence analyst. Analyze this codebase and provide comprehensive understanding.

Repository: ${context.repositoryName}
URL: ${context.repositoryUrl}
Primary Language: ${context.language}

File structure:
${fileList}

Key files:
${keyFiles}

Return a JSON object with:
- architecture: string (description of the overall architecture)
- frameworks: string[] (detected frameworks and libraries)
- entryPoints: string[] (main entry points of the application)
- authPatterns: string[] (authentication mechanisms detected)
- dataFlows: string[] (how data flows through the application)
- envVariables: string[] (required environment variables)
- setupInstructions: string (how to run this project locally)
- securityObservations: string[] (initial security observations)
- attackSurface: string[] (identified attack surface areas)

Return ONLY valid JSON.`;

    const systemInstruction = `You are SAKSHAM's Repository Intelligence Agent. You deeply understand codebases — their architecture, frameworks, data flows, authentication patterns, and attack surfaces. You guide security analysis by providing context.`;

    const response = await this.callGemini(prompt, systemInstruction);

    let repoIntel: unknown = {};
    try {
      const cleaned = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      repoIntel = JSON.parse(cleaned);
    } catch {
      repoIntel = { architecture: 'Analysis failed', frameworks: [], entryPoints: [] };
    }

    return {
      agentType: this.type,
      success: true,
      data: { repositoryIntelligence: repoIntel },
      reasoning: `Analyzed repository architecture and identified frameworks, entry points, and attack surfaces.`,
      duration: 0,
    };
  }
}
