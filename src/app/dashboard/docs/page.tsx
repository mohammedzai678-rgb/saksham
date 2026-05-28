// ============================================================
// SAKSHAM — Knowledge Base / Docs Page
// ============================================================

'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { BookOpen, Shield, Bug, Zap, GitBranch, FileText, Bot, Network } from 'lucide-react';

const topics = [
  { title: 'Getting Started', description: 'How to set up and use SAKSHAM for the first time', icon: Zap, articles: 5 },
  { title: 'Vulnerability Categories', description: 'Understanding SQL injection, XSS, SSRF, and more', icon: Bug, articles: 12 },
  { title: 'Multi-Agent System', description: 'How SAKSHAM\'s AI agents collaborate to secure your code', icon: Bot, articles: 10 },
  { title: 'Scanning Best Practices', description: 'Optimize your security scanning workflow', icon: Shield, articles: 7 },
  { title: 'Attack Graphs', description: 'Understanding attack chains and exploitation paths', icon: Network, articles: 4 },
  { title: 'GitHub Integration', description: 'Setting up webhooks, PR reviews, and automated scanning', icon: GitBranch, articles: 6 },
  { title: 'Remediation Guide', description: 'How to apply patches and fix vulnerabilities', icon: FileText, articles: 8 },
  { title: 'API Reference', description: 'SAKSHAM API documentation for integrations', icon: BookOpen, articles: 15 },
];

export default function DocsPage() {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text-primary flex items-center gap-3">
          <BookOpen className="w-6 h-6 text-saksham-primary" />
          Knowledge Base
        </h1>
        <p className="text-sm text-text-muted mt-1">Learn about cybersecurity concepts and SAKSHAM features</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {topics.map((topic, i) => (
          <motion.div
            key={topic.title}
            className="glass-card rounded-xl p-5 hover-lift cursor-pointer group"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06 }}
          >
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-saksham-primary/10 border border-saksham-primary/20 flex items-center justify-center text-saksham-primary shrink-0">
                <topic.icon className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-text-primary group-hover:text-saksham-primary transition-colors">{topic.title}</h3>
                <p className="text-xs text-text-muted mt-1">{topic.description}</p>
                <span className="text-[10px] text-saksham-primary mt-2 inline-block">{topic.articles} articles</span>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
