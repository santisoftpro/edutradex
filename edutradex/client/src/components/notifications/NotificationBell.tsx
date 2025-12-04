'use client';

import { useState, useRef, useEffect } from 'react';
import {
  Bell,
  CheckCircle2,
  XCircle,
  DollarSign,
  ArrowUpFromLine,
  Users,
  TrendingUp,
  TrendingDown,
  Info,
  X,
  Check,
  Trash2,
} from 'lucide-react';
import { useNotificationStore, type NotificationType } from '@/store/notification.store';
import { formatCurrency, cn } from '@/lib/utils';

const notificationConfig: Record<
  NotificationType,
  { icon: typeof Bell; color: string; bgColor: string }
> = {
  deposit_approved: {
    icon: CheckCircle2,
    color: 'text-emerald-400',
    bgColor: 'bg-emerald-500/20',
  },
  deposit_rejected: {
    icon: XCircle,
    color: 'text-red-400',
    bgColor: 'bg-red-500/20',
  },
  withdrawal_approved: {
    icon: ArrowUpFromLine,
    color: 'text-emerald-400',
    bgColor: 'bg-emerald-500/20',
  },
  withdrawal_rejected: {
    icon: XCircle,
    color: 'text-red-400',
    bgColor: 'bg-red-500/20',
  },
  copy_trading_approved: {
    icon: Users,
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/20',
  },
  copy_trading_rejected: {
    icon: Users,
    color: 'text-red-400',
    bgColor: 'bg-red-500/20',
  },
  trade_win: {
    icon: TrendingUp,
    color: 'text-emerald-400',
    bgColor: 'bg-emerald-500/20',
  },
  trade_loss: {
    icon: TrendingDown,
    color: 'text-red-400',
    bgColor: 'bg-red-500/20',
  },
  system: {
    icon: Info,
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/20',
  },
};

function formatTimeAgo(date: Date): string {
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - new Date(date).getTime()) / 1000);

  if (diffInSeconds < 60) return 'Just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
  return new Date(date).toLocaleDateString();
}

export function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    removeNotification,
    clearAll,
  } = useNotificationStore();

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleNotificationClick = (id: string) => {
    markAsRead(id);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 h-5 w-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-80 md:w-96 bg-slate-800 rounded-xl shadow-2xl border border-slate-700 overflow-hidden z-50">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700 bg-slate-800/80">
            <div className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-emerald-400" />
              <h3 className="font-semibold text-white">Notifications</h3>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 text-xs font-medium rounded-full">
                  {unreadCount} new
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="p-1.5 text-slate-400 hover:text-emerald-400 hover:bg-slate-700 rounded-lg transition-colors"
                  title="Mark all as read"
                >
                  <Check className="h-4 w-4" />
                </button>
              )}
              {notifications.length > 0 && (
                <button
                  onClick={clearAll}
                  className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-700 rounded-lg transition-colors"
                  title="Clear all"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

          {/* Notifications List */}
          <div className="max-h-[400px] overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="py-12 text-center">
                <Bell className="h-12 w-12 text-slate-600 mx-auto mb-3" />
                <p className="text-slate-400">No notifications yet</p>
                <p className="text-slate-500 text-sm mt-1">
                  We'll notify you when something happens
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-700/50">
                {notifications.map((notification) => {
                  const config = notificationConfig[notification.type];
                  const Icon = config.icon;

                  return (
                    <div
                      key={notification.id}
                      onClick={() => handleNotificationClick(notification.id)}
                      className={cn(
                        'flex gap-3 p-4 cursor-pointer transition-colors hover:bg-slate-700/50',
                        !notification.read && 'bg-slate-700/30'
                      )}
                    >
                      {/* Icon */}
                      <div
                        className={cn(
                          'flex-shrink-0 h-10 w-10 rounded-full flex items-center justify-center',
                          config.bgColor
                        )}
                      >
                        <Icon className={cn('h-5 w-5', config.color)} />
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p
                            className={cn(
                              'font-medium text-sm',
                              notification.read ? 'text-slate-300' : 'text-white'
                            )}
                          >
                            {notification.title}
                          </p>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              removeNotification(notification.id);
                            }}
                            className="flex-shrink-0 p-1 text-slate-500 hover:text-red-400 rounded transition-colors"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                        <p className="text-slate-400 text-sm mt-0.5 line-clamp-2">
                          {notification.message}
                        </p>
                        {notification.amount !== undefined && (
                          <p className={cn('text-sm font-semibold mt-1', config.color)}>
                            {formatCurrency(notification.amount)}
                          </p>
                        )}
                        <p className="text-slate-500 text-xs mt-1">
                          {formatTimeAgo(notification.createdAt)}
                        </p>
                      </div>

                      {/* Unread indicator */}
                      {!notification.read && (
                        <div className="flex-shrink-0 h-2 w-2 bg-emerald-500 rounded-full mt-2" />
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="px-4 py-3 border-t border-slate-700 bg-slate-800/80">
              <p className="text-center text-slate-500 text-xs">
                Showing last {notifications.length} notifications
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
