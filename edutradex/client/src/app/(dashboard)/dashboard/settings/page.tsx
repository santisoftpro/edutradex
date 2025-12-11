'use client';

import { useState, useEffect } from 'react';
import {
  User,
  Bell,
  Shield,
  Palette,
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
  RefreshCw,
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

  // Load KYC status and settings on mount
  useEffect(() => {
    loadKYCStatus();
    loadSettings();
  }, []);

  const loadSettings = () => {
    try {
      const saved = localStorage.getItem('optigobroker-settings');
      if (saved) {
        const parsed = JSON.parse(saved);
        setSettings((prev) => ({
          ...prev,
          ...parsed,
          notifications: { ...prev.notifications, ...parsed.notifications },
          trading: { ...prev.trading, ...parsed.trading },
          display: { ...prev.display, ...parsed.display },
        }));
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  };

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

  const isFullyVerified = user?.emailVerified && kycStatus?.status === 'APPROVED';

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <h1 className="text-xl md:text-2xl font-bold text-white">Settings</h1>
        <p className="text-slate-400 text-xs md:text-sm">Manage your account, verification, and trading preferences.</p>
      </div>

      {/* Compact Verified Account Card - Shows when both email and KYC are verified */}
      {isFullyVerified && (
        <div className="inline-flex items-center gap-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg px-4 py-2.5">
          <div className="flex items-center justify-center w-8 h-8 bg-emerald-500/20 rounded-full">
            <CheckCircle className="h-5 w-5 text-emerald-400" />
          </div>
          <div>
            <p className="text-emerald-400 font-medium text-sm">Account Verified</p>
            <p className="text-slate-400 text-xs">Full access enabled</p>
          </div>
        </div>
      )}

      {/* Email Verification Section - Only show if not verified */}
      {!user?.emailVerified && (
        <div className="bg-slate-800 rounded-xl p-5 border border-slate-700 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Mail className="h-5 w-5 text-emerald-500" />
              <div>
                <h2 className="text-base font-semibold text-white">Email Verification</h2>
                <p className="text-slate-400 text-xs">Verify your email to secure your account</p>
              </div>
            </div>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-yellow-600 rounded-full text-xs text-white">
              <AlertCircle className="h-3.5 w-3.5" />
              Pending
            </span>
          </div>
          <div className="space-y-3">
            {!codeSent ? (
              <button
                onClick={handleSendVerificationCode}
                disabled={isSendingCode}
                className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-sm rounded-lg transition-colors"
              >
                {isSendingCode ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
                Send Verification Code
              </button>
            ) : (
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value)}
                  placeholder="Enter 6-digit code"
                  maxLength={6}
                  className="flex-1 px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleVerifyEmail}
                    disabled={isVerifying}
                    className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-sm rounded-lg transition-colors"
                  >
                    {isVerifying ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                    Verify
                  </button>
                  <button
                    onClick={handleSendVerificationCode}
                    disabled={isSendingCode}
                    className="px-3 py-2 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-white text-sm rounded-lg transition-colors"
                  >
                    Resend
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* KYC Verification Section - Only show if not approved */}
      {!kycLoading && kycStatus?.status !== 'APPROVED' && (
        <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-700 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <ShieldCheck className="h-5 w-5 text-emerald-500" />
              <div>
                <h2 className="text-base font-semibold text-white">Identity Verification (KYC)</h2>
                <p className="text-slate-400 text-xs">Verify your identity to unlock all features</p>
              </div>
            </div>
            {kycStatus?.status === 'PENDING' && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-yellow-600 rounded-full text-xs text-white">
                <Clock className="h-3.5 w-3.5" />
                Under Review
              </span>
            )}
            {kycStatus?.status === 'REJECTED' && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-red-600 rounded-full text-xs text-white">
                <XCircle className="h-3.5 w-3.5" />
                Rejected
              </span>
            )}
            {kycStatus?.status === 'NOT_SUBMITTED' && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-600 rounded-full text-xs text-white">
                <AlertCircle className="h-3.5 w-3.5" />
                Not Started
              </span>
            )}
          </div>

          <div className="p-5">
            {kycStatus?.status === 'PENDING' ? (
              <div className="text-center py-6">
                <Clock className="h-12 w-12 text-yellow-400 mx-auto mb-3 animate-pulse" />
                <h3 className="text-lg font-semibold text-white mb-1">Verification in Progress</h3>
                <p className="text-slate-400 text-sm">Your documents are being reviewed. This usually takes 24-48 hours.</p>
              </div>
            ) : kycStatus?.status === 'REJECTED' ? (
              <div className="space-y-4">
                <div className="bg-red-900/20 border border-red-800/50 rounded-lg p-3">
                  <p className="text-red-400 font-medium text-sm mb-1">Rejection Reason:</p>
                  <p className="text-slate-300 text-sm">{kycStatus.rejectionReason}</p>
                </div>
                <button
                  onClick={() => setKycStep('info')}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg transition-colors"
                >
                  <RefreshCw className="h-4 w-4" />
                  Submit New Verification
                </button>
              </div>
            ) : (
              <div className="space-y-5">
                {/* Steps Indicator */}
                <div className="flex items-center justify-center">
                  <div className="flex items-center gap-3">
                    <StepPill stepNumber={1} active={kycStep === 'info'} completed={kycStep === 'documents'} label="Personal Info" />
                    <div className={cn('h-0.5 w-8 rounded-full', kycStep === 'documents' ? 'bg-emerald-600' : 'bg-slate-700')} />
                    <StepPill stepNumber={2} active={kycStep === 'documents'} completed={false} label="Documents" />
                  </div>
                </div>

                {kycStep === 'info' ? (
                  <form onSubmit={handleSubmitPersonalInfo} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-slate-300 text-xs font-medium mb-1.5">First Name *</label>
                        <input
                          type="text"
                          required
                          placeholder="John"
                          value={personalInfo.firstName}
                          onChange={(e) => setPersonalInfo({ ...personalInfo, firstName: e.target.value })}
                          className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm placeholder-slate-500 focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-300 text-xs font-medium mb-1.5">Last Name *</label>
                        <input
                          type="text"
                          required
                          placeholder="Doe"
                          value={personalInfo.lastName}
                          onChange={(e) => setPersonalInfo({ ...personalInfo, lastName: e.target.value })}
                          className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm placeholder-slate-500 focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-300 text-xs font-medium mb-1.5">Date of Birth *</label>
                        <input
                          type="date"
                          required
                          value={personalInfo.dateOfBirth}
                          onChange={(e) => setPersonalInfo({ ...personalInfo, dateOfBirth: e.target.value })}
                          className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-300 text-xs font-medium mb-1.5">Nationality *</label>
                        <input
                          type="text"
                          required
                          placeholder="e.g., American"
                          value={personalInfo.nationality}
                          onChange={(e) => setPersonalInfo({ ...personalInfo, nationality: e.target.value })}
                          className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm placeholder-slate-500 focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-slate-300 text-xs font-medium mb-1.5">Phone Number *</label>
                        <input
                          type="tel"
                          required
                          placeholder="+1 234 567 8900"
                          value={personalInfo.phoneNumber}
                          onChange={(e) => setPersonalInfo({ ...personalInfo, phoneNumber: e.target.value })}
                          className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm placeholder-slate-500 focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-slate-300 text-xs font-medium mb-1.5">Street Address *</label>
                        <input
                          type="text"
                          required
                          placeholder="123 Main Street, Apt 4B"
                          value={personalInfo.address}
                          onChange={(e) => setPersonalInfo({ ...personalInfo, address: e.target.value })}
                          className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm placeholder-slate-500 focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-300 text-xs font-medium mb-1.5">City *</label>
                        <input
                          type="text"
                          required
                          placeholder="New York"
                          value={personalInfo.city}
                          onChange={(e) => setPersonalInfo({ ...personalInfo, city: e.target.value })}
                          className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm placeholder-slate-500 focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-300 text-xs font-medium mb-1.5">Country *</label>
                        <input
                          type="text"
                          required
                          placeholder="United States"
                          value={personalInfo.country}
                          onChange={(e) => setPersonalInfo({ ...personalInfo, country: e.target.value })}
                          className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm placeholder-slate-500 focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-300 text-xs font-medium mb-1.5">Postal Code</label>
                        <input
                          type="text"
                          placeholder="10001"
                          value={personalInfo.postalCode}
                          onChange={(e) => setPersonalInfo({ ...personalInfo, postalCode: e.target.value })}
                          className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm placeholder-slate-500 focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                        />
                      </div>
                    </div>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-all"
                    >
                      {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Continue to Documents <ArrowRight className="h-4 w-4" /></>}
                    </button>
                  </form>
                ) : (
                  <form onSubmit={handleSubmitDocuments} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-slate-300 text-xs font-medium mb-1.5">Document Type *</label>
                        <select
                          required
                          value={documentInfo.documentType}
                          onChange={(e) => setDocumentInfo({ ...documentInfo, documentType: e.target.value as DocumentType })}
                          className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                        >
                          <option value="NATIONAL_ID">National ID Card</option>
                          <option value="PASSPORT">Passport</option>
                          <option value="DRIVERS_LICENSE">Driver&apos;s License</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-slate-300 text-xs font-medium mb-1.5">Document Number *</label>
                        <input
                          type="text"
                          required
                          placeholder="Enter document number"
                          value={documentInfo.documentNumber}
                          onChange={(e) => setDocumentInfo({ ...documentInfo, documentNumber: e.target.value })}
                          className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm placeholder-slate-500 focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <CompactFileUpload
                        label="Document Front *"
                        file={documentFront}
                        onFileChange={setDocumentFront}
                        accept="image/jpeg,image/png,application/pdf"
                      />
                      <CompactFileUpload
                        label="Document Back"
                        file={documentBack}
                        onFileChange={setDocumentBack}
                        accept="image/jpeg,image/png,application/pdf"
                      />
                      <CompactFileUpload
                        label="Selfie with ID *"
                        file={selfieWithId}
                        onFileChange={setSelfieWithId}
                        accept="image/jpeg,image/png"
                      />
                    </div>

                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setKycStep('info')}
                        className="flex items-center gap-2 px-4 py-2.5 bg-slate-700 hover:bg-slate-600 text-white text-sm font-medium rounded-lg transition-colors"
                      >
                        <ArrowLeft className="h-4 w-4" />
                        Back
                      </button>
                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-all"
                      >
                        {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Submit for Verification <ShieldCheck className="h-4 w-4" /></>}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Profile Section */}
      <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 overflow-hidden">
        <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-700/50">
          <div className="flex items-center justify-center w-7 h-7 bg-blue-500/10 rounded-lg">
            <User className="h-4 w-4 text-blue-400" />
          </div>
          <h2 className="text-sm font-medium text-white">Profile</h2>
        </div>
        <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="flex items-center gap-3 bg-slate-700/30 rounded-lg px-3 py-2.5">
            <span className="text-slate-500 text-xs min-w-[50px]">Name</span>
            <span className="text-white text-sm">{user?.name || '-'}</span>
          </div>
          <div className="flex items-center gap-3 bg-slate-700/30 rounded-lg px-3 py-2.5">
            <span className="text-slate-500 text-xs min-w-[50px]">Email</span>
            <span className="text-white text-sm truncate">{user?.email || '-'}</span>
          </div>
        </div>
      </div>

      {/* Notifications & Trading in a grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Notifications */}
        <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 overflow-hidden">
          <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-700/50">
            <div className="flex items-center justify-center w-7 h-7 bg-yellow-500/10 rounded-lg">
              <Bell className="h-4 w-4 text-yellow-400" />
            </div>
            <h2 className="text-sm font-medium text-white">Notifications</h2>
          </div>
          <div className="p-4 space-y-1">
            <ToggleSetting
              label="Trade Opened"
              checked={settings.notifications.tradeOpened}
              onChange={(checked) => setSettings((s) => ({ ...s, notifications: { ...s.notifications, tradeOpened: checked } }))}
            />
            <ToggleSetting
              label="Trade Results"
              checked={settings.notifications.tradeResult}
              onChange={(checked) => setSettings((s) => ({ ...s, notifications: { ...s.notifications, tradeResult: checked } }))}
            />
            <ToggleSetting
              label="Low Balance Warning"
              checked={settings.notifications.lowBalance}
              onChange={(checked) => setSettings((s) => ({ ...s, notifications: { ...s.notifications, lowBalance: checked } }))}
            />
            <ToggleSetting
              label="Market Alerts"
              checked={settings.notifications.marketAlerts}
              onChange={(checked) => setSettings((s) => ({ ...s, notifications: { ...s.notifications, marketAlerts: checked } }))}
            />
          </div>
        </div>

        {/* Trading Preferences */}
        <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 overflow-hidden">
          <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-700/50">
            <div className="flex items-center justify-center w-7 h-7 bg-purple-500/10 rounded-lg">
              <Shield className="h-4 w-4 text-purple-400" />
            </div>
            <h2 className="text-sm font-medium text-white">Trading</h2>
          </div>
          <div className="p-4 space-y-1">
            <ToggleSetting
              label="Confirm Trades"
              checked={settings.trading.confirmTrades}
              onChange={(checked) => setSettings((s) => ({ ...s, trading: { ...s.trading, confirmTrades: checked } }))}
            />
            <ToggleSetting
              label="Sound Effects"
              checked={settings.trading.soundEffects}
              onChange={(checked) => setSettings((s) => ({ ...s, trading: { ...s.trading, soundEffects: checked } }))}
            />
            <div className="grid grid-cols-2 gap-2 pt-2">
              <div>
                <label className="block text-slate-500 text-xs mb-1">Amount ($)</label>
                <input
                  type="number"
                  value={settings.trading.defaultAmount}
                  onChange={(e) => setSettings((s) => ({ ...s, trading: { ...s.trading, defaultAmount: Number(e.target.value) } }))}
                  className="w-full px-2.5 py-1.5 bg-slate-700/50 border border-slate-600/50 rounded-lg text-white text-sm focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="block text-slate-500 text-xs mb-1">Duration</label>
                <select
                  value={settings.trading.defaultDuration}
                  onChange={(e) => setSettings((s) => ({ ...s, trading: { ...s.trading, defaultDuration: Number(e.target.value) } }))}
                  className="w-full px-2.5 py-1.5 bg-slate-700/50 border border-slate-600/50 rounded-lg text-white text-sm focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
                >
                  <option value={5}>5s</option>
                  <option value={15}>15s</option>
                  <option value={30}>30s</option>
                  <option value={60}>1m</option>
                  <option value={180}>3m</option>
                  <option value={300}>5m</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Display */}
      <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-7 h-7 bg-pink-500/10 rounded-lg">
              <Palette className="h-4 w-4 text-pink-400" />
            </div>
            <h2 className="text-sm font-medium text-white">Display</h2>
          </div>
          <ToggleSetting
            label="Compact Mode"
            checked={settings.display.compactMode}
            onChange={(checked) => setSettings((s) => ({ ...s, display: { ...s.display, compactMode: checked } }))}
            inline
          />
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          onClick={handleSaveSettings}
          className="flex items-center gap-2 px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg transition-colors"
        >
          <Save className="h-4 w-4" />
          Save Settings
        </button>
      </div>
    </div>
  );
}

function ToggleSetting({
  label,
  checked,
  onChange,
  inline,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  inline?: boolean;
}) {
  return (
    <div className={cn(
      'flex items-center justify-between gap-3',
      !inline && 'py-2 px-3 rounded-lg hover:bg-slate-700/30 transition-colors'
    )}>
      <span className="text-slate-300 text-sm">{label}</span>
      <button
        onClick={() => onChange(!checked)}
        className={cn(
          'relative w-9 h-5 rounded-full transition-colors flex-shrink-0',
          checked ? 'bg-emerald-500' : 'bg-slate-600'
        )}
      >
        <div
          className={cn(
            'absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform shadow-sm',
            checked && 'translate-x-4'
          )}
        />
      </button>
    </div>
  );
}

function CompactFileUpload({
  label,
  file,
  onFileChange,
  accept,
}: {
  label: string;
  file: File | null;
  onFileChange: (file: File | null) => void;
  accept: string;
}) {
  return (
    <div>
      <label className="block text-slate-300 text-xs font-medium mb-1.5">{label}</label>
      <label className="group relative flex items-center justify-center w-full h-24 bg-slate-700/50 border border-dashed border-slate-600 rounded-lg cursor-pointer hover:border-emerald-500/50 hover:bg-slate-700 transition-all overflow-hidden">
        {file ? (
          <div className="text-center px-2">
            <FileCheck className="h-6 w-6 text-emerald-500 mx-auto mb-1" />
            <p className="text-emerald-400 text-xs truncate max-w-full">{file.name}</p>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onFileChange(null);
              }}
              className="text-red-400 text-xs mt-1 hover:text-red-300"
            >
              Remove
            </button>
          </div>
        ) : (
          <div className="text-center">
            <Upload className="h-5 w-5 text-slate-400 mx-auto mb-1 group-hover:text-emerald-400" />
            <p className="text-slate-400 text-xs">Click to upload</p>
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
