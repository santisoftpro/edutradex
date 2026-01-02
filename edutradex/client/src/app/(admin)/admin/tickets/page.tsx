'use client';

import { useState, useEffect } from 'react';
import {
  MessageSquare,
  Clock,
  CheckCircle,
  Loader2,
  Send,
  ArrowLeft,
  MessageCircle,
  User,
  RefreshCw,
  AlertTriangle,
  Inbox,
  Mail,
  MailOpen,
  CheckCheck,
  Archive,
} from 'lucide-react';
import { format } from 'date-fns';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';

type TicketCategory = 'GENERAL' | 'DEPOSIT' | 'WITHDRAWAL' | 'TRADING' | 'ACCOUNT' | 'TECHNICAL';
type TicketPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
type TicketStatus = 'OPEN' | 'IN_PROGRESS' | 'REPLIED' | 'RESOLVED' | 'CLOSED';

interface Ticket {
  id: string;
  ticketNumber: string;
  subject: string;
  message: string;
  category: TicketCategory;
  priority: TicketPriority;
  status: TicketStatus;
  adminReply: string | null;
  repliedBy: string | null;
  repliedAt: string | null;
  closedBy: string | null;
  closedAt: string | null;
  createdAt: string;
  updatedAt: string;
  user: {
    id: string;
    name: string;
    email: string;
  };
}

interface Stats {
  open: number;
  inProgress: number;
  replied: number;
  resolved: number;
  closed: number;
  total: number;
  urgent: number;
}

const STATUS_CONFIG: Record<TicketStatus, { label: string; color: string; bgColor: string; icon: typeof Clock }> = {
  OPEN: { label: 'Open', color: 'text-[#1079ff]', bgColor: 'bg-[#1079ff]/10 border-[#1079ff]/20', icon: Mail },
  IN_PROGRESS: { label: 'In Progress', color: 'text-amber-400', bgColor: 'bg-amber-500/10 border-amber-500/20', icon: Loader2 },
  REPLIED: { label: 'Replied', color: 'text-emerald-400', bgColor: 'bg-emerald-500/10 border-emerald-500/20', icon: MailOpen },
  RESOLVED: { label: 'Resolved', color: 'text-green-400', bgColor: 'bg-green-500/10 border-green-500/20', icon: CheckCheck },
  CLOSED: { label: 'Closed', color: 'text-slate-400', bgColor: 'bg-slate-500/10 border-slate-500/20', icon: Archive },
};

const PRIORITY_CONFIG: Record<TicketPriority, { label: string; color: string; bgColor: string }> = {
  LOW: { label: 'Low', color: 'text-slate-400', bgColor: 'bg-slate-500/10' },
  MEDIUM: { label: 'Medium', color: 'text-blue-400', bgColor: 'bg-blue-500/10' },
  HIGH: { label: 'High', color: 'text-orange-400', bgColor: 'bg-orange-500/10' },
  URGENT: { label: 'Urgent', color: 'text-red-400', bgColor: 'bg-red-500/10' },
};

const CATEGORY_LABELS: Record<TicketCategory, string> = {
  GENERAL: 'General',
  DEPOSIT: 'Deposit',
  WITHDRAWAL: 'Withdrawal',
  TRADING: 'Trading',
  ACCOUNT: 'Account',
  TECHNICAL: 'Technical',
};

