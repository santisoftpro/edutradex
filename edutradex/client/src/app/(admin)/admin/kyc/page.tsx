'use client';

import { useEffect, useState } from 'react';
import {
  FileCheck,
  Loader2,
  CheckCircle,
  XCircle,
  Clock,
  Filter,
  ChevronLeft,
  ChevronRight,
  User,
  AlertCircle,
  Eye,
  Image,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '@/lib/api';
import { formatDate, cn } from '@/lib/utils';
import type { KYCSubmission, KYCStats, KYCStatus } from '@/types';

function StatCard({
  title,
  value,
  icon: Icon,
  color,
}: {
  title: string;
  value: string | number;
  icon: React.ElementType;
  color: string;
}) {
  const colorClasses: Record<string, string> = {
    amber: 'bg-amber-600/20 text-amber-500',
    emerald: 'bg-emerald-600/20 text-emerald-500',
    red: 'bg-red-600/20 text-red-500',
    slate: 'bg-slate-600/20 text-slate-400',
  };

  return (
    <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg ${colorClasses[color]}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-sm text-slate-400">{title}</p>
          <p className="text-xl font-bold text-white">{value}</p>
        </div>
      </div>
    </div>
  );
}

function ViewKYCModal({
  kyc,
  onClose,
  onApprove,
  onReject,
}: {
  kyc: KYCSubmission;
  onClose: () => void;
  onApprove: () => void;
  onReject: (reason: string) => void;
}) {
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectForm, setShowRejectForm] = useState(false);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-auto">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-slate-800 rounded-xl p-6 max-w-3xl w-full mx-4 my-8 border border-slate-700 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-white">KYC Submission Details</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <XCircle className="h-6 w-6" />
          </button>
        </div>

        {/* User Info */}
        <div className="bg-slate-700/50 rounded-lg p-4 mb-6">
          <h4 className="text-white font-medium mb-3">User Information</h4>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-slate-400">Name:</span>
              <span className="text-white ml-2">{kyc.user?.name}</span>
            </div>
            <div>
              <span className="text-slate-400">Email:</span>
              <span className="text-white ml-2">{kyc.user?.email}</span>
            </div>
            <div>
              <span className="text-slate-400">Registered:</span>
              <span className="text-white ml-2">{kyc.user?.createdAt ? formatDate(kyc.user.createdAt) : 'N/A'}</span>
            </div>
          </div>
        </div>

        {/* Personal Info */}
        <div className="bg-slate-700/50 rounded-lg p-4 mb-6">
          <h4 className="text-white font-medium mb-3">Personal Information</h4>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-slate-400">Full Name:</span>
              <span className="text-white ml-2">{kyc.firstName} {kyc.lastName}</span>
            </div>
            <div>
              <span className="text-slate-400">Date of Birth:</span>
              <span className="text-white ml-2">{kyc.dateOfBirth ? formatDate(kyc.dateOfBirth) : 'N/A'}</span>
            </div>
            <div>
              <span className="text-slate-400">Nationality:</span>
              <span className="text-white ml-2">{kyc.nationality}</span>
            </div>
            <div>
              <span className="text-slate-400">Phone:</span>
              <span className="text-white ml-2">{kyc.phoneNumber}</span>
            </div>
            <div className="col-span-2">
              <span className="text-slate-400">Address:</span>
              <span className="text-white ml-2">{kyc.address}, {kyc.city}, {kyc.country} {kyc.postalCode}</span>
            </div>
          </div>
        </div>

        {/* Document Info */}
        <div className="bg-slate-700/50 rounded-lg p-4 mb-6">
          <h4 className="text-white font-medium mb-3">Document Information</h4>
          <div className="grid grid-cols-2 gap-4 text-sm mb-4">
            <div>
              <span className="text-slate-400">Document Type:</span>
              <span className="text-white ml-2">{kyc.documentType?.replace(/_/g, ' ')}</span>
            </div>
            <div>
              <span className="text-slate-400">Document Number:</span>
              <span className="text-white ml-2">{kyc.documentNumber}</span>
            </div>
          </div>

          {/* Document Images */}
          <div className="grid grid-cols-3 gap-4">
            {kyc.documentFront && (
              <div>
                <p className="text-slate-400 text-sm mb-2">Document Front</p>
                <a
                  href={`${process.env.NEXT_PUBLIC_API_URL?.replace('/api', '')}/${kyc.documentFront}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center h-24 bg-slate-600 rounded-lg hover:bg-slate-500 transition-colors"
                >
                  <Image className="h-8 w-8 text-slate-400" />
                </a>
              </div>
            )}
            {kyc.documentBack && (
              <div>
                <p className="text-slate-400 text-sm mb-2">Document Back</p>
                <a
                  href={`${process.env.NEXT_PUBLIC_API_URL?.replace('/api', '')}/${kyc.documentBack}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center h-24 bg-slate-600 rounded-lg hover:bg-slate-500 transition-colors"
                >
                  <Image className="h-8 w-8 text-slate-400" />
                </a>
              </div>
            )}
            {kyc.selfieWithId && (
              <div>
                <p className="text-slate-400 text-sm mb-2">Selfie with ID</p>
                <a
                  href={`${process.env.NEXT_PUBLIC_API_URL?.replace('/api', '')}/${kyc.selfieWithId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center h-24 bg-slate-600 rounded-lg hover:bg-slate-500 transition-colors"
                >
                  <Image className="h-8 w-8 text-slate-400" />
                </a>
              </div>
            )}
          </div>
        </div>

        {/* Submission Info */}
        <div className="bg-slate-700/50 rounded-lg p-4 mb-6">
          <h4 className="text-white font-medium mb-3">Submission Details</h4>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-slate-400">Submitted:</span>
              <span className="text-white ml-2">{kyc.submittedAt ? formatDate(kyc.submittedAt) : 'N/A'}</span>
            </div>
            <div>
              <span className="text-slate-400">Status:</span>
              <span className={cn(
                'ml-2 px-2 py-0.5 rounded-full text-xs font-medium',
                kyc.status === 'PENDING' && 'bg-yellow-600/20 text-yellow-500',
                kyc.status === 'APPROVED' && 'bg-emerald-600/20 text-emerald-500',
                kyc.status === 'REJECTED' && 'bg-red-600/20 text-red-500',
              )}>
                {kyc.status}
              </span>
            </div>
            {kyc.reviewedAt && (
              <div>
                <span className="text-slate-400">Reviewed:</span>
                <span className="text-white ml-2">{formatDate(kyc.reviewedAt)}</span>
              </div>
            )}
            {kyc.rejectionReason && (
              <div className="col-span-2">
                <span className="text-slate-400">Rejection Reason:</span>
                <span className="text-red-400 ml-2">{kyc.rejectionReason}</span>
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        {kyc.status === 'PENDING' && (
          <div className="space-y-4">
            {!showRejectForm ? (
              <div className="flex gap-3">
                <button
                  onClick={onApprove}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg transition-colors"
                >
                  <CheckCircle className="h-5 w-5" />
                  Approve KYC
                </button>
                <button
                  onClick={() => setShowRejectForm(true)}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors"
                >
                  <XCircle className="h-5 w-5" />
                  Reject KYC
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <label className="block text-slate-400 text-sm">Rejection Reason *</label>
                <textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Please provide a reason for rejection..."
                  className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  rows={3}
                />
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowRejectForm(false)}
                    className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      if (!rejectionReason.trim()) {
                        toast.error('Please provide a rejection reason');
                        return;
                      }
                      onReject(rejectionReason);
                    }}
                    className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                  >
                    Confirm Rejection
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function AdminKYCPage() {
  const [submissions, setSubmissions] = useState<KYCSubmission[]>([]);
  const [stats, setStats] = useState<KYCStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [selectedKYC, setSelectedKYC] = useState<KYCSubmission | null>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState<KYCStatus | ''>('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const limit = 20;

  useEffect(() => {
    loadData();
  }, [statusFilter, page]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [submissionsRes, statsRes] = await Promise.all([
        api.getAdminKYCSubmissions({
          status: statusFilter || undefined,
          page,
          limit,
        }),
        api.getKYCStats(),
      ]);
      setSubmissions(submissionsRes.data);
      setTotalPages(submissionsRes.pagination.totalPages);
      setStats(statsRes);
    } catch (error) {
      console.error('Failed to load KYC data:', error);
      toast.error('Failed to load KYC submissions');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id: string) => {
    setProcessing(id);
    try {
      await api.approveKYC(id);
      toast.success('KYC approved successfully');
      setSelectedKYC(null);
      loadData();
    } catch (error) {
      console.error('Failed to approve KYC:', error);
      toast.error('Failed to approve KYC');
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async (id: string, reason: string) => {
    setProcessing(id);
    try {
      await api.rejectKYC(id, reason);
      toast.success('KYC rejected');
      setSelectedKYC(null);
      loadData();
    } catch (error) {
      console.error('Failed to reject KYC:', error);
      toast.error('Failed to reject KYC');
    } finally {
      setProcessing(null);
    }
  };

  const getStatusBadge = (status: KYCStatus) => {
    const configs = {
      NOT_SUBMITTED: { color: 'bg-slate-600/20 text-slate-400', icon: AlertCircle },
      PENDING: { color: 'bg-yellow-600/20 text-yellow-500', icon: Clock },
      APPROVED: { color: 'bg-emerald-600/20 text-emerald-500', icon: CheckCircle },
      REJECTED: { color: 'bg-red-600/20 text-red-500', icon: XCircle },
    };
    const config = configs[status];
    const Icon = config.icon;
    return (
      <span className={cn('inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium', config.color)}>
        <Icon className="h-3 w-3" />
        {status.replace(/_/g, ' ')}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">KYC Verification</h1>
        <p className="text-slate-400 mt-1">Review and manage user identity verifications</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard title="Pending" value={stats?.pending || 0} icon={Clock} color="amber" />
        <StatCard title="Approved" value={stats?.approved || 0} icon={CheckCircle} color="emerald" />
        <StatCard title="Rejected" value={stats?.rejected || 0} icon={XCircle} color="red" />
        <StatCard title="Not Started" value={stats?.notSubmitted || 0} icon={AlertCircle} color="slate" />
      </div>

      {/* Filters */}
      <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-slate-400" />
            <span className="text-slate-400 text-sm">Filter:</span>
          </div>
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value as KYCStatus | '');
              setPage(1);
            }}
            className="px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
          >
            <option value="">All Status</option>
            <option value="PENDING">Pending</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
            <option value="NOT_SUBMITTED">Not Submitted</option>
          </select>
        </div>
      </div>

      {/* Submissions Table */}
      <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
          </div>
        ) : submissions.length === 0 ? (
          <div className="text-center py-12">
            <FileCheck className="h-12 w-12 text-slate-600 mx-auto mb-4" />
            <p className="text-slate-400">No KYC submissions found</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-700/50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">User</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Name</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Document</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Submitted</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700">
                  {submissions.map((kyc) => (
                    <tr key={kyc.id} className="hover:bg-slate-700/30">
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-slate-700 rounded-lg">
                            <User className="h-4 w-4 text-slate-400" />
                          </div>
                          <div>
                            <p className="text-white font-medium text-sm">{kyc.user?.name || 'N/A'}</p>
                            <p className="text-slate-400 text-xs">{kyc.user?.email || 'N/A'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <p className="text-white text-sm">{kyc.firstName} {kyc.lastName}</p>
                        <p className="text-slate-400 text-xs">{kyc.country}</p>
                      </td>
                      <td className="px-4 py-4">
                        <p className="text-white text-sm">{kyc.documentType?.replace(/_/g, ' ') || 'N/A'}</p>
                        <p className="text-slate-400 text-xs">{kyc.documentNumber || 'N/A'}</p>
                      </td>
                      <td className="px-4 py-4">{getStatusBadge(kyc.status)}</td>
                      <td className="px-4 py-4 text-slate-400 text-sm">
                        {kyc.submittedAt ? formatDate(kyc.submittedAt) : 'N/A'}
                      </td>
                      <td className="px-4 py-4">
                        <button
                          onClick={() => setSelectedKYC(kyc)}
                          disabled={processing === kyc.id}
                          className="flex items-center gap-1 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white text-sm rounded-lg transition-colors disabled:opacity-50"
                        >
                          {processing === kyc.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-slate-700">
                <p className="text-sm text-slate-400">
                  Page {page} of {totalPages}
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="p-2 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
                  >
                    <ChevronLeft className="h-4 w-4 text-white" />
                  </button>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="p-2 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
                  >
                    <ChevronRight className="h-4 w-4 text-white" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* View KYC Modal */}
      {selectedKYC && (
        <ViewKYCModal
          kyc={selectedKYC}
          onClose={() => setSelectedKYC(null)}
          onApprove={() => selectedKYC.id && handleApprove(selectedKYC.id)}
          onReject={(reason) => selectedKYC.id && handleReject(selectedKYC.id, reason)}
        />
      )}
    </div>
  );
}
