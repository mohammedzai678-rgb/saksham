'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  collection,
  onSnapshot,
  query,
  where,
  type QueryConstraint,
  type Timestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { useAuth } from '@/lib/auth/auth-context';
import type {
  AgentLog,
  AttackGraph,
  ChatSession,
  Notification,
  Repository,
  Remediation,
  RiskScore,
  SavedReport,
  ScanSession,
  Vulnerability,
} from '@/types';

type WithId = { id: string };
const EMPTY_CONSTRAINTS: QueryConstraint[] = [];

interface FirestoreState<T> {
  data: T[];
  loading: boolean;
  error: string | null;
}

function toMillis(value: unknown) {
  if (!value) return 0;
  if (value instanceof Date) return value.getTime();
  if (typeof value === 'object' && 'toDate' in value && typeof value.toDate === 'function') {
    return (value as Timestamp).toDate().getTime();
  }
  return 0;
}

function sortByDateDesc<T extends WithId>(rows: T[]) {
  return [...rows].sort((a, b) => {
    const aRow = a as Record<string, unknown>;
    const bRow = b as Record<string, unknown>;
    const bDate = toMillis(bRow.updatedAt || bRow.createdAt || bRow.timestamp || bRow.generatedAt || bRow.startedAt);
    const aDate = toMillis(aRow.updatedAt || aRow.createdAt || aRow.timestamp || aRow.generatedAt || aRow.startedAt);
    return bDate - aDate;
  });
}

function useUserCollection<T extends WithId>(
  collectionName: string,
  extraConstraints: QueryConstraint[] = EMPTY_CONSTRAINTS
): FirestoreState<T> {
  const { user } = useAuth();
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const constraints = useMemo(() => extraConstraints, [extraConstraints]);

  useEffect(() => {
    if (!user) {
      queueMicrotask(() => {
        setData([]);
        setLoading(false);
      });
      return;
    }

    queueMicrotask(() => setLoading(true));
    const q = query(
      collection(db, collectionName),
      where('userId', '==', user.uid),
      ...constraints
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const rows = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as T);
        setData(sortByDateDesc(rows));
        setError(null);
        setLoading(false);
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [collectionName, constraints, user]);

  return { data, loading, error };
}

export function useRepositories() {
  return useUserCollection<Repository>('repositories');
}

export function useScanSessions() {
  return useUserCollection<ScanSession>('scan_sessions');
}

export function useVulnerabilities() {
  return useUserCollection<Vulnerability>('vulnerabilities');
}

export function useRemediations() {
  return useUserCollection<Remediation>('remediations');
}

export function useAgentLogs(scanSessionId?: string) {
  const constraints = useMemo(
    () => (scanSessionId ? [where('scanSessionId', '==', scanSessionId)] : []),
    [scanSessionId]
  );
  return useUserCollection<AgentLog>('agent_logs', constraints);
}

export function useChatSessions() {
  return useUserCollection<ChatSession>('chat_sessions');
}

export function useReports() {
  return useUserCollection<SavedReport>('saved_reports');
}

export function useNotifications() {
  return useUserCollection<Notification>('notifications');
}

export function useRiskScores() {
  return useUserCollection<RiskScore>('risk_scores');
}

export function useAttackGraphs() {
  return useUserCollection<AttackGraph>('attack_graphs');
}
