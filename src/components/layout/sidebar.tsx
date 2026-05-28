// ============================================================
// SAKSHAM — Dashboard Sidebar
// Futuristic navigation with glowing icons and agent status
// ============================================================

'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { useUIStore } from '@/lib/store';
import { cn } from '@/lib/utils';
import {
  Shield,
  LayoutDashboard,
  Scan,
  MessageSquare,
  FileText,
  GitBranch,
  Bell,
  Settings,
  LogOut,
  Bot,
  Network,
  ChevronLeft,
  ChevronRight,
  Bug,
  BookOpen,
  History,
} from 'lucide-react';
import { useAuth } from '@/lib/auth/auth-context';

const navItems = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/dashboard/scan', icon: Scan, label: 'Scan Repository' },
  { href: '/dashboard/vulnerabilities', icon: Bug, label: 'Vulnerabilities' },
  { href: '/dashboard/agents', icon: Bot, label: 'Agent Terminal' },
  { href: '/dashboard/chat', icon: MessageSquare, label: 'AI Assistant' },
  { href: '/dashboard/attack-graphs', icon: Network, label: 'Attack Graphs' },
  { href: '/dashboard/reports', icon: FileText, label: 'Reports' },
  { href: '/dashboard/repositories', icon: GitBranch, label: 'Repositories' },
  { href: '/dashboard/history', icon: History, label: 'Scan History' },
  { href: '/dashboard/docs', icon: BookOpen, label: 'Knowledge Base' },
];

const bottomItems = [
  { href: '/dashboard/notifications', icon: Bell, label: 'Notifications' },
  { href: '/dashboard/settings', icon: Settings, label: 'Settings' },
];

export function Sidebar() {
  const pathname = usePathname();
  const { sidebarCollapsed, toggleSidebarCollapsed } = useUIStore();
  const { logout, sakshamUser } = useAuth();

  return (
    <motion.aside
      className={cn(
        'fixed left-0 top-0 h-screen z-40 flex flex-col glass-strong border-r border-border-default',
        'transition-all duration-300 ease-in-out',
        sidebarCollapsed ? 'w-[72px]' : 'w-[260px]'
      )}
      initial={false}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 h-16 border-b border-border-default shrink-0">
        <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-saksham-primary/20 to-saksham-secondary/20 border border-saksham-primary/30 flex items-center justify-center glow-cyan shrink-0">
          <Shield className="w-5 h-5 text-saksham-primary" />
        </div>
        {!sidebarCollapsed && (
          <motion.span
            className="text-lg font-bold tracking-wider gradient-text"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
          >
            SAKSHAM
          </motion.span>
        )}
      </div>

      {/* Nav items */}
      <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group relative',
                isActive
                  ? 'text-saksham-primary bg-saksham-primary/10 border border-saksham-primary/20'
                  : 'text-text-secondary hover:text-text-primary hover:bg-white/5'
              )}
            >
              {isActive && (
                <motion.div
                  className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-saksham-primary"
                  layoutId="activeNav"
                  transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                />
              )}
              <item.icon className={cn('w-[18px] h-[18px] shrink-0', isActive && 'drop-shadow-[0_0_6px_rgba(0,240,255,0.5)]')} />
              {!sidebarCollapsed && (
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.05 }}
                >
                  {item.label}
                </motion.span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Bottom items */}
      <div className="px-3 py-3 space-y-1 border-t border-border-default">
        {bottomItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200',
                isActive
                  ? 'text-saksham-primary bg-saksham-primary/10'
                  : 'text-text-secondary hover:text-text-primary hover:bg-white/5'
              )}
            >
              <item.icon className="w-[18px] h-[18px] shrink-0" />
              {!sidebarCollapsed && <span>{item.label}</span>}
            </Link>
          );
        })}

        {/* User & Logout */}
        <div className="pt-2 border-t border-border-default mt-2">
          <div className={cn('flex items-center gap-3 px-3 py-2', sidebarCollapsed && 'justify-center')}>
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-saksham-primary/30 to-saksham-secondary/30 border border-saksham-primary/20 flex items-center justify-center text-xs font-bold text-saksham-primary shrink-0">
              {sakshamUser?.displayName?.charAt(0)?.toUpperCase() || 'U'}
            </div>
            {!sidebarCollapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-text-primary truncate">{sakshamUser?.displayName || 'User'}</p>
                <p className="text-xs text-text-muted truncate">{sakshamUser?.email || ''}</p>
              </div>
            )}
          </div>
          <button
            onClick={logout}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-text-secondary hover:text-saksham-accent hover:bg-saksham-accent/10 transition-all duration-200 w-full"
          >
            <LogOut className="w-[18px] h-[18px] shrink-0" />
            {!sidebarCollapsed && <span>Sign Out</span>}
          </button>
        </div>
      </div>

      {/* Collapse toggle */}
      <button
        onClick={toggleSidebarCollapsed}
        className="absolute -right-3 top-20 w-6 h-6 rounded-full glass border border-border-default flex items-center justify-center text-text-muted hover:text-saksham-primary hover:border-saksham-primary/30 transition-all z-50"
      >
        {sidebarCollapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
      </button>
    </motion.aside>
  );
}
