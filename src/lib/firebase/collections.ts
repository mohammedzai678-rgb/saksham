// ============================================================
// SAKSHAM — Firestore Collection References
// ============================================================

import {
  collection,
  doc,
  query,
  where,
  orderBy,
  limit,
  type CollectionReference,
  type DocumentReference,
  Timestamp,
} from 'firebase/firestore';
import { db } from './config';
import type {
  SakshamUser,
  Organization,
  Repository,
  ScanSession,
  Vulnerability,
  Remediation,
  AgentLog,
  ChatSession,
  SavedReport,
  RepositoryMemory,
  Notification,
  RiskScore,
  AttackGraph,
} from '@/types';

// ============================================================
// Collection References
// ============================================================

export const usersCollection = collection(db, 'users') as CollectionReference<SakshamUser>;
export const organizationsCollection = collection(db, 'organizations') as CollectionReference<Organization>;
export const repositoriesCollection = collection(db, 'repositories') as CollectionReference<Repository>;
export const scanSessionsCollection = collection(db, 'scan_sessions') as CollectionReference<ScanSession>;
export const vulnerabilitiesCollection = collection(db, 'vulnerabilities') as CollectionReference<Vulnerability>;
export const remediationsCollection = collection(db, 'remediations') as CollectionReference<Remediation>;
export const agentLogsCollection = collection(db, 'agent_logs') as CollectionReference<AgentLog>;
export const chatSessionsCollection = collection(db, 'chat_sessions') as CollectionReference<ChatSession>;
export const savedReportsCollection = collection(db, 'saved_reports') as CollectionReference<SavedReport>;
export const repositoryMemoryCollection = collection(db, 'repository_memory') as CollectionReference<RepositoryMemory>;
export const notificationsCollection = collection(db, 'notifications') as CollectionReference<Notification>;
export const riskScoresCollection = collection(db, 'risk_scores') as CollectionReference<RiskScore>;
export const attackGraphsCollection = collection(db, 'attack_graphs') as CollectionReference<AttackGraph>;

// ============================================================
// Document References
// ============================================================

export const userDoc = (uid: string) => doc(usersCollection, uid) as DocumentReference<SakshamUser>;
export const repositoryDoc = (id: string) => doc(repositoriesCollection, id) as DocumentReference<Repository>;
export const scanSessionDoc = (id: string) => doc(scanSessionsCollection, id) as DocumentReference<ScanSession>;
export const vulnerabilityDoc = (id: string) => doc(vulnerabilitiesCollection, id) as DocumentReference<Vulnerability>;
export const remediationDoc = (id: string) => doc(remediationsCollection, id) as DocumentReference<Remediation>;

// ============================================================
// Query Helpers
// ============================================================

export const userRepositoriesQuery = (userId: string) =>
  query(repositoriesCollection, where('userId', '==', userId), orderBy('updatedAt', 'desc'));

export const repoScansQuery = (repositoryId: string) =>
  query(scanSessionsCollection, where('repositoryId', '==', repositoryId), orderBy('createdAt', 'desc'));

export const scanVulnerabilitiesQuery = (scanSessionId: string) =>
  query(vulnerabilitiesCollection, where('scanSessionId', '==', scanSessionId), orderBy('severity', 'asc'));

export const userNotificationsQuery = (userId: string) =>
  query(notificationsCollection, where('userId', '==', userId), where('read', '==', false), orderBy('createdAt', 'desc'), limit(20));

export const scanAgentLogsQuery = (scanSessionId: string) =>
  query(agentLogsCollection, where('scanSessionId', '==', scanSessionId), orderBy('timestamp', 'asc'));

export const repoChatSessionsQuery = (userId: string, repositoryId: string) =>
  query(chatSessionsCollection, where('userId', '==', userId), where('repositoryId', '==', repositoryId), orderBy('updatedAt', 'desc'));

export const repoAttackGraphsQuery = (repositoryId: string) =>
  query(attackGraphsCollection, where('repositoryId', '==', repositoryId), orderBy('createdAt', 'desc'));

// ============================================================
// Utility
// ============================================================

export const serverTimestamp = () => Timestamp.now();
