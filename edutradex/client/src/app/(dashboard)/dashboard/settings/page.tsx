'use client';

import { useState, useEffect } from 'react';
import {
  User,
  Bell,
  Shield,
  Palette,
  RefreshCw,
  Save,
  Check,
  Mail,
  FileCheck,
  Upload,
  AlertCircle,
  Clock,
  CheckCircle,
  XCircle,
  Loader2,
  Camera,
  CreditCard,
  MapPin,
  Phone,
  Calendar,
  Globe,
  ArrowRight,
  ArrowLeft,
  ShieldCheck,
  FileText,
  Info,
} from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';
import { api } from '@/lib/api';
import type { KYCInfo, DocumentType } from '@/types';
import toast from 'react-hot-toast';
import { cn } from '@/lib/utils';
import { StepPill } from './StepPill';

export default function SettingsPage() {
  const { user, refreshProfile } = useAuthStore();

  // Email verification state
  const [verificationCode, setVerificationCode] = useState('');
  const [isSendingCode, setIsSendingCode] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [codeSent, setCodeSent] = useState(false);

  // KYC state
  const [kycStatus, setKycStatus] = useState<KYCInfo | null>(null);
  const [kycLoading, setKycLoading] = useState(true);
  const [kycStep, setKycStep] = useState<'info' | 'documents'>('info');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Personal info form
  const [personalInfo, setPersonalInfo] = useState({
    firstName: '',
    lastName: '',
    dateOfBirth: '',
    nationality: '',
    address: '',
    city: '',
    country: '',
    postalCode: '',
    phoneNumber: '',
  });

  // Document form
  const [documentInfo, setDocumentInfo] = useState({
    documentType: 'NATIONAL_ID' as DocumentType,
    documentNumber: '',
  });
  const [documentFront, setDocumentFront] = useState<File | null>(null);
  const [documentBack, setDocumentBack] = useState<File | null>(null);
  const [selfieWithId, setSelfieWithId] = useState<File | null>(null);

  // Settings state
  const [settings, setSettings] = useState({
    notifications: {
      tradeOpened: true,
      tradeResult: true,
      lowBalance: true,
      marketAlerts: false,
    },
    trading: {
      confirmTrades: true,
      defaultAmount: 10,
      defaultDuration: 30,
      soundEffects: true,
    },
    display: {
      theme: 'dark' as 'dark' | 'light',
      compactMode: false,
    },
  });

  // Load KYC status on mount
  useEffect(() => {
    loadKYCStatus();
  }, []);

  const loadKYCStatus = async () => {
    try {
      const status = await api.getKYCStatus();
      setKycStatus(status);
      if (status.firstName) {
        setPersonalInfo({
          firstName: status.firstName || '',
          lastName: status.lastName || '',
          dateOfBirth: status.dateOfBirth?.split('T')[0] || '',
          nationality: status.nationality || '',
          address: status.address || '',
          city: status.city || '',
          country: status.country || '',
          postalCode: status.postalCode || '',
          phoneNumber: status.phoneNumber || '',
        });
      }
    } catch (error) {
      console.error('Failed to load KYC status:', error);
    } finally {
      setKycLoading(false);
    }
  };

  // Email verification handlers
  const handleSendVerificationCode = async () => {
    setIsSendingCode(true);
    try {
      await api.sendVerificationCode();
      setCodeSent(true);
      toast.success('Verification code sent to your email');
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string } } };
      toast.error(err.response?.data?.error || 'Failed to send verification code');
    } finally {
      setIsSendingCode(false);
    }
  };

  const handleVerifyEmail = async () => {
    if (!verificationCode.trim()) {
      toast.error('Please enter the verification code');
      return;
    }
    setIsVerifying(true);
    try {
      await api.verifyEmail(verificationCode);
      toast.success('Email verified successfully!');
      await refreshProfile();
      setVerificationCode('');
      setCodeSent(false);
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string } } };
      toast.error(err.response?.data?.error || 'Invalid verification code');
    } finally {
      setIsVerifying(false);
    }
  };

  // KYC handlers
  const handleSubmitPersonalInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await api.submitKYCPersonalInfo(personalInfo);
      toast.success('Personal information saved');
      setKycStep('documents');
      await loadKYCStatus();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string } } };
      toast.error(err.response?.data?.error || 'Failed to save personal information');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitDocuments = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!documentFront || !selfieWithId) {
      toast.error('Please upload required documents');
      return;
    }

    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('documentType', documentInfo.documentType);
      formData.append('documentNumber', documentInfo.documentNumber);
      formData.append('documentFront', documentFront);
      if (documentBack) formData.append('documentBack', documentBack);
      formData.append('selfieWithId', selfieWithId);

      await api.submitKYCDocuments(formData);
      toast.success('Documents submitted for review');
      await loadKYCStatus();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string } } };
      toast.error(err.response?.data?.error || 'Failed to submit documents');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveSettings = () => {
    localStorage.setItem('optigobroker-settings', JSON.stringify(settings));
    toast.success('Settings saved');
  };

  const getKYCStatusBadge = () => {
    if (!kycStatus) return null;
    const statusConfig = {
      NOT_SUBMITTED: { color: 'bg-slate-600', icon: AlertCircle, text: 'Not Started' },
      PENDING: { color: 'bg-yellow-600', icon: Clock, text: 'Under Review' },
      APPROVED: { color: 'bg-emerald-600', icon: CheckCircle, text: 'Verified' },
      REJECTED: { color: 'bg-red-600', icon: XCircle, text: 'Rejected' },
    };
    const config = statusConfig[kycStatus.status];
    const Icon = config.icon;
    return (
      <span className={cn('inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm text-white', config.color)}>
        <Icon className="h-4 w-4" />
        {config.text}
      </span>
    );
  };

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <h1 className="text-xl md:text-2xl font-bold text-white">Settings</h1>
        <p className="text-slate-400 text-xs md:text-sm">Manage your account, verification, and trading preferences.</p>
      </div>

      {/* Email Verification Section */}
      <div className="bg-slate-800 rounded-xl p-5 md:p-6 border border-slate-700 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Mail className="h-5 w-5 text-emerald-500" />
            <div>
              <h2 className="text-base md:text-lg font-semibold text-white">Email Verification</h2>
              <p className="text-slate-400 text-xs md:text-sm">Secure your account and unlock all features.</p>
            </div>
          </div>
          {user?.emailVerified ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-600 rounded-full text-sm text-white">
              <CheckCircle className="h-4 w-4" />
              Verified
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-yellow-600 rounded-full text-sm text-white">
              <AlertCircle className="h-4 w-4" />
              Not Verified
            </span>
          )}
        </div>

        {user?.emailVerified ? (
          <p className="text-slate-400 text-xs md:text-sm">Your email address has been verified.</p>
        ) : (
          <div className="space-y-3">
            <p className="text-slate-400 text-xs md:text-sm">Verify your email to finish securing your account.</p>
            {!codeSent ? (
              <button
                onClick={handleSendVerificationCode}
                disabled={isSendingCode}
                className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-lg transition-colors"
              >
                {isSendingCode ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Mail className="h-4 w-4" />
                )}
                Send Code
              </button>
            ) : (
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value)}
                  placeholder="Enter 6-digit code"
                  maxLength={6}
                  className="flex-1 px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleVerifyEmail}
                    disabled={isVerifying}
                    className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-lg transition-colors"
                  >
                    {isVerifying ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Check className="h-4 w-4" />
                    )}
                    Verify
                  </button>
                  <button
                    onClick={handleSendVerificationCode}
                    disabled={isSendingCode}
                    className="flex-1 sm:flex-none px-4 py-2 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-white rounded-lg transition-colors"
                  >
                    Resend
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* KYC Verification Section */}
      <div className="bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden">
        {/* Header with gradient */}
        <div className="bg-gradient-to-r from-emerald-600/20 to-blue-600/20 px-6 py-5 border-b border-slate-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-emerald-500/20 rounded-xl">
                <ShieldCheck className="h-6 w-6 text-emerald-400" />
              </div>
              <div>
                <h2 className="text-base md:text-lg font-bold text-white">Identity Verification (KYC)</h2>
                <p className="text-slate-400 text-xs md:text-sm">Verify your identity to unlock all features</p>
              </div>
            </div>
            {!kycLoading && getKYCStatusBadge()}
          </div>
        </div>

        <div className="p-6 space-y-6">
          {kycLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-10 w-10 animate-spin text-emerald-500" />
            </div>
          ) : kycStatus?.status === 'APPROVED' ? (
            <div className="text-center py-10">
              <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="h-10 w-10 text-emerald-400" />
              </div>
              <h3 className="text-lg md:text-xl font-bold text-white mb-2">Verification Complete</h3>
              <p className="text-slate-400">Your identity has been verified successfully.</p>
              <p className="text-slate-400 text-sm mt-1">You have full access to all platform features.</p>
            </div>
          ) : kycStatus?.status === 'PENDING' ? (
            <div className="text-center py-10">
              <div className="w-20 h-20 bg-yellow-500/20 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
                <Clock className="h-10 w-10 text-yellow-400" />
              </div>
              <h3 className="text-lg md:text-xl font-bold text-white mb-2">Verification in Progress</h3>
              <p className="text-slate-400">Your documents are being reviewed by our team.</p>
              <p className="text-slate-400 text-sm mt-1">This usually takes 24-48 hours.</p>
              <div className="mt-6 p-4 bg-slate-700/50 rounded-xl max-w-md mx-auto">
                <p className="text-slate-400 text-sm">
                  <Info className="h-4 w-4 inline mr-2 text-blue-400" />
                  You&apos;ll receive an email notification once your verification is complete.
                </p>
              </div>
            </div>
          ) : kycStatus?.status === 'REJECTED' ? (
            <div className="space-y-6">
              <div className="text-center py-6">
                <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <XCircle className="h-10 w-10 text-red-400" />
                </div>
                <h3 className="text-lg md:text-xl font-bold text-white mb-2">Verification Rejected</h3>
                <p className="text-slate-400">Your submission could not be verified.</p>
              </div>
              <div className="bg-red-900/20 border border-red-800/50 rounded-xl p-4">
                <p className="text-red-400 font-medium text-sm mb-1">Rejection Reason:</p>
                <p className="text-slate-300">{kycStatus.rejectionReason}</p>
              </div>
              <button
                onClick={() => setKycStep('info')}
                className="w-full flex items-center justify-center gap-2 px-6 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-xl transition-colors"
              >
                <RefreshCw className="h-5 w-5" />
                Submit New Verification
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Steps Indicator */}
              <div className="flex items-center justify-center">
                <div className="flex flex-wrap items-center gap-3 justify-center">
                  <StepPill stepNumber={1} active={kycStep === 'info'} completed={kycStep === 'documents'} label="Personal Info" />
                  <div className={cn('h-0.5 w-12 rounded-full', kycStep === 'documents' ? 'bg-emerald-600' : 'bg-slate-700')} />
                  <StepPill stepNumber={2} active={kycStep === 'documents'} completed={false} label="Documents" />
                </div>
              </div>

              {kycStep === 'info' ? (
                <form onSubmit={handleSubmitPersonalInfo} className="space-y-5">
                  {/* Basic Info Section */}
                  <div className="bg-slate-700/30 rounded-xl p-5 space-y-4">
                    <div className="flex items-center gap-2">
                      <User className="h-5 w-5 text-emerald-400" />
                      <h3 className="text-white font-semibold">Basic Information</h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-white text-sm font-medium mb-2">First Name *</label>
                        <input
                          type="text"
                          required
                          placeholder="John"
                          value={personalInfo.firstName}
                          onChange={(e) => setPersonalInfo({ ...personalInfo, firstName: e.target.value })}
                          className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-xl text-white placeholder-slate-500 focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                        />
                      </div>
                      <div>
                        <label className="block text-white text-sm font-medium mb-2">Last Name *</label>
                        <input
                          type="text"
                          required
                          placeholder="Doe"
                          value={personalInfo.lastName}
                          onChange={(e) => setPersonalInfo({ ...personalInfo, lastName: e.target.value })}
                          className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-xl text-white placeholder-slate-500 focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                        />
                      </div>
                      <div>
                        <label className="flex items-center gap-2 text-white text-sm font-medium mb-2">
                          <Calendar className="h-4 w-4 text-slate-400" />
                          Date of Birth *
                        </label>
                        <input
                          type="date"
                          required
                          value={personalInfo.dateOfBirth}
                          onChange={(e) => setPersonalInfo({ ...personalInfo, dateOfBirth: e.target.value })}
                          className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-xl text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                        />
                      </div>
                      <div>
                        <label className="flex items-center gap-2 text-white text-sm font-medium mb-2">
                          <Globe className="h-4 w-4 text-slate-400" />
                          Nationality *
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="e.g., American"
                          value={personalInfo.nationality}
                          onChange={(e) => setPersonalInfo({ ...personalInfo, nationality: e.target.value })}
                          className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-xl text-white placeholder-slate-500 focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="flex items-center gap-2 text-white text-sm font-medium mb-2">
                          <Phone className="h-4 w-4 text-slate-400" />
                          Phone Number *
                        </label>
                        <input
                          type="tel"
                          required
                          placeholder="+1 234 567 8900"
                          value={personalInfo.phoneNumber}
                          onChange={(e) => setPersonalInfo({ ...personalInfo, phoneNumber: e.target.value })}
                          className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-xl text-white placeholder-slate-500 focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Address Section */}
                  <div className="bg-slate-700/30 rounded-xl p-5 space-y-4">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-5 w-5 text-emerald-400" />
                      <h3 className="text-white font-semibold">Address Information</h3>
                    </div>
                    <div>
                      <label className="block text-white text-sm font-medium mb-2">Street Address *</label>
                      <input
                        type="text"
                        required
                        placeholder="123 Main Street, Apt 4B"
                        value={personalInfo.address}
                        onChange={(e) => setPersonalInfo({ ...personalInfo, address: e.target.value })}
                        className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-xl text-white placeholder-slate-500 focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                      />
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <label className="block text-white text-sm font-medium mb-2">City *</label>
                        <input
                          type="text"
                          required
                          placeholder="New York"
                          value={personalInfo.city}
                          onChange={(e) => setPersonalInfo({ ...personalInfo, city: e.target.value })}
                          className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-xl text-white placeholder-slate-500 focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                        />
                      </div>
                      <div>
                        <label className="block text-white text-sm font-medium mb-2">Postal Code</label>
                        <input
                          type="text"
                          placeholder="10001"
                          value={personalInfo.postalCode}
                          onChange={(e) => setPersonalInfo({ ...personalInfo, postalCode: e.target.value })}
                          className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-xl text-white placeholder-slate-500 focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                        />
                      </div>
                      <div className="col-span-2">
                        <label className="block text-white text-sm font-medium mb-2">Country *</label>
                        <input
                          type="text"
                          required
                          placeholder="United States"
                          value={personalInfo.country}
                          onChange={(e) => setPersonalInfo({ ...personalInfo, country: e.target.value })}
                          className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-xl text-white placeholder-slate-500 focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                        />
                      </div>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-semibold rounded-xl transition-all"
                  >
                    {isSubmitting ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <>
                        Continue to Documents
                        <ArrowRight className="h-5 w-5" />
                      </>
                    )}
                  </button>
                </form>
              ) : (
                <form onSubmit={handleSubmitDocuments} className="space-y-5">
                  {/* Document Type Section */}
                  <div className="bg-slate-700/30 rounded-xl p-5 space-y-4">
                    <div className="flex items-center gap-2">
                      <CreditCard className="h-5 w-5 text-emerald-400" />
                      <h3 className="text-white font-semibold">Document Details</h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-white text-sm font-medium mb-2">Document Type *</label>
                        <select
                          required
                          value={documentInfo.documentType}
                          onChange={(e) => setDocumentInfo({ ...documentInfo, documentType: e.target.value as DocumentType })}
                          className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-xl text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                        >
                          <option value="NATIONAL_ID">National ID Card</option>
                          <option value="PASSPORT">Passport</option>
                          <option value="DRIVERS_LICENSE">Driver&apos;s License</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-white text-sm font-medium mb-2">Document Number *</label>
                        <input
                          type="text"
                          required
                          placeholder="Enter document number"
                          value={documentInfo.documentNumber}
                          onChange={(e) => setDocumentInfo({ ...documentInfo, documentNumber: e.target.value })}
                          className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-xl text-white placeholder-slate-500 focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Document Upload Section */}
                  <div className="bg-slate-700/30 rounded-xl p-5 space-y-4">
                    <div className="flex items-center gap-2">
                      <FileText className="h-5 w-5 text-emerald-400" />
                      <h3 className="text-white font-semibold">Upload Documents</h3>
                    </div>
                    <p className="text-slate-400 text-sm mb-4">
                      Please upload clear, readable photos of your documents. Accepted formats: JPEG, PNG, PDF (max 5MB each)
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <FileUploadBox
                        label="Document Front *"
                        hint="Front side of your ID"
                        file={documentFront}
                        onFileChange={setDocumentFront}
                        accept="image/jpeg,image/png,application/pdf"
                      />
                      <FileUploadBox
                        label="Document Back"
                        hint="Back side (if applicable)"
                        file={documentBack}
                        onFileChange={setDocumentBack}
                        accept="image/jpeg,image/png,application/pdf"
                      />
                      <FileUploadBox
                        label="Selfie with ID *"
                        hint="Hold your ID next to your face"
                        file={selfieWithId}
                        onFileChange={setSelfieWithId}
                        accept="image/jpeg,image/png"
                      />
                    </div>

                    {/* Tips */}
                    <div className="mt-4 p-4 bg-blue-900/20 border border-blue-800/30 rounded-xl">
                      <p className="text-blue-400 text-sm font-medium mb-2 flex items-center gap-2">
                        <Info className="h-4 w-4" />
                        Tips for a successful verification:
                      </p>
                      <ul className="text-slate-400 text-sm space-y-1 ml-6 list-disc">
                        <li>Ensure all text on your document is clearly readable</li>
                        <li>Make sure the entire document is visible in the frame</li>
                        <li>For selfie, ensure your face and ID are clearly visible</li>
                        <li>Avoid glare or shadows on the documents</li>
                      </ul>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => setKycStep('info')}
                      className="flex items-center justify-center gap-2 px-6 py-4 bg-slate-700 hover:bg-slate-600 text-white font-semibold rounded-xl transition-colors"
                    >
                      <ArrowLeft className="h-5 w-5" />
                      Back
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="flex-1 flex items-center justify-center gap-2 px-6 py-4 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-semibold rounded-xl transition-all"
                    >
                      {isSubmitting ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                      ) : (
                        <>
                          <ShieldCheck className="h-5 w-5" />
                          Submit for Verification
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Profile Section */}
      <div className="bg-slate-800 rounded-xl p-5 md:p-6 border border-slate-700 space-y-4">
        <div className="flex items-center gap-3">
          <User className="h-5 w-5 text-emerald-500" />
          <h2 className="text-base md:text-lg font-semibold text-white">Profile</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-slate-400 text-sm mb-2">Name</label>
            <input
              type="text"
              value={user?.name || ''}
              disabled
              className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white disabled:opacity-50"
            />
          </div>
          <div>
            <label className="block text-slate-400 text-sm mb-2">Email</label>
            <input
              type="email"
              value={user?.email || ''}
              disabled
              className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white disabled:opacity-50"
            />
          </div>
        </div>
      </div>

      {/* Notifications */}
      <div className="bg-slate-800 rounded-xl p-5 md:p-6 border border-slate-700">
        <div className="flex items-center gap-3 mb-4">
          <Bell className="h-5 w-5 text-emerald-500" />
          <h2 className="text-base md:text-lg font-semibold text-white">Notifications</h2>
        </div>
        <div className="space-y-3">
          <ToggleSetting
            label="Trade Opened"
            description="Get notified when a trade is placed"
            checked={settings.notifications.tradeOpened}
            onChange={(checked) =>
              setSettings((s) => ({
                ...s,
                notifications: { ...s.notifications, tradeOpened: checked },
              }))
            }
          />
          <ToggleSetting
            label="Trade Results"
            description="Get notified when trades win or lose"
            checked={settings.notifications.tradeResult}
            onChange={(checked) =>
              setSettings((s) => ({
                ...s,
                notifications: { ...s.notifications, tradeResult: checked },
              }))
            }
          />
          <ToggleSetting
            label="Low Balance Warning"
            description="Alert when balance is running low"
            checked={settings.notifications.lowBalance}
            onChange={(checked) =>
              setSettings((s) => ({
                ...s,
                notifications: { ...s.notifications, lowBalance: checked },
              }))
            }
          />
          <ToggleSetting
            label="Market Alerts"
            description="Receive market volatility alerts"
            checked={settings.notifications.marketAlerts}
            onChange={(checked) =>
              setSettings((s) => ({
                ...s,
                notifications: { ...s.notifications, marketAlerts: checked },
              }))
            }
          />
        </div>
      </div>

      {/* Trading Preferences */}
      <div className="bg-slate-800 rounded-xl p-5 md:p-6 border border-slate-700">
        <div className="flex items-center gap-3 mb-4">
          <Shield className="h-5 w-5 text-emerald-500" />
          <h2 className="text-base md:text-lg font-semibold text-white">Trading Preferences</h2>
        </div>
        <div className="space-y-3">
          <ToggleSetting
            label="Confirm Trades"
            description="Show confirmation before placing trades"
            checked={settings.trading.confirmTrades}
            onChange={(checked) =>
              setSettings((s) => ({
                ...s,
                trading: { ...s.trading, confirmTrades: checked },
              }))
            }
          />
          <ToggleSetting
            label="Sound Effects"
            description="Play sounds for trade results"
            checked={settings.trading.soundEffects}
            onChange={(checked) =>
              setSettings((s) => ({
                ...s,
                trading: { ...s.trading, soundEffects: checked },
              }))
            }
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            <div>
              <label className="block text-slate-400 text-sm mb-2">Default Amount ($)</label>
              <input
                type="number"
                value={settings.trading.defaultAmount}
                onChange={(e) =>
                  setSettings((s) => ({
                    ...s,
                    trading: { ...s.trading, defaultAmount: Number(e.target.value) },
                  }))
                }
                className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-slate-400 text-sm mb-2">Default Duration (s)</label>
              <select
                value={settings.trading.defaultDuration}
                onChange={(e) =>
                  setSettings((s) => ({
                    ...s,
                    trading: { ...s.trading, defaultDuration: Number(e.target.value) },
                  }))
                }
                className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              >
                <option value={5}>5 seconds</option>
                <option value={15}>15 seconds</option>
                <option value={30}>30 seconds</option>
                <option value={60}>1 minute</option>
                <option value={180}>3 minutes</option>
                <option value={300}>5 minutes</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Display */}
      <div className="bg-slate-800 rounded-xl p-5 md:p-6 border border-slate-700">
        <div className="flex items-center gap-3 mb-4">
          <Palette className="h-5 w-5 text-emerald-500" />
          <h2 className="text-base md:text-lg font-semibold text-white">Display</h2>
        </div>
        <div className="space-y-3">
          <ToggleSetting
            label="Compact Mode"
            description="Use smaller UI elements"
            checked={settings.display.compactMode}
            onChange={(checked) =>
              setSettings((s) => ({
                ...s,
                display: { ...s.display, compactMode: checked },
              }))
            }
          />
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          onClick={handleSaveSettings}
          className="flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg transition-colors"
        >
          <Save className="h-5 w-5" />
          Save Settings
        </button>
      </div>
    </div>
  );
}

