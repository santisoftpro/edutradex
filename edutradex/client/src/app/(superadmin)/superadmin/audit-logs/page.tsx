'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  ScrollText,
  Search,
  Download,
  Filter,
  Calendar,
  User,
  Activity,
  Loader2,
  ChevronDown,
  ChevronUp,
  X,
} from 'lucide-react';
import { api, AuditLog, PaginatedResponse } from '@/lib/api';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';

const ACTION_TYPES = [
  'LOGIN', 'LOGOUT',
  'USER_CREATE', 'USER_UPDATE', 'USER_DELETE', 'USER_STATUS_CHANGE', 'USER_BALANCE_RESET',
  'USER_IMPERSONATE', 'USER_IMPERSONATE_END',
  'ROLE_CHANGE',
  'DEPOSIT_APPROVE', 'DEPOSIT_REJECT',
  'WITHDRAWAL_APPROVE', 'WITHDRAWAL_REJECT',
  'KYC_APPROVE', 'KYC_REJECT',
  'SETTINGS_CHANGE',
  'ADMIN_CREATE', 'ADMIN_UPDATE', 'ADMIN_DELETE', 'ADMIN_PASSWORD_RESET', 'ADMIN_ACTIVATE', 'ADMIN_DEACTIVATE',
  'LEADER_APPROVE', 'LEADER_REJECT', 'LEADER_SUSPEND',
  'OTC_CONFIG_CHANGE', 'MARKET_CONFIG_CHANGE',
  'TICKET_REPLY', 'TICKET_CLOSE',
  'PAYMENT_METHOD_CREATE', 'PAYMENT_METHOD_UPDATE', 'PAYMENT_METHOD_DELETE',
];

const TARGET_TYPES = [
  'USER', 'DEPOSIT', 'WITHDRAWAL', 'SETTINGS', 'ADMIN', 'KYC', 'LEADER', 'TICKET', 'OTC', 'MARKET', 'PAYMENT_METHOD',
];

