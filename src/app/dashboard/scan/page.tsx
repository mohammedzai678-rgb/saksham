// ============================================================
// SAKSHAM — Repository Scan Page
// Real persisted scan initiation with Firestore agent telemetry
// ============================================================

'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Scan,
  GitBranch,
  Link2,
  Play,
  Loader2,
  CheckCircle2,
  Bot,
} from 'lucide-react';
import { useScanStore } from '@/lib/store';
import toast from 'react-hot-toast';
import type { AgentType } from '@/types';
import { useAuth } from '@/lib/auth/auth-context';
import { useAgentLogs, useScanSessions } from '@/hooks/use-firestore-collections';

type ScanDepth = 'shallow' | 'standard' | 'deep';

const scanDepths: { value: ScanDepth; label: string; time: string }[] = [
  { value: 'shallow', label: 'Quick Scan', time: '~2 min' },
  { value: 'standard', label: 'Standard Scan', time: '~5 min' },
  { value: 'deep', label: 'Deep Scan', time: '~10 min' },
];

export default function ScanPage() {
  const [repoUrl, setRepoUrl] = useState('');
  const [branch, setBranch] = useState('main');
  const [depth, setDepth] = useState<ScanDepth>('standard');
  const [isScanning, setIsScanning] = useState(false);
  const [scanComplete, setScanComplete] = useState(false);
  const [activeScanId, setActiveScanId] = useState<string | undefined>();
  const { user } = useAuth();
  const { data: liveLogs } = useAgentLogs(activeScanId);
  const { data: scans } = useScanSessions();
  const {
    agentStates,
    agentLogs,
    scanProgress,
    updateAgentState,
    addAgentLog,
    setScanProgress,
    resetScan,
  } = useScanStore();

  const liveScan = useMemo(() => scans.find((scan) => scan.id === activeScanId), [activeScanId, scans]);
  const displayProgress = liveScan?.progress ?? scanProgress;
  const displayComplete = scanComplete || liveScan?.status === 'completed';
  const terminalLogs = liveLogs.length > 0
    ? [...liveLogs].reverse().map((log) => ({
        agent: log.agentType.replace(/_/g, ' '),
        message: log.message,
        level: log.level,
        timestamp: log.timestamp?.toDate?.() ?? new Date(),
      }))
    : agentLogs;

  useEffect(() => {
    if (!liveScan) return;
    setScanProgress(liveScan.progress);
    liveScan.agentsCompleted.forEach((agent) => {
      updateAgentState(agent as AgentType, { status: 'completed', progress: 100 });
    });
    liveScan.agentsActive.forEach((agent) => {
      updateAgentState(agent as AgentType, { status: 'running' });
    });
  }, [liveScan, setScanProgress, updateAgentState]);

  const startScan = useCallback(async () => {
    if (!repoUrl.trim()) {
      toast.error('Please enter a repository URL');
      return;
    }
    if (!user) {
      toast.error('Please sign in before starting a scan');
      return;
    }

    const scanSessionId = `scan_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    setActiveScanId(scanSessionId);
    setIsScanning(true);
    setScanComplete(false);
    resetScan();
    setScanProgress(2);
    updateAgentState('orchestrator', { status: 'running', currentTask: 'Initializing persisted scan session...' });
    addAgentLog('Orchestrator', 'Initializing persisted scan session...');

    try {
      const token = await user.getIdToken();
      const response = await fetch('/api/scan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          repositoryUrl: repoUrl.trim(),
          branch,
          depth,
          scanSessionId,
        }),
      });

      const payload = await response.json();
      if (!response.ok || !payload.success) {
        throw new Error(payload.error || 'Scan failed');
      }

      setScanProgress(100);
      setScanComplete(true);
      updateAgentState('orchestrator', { status: 'completed', progress: 100 });
      addAgentLog('Orchestrator', 'All agents completed. Scan results persisted to Firestore.');
      toast.success('Scan completed successfully!');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Scan failed. Please try again.';
      toast.error(message);
      addAgentLog('Orchestrator', message, 'error');
      updateAgentState('orchestrator', { status: 'error' });
    } finally {
      setIsScanning(false);
    }
  }, [repoUrl, user, resetScan, setScanProgress, updateAgentState, addAgentLog, branch, depth]);

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text-primary flex items-center gap-3">
          <Scan className="w-6 h-6 text-saksham-primary" />
          Scan Repository
        </h1>
        <p className="text-sm text-text-muted mt-1">Paste a GitHub URL to start the persisted multi-agent security pipeline</p>
      </div>

      <motion.div
        className="glass-card rounded-2xl p-6 space-y-5"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div>
          <label className="text-sm font-medium text-text-secondary mb-2 block">Repository URL</label>
          <div className="relative">
            <Link2 className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
            <input
              type="url"
              placeholder="https://github.com/owner/repository"
              value={repoUrl}
              onChange={(e) => setRepoUrl(e.target.value)}
              className="w-full pl-11 pr-4 py-3.5 rounded-xl input-cyber text-sm font-mono"
              disabled={isScanning}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-text-secondary mb-2 block">Branch</label>
            <div className="relative">
              <GitBranch className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
              <input
                type="text"
                value={branch}
                onChange={(e) => setBranch(e.target.value)}
                className="w-full pl-11 pr-4 py-3 rounded-xl input-cyber text-sm"
                disabled={isScanning}
              />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-text-secondary mb-2 block">Scan Depth</label>
            <div className="grid grid-cols-3 gap-2">
              {scanDepths.map((item) => (
                <button
                  key={item.value}
                  onClick={() => setDepth(item.value)}
                  disabled={isScanning}
                  className={`px-3 py-2.5 rounded-xl text-xs font-medium transition-all ${
                    depth === item.value
                      ? 'bg-saksham-primary/15 border border-saksham-primary/30 text-saksham-primary'
                      : 'glass text-text-secondary hover:text-text-primary'
                  }`}
                >
                  {item.label}
                  <span className="block text-[10px] text-text-muted mt-0.5">{item.time}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <motion.button
          onClick={startScan}
          disabled={isScanning || !repoUrl.trim()}
          className="w-full py-4 rounded-xl font-semibold text-sm relative overflow-hidden group disabled:opacity-50 disabled:cursor-not-allowed"
          whileHover={{ scale: 1.005 }}
          whileTap={{ scale: 0.995 }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-saksham-primary to-saksham-secondary opacity-90 group-hover:opacity-100 transition-opacity" />
          <div className="relative flex items-center justify-center gap-2 text-bg-primary">
            {isScanning ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Scanning... {displayProgress}%
              </>
            ) : displayComplete ? (
              <>
                <CheckCircle2 className="w-5 h-5" />
                Scan Complete — View Results
              </>
            ) : (
              <>
                <Play className="w-5 h-5" />
                Initialize Security Scan
              </>
            )}
          </div>
        </motion.button>
      </motion.div>

      <AnimatePresence>
        {(isScanning || displayComplete || activeScanId) && (
          <motion.div
            className="glass-card rounded-2xl p-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-sm font-semibold text-text-primary flex items-center gap-2">
                <Bot className="w-4 h-4 text-saksham-primary" />
                Agent Pipeline
              </h3>
              <span className="text-xs text-text-muted font-mono">{displayProgress}% complete</span>
            </div>

            <div className="h-1.5 rounded-full bg-bg-elevated mb-6 overflow-hidden">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-saksham-primary to-saksham-secondary"
                initial={{ width: 0 }}
                animate={{ width: `${displayProgress}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {agentStates.filter((agent) => agent.type !== 'pdf_report').map((agent, i) => (
                <motion.div
                  key={agent.type}
                  className={`p-3 rounded-xl border transition-all ${
                    agent.status === 'running'
                      ? 'border-saksham-primary/30 bg-saksham-primary/5'
                      : agent.status === 'completed'
                      ? 'border-saksham-success/30 bg-saksham-success/5'
                      : agent.status === 'error'
                      ? 'border-saksham-accent/30 bg-saksham-accent/5'
                      : 'border-border-default bg-bg-card'
                  }`}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-base">{agent.icon}</span>
                    <span className="text-xs font-medium text-text-primary truncate">{agent.name}</span>
                    {agent.status === 'running' && <Loader2 className="w-3 h-3 text-saksham-primary animate-spin ml-auto shrink-0" />}
                    {agent.status === 'completed' && <CheckCircle2 className="w-3 h-3 text-saksham-success ml-auto shrink-0" />}
                  </div>
                  <p className="text-[10px] text-text-muted truncate">{agent.currentTask || agent.description}</p>
                </motion.div>
              ))}
            </div>

            <div className="mt-5 rounded-xl bg-bg-primary border border-border-default p-4 max-h-56 overflow-y-auto font-mono">
              <div className="flex items-center gap-2 mb-3">
                <div className="flex gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-saksham-accent" />
                  <div className="w-2.5 h-2.5 rounded-full bg-saksham-warning" />
                  <div className="w-2.5 h-2.5 rounded-full bg-saksham-success" />
                </div>
                <span className="text-[10px] text-text-muted">SAKSHAM Agent Terminal</span>
              </div>
              {terminalLogs.map((log, i) => (
                <motion.div
                  key={`${log.agent}-${i}`}
                  className="text-xs leading-relaxed"
                  initial={{ opacity: 0, x: -5 }}
                  animate={{ opacity: 1, x: 0 }}
                >
                  <span className="text-text-muted">[{log.timestamp.toLocaleTimeString()}]</span>{' '}
                  <span className="text-saksham-primary">[{log.agent}]</span>{' '}
                  <span className={log.level === 'error' ? 'text-saksham-accent' : 'text-text-secondary'}>{log.message}</span>
                </motion.div>
              ))}
              {isScanning && <span className="terminal-cursor text-xs" />}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