export default function AdminTicketsPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [statusFilter, setStatusFilter] = useState<TicketStatus | 'ALL'>('ALL');
  const [isReplying, setIsReplying] = useState(false);
  const [reply, setReply] = useState('');
  const [closeOnReply, setCloseOnReply] = useState(false);

  useEffect(() => {
    fetchData();
  }, [statusFilter]);

  const fetchData = async () => {
    try {
      const [ticketsRes, statsRes] = await Promise.all([
        api.get<{ success: boolean; data: Ticket[] }>('/support/admin/all', {
          params: statusFilter !== 'ALL' ? { status: statusFilter } : {},
        }),
        api.get<{ success: boolean; data: Stats }>('/support/admin/stats'),
      ]);

      if (ticketsRes.success) {
        setTickets(ticketsRes.data);
      }
      if (statsRes.success) {
        setStats(statsRes.data);
      }
    } catch (error) {
      console.error('Failed to fetch tickets:', error);
      toast.error('Failed to load tickets');
    } finally {
      setIsLoading(false);
    }
  };

  const handleReply = async () => {
    if (!selectedTicket || !reply.trim()) {
      toast.error('Please enter a reply');
      return;
    }

    setIsReplying(true);

    try {
      const response = await api.post<{ success: boolean; data: Ticket }>(`/support/admin/${selectedTicket.id}/reply`, {
        reply,
        closeTicket: closeOnReply,
      });

      if (response.success) {
        toast.success(closeOnReply ? 'Reply sent and ticket closed' : 'Reply sent successfully');
        setReply('');
        setCloseOnReply(false);
        setSelectedTicket(response.data);
        fetchData();
      }
    } catch (error) {
      toast.error('Failed to send reply');
      console.error(error);
    } finally {
      setIsReplying(false);
    }
  };

  const handleStatusChange = async (ticketId: string, status: TicketStatus) => {
    try {
      const response = await api.patch<{ success: boolean; data: Ticket }>(`/support/admin/${ticketId}/status`, { status });

      if (response.success) {
        toast.success('Status updated');
        if (selectedTicket?.id === ticketId) {
          setSelectedTicket(response.data);
        }
        fetchData();
      }
    } catch (error) {
      toast.error('Failed to update status');
      console.error(error);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 text-[#1079ff] animate-spin" />
      </div>
    );
  }

  // Ticket detail view
  if (selectedTicket) {
    const statusConfig = STATUS_CONFIG[selectedTicket.status];
    const priorityConfig = PRIORITY_CONFIG[selectedTicket.priority];
    const StatusIcon = statusConfig.icon;

    return (
      <div className="space-y-6">
        <button
          onClick={() => setSelectedTicket(null)}
          className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors group"
        >
          <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
          <span>Back to tickets</span>
        </button>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Main content */}
          <div className="xl:col-span-2 space-y-6">
            <div className="bg-gradient-to-br from-slate-800 to-slate-800/50 rounded-2xl border border-slate-700/50 overflow-hidden">
              {/* Header */}
              <div className="p-6 border-b border-slate-700/50">
                <div className="flex flex-wrap items-center gap-3 mb-3">
                  <span className="text-xs font-mono text-slate-500 bg-slate-700/50 px-2 py-1 rounded">
                    {selectedTicket.ticketNumber}
                  </span>
                  <span className={cn(
                    'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border',
                    statusConfig.bgColor,
                    statusConfig.color
                  )}>
                    <StatusIcon className={cn('h-3 w-3', selectedTicket.status === 'IN_PROGRESS' && 'animate-spin')} />
                    {statusConfig.label}
                  </span>
                  <span className={cn(
                    'px-2.5 py-1 rounded-full text-xs font-medium',
                    priorityConfig.bgColor,
                    priorityConfig.color
                  )}>
                    {priorityConfig.label} Priority
                  </span>
                  <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-slate-700/50 text-slate-300">
                    {CATEGORY_LABELS[selectedTicket.category]}
                  </span>
                </div>
                <h1 className="text-xl font-semibold text-white">{selectedTicket.subject}</h1>
              </div>

              {/* Conversation */}
              <div className="p-6 space-y-6">
                {/* User message */}
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center">
                    <User className="h-5 w-5 text-slate-400" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-medium text-white">{selectedTicket.user.name}</span>
                      <span className="text-sm text-slate-500">{selectedTicket.user.email}</span>
                    </div>
                    <div className="bg-slate-700/30 rounded-2xl rounded-tl-md p-4 border border-slate-700/50">
                      <p className="text-slate-200 whitespace-pre-wrap leading-relaxed">{selectedTicket.message}</p>
                    </div>
                    <p className="text-xs text-slate-500 mt-2 ml-2">
                      {format(new Date(selectedTicket.createdAt), 'MMM d, yyyy')} at {format(new Date(selectedTicket.createdAt), 'h:mm a')}
                    </p>
                  </div>
                </div>

                {/* Admin reply */}
                {selectedTicket.adminReply && (
                  <div className="flex gap-4">
                    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-red-600 flex items-center justify-center">
                      <MessageCircle className="h-5 w-5 text-white" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-medium text-white">Support Team</span>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-red-500/20 text-red-400">Admin</span>
                      </div>
                      <div className="bg-red-500/5 border border-red-500/20 rounded-2xl rounded-tl-md p-4">
                        <p className="text-slate-200 whitespace-pre-wrap leading-relaxed">{selectedTicket.adminReply}</p>
                      </div>
                      {selectedTicket.repliedAt && (
                        <p className="text-xs text-slate-500 mt-2 ml-2">
                          {format(new Date(selectedTicket.repliedAt), 'MMM d, yyyy')} at {format(new Date(selectedTicket.repliedAt), 'h:mm a')}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Reply form */}
                {selectedTicket.status !== 'CLOSED' && (
                  <div className="border-t border-slate-700/50 pt-6">
                    <div className="flex gap-4">
                      <div className="flex-shrink-0 w-10 h-10 rounded-full bg-red-600 flex items-center justify-center">
                        <Send className="h-5 w-5 text-white" />
                      </div>
                      <div className="flex-1 space-y-4">
                        <textarea
                          value={reply}
                          onChange={(e) => setReply(e.target.value)}
                          placeholder="Type your response to the customer..."
                          rows={4}
                          className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#1079ff]/50 focus:border-[#1079ff]/50 transition-all resize-none"
                        />
                        <div className="flex items-center justify-between">
                          <label className="flex items-center gap-2 text-sm text-slate-400 cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={closeOnReply}
                              onChange={(e) => setCloseOnReply(e.target.checked)}
                              className="w-4 h-4 rounded border-slate-600 bg-slate-700 text-red-500 focus:ring-red-500 focus:ring-offset-slate-800"
                            />
                            Close ticket after sending
                          </label>
                          <button
                            onClick={handleReply}
                            disabled={isReplying || !reply.trim()}
                            className="flex items-center gap-2 px-5 py-2.5 bg-red-600 hover:bg-red-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-medium transition-all"
                          >
                            {isReplying ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Send className="h-4 w-4" />
                            )}
                            <span>Send Reply</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* User info */}
            <div className="bg-gradient-to-br from-slate-800 to-slate-800/50 rounded-2xl border border-slate-700/50 p-5">
              <h3 className="text-sm font-medium text-slate-400 mb-4">Customer</h3>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-slate-700 flex items-center justify-center">
                  <User className="h-6 w-6 text-slate-400" />
                </div>
                <div>
                  <p className="font-medium text-white">{selectedTicket.user.name}</p>
                  <p className="text-sm text-slate-400">{selectedTicket.user.email}</p>
                </div>
              </div>
            </div>

            {/* Ticket details */}
            <div className="bg-gradient-to-br from-slate-800 to-slate-800/50 rounded-2xl border border-slate-700/50 p-5">
              <h3 className="text-sm font-medium text-slate-400 mb-4">Details</h3>
              <div className="space-y-4 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-400">Created</span>
                  <span className="text-white">{format(new Date(selectedTicket.createdAt), 'MMM d, yyyy')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Category</span>
                  <span className="text-white">{CATEGORY_LABELS[selectedTicket.category]}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Priority</span>
                  <span className={priorityConfig.color}>{priorityConfig.label}</span>
                </div>
                {selectedTicket.repliedAt && (
                  <div className="flex justify-between">
                    <span className="text-slate-400">Last Reply</span>
                    <span className="text-white">{format(new Date(selectedTicket.repliedAt), 'MMM d')}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Status actions */}
            <div className="bg-gradient-to-br from-slate-800 to-slate-800/50 rounded-2xl border border-slate-700/50 p-5">
              <h3 className="text-sm font-medium text-slate-400 mb-4">Update Status</h3>
              <div className="grid grid-cols-2 gap-2">
                {(Object.keys(STATUS_CONFIG) as TicketStatus[]).map((status) => {
                  const config = STATUS_CONFIG[status];
                  const isActive = selectedTicket.status === status;
                  const Icon = config.icon;

                  return (
                    <button
                      key={status}
                      onClick={() => handleStatusChange(selectedTicket.id, status)}
                      disabled={isActive}
                      className={cn(
                        'flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all border',
                        isActive
                          ? cn(config.bgColor, config.color, 'cursor-default')
                          : 'bg-slate-700/30 border-slate-700 text-slate-400 hover:bg-slate-700/50 hover:text-slate-300'
                      )}
                    >
                      <Icon className={cn('h-3.5 w-3.5', status === 'IN_PROGRESS' && isActive && 'animate-spin')} />
                      {config.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Main tickets list
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Support Tickets</h1>
          <p className="text-slate-400 mt-1">Manage customer support requests</p>
        </div>
        <button
          onClick={fetchData}
          className="flex items-center gap-2 px-4 py-2 bg-slate-700/50 hover:bg-slate-700 text-slate-300 rounded-xl transition-all border border-slate-700"
        >
          <RefreshCw className="h-4 w-4" />
          <span>Refresh</span>
        </button>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
          {[
            { label: 'Open', value: stats.open, color: 'text-[#1079ff]', icon: Mail },
            { label: 'In Progress', value: stats.inProgress, color: 'text-amber-400', icon: Loader2 },
            { label: 'Replied', value: stats.replied, color: 'text-emerald-400', icon: MailOpen },
            { label: 'Resolved', value: stats.resolved, color: 'text-green-400', icon: CheckCheck },
            { label: 'Closed', value: stats.closed, color: 'text-slate-400', icon: Archive },
            { label: 'Total', value: stats.total, color: 'text-white', icon: Inbox },
            { label: 'Urgent', value: stats.urgent, color: 'text-red-400', icon: AlertTriangle, highlight: true },
          ].map((stat) => (
            <div
              key={stat.label}
              className={cn(
                'bg-gradient-to-br from-slate-800 to-slate-800/50 rounded-xl p-4 border',
                stat.highlight && stats.urgent > 0 ? 'border-red-500/30' : 'border-slate-700/50'
              )}
            >
              <div className="flex items-center gap-2 mb-2">
                <stat.icon className={cn('h-4 w-4', stat.color)} />
                <span className="text-xs text-slate-400">{stat.label}</span>
              </div>
              <p className={cn('text-2xl font-bold', stat.color)}>{stat.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setStatusFilter('ALL')}
          className={cn(
            'px-4 py-2 rounded-lg text-sm font-medium transition-all border',
            statusFilter === 'ALL'
              ? 'bg-[#1079ff]/10 border-[#1079ff]/50 text-[#1079ff]'
              : 'bg-slate-700/30 border-slate-700 text-slate-400 hover:bg-slate-700/50'
          )}
        >
          All Tickets
        </button>
        {(Object.keys(STATUS_CONFIG) as TicketStatus[]).map((status) => {
          const config = STATUS_CONFIG[status];
          const Icon = config.icon;
          return (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={cn(
                'inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all border',
                statusFilter === status
                  ? cn(config.bgColor, config.color)
                  : 'bg-slate-700/30 border-slate-700 text-slate-400 hover:bg-slate-700/50'
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {config.label}
            </button>
          );
        })}
      </div>

      {/* Tickets list */}
      {tickets.length === 0 ? (
        <div className="bg-gradient-to-br from-slate-800 to-slate-800/50 rounded-2xl border border-slate-700/50 p-12">
          <div className="max-w-sm mx-auto text-center space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-slate-700/50 flex items-center justify-center mx-auto">
              <Inbox className="h-8 w-8 text-slate-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">No tickets found</h3>
              <p className="text-slate-400 mt-1">
                {statusFilter !== 'ALL' ? 'Try changing the filter to see more tickets' : 'No support tickets have been submitted yet'}
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-gradient-to-br from-slate-800 to-slate-800/50 rounded-2xl border border-slate-700/50 overflow-hidden">
          <div className="divide-y divide-slate-700/50">
            {tickets.map((ticket) => {
              const statusConfig = STATUS_CONFIG[ticket.status];
              const priorityConfig = PRIORITY_CONFIG[ticket.priority];
              const StatusIcon = statusConfig.icon;

              return (
                <button
                  key={ticket.id}
                  onClick={() => setSelectedTicket(ticket)}
                  className="w-full p-4 hover:bg-slate-700/20 transition-all text-left group"
                >
                  <div className="flex items-start gap-4">
                    <div className={cn(
                      'flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center',
                      ticket.status === 'OPEN' ? 'bg-blue-500/10' :
                      ticket.status === 'REPLIED' ? 'bg-emerald-500/10' :
                      'bg-slate-700/50'
                    )}>
                      <StatusIcon className={cn(
                        'h-5 w-5',
                        statusConfig.color,
                        ticket.status === 'IN_PROGRESS' && 'animate-spin'
                      )} />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span className="text-xs font-mono text-slate-500">{ticket.ticketNumber}</span>
                        <span className={cn(
                          'px-2 py-0.5 rounded-full text-xs font-medium border',
                          statusConfig.bgColor,
                          statusConfig.color
                        )}>
                          {statusConfig.label}
                        </span>
                        <span className={cn(
                          'px-2 py-0.5 rounded-full text-xs font-medium',
                          priorityConfig.bgColor,
                          priorityConfig.color
                        )}>
                          {priorityConfig.label}
                        </span>
                      </div>
                      <p className="text-white font-medium truncate mb-1">{ticket.subject}</p>
                      <div className="flex items-center gap-3 text-sm text-slate-500">
                        <span>{ticket.user.name}</span>
                        <span>·</span>
                        <span>{format(new Date(ticket.createdAt), 'MMM d, h:mm a')}</span>
                      </div>
                    </div>

                    <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                      <span className="px-3 py-1.5 bg-[#1079ff]/10 text-[#1079ff] rounded-lg text-sm font-medium">
                        View
                      </span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