const getActionColor = (actionType: string): string => {
  if (actionType.includes('DELETE') || actionType.includes('REJECT') || actionType.includes('SUSPEND')) {
    return 'bg-red-900/50 text-red-400';
  }
  if (actionType.includes('APPROVE') || actionType.includes('CREATE') || actionType.includes('ACTIVATE')) {
    return 'bg-emerald-900/50 text-emerald-400';
  }
  if (actionType.includes('UPDATE') || actionType.includes('CHANGE')) {
    return 'bg-blue-900/50 text-blue-400';
  }
  if (actionType === 'LOGIN' || actionType === 'LOGOUT') {
    return 'bg-amber-900/50 text-amber-400';
  }
  if (actionType.includes('IMPERSONATE')) {
    return 'bg-orange-900/50 text-orange-400';
  }
  return 'bg-slate-700 text-slate-400';
};

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [actionType, setActionType] = useState('');
  const [targetType, setTargetType] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const fetchLogs = useCallback(async () => {
    try {
      setLoading(true);
      const result: PaginatedResponse<AuditLog> = await (api as any).getAuditLogs({
        page: pagination.page,
        limit: pagination.limit,
        search: search || undefined,
        actionType: actionType || undefined,
        targetType: targetType || undefined,
        from: fromDate || undefined,
        to: toDate || undefined,
      });
      setLogs(result.data);
      setPagination(prev => ({ ...prev, ...result.pagination }));
    } catch (error) {
      console.error('Failed to fetch logs:', error);
      toast.error('Failed to load audit logs');
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, search, actionType, targetType, fromDate, toDate]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const handleExport = async () => {
    setExporting(true);
    try {
      const csv = await (api as any).exportAuditLogs({
        actionType: actionType || undefined,
        targetType: targetType || undefined,
        from: fromDate || undefined,
        to: toDate || undefined,
      });

      const blob = new Blob([csv], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `audit-logs-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      toast.success('Audit logs exported');
    } catch (error) {
      console.error('Failed to export:', error);
      toast.error('Failed to export logs');
    } finally {
      setExporting(false);
    }
  };

  const clearFilters = () => {
    setSearch('');
    setActionType('');
    setTargetType('');
    setFromDate('');
    setToDate('');
  };

  const hasFilters = search || actionType || targetType || fromDate || toDate;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <ScrollText className="h-7 w-7 text-amber-500" />
            Audit Logs
          </h1>
          <p className="text-slate-400 mt-1">Track all administrative actions</p>
        </div>
        <button
          onClick={handleExport}
          disabled={exporting}
          className="flex items-center gap-2 px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors disabled:opacity-50"
        >
          {exporting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Download className="h-4 w-4" />
          )}
          Export CSV
        </button>
      </div>

      {/* Search & Filter Toggle */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search logs..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-amber-500"
          />
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors',
            showFilters
              ? 'bg-amber-900/30 border-amber-900/50 text-amber-400'
              : 'bg-slate-800 border-slate-700 text-white hover:bg-slate-700'
          )}
        >
          <Filter className="h-4 w-4" />
          Filters
          {hasFilters && (
            <span className="h-2 w-2 bg-amber-400 rounded-full" />
          )}
        </button>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="bg-slate-800 rounded-xl border border-slate-700 p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm text-slate-400 mb-1">Action Type</label>
              <select
                value={actionType}
                onChange={(e) => setActionType(e.target.value)}
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-amber-500"
              >
                <option value="">All Actions</option>
                {ACTION_TYPES.map(type => (
                  <option key={type} value={type}>{type.replace(/_/g, ' ')}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1">Target Type</label>
              <select
                value={targetType}
                onChange={(e) => setTargetType(e.target.value)}
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-amber-500"
              >
                <option value="">All Targets</option>
                {TARGET_TYPES.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1">From Date</label>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-amber-500"
              />
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1">To Date</label>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>
          {hasFilters && (
            <button
              onClick={clearFilters}
              className="mt-4 flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors"
            >
              <X className="h-4 w-4" />
              Clear all filters
            </button>
          )}
        </div>
      )}

      {/* Logs List */}
      <div className="bg-slate-800 rounded-xl border border-slate-700">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 text-amber-500 animate-spin" />
          </div>
        ) : logs.length === 0 ? (
          <div className="text-center py-12 text-slate-400">
            No audit logs found
          </div>
        ) : (
          <div className="divide-y divide-slate-700">
            {logs.map((log) => (
              <div key={log.id} className="p-4 hover:bg-slate-700/30 transition-colors">
                <div
                  className="flex items-start justify-between cursor-pointer"
                  onClick={() => setExpandedLogId(expandedLogId === log.id ? null : log.id)}
                >
                  <div className="flex items-start gap-4">
                    <div className="p-2 bg-slate-700 rounded-lg">
                      <Activity className="h-5 w-5 text-amber-400" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={cn(
                          'px-2 py-0.5 rounded text-xs font-medium',
                          getActionColor(log.actionType)
                        )}>
                          {log.actionType.replace(/_/g, ' ')}
                        </span>
                        {log.targetType && (
                          <span className="px-2 py-0.5 bg-slate-700 text-slate-300 rounded text-xs">
                            {log.targetType}
                          </span>
                        )}
                      </div>
                      <p className="text-white mt-1">{log.description}</p>
                      <div className="flex items-center gap-4 mt-2 text-sm text-slate-400">
                        <span className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {log.adminName || 'Unknown'}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {new Date(log.createdAt).toLocaleString()}
                        </span>
                        {log.ipAddress && (
                          <span className="text-slate-500">{log.ipAddress}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <button className="p-1 text-slate-400">
                    {expandedLogId === log.id ? (
                      <ChevronUp className="h-5 w-5" />
                    ) : (
                      <ChevronDown className="h-5 w-5" />
                    )}
                  </button>
                </div>

                {/* Expanded Details */}
                {expandedLogId === log.id && (
                  <div className="mt-4 pt-4 border-t border-slate-700">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {log.previousValue && (
                        <div>
                          <p className="text-sm text-slate-400 mb-2">Previous Value</p>
                          <pre className="p-3 bg-slate-900 rounded-lg text-xs text-slate-300 overflow-auto max-h-40">
                            {JSON.stringify(log.previousValue, null, 2)}
                          </pre>
                        </div>
                      )}
                      {log.newValue && (
                        <div>
                          <p className="text-sm text-slate-400 mb-2">New Value</p>
                          <pre className="p-3 bg-slate-900 rounded-lg text-xs text-slate-300 overflow-auto max-h-40">
                            {JSON.stringify(log.newValue, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                    {log.metadata && (
                      <div className="mt-4">
                        <p className="text-sm text-slate-400 mb-2">Metadata</p>
                        <pre className="p-3 bg-slate-900 rounded-lg text-xs text-slate-300 overflow-auto max-h-40">
                          {JSON.stringify(log.metadata, null, 2)}
                        </pre>
                      </div>
                    )}
                    <div className="mt-4 flex flex-wrap gap-4 text-sm text-slate-500">
                      <span>ID: {log.id}</span>
                      <span>Admin ID: {log.adminId}</span>
                      {log.targetId && <span>Target ID: {log.targetId}</span>}
                      {log.userAgent && <span className="truncate max-w-xs">UA: {log.userAgent}</span>}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="px-4 py-3 border-t border-slate-700 flex items-center justify-between">
            <p className="text-sm text-slate-400">
              Showing {(pagination.page - 1) * pagination.limit + 1} to{' '}
              {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                disabled={pagination.page === 1}
                className="px-3 py-1 bg-slate-700 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <button
                onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                disabled={pagination.page === pagination.totalPages}
                className="px-3 py-1 bg-slate-700 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
