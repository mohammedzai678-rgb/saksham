// ============================================================
// SAKSHAM — Zustand Store
// Global state management for the application
// ============================================================

import { create } from 'zustand';
import type { AgentState, AgentType, Notification, Repository, ScanSession } from '@/types';

// ============================================================
// SCAN STORE
// ============================================================

interface ScanStore {
  activeScan: ScanSession | null;
  scanProgress: number;
  agentStates: AgentState[];
  agentLogs: Array<{ agent: string; message: string; timestamp: Date; level: string }>;
  setActiveScan: (scan: ScanSession | null) => void;
  setScanProgress: (progress: number) => void;
  updateAgentState: (agentType: AgentType, update: Partial<AgentState>) => void;
  addAgentLog: (agent: string, message: string, level?: string) => void;
  resetScan: () => void;
}

const defaultAgentStates: AgentState[] = [
  { type: 'orchestrator', name: 'Orchestrator', description: 'Coordinating all agents', icon: '🎯', status: 'idle', progress: 0 },
  { type: 'static_analysis', name: 'Static Analysis', description: 'Scanning source code', icon: '🔍', status: 'idle', progress: 0 },
  { type: 'dependency_security', name: 'Dependency Security', description: 'Analyzing dependencies', icon: '📦', status: 'idle', progress: 0 },
  { type: 'exploitability_validation', name: 'Exploitability Validator', description: 'Validating threats', icon: '💀', status: 'idle', progress: 0 },
  { type: 'threat_intelligence', name: 'Threat Intelligence', description: 'Correlating intelligence', icon: '🌐', status: 'idle', progress: 0 },
  { type: 'risk_scoring', name: 'Risk Scoring', description: 'Computing risk scores', icon: '📊', status: 'idle', progress: 0 },
  { type: 'remediation', name: 'Remediation', description: 'Generating patches', icon: '🔧', status: 'idle', progress: 0 },
  { type: 'repository_intelligence', name: 'Repo Intelligence', description: 'Understanding repository', icon: '🧠', status: 'idle', progress: 0 },
  { type: 'memory', name: 'Memory', description: 'Storing context', icon: '💾', status: 'idle', progress: 0 },
];

export const useScanStore = create<ScanStore>((set) => ({
  activeScan: null,
  scanProgress: 0,
  agentStates: [...defaultAgentStates],
  agentLogs: [],
  setActiveScan: (scan) => set({ activeScan: scan }),
  setScanProgress: (progress) => set({ scanProgress: progress }),
  updateAgentState: (agentType, update) =>
    set((state) => ({
      agentStates: state.agentStates.map((a) =>
        a.type === agentType ? { ...a, ...update } : a
      ),
    })),
  addAgentLog: (agent, message, level = 'info') =>
    set((state) => ({
      agentLogs: [
        ...state.agentLogs,
        { agent, message, timestamp: new Date(), level },
      ].slice(-200), // Keep last 200 logs
    })),
  resetScan: () =>
    set({
      activeScan: null,
      scanProgress: 0,
      agentStates: [...defaultAgentStates],
      agentLogs: [],
    }),
}));

// ============================================================
// UI STORE
// ============================================================

interface UIStore {
  sidebarOpen: boolean;
  sidebarCollapsed: boolean;
  activeModal: string | null;
  notifications: Notification[];
  unreadCount: number;
  toggleSidebar: () => void;
  toggleSidebarCollapsed: () => void;
  openModal: (modal: string) => void;
  closeModal: () => void;
  setNotifications: (notifications: Notification[]) => void;
  markRead: (id: string) => void;
}

export const useUIStore = create<UIStore>((set) => ({
  sidebarOpen: true,
  sidebarCollapsed: false,
  activeModal: null,
  notifications: [],
  unreadCount: 0,
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  toggleSidebarCollapsed: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
  openModal: (modal) => set({ activeModal: modal }),
  closeModal: () => set({ activeModal: null }),
  setNotifications: (notifications) =>
    set({ notifications, unreadCount: notifications.filter((n) => !n.read).length }),
  markRead: (id) =>
    set((s) => ({
      notifications: s.notifications.map((n) =>
        n.id === id ? { ...n, read: true } : n
      ),
      unreadCount: Math.max(0, s.unreadCount - 1),
    })),
}));

// ============================================================
// REPOSITORY STORE
// ============================================================

interface RepoStore {
  repositories: Repository[];
  selectedRepo: Repository | null;
  setRepositories: (repos: Repository[]) => void;
  setSelectedRepo: (repo: Repository | null) => void;
  addRepository: (repo: Repository) => void;
}

export const useRepoStore = create<RepoStore>((set) => ({
  repositories: [],
  selectedRepo: null,
  setRepositories: (repositories) => set({ repositories }),
  setSelectedRepo: (selectedRepo) => set({ selectedRepo }),
  addRepository: (repo) =>
    set((s) => ({ repositories: [repo, ...s.repositories] })),
}));