function ToggleSetting({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="min-w-0">
        <p className="text-white font-medium">{label}</p>
        <p className="text-slate-400 text-sm">{description}</p>
      </div>
      <button
        onClick={() => onChange(!checked)}
        className={cn(
          'relative w-12 h-6 rounded-full transition-colors',
          checked ? 'bg-emerald-600' : 'bg-slate-600'
        )}
      >
        <div
          className={cn(
            'absolute top-1 w-4 h-4 bg-white rounded-full transition-transform',
            checked ? 'translate-x-7' : 'translate-x-1'
          )}
        />
      </button>
    </div>
  );
}

function FileUploadBox({
  label,
  file,
  onFileChange,
  accept,
  hint,
}: {
  label: string;
  file: File | null;
  onFileChange: (file: File | null) => void;
  accept: string;
  hint?: string;
}) {
  const [preview, setPreview] = useState<string | null>(null);

  useEffect(() => {
    if (file && file.type.startsWith('image/')) {
      const url = URL.createObjectURL(file);
      setPreview(url);
      return () => URL.revokeObjectURL(url);
    } else {
      setPreview(null);
    }
  }, [file]);

  return (
    <div>
      <label className="block text-white text-sm font-medium mb-2">{label}</label>
      {hint && <p className="text-slate-400 text-xs mb-2">{hint}</p>}
      <label className="group relative flex flex-col items-center justify-center w-full h-40 bg-slate-700/50 border-2 border-dashed border-slate-600 rounded-xl cursor-pointer hover:border-emerald-500/50 hover:bg-slate-700 transition-all overflow-hidden">
        {file ? (
          <>
            {preview ? (
              <img src={preview} alt="Preview" className="absolute inset-0 w-full h-full object-cover" />
            ) : (
              <div className="text-center p-4">
                <FileCheck className="h-10 w-10 text-emerald-500 mx-auto mb-2" />
                <p className="text-emerald-400 text-sm font-medium">File Selected</p>
              </div>
            )}
            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center">
              <p className="text-white text-sm font-medium truncate max-w-[90%] px-2">{file.name}</p>
              <p className="text-emerald-400 text-xs mt-1">Click to change</p>
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onFileChange(null);
              }}
              className="absolute top-2 right-2 p-1 bg-red-500 hover:bg-red-600 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity z-10"
            >
              <XCircle className="h-4 w-4" />
            </button>
          </>
        ) : (
          <div className="text-center p-4">
            <div className="w-14 h-14 bg-slate-600 rounded-full flex items-center justify-center mx-auto mb-3 group-hover:bg-emerald-600/20 transition-colors">
              <Upload className="h-6 w-6 text-slate-400 group-hover:text-emerald-400 transition-colors" />
            </div>
            <p className="text-slate-300 text-sm font-medium">Click to upload</p>
            <p className="text-slate-500 text-xs mt-1">PNG, JPG or PDF (max 5MB)</p>
          </div>
        )}
        <input
          type="file"
          className="hidden"
          accept={accept}
          onChange={(e) => onFileChange(e.target.files?.[0] || null)}
        />
      </label>
    </div>
  );
}
