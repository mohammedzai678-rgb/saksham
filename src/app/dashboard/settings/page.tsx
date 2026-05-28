// ============================================================
// SAKSHAM — Settings Page
// Firestore-backed user preferences
// ============================================================

'use client';

import React, { useEffect, useState } from 'react';
import { Settings, User, Bell, Zap } from 'lucide-react';
import { doc, updateDoc } from 'firebase/firestore';
import toast from 'react-hot-toast';
import { useAuth } from '@/lib/auth/auth-context';
import { db } from '@/lib/firebase/config';
import type { ScanDepth } from '@/types';

export default function SettingsPage() {
  const { sakshamUser, user } = useAuth();
  const [notifications, setNotifications] = useState(true);
  const [emailAlerts, setEmailAlerts] = useState(false);
  const [autoRemediate, setAutoRemediate] = useState(false);
  const [defaultScanDepth, setDefaultScanDepth] = useState<ScanDepth>('standard');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!sakshamUser) return;
    queueMicrotask(() => {
      setNotifications(sakshamUser.preferences.notifications);
      setEmailAlerts(sakshamUser.preferences.emailAlerts);
      setAutoRemediate(sakshamUser.preferences.autoRemediate);
      setDefaultScanDepth(sakshamUser.preferences.defaultScanDepth);
    });
  }, [sakshamUser]);

  const save = async () => {
    if (!user) return;
    setSaving(true);
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        preferences: {
          ...(sakshamUser?.preferences || {}),
          notifications,
          emailAlerts,
          autoRemediate,
          defaultScanDepth,
        },
        updatedAt: new Date(),
      });
      toast.success('Settings saved');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text-primary flex items-center gap-3">
          <Settings className="w-6 h-6 text-saksham-primary" />
          Settings
        </h1>
        <p className="text-sm text-text-muted mt-1">Manage Firestore-backed account and scan preferences</p>
      </div>

      <section className="glass-card rounded-xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <User className="w-5 h-5 text-saksham-primary" />
          <h2 className="text-base font-semibold text-text-primary">Profile</h2>
        </div>
        <div className="space-y-4">
          <SettingRow label="Display Name" value={sakshamUser?.displayName || 'User'} />
          <SettingRow label="Email" value={sakshamUser?.email || ''} />
          <SettingRow label="Role" value={sakshamUser?.role || 'developer'} badge />
          <SettingRow label="GitHub Connected" value={sakshamUser?.githubConnected ? 'Yes' : 'No'} badge />
        </div>
      </section>

      <section className="glass-card rounded-xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <Bell className="w-5 h-5 text-saksham-primary" />
          <h2 className="text-base font-semibold text-text-primary">Notifications</h2>
        </div>
        <ToggleRow label="Scan Completions" value={notifications} onChange={setNotifications} />
        <ToggleRow label="Critical Threats" value={notifications} onChange={setNotifications} />
        <ToggleRow label="Email Alerts" value={emailAlerts} onChange={setEmailAlerts} />
      </section>

      <section className="glass-card rounded-xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <Zap className="w-5 h-5 text-saksham-primary" />
          <h2 className="text-base font-semibold text-text-primary">Scan Preferences</h2>
        </div>
        <div className="flex items-center justify-between py-2 border-b border-border-default">
          <span className="text-sm text-text-secondary">Default Scan Depth</span>
          <select
            value={defaultScanDepth}
            onChange={(e) => setDefaultScanDepth(e.target.value as ScanDepth)}
            className="px-3 py-1.5 rounded-lg input-cyber text-sm"
          >
            <option value="shallow">Quick</option>
            <option value="standard">Standard</option>
            <option value="deep">Deep</option>
          </select>
        </div>
        <ToggleRow label="Auto-Remediate" value={autoRemediate} onChange={setAutoRemediate} />
      </section>

      <button onClick={save} disabled={saving} className="w-full py-3 rounded-xl font-semibold text-sm btn-primary disabled:opacity-60">
        {saving ? 'Saving...' : 'Save Changes'}
      </button>
    </div>
  );
}

function SettingRow({ label, value, badge = false }: { label: string; value: string; badge?: boolean }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-border-default last:border-0">
      <span className="text-sm text-text-secondary">{label}</span>
      {badge ? (
        <span className="text-xs px-2 py-1 rounded-lg bg-saksham-primary/15 text-saksham-primary border border-saksham-primary/20 capitalize">{value}</span>
      ) : (
        <span className="text-sm text-text-primary">{value}</span>
      )}
    </div>
  );
}

function ToggleRow({ label, value, onChange }: { label: string; value: boolean; onChange: (value: boolean) => void }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-border-default last:border-0">
      <span className="text-sm text-text-secondary">{label}</span>
      <button
        onClick={() => onChange(!value)}
        className={`w-10 h-5 rounded-full transition-all relative ${value ? 'bg-saksham-primary' : 'bg-bg-elevated border border-border-default'}`}
      >
        <div className={`w-4 h-4 rounded-full bg-white absolute top-0.5 transition-all ${value ? 'left-5' : 'left-0.5'}`} />
      </button>
    </div>
  );
}
