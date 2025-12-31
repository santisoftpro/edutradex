'use client';

import { useEffect, useState } from 'react';
import {
  Users,
  Shield,
  ScrollText,
  Activity,
  Crown,
  UserCheck,
  UserX,
  Clock,
  Loader2,
  ArrowRight,
} from 'lucide-react';
import Link from 'next/link';
import { api, SuperAdminStats } from '@/lib/api';
import { cn } from '@/lib/utils';

export default function SuperAdminDashboard() {
  const [stats, setStats] = useState<SuperAdminStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const data = await (api as any).getSuperAdminStats();
        setStats(data);
      } catch (error) {
        console.error('Failed to fetch stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-10 w-10 text-amber-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Crown className="h-7 w-7 text-amber-500" />
          SuperAdmin Dashboard
        </h1>
        <p className="text-slate-400 mt-1">System administration and monitoring</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-amber-900/30 rounded-lg">
              <Users className="h-6 w-6 text-amber-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{stats?.totalAdmins || 0}</p>
              <p className="text-sm text-slate-400">Total Admins</p>
            </div>
          </div>
        </div>

        <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-emerald-900/30 rounded-lg">
              <UserCheck className="h-6 w-6 text-emerald-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{stats?.activeAdmins || 0}</p>
              <p className="text-sm text-slate-400">Active Admins</p>
            </div>
          </div>
        </div>

        <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-red-900/30 rounded-lg">
              <UserX className="h-6 w-6 text-red-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{stats?.inactiveAdmins || 0}</p>
              <p className="text-sm text-slate-400">Inactive Admins</p>
            </div>
          </div>
        </div>

        <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-purple-900/30 rounded-lg">
              <Shield className="h-6 w-6 text-purple-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{stats?.superAdmins || 0}</p>
              <p className="text-sm text-slate-400">SuperAdmins</p>
            </div>
          </div>
        </div>
      </div>

      {/* Activity Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-400">Actions Today</p>
              <p className="text-3xl font-bold text-white mt-1">{stats?.actionsToday || 0}</p>
            </div>
            <Activity className="h-10 w-10 text-blue-400" />
          </div>
        </div>

        <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-400">Actions This Week</p>
              <p className="text-3xl font-bold text-white mt-1">{stats?.actionsThisWeek || 0}</p>
            </div>
            <ScrollText className="h-10 w-10 text-cyan-400" />
          </div>
        </div>

        <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-400">Actions This Month</p>
              <p className="text-3xl font-bold text-white mt-1">{stats?.actionsThisMonth || 0}</p>
            </div>
            <Clock className="h-10 w-10 text-amber-400" />
          </div>
        </div>
      </div>

      {/* Quick Actions & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Quick Actions */}
        <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
          <h2 className="text-lg font-semibold text-white mb-4">Quick Actions</h2>
          <div className="grid grid-cols-2 gap-3">
            <Link
              href="/superadmin/admins"
              className="flex items-center justify-between p-4 bg-slate-700/50 rounded-lg hover:bg-slate-700 transition-colors"
            >
              <div className="flex items-center gap-3">
                <Users className="h-5 w-5 text-amber-400" />
                <span className="text-white font-medium">Manage Admins</span>
              </div>
              <ArrowRight className="h-4 w-4 text-slate-400" />
            </Link>

            <Link
              href="/superadmin/audit-logs"
              className="flex items-center justify-between p-4 bg-slate-700/50 rounded-lg hover:bg-slate-700 transition-colors"
            >
              <div className="flex items-center gap-3">
                <ScrollText className="h-5 w-5 text-cyan-400" />
                <span className="text-white font-medium">View Logs</span>
              </div>
              <ArrowRight className="h-4 w-4 text-slate-400" />
            </Link>
          </div>
        </div>

        {/* Recent Logins */}
        <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">Recent Admin Logins</h2>
            <Link href="/superadmin/audit-logs" className="text-sm text-amber-400 hover:underline">
              View all
            </Link>
          </div>
          <div className="space-y-3">
            {stats?.recentLogins && stats.recentLogins.length > 0 ? (
              stats.recentLogins.slice(0, 5).map((login, i) => (
                <div key={i} className="flex items-center justify-between py-2 border-b border-slate-700 last:border-0">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 bg-amber-900/30 rounded-full flex items-center justify-center">
                      <Users className="h-4 w-4 text-amber-400" />
                    </div>
                    <div>
                      <p className="text-white text-sm font-medium">{login.adminName}</p>
                      <p className="text-slate-400 text-xs">{login.adminEmail}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-slate-400 text-xs">
                      {new Date(login.loginAt).toLocaleDateString()}
                    </p>
                    <p className="text-slate-500 text-xs">{login.ipAddress || 'Unknown IP'}</p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-slate-400 text-center py-4">No recent logins</p>
            )}
          </div>
        </div>
      </div>

      {/* Top Admins by Activity */}
      <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
        <h2 className="text-lg font-semibold text-white mb-4">Top Admins by Activity (This Month)</h2>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {stats?.topAdminsByActivity && stats.topAdminsByActivity.length > 0 ? (
            stats.topAdminsByActivity.map((admin, i) => (
              <div
                key={admin.adminId}
                className={cn(
                  'p-4 rounded-lg border',
                  i === 0
                    ? 'bg-amber-900/20 border-amber-900/50'
                    : 'bg-slate-700/50 border-slate-700'
                )}
              >
                <div className="flex items-center gap-2 mb-2">
                  {i === 0 && <Crown className="h-4 w-4 text-amber-400" />}
                  <span className="text-slate-400 text-sm">#{i + 1}</span>
                </div>
                <p className="text-white font-medium truncate">{admin.adminName}</p>
                <p className="text-2xl font-bold text-amber-400">{admin.count}</p>
                <p className="text-slate-400 text-xs">actions</p>
              </div>
            ))
          ) : (
            <p className="text-slate-400 col-span-5 text-center py-4">No activity data</p>
          )}
        </div>
      </div>
    </div>
  );
}
