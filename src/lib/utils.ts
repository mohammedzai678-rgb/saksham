// ============================================================
// SAKSHAM — Utility Functions
// ============================================================

import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: Date | { toDate: () => Date }): string {
  const d = date instanceof Date ? date : date.toDate();
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d);
}

export function formatRelativeTime(date: Date | { toDate: () => Date }): string {
  const d = date instanceof Date ? date : date.toDate();
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffSec < 60) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;
  return formatDate(d);
}

export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength) + '...';
}

export function getSeverityColor(severity: string): string {
  const colors: Record<string, string> = {
    critical: '#ff1744',
    high: '#ff6d00',
    medium: '#ffc400',
    low: '#00e5ff',
    info: '#69f0ae',
  };
  return colors[severity] || '#69f0ae';
}

export function getSeverityGradient(severity: string): string {
  const gradients: Record<string, string> = {
    critical: 'from-red-600 to-red-900',
    high: 'from-orange-500 to-red-700',
    medium: 'from-yellow-500 to-orange-600',
    low: 'from-cyan-400 to-blue-600',
    info: 'from-green-400 to-emerald-600',
  };
  return gradients[severity] || 'from-green-400 to-emerald-600';
}

export function getSecurityScoreColor(score: number): string {
  if (score >= 80) return '#69f0ae';
  if (score >= 60) return '#ffc400';
  if (score >= 40) return '#ff6d00';
  return '#ff1744';
}

export function getSecurityScoreLabel(score: number): string {
  if (score >= 90) return 'Excellent';
  if (score >= 80) return 'Good';
  if (score >= 60) return 'Fair';
  if (score >= 40) return 'Poor';
  return 'Critical';
}

export function generateId(): string {
  return `${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 11)}`;
}

export function extractRepoInfo(url: string): { owner: string; name: string } | null {
  const match = url.match(/github\.com\/([^/]+)\/([^/]+)/);
  if (!match) return null;
  return { owner: match[1], name: match[2].replace('.git', '') };
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
