// ============================================================
// SAKSHAM — TypeScript Type Definitions
// AI-Native Autonomous Cybersecurity Platform
// ============================================================

import { Timestamp } from 'firebase/firestore';

// ============================================================
// USER & AUTH TYPES
// ============================================================

export type UserRole = 'admin' | 'analyst' | 'developer' | 'viewer';

export interface SakshamUser {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  role: UserRole;
  organizationId?: string;
  githubConnected: boolean;
  githubAccessToken?: string;
  githubUsername?: string;
  preferences: UserPreferences;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  lastLoginAt: Timestamp;
}

export interface UserPreferences {
  theme: 'dark' | 'light';
  notifications: boolean;
  emailAlerts: boolean;
  defaultScanDepth: 'shallow' | 'standard' | 'deep';
  autoRemediate: boolean;
}

// ============================================================
// ORGANIZATION TYPES
// ============================================================

export interface Organization {
  id: string;
  name: string;
  slug: string;
  ownerId: string;
  memberIds: string[];
  plan: 'free' | 'pro' | 'enterprise';
  settings: OrgSettings;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface OrgSettings {
  maxRepositories: number;
  maxScansPerMonth: number;
  allowedDomains: string[];
  requireMFA: boolean;
}

// ============================================================
// REPOSITORY TYPES
// ============================================================

export interface Repository {
  id: string;
  userId: string;
  organizationId?: string;
  name: string;
  fullName: string;
  url: string;
  cloneUrl: string;
  defaultBranch: string;
  language: string;
  languages: Record<string, number>;
  framework?: string;
  description?: string;
  isPrivate: boolean;
  securityScore: number; // 0-100
  lastScannedAt?: Timestamp;
  totalVulnerabilities: number;
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
  status: 'active' | 'archived' | 'scanning';
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ============================================================
// SCAN SESSION TYPES
// ============================================================

export type ScanStatus = 'queued' | 'initializing' | 'scanning' | 'analyzing' | 'validating' | 'completed' | 'failed' | 'cancelled';
export type ScanDepth = 'shallow' | 'standard' | 'deep';

export interface ScanSession {
  id: string;
  repositoryId: string;
  userId: string;
  status: ScanStatus;
  depth: ScanDepth;
  branch: string;
  commitHash?: string;
  progress: number; // 0-100
  agentsActive: string[];
  agentsCompleted: string[];
  findings: ScanFindings;
  startedAt: Timestamp;
  completedAt?: Timestamp;
  duration?: number; // seconds
  error?: string;
  createdAt: Timestamp;
}

export interface ScanFindings {
  total: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
  info: number;
  exploitable: number;
  falsePositives: number;
}

// ============================================================
// VULNERABILITY TYPES
// ============================================================

export type Severity = 'critical' | 'high' | 'medium' | 'low' | 'info';
export type Confidence = 'high' | 'medium' | 'low';
export type ExploitabilityLevel = 'confirmed' | 'likely' | 'possible' | 'unlikely';

export type VulnerabilityCategory =
  | 'sql_injection'
  | 'xss'
  | 'ssrf'
  | 'rce'
  | 'path_traversal'
  | 'auth_bypass'
  | 'insecure_crypto'
  | 'command_injection'
  | 'hardcoded_secrets'
  | 'insecure_jwt'
  | 'insecure_deserialization'
  | 'open_redirect'
  | 'idor'
  | 'xxe'
  | 'csrf'
  | 'dependency_vuln'
  | 'misconfiguration'
  | 'information_disclosure'
  | 'other';

export interface Vulnerability {
  id: string;
  scanSessionId: string;
  repositoryId: string;
  userId: string;
  title: string;
  description: string;
  category: VulnerabilityCategory;
  severity: Severity;
  confidence: Confidence;
  exploitability: ExploitabilityLevel;
  cvssScore?: number;
  cveIds: string[];
  cweIds: string[];
  filePath: string;
  lineStart: number;
  lineEnd: number;
  codeSnippet: string;
  attackVector: string;
  impact: string;
  exploitScenario?: string;
  isExploitable: boolean;
  isFalsePositive: boolean;
  remediationId?: string;
  threatIntelligence?: ThreatIntelData;
  detectedBy: AgentType;
  validatedBy?: AgentType;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface ThreatIntelData {
  activelyExploited: boolean;
  cisaKev: boolean;
  mitreAttackIds: string[];
  exploitDbIds: string[];
  knownPoCs: string[];
  lastSeenInWild?: Timestamp;
}

// ============================================================
// REMEDIATION TYPES
// ============================================================

export interface Remediation {
  id: string;
  vulnerabilityId: string;
  repositoryId: string;
  userId: string;
  title: string;
  explanation: string;
  patchDiff: string;
  patchedCode: string;
  originalCode: string;
  filePath: string;
  guidance: string[];
  references: string[];
  estimatedEffort: 'trivial' | 'low' | 'medium' | 'high';
  breakingChange: boolean;
  generatedBy: AgentType;
  status: 'pending' | 'applied' | 'dismissed';
  createdAt: Timestamp;
}

// ============================================================
// AGENT TYPES
// ============================================================

export type AgentType =
  | 'orchestrator'
  | 'static_analysis'
  | 'dependency_security'
  | 'exploitability_validation'
  | 'threat_intelligence'
  | 'risk_scoring'
  | 'remediation'
  | 'repository_intelligence'
  | 'pdf_report'
  | 'memory';

export type AgentStatus = 'idle' | 'running' | 'completed' | 'error' | 'waiting';

export interface AgentLog {
  id: string;
  scanSessionId: string;
  userId: string;
  agentType: AgentType;
  status: AgentStatus;
  message: string;
  reasoning?: string;
  input?: string;
  output?: string;
  duration?: number;
  tokensUsed?: number;
  level: 'info' | 'warning' | 'error' | 'debug';
  timestamp: Timestamp;
}

export interface AgentState {
  type: AgentType;
  name: string;
  description: string;
  icon: string;
  status: AgentStatus;
  progress: number;
  currentTask?: string;
  lastActivity?: string;
}

// ============================================================
// CHAT SESSION TYPES
// ============================================================

export interface ChatSession {
  id: string;
  userId: string;
  repositoryId: string;
  title: string;
  messages: ChatMessage[];
  context: ChatContext;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  codeBlocks?: CodeBlock[];
  references?: string[];
  timestamp: Timestamp;
}

export interface CodeBlock {
  language: string;
  code: string;
  filePath?: string;
  lineStart?: number;
  lineEnd?: number;
}

export interface ChatContext {
  repositoryName: string;
  repositoryUrl: string;
  languages: string[];
  framework?: string;
  recentVulnerabilities?: string[];
}

// ============================================================
// REPORT TYPES
// ============================================================

export interface SavedReport {
  id: string;
  userId: string;
  repositoryId: string;
  scanSessionId: string;
  title: string;
  type: 'full' | 'executive' | 'remediation' | 'compliance';
  storageUrl: string;
  findings: ScanFindings;
  generatedAt: Timestamp;
  fileSize: number;
}

// ============================================================
// REPOSITORY MEMORY TYPES
// ============================================================

export interface RepositoryMemory {
  id: string;
  repositoryId: string;
  userId: string;
  architecture: string;
  frameworks: string[];
  entryPoints: string[];
  authPatterns: string[];
  dataFlows: string[];
  envVariables: string[];
  setupInstructions: string;
  knownIssues: string[];
  scanHistory: MemoryScanEntry[];
  lastAnalyzedAt: Timestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface MemoryScanEntry {
  scanSessionId: string;
  date: Timestamp;
  findingsCount: number;
  criticalCount: number;
  resolvedCount: number;
}

// ============================================================
// NOTIFICATION TYPES
// ============================================================

export type NotificationType = 'scan_complete' | 'critical_threat' | 'remediation_ready' | 'pr_review' | 'system';

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  read: boolean;
  actionUrl?: string;
  metadata?: Record<string, unknown>;
  createdAt: Timestamp;
}

// ============================================================
// RISK SCORE TYPES
// ============================================================

export interface RiskScore {
  id: string;
  userId: string;
  repositoryId: string;
  scanSessionId: string;
  overallScore: number; // 0-100
  exploitabilityScore: number;
  reachabilityScore: number;
  activeExploitationScore: number;
  businessImpactScore: number;
  breakdown: RiskBreakdown;
  trend: 'improving' | 'stable' | 'degrading';
  calculatedAt: Timestamp;
}

export interface RiskBreakdown {
  codeQuality: number;
  dependencyRisk: number;
  configurationRisk: number;
  authenticationRisk: number;
  dataExposureRisk: number;
}

// ============================================================
// ATTACK GRAPH TYPES
// ============================================================

export interface AttackGraph {
  id: string;
  userId: string;
  repositoryId: string;
  scanSessionId: string;
  title: string;
  nodes: AttackNode[];
  edges: AttackEdge[];
  riskLevel: Severity;
  description: string;
  createdAt: Timestamp;
}

export interface AttackNode {
  id: string;
  label: string;
  type: 'entry_point' | 'vulnerability' | 'asset' | 'impact' | 'technique';
  severity?: Severity;
  metadata?: Record<string, unknown>;
}

export interface AttackEdge {
  id: string;
  source: string;
  target: string;
  label: string;
  exploitability: ExploitabilityLevel;
}

// ============================================================
// DASHBOARD TYPES
// ============================================================

export interface DashboardStats {
  totalRepositories: number;
  totalScans: number;
  activeThreats: number;
  resolvedThreats: number;
  averageSecurityScore: number;
  recentFindings: Vulnerability[];
  severityDistribution: Record<Severity, number>;
  scanTrend: TrendPoint[];
  topVulnerabilities: VulnerabilityCategory[];
  agentActivity: AgentState[];
}

export interface TrendPoint {
  date: string;
  vulnerabilities: number;
  resolved: number;
  score: number;
}

// ============================================================
// API RESPONSE TYPES
// ============================================================

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}
