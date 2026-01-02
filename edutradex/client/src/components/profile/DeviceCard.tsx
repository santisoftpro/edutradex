'use client';

import { useState } from 'react';
import {
  Monitor,
  Smartphone,
  Tablet,
  HelpCircle,
  Shield,
  ShieldCheck,
  ShieldX,
  Trash2,
  MapPin,
  Clock,
  Loader2,
} from 'lucide-react';
import type { ProfileDevice } from '@/types';
import { cn } from '@/lib/utils';

interface DeviceCardProps {
  device: ProfileDevice;
  onRemove: (deviceId: string) => Promise<void>;
  onTrust: (deviceId: string) => Promise<void>;
}

const deviceIcons = {
  desktop: Monitor,
  mobile: Smartphone,
  tablet: Tablet,
  unknown: HelpCircle,
};

export function DeviceCard({ device, onRemove, onTrust }: DeviceCardProps) {
  const [isRemoving, setIsRemoving] = useState(false);
  const [isTrusting, setIsTrusting] = useState(false);

  const DeviceIcon = deviceIcons[device.deviceType] || HelpCircle;

  const handleRemove = async () => {
    if (device.isCurrent) return;
    setIsRemoving(true);
    try {
      await onRemove(device.id);
    } finally {
      setIsRemoving(false);
    }
  };

  const handleTrust = async () => {
    if (device.isTrusted) return;
    setIsTrusting(true);
    try {
      await onTrust(device.id);
    } finally {
      setIsTrusting(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const getBrowserDisplay = () => {
    if (!device.browser) return 'Unknown browser';
    return device.browserVersion
      ? `${device.browser} ${device.browserVersion}`
      : device.browser;
  };

  const getOsDisplay = () => {
    if (!device.os) return 'Unknown OS';
    return device.osVersion ? `${device.os} ${device.osVersion}` : device.os;
  };

  return (
    <div
      className={cn(
        'bg-slate-800/50 border rounded-xl p-4 transition-all',
        device.isCurrent
          ? 'border-emerald-500/50 ring-1 ring-emerald-500/20'
          : device.isBlocked
          ? 'border-red-500/50'
          : 'border-slate-700/50'
      )}
    >
      <div className="flex items-start justify-between gap-3">
        {/* Device Info */}
        <div className="flex items-start gap-3 min-w-0 flex-1">
          <div
            className={cn(
              'p-2.5 rounded-lg shrink-0',
              device.isCurrent
                ? 'bg-emerald-500/20'
                : device.isBlocked
                ? 'bg-red-500/20'
                : 'bg-slate-700/50'
            )}
          >
            <DeviceIcon
              className={cn(
                'h-5 w-5',
                device.isCurrent
                  ? 'text-emerald-400'
                  : device.isBlocked
                  ? 'text-red-400'
                  : 'text-slate-400'
              )}
            />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-medium text-white truncate">
                {getBrowserDisplay()}
              </span>
              {device.isCurrent && (
                <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 text-xs rounded-full">
                  Current
                </span>
              )}
              {device.isTrusted && !device.isCurrent && (
                <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 text-xs rounded-full">
                  Trusted
                </span>
              )}
              {device.isBlocked && (
                <span className="px-2 py-0.5 bg-red-500/20 text-red-400 text-xs rounded-full">
                  Blocked
                </span>
              )}
            </div>

            <p className="text-xs text-slate-500 mt-0.5">{getOsDisplay()}</p>

            <div className="flex items-center gap-3 mt-2 text-xs text-slate-500">
              {device.lastCountry && (
                <div className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  <span>{device.lastCountry}</span>
                </div>
              )}
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                <span>{formatDate(device.lastSeenAt)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Trust Score & Actions */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Trust Score */}
          <div className="text-center mr-2">
            <div
              className={cn(
                'text-lg font-bold',
                device.trustScore >= 80
                  ? 'text-emerald-400'
                  : device.trustScore >= 50
                  ? 'text-amber-400'
                  : 'text-red-400'
              )}
            >
              {device.trustScore}
            </div>
            <div className="text-[10px] text-slate-500 uppercase">Trust</div>
          </div>

          {/* Trust Button */}
          {!device.isTrusted && !device.isBlocked && !device.isCurrent && (
            <button
              onClick={handleTrust}
              disabled={isTrusting}
              className="p-2 rounded-lg bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 transition-colors disabled:opacity-50"
              title="Trust this device"
            >
              {isTrusting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ShieldCheck className="h-4 w-4" />
              )}
            </button>
          )}

          {/* Remove Button */}
          {!device.isCurrent && (
            <button
              onClick={handleRemove}
              disabled={isRemoving}
              className="p-2 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors disabled:opacity-50"
              title="Remove this device"
            >
              {isRemoving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
            </button>
          )}

          {/* Status Icons */}
          {device.isTrusted && (
            <span title="Trusted device">
              <Shield className="h-5 w-5 text-blue-400" />
            </span>
          )}
          {device.isBlocked && (
            <span title="Blocked device">
              <ShieldX className="h-5 w-5 text-red-400" />
            </span>
          )}
        </div>
      </div>

      {/* Login count */}
      <div className="mt-3 pt-3 border-t border-slate-700/50 flex items-center justify-between text-xs text-slate-500">
        <span>
          First seen: {new Date(device.firstSeenAt).toLocaleDateString()}
        </span>
        <span>{device.loginCount} logins</span>
      </div>
    </div>
  );
}
