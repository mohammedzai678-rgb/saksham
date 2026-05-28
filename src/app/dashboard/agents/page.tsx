// ============================================================
// SAKSHAM — Agent Terminal Page
// Firestore-backed agent activity monitor
// ============================================================

'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Terminal, Wifi, Activity, Cpu, Clock } from 'lucide-react';
import { useScanStore } from '@/lib/store';
import { useAgentLogs } from '@/hooks/use-firestore-collections';

const agentDetails: Record<string, { name: string; icon: string; color: string; description: string }> = {
  orchestrator: { name: 'Orchestrator', icon: '🎯', color: '#00f0ff', description: 'Coordinates all agents and manages workflows' },
  static_analysis: { name: 'Static Analysis', icon: '🔍', color: '#a855f7', description: 'Scans source code for vulnerability patterns' },
  dependency_security: { name: 'Dependency Security', icon: '📦', color: '#f59e0b', description: 'Analyzes dependencies against CVE databases' },
  exploitability_validation: { name: 'Exploitability Validator', icon: '💀', color: '#ef4444', description: 'Validates if vulnerabilities are truly exploitable' },
  threat_intelligence: { name: 'Threat Intelligence', icon: '🌐', color: '#06b6d4', description: 'Correlates with live threat intelligence feeds' },
  risk_scoring: { name: 'Risk Scoring', icon: '📊', color: '#22c55e', description: 'Computes contextual risk scores' },
  remediation: { name: 'Remediation', icon: '🔧', color: '#f97316', description: 'Generates secure patches and fix guidance' },
  repository_intelligence: { name: 'Repo Intelligence', icon: '🧠', color: '#8b5cf6', description: 'Understands repository architecture' },
  memory: { name: 'Memory', icon: '💾', color: '#64748b', description: 'Persistent context storage' },
};

export default function AgentTerminalPage() {
  const { agentStates } = useScanStore();
  const { data: logs } = useAgentLogs();
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);
  const displayLogs = [...logs].reverse();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary flex items-center gap-3">
            <Terminal className="w-6 h-6 text-saksham-primary" />
            Agent Terminal
          </h1>
          <p className="text-sm text-text-muted mt-1">Persisted multi-agent activity monitor</p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg glass">
          <Wifi className="w-3.5 h-3.5 text-saksham-success" />
          <span className="text-xs text-saksham-success font-medium">Firestore Live</span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {Object.entries(agentDetails).map(([key, agent], i) => {
          const state = agentStates.find((a) => a.type === key);
          const hasRecentLog = logs.some((log) => log.agentType === key);
          return (
            <motion.div
              key={key}
              className={`glass-card rounded-xl p-4 cursor-pointer hover-lift ${selectedAgent === key ? 'border-saksham-primary/30 glow-cyan' : ''}`}
              onClick={() => setSelectedAgent(selectedAgent === key ? null : key)}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <div className="flex items-center gap-3 mb-2">
                <span className="text-xl">{agent.icon}</span>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold text-text-primary">{agent.name}</h3>
                  <p className="text-[10px] text-text-muted truncate">{agent.description}</p>
                </div>
                <div className="flex items-center gap-1">
                  <div className={`w-2 h-2 rounded-full ${
                    state?.status === 'running' ? 'bg-saksham-primary animate-pulse' :
                    state?.status === 'completed' || hasRecentLog ? 'bg-saksham-success' :
                    state?.status === 'error' ? 'bg-saksham-accent' :
                    'bg-text-muted'
                  }`} />
                  <span className="text-[10px] text-text-muted capitalize">{state?.status || (hasRecentLog ? 'ready' : 'idle')}</span>
                </div>
              </div>
              <div className="flex items-center gap-4 text-[10px] text-text-muted mt-2">
                <span className="flex items-center gap-1"><Cpu className="w-3 h-3" /> Gemini</span>
                <span className="flex items-center gap-1"><Activity className="w-3 h-3" /> Firestore</span>
              </div>
            </motion.div>
          );
        })}
      </div>

      <motion.div className="rounded-2xl bg-[#0a0e1a] border border-border-default overflow-hidden" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border-default bg-[#0d1117]">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-[#ff5f57]" />
            <div className="w-3 h-3 rounded-full bg-[#febc2e]" />
            <div className="w-3 h-3 rounded-full bg-[#28c840]" />
          </div>
          <span className="text-xs text-text-muted font-mono flex items-center gap-2">
            <Terminal className="w-3 h-3" />
            saksham-agent-terminal — firestore
          </span>
          <span className="ml-auto text-[10px] text-text-muted font-mono flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {new Date().toLocaleTimeString()}
          </span>
        </div>

        <div className="p-4 font-mono text-xs max-h-[420px] overflow-y-auto space-y-0.5">
          {displayLogs.length === 0 ? (
            <div className="text-text-muted py-10 text-center">No persisted agent logs yet. Start a repository scan to stream activity here.</div>
          ) : (
            displayLogs.map((log, i) => (
              <motion.div
                key={log.id}
                className="flex items-start gap-2 py-0.5"
                initial={{ opacity: 0, x: -5 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.02 }}
              >
                <span className="text-text-muted shrink-0">[{(log.timestamp?.toDate?.() ?? new Date()).toLocaleTimeString()}]</span>
                <span className="text-saksham-primary shrink-0">[{log.agentType.replace(/_/g, ' ')}]</span>
                <span className={`${log.level === 'error' ? 'text-saksham-accent' : log.level === 'warning' ? 'text-saksham-warning' : 'text-text-secondary'}`}>
                  {log.message}
                </span>
              </motion.div>
            ))
          )}

          <div className="mt-2 flex items-center gap-1">
            <span className="text-saksham-success">saksham@agent-hub</span>
            <span className="text-text-muted">:</span>
            <span className="text-saksham-primary">~</span>
            <span className="text-text-muted">$</span>
            <span className="terminal-cursor ml-1" />
          </div>
        </div>
      </motion.div>
    </div>
  );
}
