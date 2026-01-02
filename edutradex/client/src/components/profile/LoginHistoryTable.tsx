'use client';

import {
  CheckCircle,
  XCircle,
  AlertTriangle,
  MapPin,
  Monitor,
  Smartphone,
  Tablet,
  Clock,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import type { LoginHistoryItem } from '@/types';
import { cn } from '@/lib/utils';
import { useState } from 'react';

interface LoginHistoryTableProps {
  items: LoginHistoryItem[];
  isLoading?: boolean;
}

const deviceIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  desktop: Monitor,
  mobile: Smartphone,
  tablet: Tablet,
};

export function LoginHistoryTable({ items, isLoading }: LoginHistoryTableProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minutes ago`;
    if (diffHours < 24) return `${diffHours} hours ago`;
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="bg-slate-800/30 rounded-lg p-4 animate-pulse"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-slate-700 rounded-lg" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-slate-700 rounded w-1/3" />
                <div className="h-3 bg-slate-700 rounded w-1/4" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="text-center py-8">
        <Clock className="h-10 w-10 text-slate-600 mx-auto mb-3" />
        <p className="text-slate-400 text-sm">No login history available</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {items.map((item) => {
        const DeviceIcon = deviceIcons[item.deviceType] || Monitor;
        const isExpanded = expandedId === item.id;

        return (
          <div
            key={item.id}
            className={cn(
              'bg-slate-800/30 rounded-lg border transition-all',
              item.isSuspicious
                ? 'border-amber-500/30'
                : item.success
                ? 'border-slate-700/30'
                : 'border-red-500/30'
            )}
          >
            <button
              onClick={() => setExpandedId(isExpanded ? null : item.id)}
              className="w-full p-3 flex items-center gap-3 text-left"
            >
              {/* Status Icon */}
              <div
                className={cn(
                  'p-2 rounded-lg shrink-0',
                  item.success ? 'bg-emerald-500/20' : 'bg-red-500/20'
                )}
              >
                {item.success ? (
                  <CheckCircle className="h-4 w-4 text-emerald-400" />
                ) : (
                  <XCircle className="h-4 w-4 text-red-400" />
                )}
              </div>

              {/* Main Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-white font-medium">
                    {item.success ? 'Successful login' : 'Failed login'}
                  </span>
                  {item.isSuspicious && (
                    <AlertTriangle className="h-4 w-4 text-amber-400" />
                  )}
                </div>
                <div className="flex items-center gap-3 mt-0.5 text-xs text-slate-500">
                  <div className="flex items-center gap-1">
                    <DeviceIcon className="h-3 w-3" />
                    <span>{item.browser || 'Unknown'}</span>
                  </div>
                  {(item.country || item.city) && (
                    <div className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      <span>
                        {[item.city, item.country].filter(Boolean).join(', ')}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Time & Expand */}
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-xs text-slate-500">
                  {formatDate(item.attemptedAt)}
                </span>
                {isExpanded ? (
                  <ChevronUp className="h-4 w-4 text-slate-500" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-slate-500" />
                )}
              </div>
            </button>

            {/* Expanded Details */}
            {isExpanded && (
              <div className="px-3 pb-3 pt-0 border-t border-slate-700/30 mt-1">
                <div className="grid grid-cols-2 gap-3 mt-3 text-xs">
                  <div>
                    <span className="text-slate-500">IP Address</span>
                    <p className="text-slate-300 mt-0.5 font-mono">
                      {item.ipAddress}
                    </p>
                  </div>
                  <div>
                    <span className="text-slate-500">Device Type</span>
                    <p className="text-slate-300 mt-0.5 capitalize">
                      {item.deviceType}
                    </p>
                  </div>
                  {!item.success && item.failureReason && (
                    <div className="col-span-2">
                      <span className="text-slate-500">Reason</span>
                      <p className="text-red-400 mt-0.5">
                        {item.failureReason.replace(/_/g, ' ')}
                      </p>
                    </div>
                  )}
                  {item.riskFlags && item.riskFlags.length > 0 && (
                    <div className="col-span-2">
                      <span className="text-slate-500">Risk Flags</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {item.riskFlags.map((flag) => (
                          <span
                            key={flag}
                            className="px-2 py-0.5 bg-amber-500/20 text-amber-400 rounded text-xs"
                          >
                            {flag.replace(/_/g, ' ')}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
