// ============================================================
// SAKSHAM — Attack Graph Visualization Page
// Firestore-backed attack-chain diagrams
// ============================================================

'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Network, AlertTriangle, ArrowDown, Shield, Zap, Target } from 'lucide-react';
import { useAttackGraphs } from '@/hooks/use-firestore-collections';
import type { AttackNode } from '@/types';

const nodeColors: Record<string, { bg: string; border: string; text: string; icon: React.ReactNode }> = {
  entry_point: { bg: 'bg-cyan-500/10', border: 'border-cyan-500/30', text: 'text-cyan-400', icon: <Target className="w-4 h-4" /> },
  vulnerability: { bg: 'bg-red-500/10', border: 'border-red-500/30', text: 'text-red-400', icon: <AlertTriangle className="w-4 h-4" /> },
  asset: { bg: 'bg-yellow-500/10', border: 'border-yellow-500/30', text: 'text-yellow-400', icon: <Shield className="w-4 h-4" /> },
  technique: { bg: 'bg-purple-500/10', border: 'border-purple-500/30', text: 'text-purple-400', icon: <Zap className="w-4 h-4" /> },
  impact: { bg: 'bg-red-600/10', border: 'border-red-600/30', text: 'text-red-500', icon: <AlertTriangle className="w-4 h-4" /> },
};

function nodeDescription(node: AttackNode) {
  const metadata = node.metadata || {};
  return String(metadata.description || metadata.filePath || metadata.category || '');
}

export default function AttackGraphsPage() {
  const { data: attackGraphs, loading } = useAttackGraphs();
  const [selectedGraphId, setSelectedGraphId] = useState<string | null>(null);
  const selectedGraph = attackGraphs.find((graph) => graph.id === selectedGraphId) || attackGraphs[0] || null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text-primary flex items-center gap-3">
          <Network className="w-6 h-6 text-saksham-secondary" />
          Attack Graphs
        </h1>
        <p className="text-sm text-text-muted mt-1">Interactive attack-chain visualization generated from scan findings</p>
      </div>

      {loading ? (
        <div className="glass-card rounded-xl p-8 text-center text-sm text-text-muted">Loading attack graphs...</div>
      ) : attackGraphs.length === 0 ? (
        <div className="glass-card rounded-2xl p-10 text-center">
          <Network className="w-10 h-10 text-text-muted mx-auto mb-3" />
          <h2 className="text-lg font-semibold text-text-primary">No attack graphs yet</h2>
          <p className="text-sm text-text-muted mt-1">Run a scan with exploitable findings to generate attack chains.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="space-y-2">
            {attackGraphs.map((graph, i) => (
              <motion.button
                key={graph.id}
                onClick={() => setSelectedGraphId(graph.id)}
                className={`w-full text-left p-4 rounded-xl transition-all ${
                  selectedGraph?.id === graph.id
                    ? 'glass-card border-saksham-primary/30 glow-cyan'
                    : 'glass-card hover:border-border-hover'
                }`}
                initial={{ opacity: 0, x: -15 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.08 }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase badge-${graph.riskLevel}`}>
                    {graph.riskLevel}
                  </span>
                  <span className="text-xs text-text-muted">{graph.nodes.length} steps</span>
                </div>
                <h3 className="text-sm font-semibold text-text-primary mb-1">{graph.title}</h3>
                <p className="text-xs text-text-muted line-clamp-2">{graph.description}</p>
              </motion.button>
            ))}
          </div>

          <div className="lg:col-span-2">
            {selectedGraph && (
              <motion.div key={selectedGraph.id} className="glass-card rounded-2xl p-6" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }}>
                <div className="mb-6">
                  <h2 className="text-lg font-bold text-text-primary mb-1">{selectedGraph.title}</h2>
                  <p className="text-sm text-text-muted">{selectedGraph.description}</p>
                </div>

                <div className="flex flex-col items-center gap-1">
                  {selectedGraph.nodes.map((node, i) => {
                    const style = nodeColors[node.type] || nodeColors.asset;
                    return (
                      <React.Fragment key={node.id}>
                        <motion.div
                          className={`w-full max-w-lg p-4 rounded-xl ${style.bg} border ${style.border} relative`}
                          initial={{ opacity: 0, y: 15 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.12 }}
                        >
                          <div className="flex items-start gap-3">
                            <div className={`${style.text} mt-0.5`}>{style.icon}</div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-0.5">
                                <span className={`text-[10px] uppercase font-semibold tracking-wider ${style.text}`}>
                                  {node.type.replace('_', ' ')}
                                </span>
                                <span className="text-[10px] text-text-muted">Step {i + 1}</span>
                              </div>
                              <h3 className="text-sm font-semibold text-text-primary">{node.label}</h3>
                              {nodeDescription(node) && <p className="text-xs text-text-muted mt-1">{nodeDescription(node)}</p>}
                            </div>
                          </div>
                        </motion.div>
                        {i < selectedGraph.nodes.length - 1 && (
                          <motion.div className="flex flex-col items-center py-1" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                            <div className="w-[1px] h-4 bg-gradient-to-b from-text-muted/40 to-text-muted/10" />
                            <ArrowDown className="w-4 h-4 text-text-muted/50" />
                            <div className="w-[1px] h-4 bg-gradient-to-b from-text-muted/10 to-text-muted/40" />
                          </motion.div>
                        )}
                      </React.Fragment>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
