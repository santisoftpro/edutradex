'use client';

import { useState, useEffect } from 'react';
import {
  User,
  Bell,
  Shield,
  Palette,
  Volume2,
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
} from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';
import { useTradeStore } from '@/store/trade.store';
import { api } from '@/lib/api';
import type { KYCInfo, DocumentType } from '@/types';
import toast from 'react-hot-toast';
import { cn } from '@/lib/utils';

export default function SettingsPage() {
  const { user, resetBalance, refreshProfile } = useAuthStore();
  const { clearHistory } = useTradeStore();
  const [isResetting, setIsResetting] = useState(false);

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

  const handleResetBalance = async () => {
    setIsResetting(true);
    try {
      await resetBalance();
      toast.success('Balance reset to $0');
    } catch {
      toast.error('Failed to reset balance');
    } finally {
      setIsResetting(false);
    }
  };

  const handleClearHistory = () => {
    if (confirm('Are you sure you want to clear all trade history? This cannot be undone.')) {
      clearHistory();
      toast.success('Trade history cleared');
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
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Settings</h1>
        <p className="text-slate-400 mt-1">Manage your account and preferences</p>
      </div>

      {/* Email Verification Section */}
      <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Mail className="h-5 w-5 text-emerald-500" />
            <h2 className="text-lg font-semibold text-white">Email Verification</h2>
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
          <p className="text-slate-400">Your email address has been verified.</p>
        ) : (
          <div className="space-y-4">
            <p className="text-slate-400">Verify your email to unlock all features and secure your account.</p>
            {!codeSent ? (
              <button
                onClick={handleSendVerificationCode}
                disabled={isSendingCode}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-lg transition-colors"
              >
                {isSendingCode ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Mail className="h-4 w-4" />
                )}
                Send Verification Code
              </button>
            ) : (
              <div className="flex gap-3">
                <input
                  type="text"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value)}
                  placeholder="Enter 6-digit code"
                  maxLength={6}
                  className="flex-1 px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                />
                <button
                  onClick={handleVerifyEmail}
                  disabled={isVerifying}
                  className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-lg transition-colors"
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
                  className="px-4 py-2 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-white rounded-lg transition-colors"
                >
                  Resend
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* KYC Verification Section */}
      <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <FileCheck className="h-5 w-5 text-emerald-500" />
            <h2 className="text-lg font-semibold text-white">Identity Verification (KYC)</h2>
          </div>
          {!kycLoading && getKYCStatusBadge()}
        </div>

        {kycLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
          </div>
        ) : kycStatus?.status === 'APPROVED' ? (
          <div className="text-center py-8">
            <CheckCircle className="h-16 w-16 text-emerald-500 mx-auto mb-4" />
            <p className="text-white font-medium">Your identity has been verified</p>
            <p className="text-slate-400 text-sm mt-1">You have full access to all platform features</p>
          </div>
        ) : kycStatus?.status === 'PENDING' ? (
          <div className="text-center py-8">
            <Clock className="h-16 w-16 text-yellow-500 mx-auto mb-4" />
            <p className="text-white font-medium">Verification in Progress</p>
            <p className="text-slate-400 text-sm mt-1">Your documents are being reviewed. This usually takes 24-48 hours.</p>
          </div>
        ) : kycStatus?.status === 'REJECTED' ? (
          <div className="space-y-4">
            <div className="bg-red-900/20 border border-red-800 rounded-lg p-4">
              <p className="text-red-400 font-medium">Verification Rejected</p>
              <p className="text-slate-400 text-sm mt-1">Reason: {kycStatus.rejectionReason}</p>
            </div>
            <button
              onClick={() => setKycStep('info')}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors"
            >
              <RefreshCw className="h-4 w-4" />
              Resubmit Verification
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {/* KYC Steps Indicator */}
            <div className="flex items-center gap-4">
              <div className={cn('flex items-center gap-2', kycStep === 'info' ? 'text-emerald-500' : 'text-slate-400')}>
                <div className={cn('w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium', kycStep === 'info' ? 'bg-emerald-600 text-white' : 'bg-slate-700')}>
                  1
                </div>
                <span className="text-sm">Personal Info</span>
              </div>
              <div className="flex-1 h-0.5 bg-slate-700" />
              <div className={cn('flex items-center gap-2', kycStep === 'documents' ? 'text-emerald-500' : 'text-slate-400')}>
                <div className={cn('w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium', kycStep === 'documents' ? 'bg-emerald-600 text-white' : 'bg-slate-700')}>
                  2
                </div>
                <span className="text-sm">Documents</span>
              </div>
            </div>

            {kycStep === 'info' ? (
              <form onSubmit={handleSubmitPersonalInfo} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-slate-400 text-sm mb-2">First Name *</label>
                    <input
                      type="text"
                      required
                      value={personalInfo.firstName}
                      onChange={(e) => setPersonalInfo({ ...personalInfo, firstName: e.target.value })}
                      className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 text-sm mb-2">Last Name *</label>
                    <input
                      type="text"
                      required
                      value={personalInfo.lastName}
                      onChange={(e) => setPersonalInfo({ ...personalInfo, lastName: e.target.value })}
                      className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 text-sm mb-2">Date of Birth *</label>
                    <input
                      type="date"
                      required
                      value={personalInfo.dateOfBirth}
                      onChange={(e) => setPersonalInfo({ ...personalInfo, dateOfBirth: e.target.value })}
                      className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 text-sm mb-2">Nationality *</label>
                    <input
                      type="text"
                      required
                      value={personalInfo.nationality}
                      onChange={(e) => setPersonalInfo({ ...personalInfo, nationality: e.target.value })}
                      className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 text-sm mb-2">Phone Number *</label>
                    <input
                      type="tel"
                      required
                      value={personalInfo.phoneNumber}
                      onChange={(e) => setPersonalInfo({ ...personalInfo, phoneNumber: e.target.value })}
                      className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 text-sm mb-2">Country *</label>
                    <input
                      type="text"
                      required
                      value={personalInfo.country}
                      onChange={(e) => setPersonalInfo({ ...personalInfo, country: e.target.value })}
                      className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 text-sm mb-2">City *</label>
                    <input
                      type="text"
                      required
                      value={personalInfo.city}
                      onChange={(e) => setPersonalInfo({ ...personalInfo, city: e.target.value })}
                      className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 text-sm mb-2">Postal Code</label>
                    <input
                      type="text"
                      value={personalInfo.postalCode}
                      onChange={(e) => setPersonalInfo({ ...personalInfo, postalCode: e.target.value })}
                      className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-slate-400 text-sm mb-2">Address *</label>
                  <input
                    type="text"
                    required
                    value={personalInfo.address}
                    onChange={(e) => setPersonalInfo({ ...personalInfo, address: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-medium rounded-lg transition-colors"
                >
                  {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  Continue to Documents
                </button>
              </form>
            ) : (
              <form onSubmit={handleSubmitDocuments} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-slate-400 text-sm mb-2">Document Type *</label>
                    <select
                      required
                      value={documentInfo.documentType}
                      onChange={(e) => setDocumentInfo({ ...documentInfo, documentType: e.target.value as DocumentType })}
                      className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    >
                      <option value="NATIONAL_ID">National ID</option>
                      <option value="PASSPORT">Passport</option>
                      <option value="DRIVERS_LICENSE">Driver&apos;s License</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-400 text-sm mb-2">Document Number *</label>
                    <input
                      type="text"
                      required
                      value={documentInfo.documentNumber}
                      onChange={(e) => setDocumentInfo({ ...documentInfo, documentNumber: e.target.value })}
                      className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FileUploadBox
                    label="Document Front *"
                    file={documentFront}
                    onFileChange={setDocumentFront}
                    accept="image/jpeg,image/png,application/pdf"
                  />
                  <FileUploadBox
                    label="Document Back"
                    file={documentBack}
                    onFileChange={setDocumentBack}
                    accept="image/jpeg,image/png,application/pdf"
                  />
                  <FileUploadBox
                    label="Selfie with ID *"
                    file={selfieWithId}
                    onFileChange={setSelfieWithId}
                    accept="image/jpeg,image/png"
                  />
                </div>

                <p className="text-slate-400 text-sm">
                  * Please upload clear photos of your documents. Supported formats: JPEG, PNG, PDF (max 5MB)
                </p>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setKycStep('info')}
                    className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white font-medium rounded-lg transition-colors"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-medium rounded-lg transition-colors"
                  >
                    {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                    Submit for Verification
                  </button>
                </div>
              </form>
            )}
          </div>
        )}
      </div>

      {/* Profile Section */}
      <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
        <div className="flex items-center gap-3 mb-6">
          <User className="h-5 w-5 text-emerald-500" />
          <h2 className="text-lg font-semibold text-white">Profile</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
      <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
        <div className="flex items-center gap-3 mb-6">
          <Bell className="h-5 w-5 text-emerald-500" />
          <h2 className="text-lg font-semibold text-white">Notifications</h2>
        </div>
        <div className="space-y-4">
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
      <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
        <div className="flex items-center gap-3 mb-6">
          <Shield className="h-5 w-5 text-emerald-500" />
          <h2 className="text-lg font-semibold text-white">Trading Preferences</h2>
        </div>
        <div className="space-y-4">
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
          <div className="grid grid-cols-2 gap-4 pt-2">
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
      <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
        <div className="flex items-center gap-3 mb-6">
          <Palette className="h-5 w-5 text-emerald-500" />
          <h2 className="text-lg font-semibold text-white">Display</h2>
        </div>
        <div className="space-y-4">
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

      {/* Account Actions */}
      <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
        <div className="flex items-center gap-3 mb-6">
          <Volume2 className="h-5 w-5 text-emerald-500" />
          <h2 className="text-lg font-semibold text-white">Account Actions</h2>
        </div>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-slate-700/50 rounded-lg">
            <div>
              <p className="text-white font-medium">Reset Account Balance</p>
              <p className="text-slate-400 text-sm">Clear all funds - balance will be set to $0</p>
            </div>
            <button
              onClick={handleResetBalance}
              disabled={isResetting}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded-lg transition-colors"
            >
              <RefreshCw className={cn('h-4 w-4', isResetting && 'animate-spin')} />
              Reset
            </button>
          </div>
          <div className="flex items-center justify-between p-4 bg-slate-700/50 rounded-lg">
            <div>
              <p className="text-white font-medium">Clear Trade History</p>
              <p className="text-slate-400 text-sm">Delete all your trade records</p>
            </div>
            <button
              onClick={handleClearHistory}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
            >
              Clear History
            </button>
          </div>
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
    <div className="flex items-center justify-between">
      <div>
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
}: {
  label: string;
  file: File | null;
  onFileChange: (file: File | null) => void;
  accept: string;
}) {
  return (
    <div>
      <label className="block text-slate-400 text-sm mb-2">{label}</label>
      <label className="flex flex-col items-center justify-center w-full h-32 bg-slate-700 border-2 border-dashed border-slate-600 rounded-lg cursor-pointer hover:bg-slate-600/50 transition-colors">
        {file ? (
          <div className="text-center p-2">
            <CheckCircle className="h-8 w-8 text-emerald-500 mx-auto mb-1" />
            <p className="text-slate-300 text-xs truncate max-w-full px-2">{file.name}</p>
          </div>
        ) : (
          <div className="text-center">
            <Upload className="h-8 w-8 text-slate-400 mx-auto mb-1" />
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
