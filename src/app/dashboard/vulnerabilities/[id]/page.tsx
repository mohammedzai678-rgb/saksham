import React from 'react';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';

export default async function VulnerabilityDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = await params;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link 
          href="/dashboard/vulnerabilities"
          className="p-2 hover:bg-saksham-primary/10 rounded-lg transition-colors text-text-muted hover:text-saksham-primary"
        >
          <ChevronLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-2xl font-bold text-text-primary">
          Vulnerability Details
        </h1>
      </div>

      <div className="glass-card rounded-xl p-8">
        <p className="text-text-muted">
          Details for vulnerability ID: <span className="font-mono text-saksham-primary">{resolvedParams.id}</span>
        </p>
      </div>
    </div>
  );
}
