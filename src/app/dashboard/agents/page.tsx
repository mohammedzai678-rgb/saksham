// ============================================================
// SAKSHAM — Agent Terminal Page
// Real-time hacker terminal with idle explanation tooltips
// ============================================================

'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Bot, Terminal, Wifi, Activity, Cpu, Clock, Info } from 'lucide-react';
import { useScanStore } from '@/lib/store';

const statusDescriptions: Record<string, string> = {
  idle: 'Waiting for a scan to start. This agent is loaded and ready to execute when a security scan is triggered.',
  running: 'Currently executing analysis. Processing data in real-time.',
  completed: 'Finished processing. Results have been submitted to the orchestrator.',
  error: 'Encountered an error during execution. Check logs for details.',
};

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

const sampleLogs = [
  { agent: 'Orchestrator', message: '🎯 System initialized. All agents reporting online.', level: 'info', time: '00:00:01' },
  { agent: 'Orchestrator', message: 'Awaiting scan requests. Multi-agent pipeline ready.', level: 'info', time: '00:00:01' },
  { agent: 'Static Analysis', message: 'Code pattern database loaded (2,847 rules)', level: 'info', time: '00:00:02' },
  { agent: 'Dependency Security', message: 'CVE database synced. NVD: 238,421 entries', level: 'info', time: '00:00:03' },
  { agent: 'Threat Intel', message: 'CISA KEV catalog loaded (1,142 vulnerabilities)', level: 'info', time: '00:00:03' },
  { agent: 'Threat Intel', message: 'MITRE ATT&CK framework v14 loaded', level: 'info', time: '00:00:04' },
  { agent: 'Exploitability', message: 'Exploit validation engine ready', level: 'info', time: '00:00:04' },
  { agent: 'Remediation', message: 'Patch generation models loaded', level: 'info', time: '00:00:05' },
  { agent: 'Memory', message: 'Persistent memory connected to Firestore', level: 'info', time: '00:00:05' },
  { agent: 'Orchestrator', message: '✅ All systems operational. Awaiting commands.', level: 'info', time: '00:00:06' },
];

export default function AgentTerminalPage() {
  const { agentStates, agentLogs } = useScanStore();
  const [hoveredAgent, setHoveredAgent] = useState<string | null>(null);

  const displayLogs: Array<{ agent: string; message: string; level: string; time?: string; timestamp: Date }> =
    agentLogs.length > 0
      ? agentLogs.map(l => ({ ...l, time: undefined }))
      : sampleLogs.map(l => ({ ...l, timestamp: new Date() }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary flex items-center gap-3">
            <Terminal className="w-6 h-6 text-saksham-primary" />
            Agent Terminal
          </h1>
          <p className="text-sm text-text-muted mt-1">Real-time multi-agent activity monitor</p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg glass">
          <Wifi className="w-3.5 h-3.5 text-saksham-success" />
          <span className="text-xs text-saksham-success font-medium">All Agents Online</span>
        </div>
      </div>

      {/* Agent Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {Object.entries(agentDetails).map(([key, agent], i) => {
          const state = agentStates.find(a => a.type === key);
          const status = state?.status || 'idle';
          return (
            <motion.div
              key={key}
              className={`glass-card rounded-xl p-4 cursor-pointer hover-lift relative ${hoveredAgent === key ? 'border-saksham-primary/30 glow-cyan' : ''}`}
              onMouseEnter={() => setHoveredAgent(key)}
              onMouseLeave={() => setHoveredAgent(null)}
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
                <div className="flex items-center gap-1 group relative">
                  <div className={`w-2 h-2 rounded-full ${
                    status === 'running' ? 'bg-saksham-primary animate-pulse' :
                    status === 'completed' ? 'bg-saksham-success' :
                    status === 'error' ? 'bg-saksham-accent' :
                    'bg-gray-500'
                  }`} />
                  <span className="text-[10px] text-text-muted capitalize flex items-center gap-0.5">
                    {status}
                    <Info className="w-2.5 h-2.5 opacity-40" />
                  </span>
                  {/* Status tooltip */}
                  <div className="absolute bottom-full right-0 mb-2 w-56 p-2 rounded-lg bg-bg-primary border border-border-default shadow-xl text-[10px] text-text-secondary opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50">
                    <p className="font-semibold text-text-primary capitalize mb-0.5">{status}</p>
                    <p>{statusDescriptions[status]}</p>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-4 text-[10px] text-text-muted mt-2">
                <span className="flex items-center gap-1"><Cpu className="w-3 h-3" /> Gemini 2.0</span>
                <span className="flex items-center gap-1"><Activity className="w-3 h-3" /> Ready</span>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Terminal Output */}
      <motion.div
        className="rounded-2xl bg-[#0a0e1a] border border-border-default overflow-hidden"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border-default bg-[#0d1117]">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-[#ff5f57]" />
            <div className="w-3 h-3 rounded-full bg-[#febc2e]" />
            <div className="w-3 h-3 rounded-full bg-[#28c840]" />
          </div>
          <span className="text-xs text-text-muted font-mono flex items-center gap-2">
            <Terminal className="w-3 h-3" />
            saksham-agent-terminal — bash
          </span>
          <span className="ml-auto text-[10px] text-text-muted font-mono flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {new Date().toLocaleTimeString()}
          </span>
        </div>

        <div className="p-4 font-mono text-xs max-h-[400px] overflow-y-auto space-y-0.5">
          <div className="text-saksham-primary mb-2">
            ╔══════════════════════════════════════════════════════════╗
          </div>
          <div className="text-saksham-primary">
            ║  SAKSHAM Multi-Agent Security Platform v1.0             ║
          </div>
          <div className="text-saksham-primary">
            ║  AI-Native Autonomous Cybersecurity System              ║
          </div>
          <div className="text-saksham-primary mb-3">
            ╚══════════════════════════════════════════════════════════╝
          </div>

          {displayLogs.map((log, i) => (
            <motion.div
              key={i}
              className="flex items-start gap-2 py-0.5"
              initial={{ opacity: 0, x: -5 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5 + i * 0.04 }}
            >
              <span className="text-text-muted shrink-0">[{log.time ?? log.timestamp.toLocaleTimeString()}]</span>
              <span className="text-saksham-primary shrink-0">[{log.agent}]</span>
              <span className={`${log.level === 'error' ? 'text-saksham-accent' : log.level === 'warning' ? 'text-saksham-warning' : 'text-text-secondary'}`}>
                {log.message}
              </span>
            </motion.div>
          ))}

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
