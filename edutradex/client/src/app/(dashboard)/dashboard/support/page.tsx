'use client';

import { useState, useEffect } from 'react';
import {
  MessageSquare,
  Plus,
  Clock,
  CheckCircle,
  Loader2,
  Send,
  ArrowLeft,
  MessageCircle,
  Headphones,
  ChevronRight,
  AlertCircle,
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
  repliedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

const CATEGORIES: { value: TicketCategory; label: string; description: string }[] = [
  { value: 'GENERAL', label: 'General Inquiry', description: 'General questions about our platform' },
  { value: 'DEPOSIT', label: 'Deposit Issue', description: 'Problems with depositing funds' },
  { value: 'WITHDRAWAL', label: 'Withdrawal Issue', description: 'Problems with withdrawing funds' },
  { value: 'TRADING', label: 'Trading Problem', description: 'Issues with trades or orders' },
  { value: 'ACCOUNT', label: 'Account Issue', description: 'Account access or settings' },
  { value: 'TECHNICAL', label: 'Technical Support', description: 'Technical problems or bugs' },
];

const STATUS_CONFIG: Record<TicketStatus, { label: string; color: string; bgColor: string; icon: typeof Clock }> = {
  OPEN: { label: 'Open', color: 'text-[#1079ff]', bgColor: 'bg-[#1079ff]/10 border-[#1079ff]/20', icon: Clock },
  IN_PROGRESS: { label: 'In Progress', color: 'text-amber-400', bgColor: 'bg-amber-500/10 border-amber-500/20', icon: Loader2 },
  REPLIED: { label: 'Replied', color: 'text-emerald-400', bgColor: 'bg-emerald-500/10 border-emerald-500/20', icon: MessageCircle },
  RESOLVED: { label: 'Resolved', color: 'text-green-400', bgColor: 'bg-green-500/10 border-green-500/20', icon: CheckCircle },
  CLOSED: { label: 'Closed', color: 'text-slate-400', bgColor: 'bg-slate-500/10 border-slate-500/20', icon: CheckCircle },
};

export default function SupportPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showNewForm, setShowNewForm] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [category, setCategory] = useState<TicketCategory>('GENERAL');

  useEffect(() => {
    fetchTickets();
  }, []);

  const fetchTickets = async () => {
    try {
      const response = await api.get<{ success: boolean; data: Ticket[] }>('/support/my-tickets');
      if (response.success) {
        setTickets(response.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch tickets:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!subject.trim() || !message.trim()) {
      toast.error('Please fill in all fields');
      return;
    }

    if (subject.length < 5) {
      toast.error('Subject must be at least 5 characters');
      return;
    }

    if (message.length < 20) {
      toast.error('Message must be at least 20 characters');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await api.post<{ success: boolean; message?: string; data?: unknown; error?: string }>('/support', {
        subject,
        message,
        category,
      });

      if (response.success) {
        toast.success('Ticket submitted successfully');
        setSubject('');
        setMessage('');
        setCategory('GENERAL');
        setShowNewForm(false);
        fetchTickets();
      } else {
        toast.error(response.error || 'Failed to submit ticket');
      }
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string; message?: string } } };
      const errorMessage = err.response?.data?.error || err.response?.data?.message || 'Failed to submit ticket';
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
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
    const StatusIcon = statusConfig.icon;

    return (
      <div className="max-w-3xl mx-auto space-y-6">
        <button
          onClick={() => setSelectedTicket(null)}
          className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors group"
        >
          <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
          <span>Back to tickets</span>
        </button>

        <div className="bg-gradient-to-br from-slate-800 to-slate-800/50 rounded-2xl border border-slate-700/50 overflow-hidden">
          {/* Header */}
          <div className="p-6 border-b border-slate-700/50">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-3">
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
                </div>
                <h1 className="text-xl font-semibold text-white">{selectedTicket.subject}</h1>
                <p className="text-sm text-slate-400">
                  Submitted on {format(new Date(selectedTicket.createdAt), 'MMMM d, yyyy')} at {format(new Date(selectedTicket.createdAt), 'h:mm a')}
                </p>
              </div>
            </div>
          </div>

          {/* Conversation */}
          <div className="p-6 space-y-4">
            {/* User message */}
            <div className="flex gap-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center">
                <span className="text-xs font-medium text-slate-300">You</span>
              </div>
              <div className="flex-1">
                <div className="bg-slate-700/50 rounded-2xl rounded-tl-md p-4">
                  <p className="text-slate-200 whitespace-pre-wrap leading-relaxed">{selectedTicket.message}</p>
                </div>
                <p className="text-xs text-slate-500 mt-2 ml-2">
                  {format(new Date(selectedTicket.createdAt), 'MMM d, h:mm a')}
                </p>
              </div>
            </div>

            {/* Admin reply */}
            {selectedTicket.adminReply && (
              <div className="flex gap-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center">
                  <Headphones className="h-4 w-4 text-white" />
                </div>
                <div className="flex-1">
                  <div className="bg-emerald-600/10 border border-emerald-600/20 rounded-2xl rounded-tl-md p-4">
                    <p className="text-sm font-medium text-emerald-400 mb-2">Support Team</p>
                    <p className="text-slate-200 whitespace-pre-wrap leading-relaxed">{selectedTicket.adminReply}</p>
                  </div>
                  {selectedTicket.repliedAt && (
                    <p className="text-xs text-slate-500 mt-2 ml-2">
                      {format(new Date(selectedTicket.repliedAt), 'MMM d, h:mm a')}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Waiting indicator */}
            {!selectedTicket.adminReply && selectedTicket.status !== 'CLOSED' && (
              <div className="flex items-center justify-center py-8">
                <div className="text-center space-y-3">
                  <div className="w-12 h-12 rounded-full bg-slate-700/50 flex items-center justify-center mx-auto">
                    <Clock className="h-6 w-6 text-slate-400" />
                  </div>
                  <div>
                    <p className="text-slate-300 font-medium">Waiting for response</p>
                    <p className="text-sm text-slate-500">Our team typically responds within 24-48 hours</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // New ticket form
  if (showNewForm) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <button
          onClick={() => setShowNewForm(false)}
          className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors group"
        >
          <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
          <span>Back to tickets</span>
        </button>

        <div className="bg-gradient-to-br from-slate-800 to-slate-800/50 rounded-2xl border border-slate-700/50 overflow-hidden">
          <div className="p-6 border-b border-slate-700/50">
            <h1 className="text-xl font-semibold text-white">Create Support Ticket</h1>
            <p className="text-sm text-slate-400 mt-1">Describe your issue and we'll get back to you soon</p>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* Category selection */}
            <div className="space-y-3">
              <label className="block text-sm font-medium text-slate-300">Category</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat.value}
                    type="button"
                    onClick={() => setCategory(cat.value)}
                    className={cn(
                      'p-3 rounded-xl text-left transition-all border',
                      category === cat.value
                        ? 'bg-[#1079ff]/10 border-[#1079ff]/50 text-[#1079ff]'
                        : 'bg-slate-700/30 border-slate-700 text-slate-300 hover:bg-slate-700/50 hover:border-slate-600'
                    )}
                  >
                    <span className="text-sm font-medium">{cat.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Subject */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-300">Subject</label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Brief description of your issue"
                className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#1079ff]/50 focus:border-[#1079ff]/50 transition-all"
              />
            </div>

            {/* Message */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-300">Message</label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Please describe your issue in detail. Include any relevant information that might help us assist you better."
                rows={6}
                className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#1079ff]/50 focus:border-[#1079ff]/50 transition-all resize-none"
              />
              <p className="text-xs text-slate-500">Minimum 20 characters</p>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full flex items-center justify-center gap-2 px-6 py-3.5 bg-gradient-to-r from-[#1079ff] to-[#092ab2] hover:from-[#3a93ff] hover:to-[#1079ff] disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-medium transition-all shadow-lg shadow-[#1079ff]/20"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span>Submitting...</span>
                </>
              ) : (
                <>
                  <Send className="h-5 w-5" />
                  <span>Submit Ticket</span>
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Tickets list
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Support Center</h1>
          <p className="text-slate-400 mt-1">Get help from our support team</p>
        </div>
        <button
          onClick={() => setShowNewForm(true)}
          className="flex items-center justify-center gap-2 px-5 py-2.5 bg-gradient-to-r from-[#1079ff] to-[#092ab2] hover:from-[#3a93ff] hover:to-[#1079ff] text-white rounded-xl font-medium transition-all shadow-lg shadow-[#1079ff]/20"
        >
          <Plus className="h-4 w-4" />
          <span>New Ticket</span>
        </button>
      </div>

      {/* Empty state */}
      {tickets.length === 0 ? (
        <div className="bg-gradient-to-br from-slate-800 to-slate-800/50 rounded-2xl border border-slate-700/50 p-12">
          <div className="max-w-sm mx-auto text-center space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-slate-700/50 flex items-center justify-center mx-auto">
              <Headphones className="h-8 w-8 text-slate-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">No tickets yet</h3>
              <p className="text-slate-400 mt-1">
                Have a question or issue? Create a support ticket and our team will help you.
              </p>
            </div>
            <button
              onClick={() => setShowNewForm(true)}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-[#1079ff] to-[#092ab2] hover:from-[#3a93ff] hover:to-[#1079ff] text-white rounded-xl font-medium transition-all"
            >
              <Plus className="h-4 w-4" />
              <span>Create Ticket</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {tickets.map((ticket) => {
            const statusConfig = STATUS_CONFIG[ticket.status];
            const StatusIcon = statusConfig.icon;
            const hasNewReply = ticket.adminReply && ticket.status === 'REPLIED';

            return (
              <button
                key={ticket.id}
                onClick={() => setSelectedTicket(ticket)}
                className="w-full bg-gradient-to-br from-slate-800 to-slate-800/50 rounded-xl border border-slate-700/50 p-4 hover:border-slate-600 transition-all text-left group"
              >
                <div className="flex items-center gap-4">
                  <div className={cn(
                    'flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center',
                    hasNewReply ? 'bg-emerald-600/20' : 'bg-slate-700/50'
                  )}>
                    {hasNewReply ? (
                      <MessageCircle className="h-5 w-5 text-emerald-400" />
                    ) : (
                      <MessageSquare className="h-5 w-5 text-slate-400" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-mono text-slate-500">{ticket.ticketNumber}</span>
                      <span className={cn(
                        'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border',
                        statusConfig.bgColor,
                        statusConfig.color
                      )}>
                        <StatusIcon className={cn('h-3 w-3', ticket.status === 'IN_PROGRESS' && 'animate-spin')} />
                        {statusConfig.label}
                      </span>
                      {hasNewReply && (
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                          New Reply
                        </span>
                      )}
                    </div>
                    <p className="text-white font-medium truncate">{ticket.subject}</p>
                    <p className="text-sm text-slate-500 mt-0.5">
                      {format(new Date(ticket.createdAt), 'MMM d, yyyy')}
                    </p>
                  </div>

                  <ChevronRight className="h-5 w-5 text-slate-500 group-hover:text-slate-300 group-hover:translate-x-1 transition-all" />
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
