'use client';

import { useState } from 'react';
import {
  Settings,
  Crown,
  Info,
  Shield,
  Server,
} from 'lucide-react';

export default function SuperAdminSettingsPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Settings className="h-7 w-7 text-amber-500" />
          SuperAdmin Settings
        </h1>
        <p className="text-slate-400 mt-1">System configuration and preferences</p>
      </div>

      {/* Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* About */}
        <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
          <div className="flex items-center gap-3 mb-4">
            <Crown className="h-6 w-6 text-amber-400" />
            <h2 className="text-lg font-semibold text-white">SuperAdmin Panel</h2>
          </div>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-400">Version</span>
              <span className="text-white">1.0.0</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Role Level</span>
              <span className="text-amber-400 font-medium">SUPERADMIN</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Access Level</span>
              <span className="text-white">Full System Access</span>
            </div>
          </div>
        </div>

        {/* Capabilities */}
        <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
          <div className="flex items-center gap-3 mb-4">
            <Shield className="h-6 w-6 text-emerald-400" />
            <h2 className="text-lg font-semibold text-white">Your Capabilities</h2>
          </div>
          <ul className="space-y-2 text-sm">
            <li className="flex items-center gap-2 text-slate-300">
              <div className="h-1.5 w-1.5 bg-emerald-400 rounded-full" />
              Create and manage admin accounts
            </li>
            <li className="flex items-center gap-2 text-slate-300">
              <div className="h-1.5 w-1.5 bg-emerald-400 rounded-full" />
              Reset admin passwords
            </li>
            <li className="flex items-center gap-2 text-slate-300">
              <div className="h-1.5 w-1.5 bg-emerald-400 rounded-full" />
              Activate/deactivate admins
            </li>
            <li className="flex items-center gap-2 text-slate-300">
              <div className="h-1.5 w-1.5 bg-emerald-400 rounded-full" />
              View complete audit trail
            </li>
            <li className="flex items-center gap-2 text-slate-300">
              <div className="h-1.5 w-1.5 bg-emerald-400 rounded-full" />
              Export audit logs for compliance
            </li>
            <li className="flex items-center gap-2 text-slate-300">
              <div className="h-1.5 w-1.5 bg-emerald-400 rounded-full" />
              All regular admin capabilities
            </li>
          </ul>
        </div>
      </div>

      {/* Security Information */}
      <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
        <div className="flex items-center gap-3 mb-4">
          <Info className="h-6 w-6 text-blue-400" />
          <h2 className="text-lg font-semibold text-white">Security Information</h2>
        </div>
        <div className="space-y-4 text-sm text-slate-300">
          <div className="p-4 bg-amber-900/20 border border-amber-900/50 rounded-lg">
            <p className="text-amber-400 font-medium mb-2">Protected Accounts</p>
            <p className="text-slate-400">
              Accounts marked as protected cannot be deleted. This includes the initial SuperAdmin
              account created via the seed script. You can deactivate protected accounts but not delete them.
            </p>
          </div>
          <div className="p-4 bg-blue-900/20 border border-blue-900/50 rounded-lg">
            <p className="text-blue-400 font-medium mb-2">Audit Logging</p>
            <p className="text-slate-400">
              All actions performed in the admin and superadmin panels are logged to the audit trail.
              This includes logins, user modifications, financial approvals, and configuration changes.
            </p>
          </div>
          <div className="p-4 bg-purple-900/20 border border-purple-900/50 rounded-lg">
            <p className="text-purple-400 font-medium mb-2">Session Management</p>
            <p className="text-slate-400">
              Admin sessions are tracked and can be viewed per admin. You can terminate active sessions
              from the admin detail view if needed for security purposes.
            </p>
          </div>
        </div>
      </div>

      {/* System Info */}
      <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
        <div className="flex items-center gap-3 mb-4">
          <Server className="h-6 w-6 text-cyan-400" />
          <h2 className="text-lg font-semibold text-white">Quick Commands</h2>
        </div>
        <div className="space-y-3">
          <div className="p-4 bg-slate-900 rounded-lg">
            <p className="text-slate-400 text-sm mb-2">Create new SuperAdmin via CLI:</p>
            <code className="text-cyan-400 text-sm font-mono">
              npx tsx src/scripts/seed-superadmin.ts
            </code>
          </div>
          <div className="p-4 bg-slate-900 rounded-lg">
            <p className="text-slate-400 text-sm mb-2">Reset SuperAdmin password:</p>
            <code className="text-cyan-400 text-sm font-mono">
              npx tsx src/scripts/seed-superadmin.ts --reset
            </code>
          </div>
          <div className="p-4 bg-slate-900 rounded-lg">
            <p className="text-slate-400 text-sm mb-2">Custom SuperAdmin credentials:</p>
            <code className="text-cyan-400 text-sm font-mono break-all">
              SUPERADMIN_EMAIL=admin@example.com SUPERADMIN_PASSWORD=SecurePass123! npx tsx src/scripts/seed-superadmin.ts
            </code>
          </div>
        </div>
      </div>
    </div>
  );
}
