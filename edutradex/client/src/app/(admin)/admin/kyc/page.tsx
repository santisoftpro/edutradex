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
  X,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Download,
  FileText,
  ExternalLink,
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

// Document Viewer Component
function DocumentViewer({
  url,
  title,
  onClose,
}: {
  url: string;
  title: string;
  onClose: () => void;
}) {
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const isPDF = url.toLowerCase().endsWith('.pdf');

  // Get the base URL (remove /api if present)
  const baseUrl = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:5000';

  // Clean the path - remove leading slashes
  let cleanPath = url.replace(/^\/+/, '');

  // If path doesn't start with 'uploads/', add it
  if (!cleanPath.startsWith('uploads/')) {
    cleanPath = `uploads/${cleanPath}`;
  }

  const fullUrl = `${baseUrl}/${cleanPath}`;

  const handleZoomIn = () => setZoom((z) => Math.min(z + 0.25, 3));
  const handleZoomOut = () => setZoom((z) => Math.max(z - 0.25, 0.5));
  const handleRotate = () => setRotation((r) => (r + 90) % 360);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-6 py-4 bg-gradient-to-b from-black/80 to-transparent z-10">
        <h3 className="text-white font-medium">{title}</h3>
        <div className="flex items-center gap-2">
          {!isPDF && (
            <>
              <button
                onClick={handleZoomOut}
                className="p-2 bg-white/10 hover:bg-white/20 rounded-lg text-white transition-colors"
                title="Zoom Out"
              >
                <ZoomOut className="h-5 w-5" />
              </button>
              <span className="text-white text-sm min-w-[60px] text-center">{Math.round(zoom * 100)}%</span>
              <button
                onClick={handleZoomIn}
                className="p-2 bg-white/10 hover:bg-white/20 rounded-lg text-white transition-colors"
                title="Zoom In"
              >
                <ZoomIn className="h-5 w-5" />
              </button>
              <button
                onClick={handleRotate}
                className="p-2 bg-white/10 hover:bg-white/20 rounded-lg text-white transition-colors"
                title="Rotate"
              >
                <RotateCw className="h-5 w-5" />
              </button>
            </>
          )}
          <a
            href={fullUrl}
            download
            className="p-2 bg-white/10 hover:bg-white/20 rounded-lg text-white transition-colors"
            title="Download"
          >
            <Download className="h-5 w-5" />
          </a>
          <a
            href={fullUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 bg-white/10 hover:bg-white/20 rounded-lg text-white transition-colors"
            title="Open in New Tab"
          >
            <ExternalLink className="h-5 w-5" />
          </a>
          <button
            onClick={onClose}
            className="p-2 bg-white/10 hover:bg-red-500/50 rounded-lg text-white transition-colors ml-2"
            title="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="w-full h-full flex items-center justify-center overflow-auto pt-16 pb-4 px-4">
        {loading && !error && (
          <div className="absolute inset-0 flex items-center justify-center">
            <Loader2 className="h-12 w-12 animate-spin text-white" />
          </div>
        )}

        {error ? (
          <div className="text-center text-white">
            <AlertCircle className="h-16 w-16 mx-auto mb-4 text-red-400" />
            <p className="text-lg font-medium">Failed to load document</p>
            <p className="text-slate-400 mt-2">The document could not be displayed.</p>
            <a
              href={fullUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 mt-4 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors"
            >
              <ExternalLink className="h-4 w-4" />
              Open in New Tab
            </a>
          </div>
        ) : isPDF ? (
          <div className="w-full h-full max-w-5xl flex flex-col items-center justify-center">
            <object
              data={fullUrl}
              type="application/pdf"
              className="w-full h-full rounded-lg"
              onLoad={() => setLoading(false)}
            >
              {/* Fallback for browsers that don't support object tag for PDFs */}
              <div className="flex flex-col items-center justify-center h-full bg-slate-800 rounded-lg p-8">
                <FileText className="h-20 w-20 text-red-400 mb-4" />
                <p className="text-white text-lg font-medium mb-2">PDF Document</p>
                <p className="text-slate-400 text-center mb-6">Your browser cannot display this PDF inline.</p>
                <div className="flex gap-3">
                  <a
                    href={fullUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors text-white"
                  >
                    <ExternalLink className="h-4 w-4" />
                    Open in New Tab
                  </a>
                  <a
                    href={fullUrl}
                    download
                    className="inline-flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors text-white"
                  >
                    <Download className="h-4 w-4" />
                    Download
                  </a>
                </div>
              </div>
            </object>
          </div>
        ) : (
          <img
            src={fullUrl}
            alt={title}
            className="max-w-full max-h-full object-contain transition-transform duration-200"
            style={{
              transform: `scale(${zoom}) rotate(${rotation}deg)`,
            }}
            onLoad={() => setLoading(false)}
            onError={() => {
              setLoading(false);
              setError(true);
            }}
          />
        )}
      </div>

      {/* Click outside to close */}
      <div
        className="absolute inset-0 -z-10"
        onClick={onClose}
      />
    </div>
  );
}

// Helper to construct proper file URL
function getFileUrl(path: string | undefined): string {
  if (!path) return '';

  // Get the base URL (remove /api if present)
  const baseUrl = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:5000';

  // Clean the path - remove leading slashes
  let cleanPath = path.replace(/^\/+/, '');

  // If path doesn't start with 'uploads/', add it
  if (!cleanPath.startsWith('uploads/')) {
    cleanPath = `uploads/${cleanPath}`;
  }

  return `${baseUrl}/${cleanPath}`;
}

// Document Preview Card
function DocumentPreviewCard({
  label,
  url,
  onView,
}: {
  label: string;
  url: string | undefined;
  onView: (url: string, label: string) => void;
}) {
  const [imageError, setImageError] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  if (!url) return null;

  const isPDF = url.toLowerCase().endsWith('.pdf');
  const fullUrl = getFileUrl(url);

  return (
    <div className="group relative">
      <p className="text-slate-400 text-sm mb-2">{label}</p>
      <div
        onClick={() => onView(url, label)}
        className="relative h-40 bg-slate-600 rounded-xl overflow-hidden cursor-pointer border-2 border-transparent hover:border-emerald-500 transition-all"
      >
        {isPDF ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-700">
            <FileText className="h-12 w-12 text-red-400 mb-2" />
            <span className="text-slate-300 text-sm">PDF Document</span>
          </div>
        ) : imageError ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-700">
            <Image className="h-12 w-12 text-slate-500 mb-2" />
            <span className="text-slate-400 text-sm">Click to view</span>
          </div>
        ) : (
          <>
            {!imageLoaded && (
              <div className="absolute inset-0 flex items-center justify-center bg-slate-700">
                <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
              </div>
            )}
            <img
              src={fullUrl}
              alt={label}
              className={cn(
                "w-full h-full object-cover transition-opacity",
                imageLoaded ? "opacity-100" : "opacity-0"
              )}
              onLoad={() => setImageLoaded(true)}
              onError={() => setImageError(true)}
            />
          </>
        )}
        {/* Hover overlay */}
        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <div className="flex items-center gap-2 text-white">
            <Eye className="h-5 w-5" />
            <span className="font-medium">View</span>
          </div>
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
  const [viewingDocument, setViewingDocument] = useState<{ url: string; title: string } | null>(null);

  const handleViewDocument = (url: string, title: string) => {
    setViewingDocument({ url, title });
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center overflow-auto">
        <div className="absolute inset-0 bg-black/50" onClick={onClose} />
        <div className="relative bg-slate-800 rounded-2xl p-6 max-w-4xl w-full mx-4 my-8 border border-slate-700 max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-700">
            <div>
              <h3 className="text-xl font-bold text-white">KYC Verification Review</h3>
              <p className="text-slate-400 text-sm mt-1">Review submitted documents and information</p>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-white transition-colors">
              <X className="h-6 w-6" />
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Column - Info */}
            <div className="space-y-4">
              {/* User Info */}
              <div className="bg-slate-700/50 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <User className="h-4 w-4 text-emerald-400" />
                  <h4 className="text-white font-medium">Account Information</h4>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Username:</span>
                    <span className="text-white font-medium">{kyc.user?.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Email:</span>
                    <span className="text-white">{kyc.user?.email}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Registered:</span>
                    <span className="text-white">{kyc.user?.createdAt ? formatDate(kyc.user.createdAt) : 'N/A'}</span>
                  </div>
                </div>
              </div>

              {/* Personal Info */}
              <div className="bg-slate-700/50 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <FileCheck className="h-4 w-4 text-emerald-400" />
                  <h4 className="text-white font-medium">Personal Details</h4>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Full Name:</span>
                    <span className="text-white font-medium">{kyc.firstName} {kyc.lastName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Date of Birth:</span>
                    <span className="text-white">{kyc.dateOfBirth ? formatDate(kyc.dateOfBirth) : 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Nationality:</span>
                    <span className="text-white">{kyc.nationality}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Phone:</span>
                    <span className="text-white">{kyc.phoneNumber}</span>
                  </div>
                  <div className="pt-2 border-t border-slate-600 mt-2">
                    <span className="text-slate-400">Address:</span>
                    <p className="text-white mt-1">{kyc.address}, {kyc.city}, {kyc.country} {kyc.postalCode}</p>
                  </div>
                </div>
              </div>

              {/* Document Info */}
              <div className="bg-slate-700/50 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <FileText className="h-4 w-4 text-emerald-400" />
                  <h4 className="text-white font-medium">Document Details</h4>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Document Type:</span>
                    <span className="text-white font-medium">{kyc.documentType?.replace(/_/g, ' ')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Document Number:</span>
                    <span className="text-white font-mono">{kyc.documentNumber}</span>
                  </div>
                </div>
              </div>

              {/* Status Info */}
              <div className="bg-slate-700/50 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Clock className="h-4 w-4 text-emerald-400" />
                  <h4 className="text-white font-medium">Submission Status</h4>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Status:</span>
                    <span className={cn(
                      'px-3 py-1 rounded-full text-xs font-medium',
                      kyc.status === 'PENDING' && 'bg-yellow-600/20 text-yellow-400',
                      kyc.status === 'APPROVED' && 'bg-emerald-600/20 text-emerald-400',
                      kyc.status === 'REJECTED' && 'bg-red-600/20 text-red-400',
                    )}>
                      {kyc.status}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Submitted:</span>
                    <span className="text-white">{kyc.submittedAt ? formatDate(kyc.submittedAt) : 'N/A'}</span>
                  </div>
                  {kyc.reviewedAt && (
                    <div className="flex justify-between">
                      <span className="text-slate-400">Reviewed:</span>
                      <span className="text-white">{formatDate(kyc.reviewedAt)}</span>
                    </div>
                  )}
                  {kyc.rejectionReason && (
                    <div className="pt-2 border-t border-slate-600 mt-2">
                      <span className="text-slate-400">Rejection Reason:</span>
                      <p className="text-red-400 mt-1">{kyc.rejectionReason}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Right Column - Documents */}
            <div className="space-y-4">
              <div className="bg-slate-700/50 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-4">
                  <Image className="h-4 w-4 text-emerald-400" />
                  <h4 className="text-white font-medium">Uploaded Documents</h4>
                </div>
                <p className="text-slate-400 text-sm mb-4">Click on any document to view it in full screen</p>

                <div className="space-y-4">
                  <DocumentPreviewCard
                    label="Document Front"
                    url={kyc.documentFront}
                    onView={handleViewDocument}
                  />
                  <DocumentPreviewCard
                    label="Document Back"
                    url={kyc.documentBack}
                    onView={handleViewDocument}
                  />
                  <DocumentPreviewCard
                    label="Selfie with ID"
                    url={kyc.selfieWithId}
                    onView={handleViewDocument}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          {kyc.status === 'PENDING' && (
            <div className="mt-6 pt-6 border-t border-slate-700">
              {!showRejectForm ? (
                <div className="flex gap-3">
                  <button
                    onClick={onApprove}
                    className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-xl transition-colors"
                  >
                    <CheckCircle className="h-5 w-5" />
                    Approve Verification
                  </button>
                  <button
                    onClick={() => setShowRejectForm(true)}
                    className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-medium rounded-xl transition-colors"
                  >
                    <XCircle className="h-5 w-5" />
                    Reject Verification
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="block text-slate-400 text-sm mb-2">Rejection Reason *</label>
                    <textarea
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                      placeholder="Please provide a clear reason for rejection so the user can correct their submission..."
                      className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-xl text-white placeholder-slate-500 focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none"
                      rows={3}
                    />
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={() => setShowRejectForm(false)}
                      className="flex-1 px-4 py-3 bg-slate-700 hover:bg-slate-600 text-white font-medium rounded-xl transition-colors"
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
                      className="flex-1 px-4 py-3 bg-red-600 hover:bg-red-700 text-white font-medium rounded-xl transition-colors"
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

      {/* Document Viewer Modal */}
      {viewingDocument && (
        <DocumentViewer
          url={viewingDocument.url}
          title={viewingDocument.title}
          onClose={() => setViewingDocument(null)}
        />
      )}
    </>
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
