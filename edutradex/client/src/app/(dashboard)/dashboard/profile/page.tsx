'use client';

import { useState, useEffect } from 'react';
import {
  User,
  Mail,
  Shield,
  ShieldCheck,
  CheckCircle,
  XCircle,
  Clock,
  Loader2,
  Calendar,
  MapPin,
  Phone,
  Globe,
  FileCheck,
  Upload,
  AlertCircle,
  CreditCard,
  ArrowRight,
  ArrowLeft,
  Monitor,
  History,
  ChevronDown,
  ChevronUp,
  Key,
  Copy,
  Lock,
  Eye,
  EyeOff,
  RefreshCw,
} from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';
import { api, type TwoFactorStatus, type TwoFactorSetup } from '@/lib/api';
import type {
  UserProfile,
  ProfileDevice,
  LoginHistoryItem,
  ProfileStats,
  DocumentType,
} from '@/types';
import toast from 'react-hot-toast';
import { cn } from '@/lib/utils';
import { DeviceCard } from '@/components/profile/DeviceCard';
import { LoginHistoryTable } from '@/components/profile/LoginHistoryTable';
import { StepPill } from '../settings/StepPill';

export default function ProfilePage() {
  const { user, refreshProfile } = useAuthStore();

  // Profile state
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [stats, setStats] = useState<ProfileStats | null>(null);

  // Devices state
  const [devices, setDevices] = useState<ProfileDevice[]>([]);
  const [devicesLoading, setDevicesLoading] = useState(true);

  // Login history state
  const [loginHistory, setLoginHistory] = useState<LoginHistoryItem[]>([]);
  const [loginHistoryLoading, setLoginHistoryLoading] = useState(true);
  const [showLoginHistory, setShowLoginHistory] = useState(false);

  // 2FA state
  const [twoFactorStatus, setTwoFactorStatus] = useState<TwoFactorStatus | null>(null);
  const [twoFactorLoading, setTwoFactorLoading] = useState(true);
  const [twoFactorSetup, setTwoFactorSetup] = useState<TwoFactorSetup | null>(null);
  const [twoFactorStep, setTwoFactorStep] = useState<'idle' | 'setup' | 'verify' | 'backup'>('idle');
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [twoFactorPassword, setTwoFactorPassword] = useState('');
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [is2FASubmitting, setIs2FASubmitting] = useState(false);
  const [showDisable2FA, setShowDisable2FA] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // KYC state
  const [kycStep, setKycStep] = useState<'info' | 'documents'>('info');
  const [isKycSubmitting, setIsKycSubmitting] = useState(false);
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
  const [documentInfo, setDocumentInfo] = useState({
    documentType: 'NATIONAL_ID' as DocumentType,
    documentNumber: '',
  });
  const [documentFront, setDocumentFront] = useState<File | null>(null);
  const [documentBack, setDocumentBack] = useState<File | null>(null);
  const [selfieWithId, setSelfieWithId] = useState<File | null>(null);

  // Email verification
  const [verificationCode, setVerificationCode] = useState('');
  const [isSendingCode, setIsSendingCode] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [codeSent, setCodeSent] = useState(false);

  // Change password state
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);

  // Load data on mount
  useEffect(() => {
    loadProfile();
    loadDevices();
    load2FAStatus();
  }, []);

  const loadProfile = async () => {
    try {
      const [profileData, statsData] = await Promise.all([
        api.getFullProfile(),
        api.getProfileStats(),
      ]);
      setProfile(profileData);
      setStats(statsData);

      // Pre-fill personal info if KYC exists
      if (profileData.kyc) {
        setPersonalInfo({
          firstName: profileData.kyc.firstName || '',
          lastName: profileData.kyc.lastName || '',
          dateOfBirth: profileData.kyc.dateOfBirth?.split('T')[0] || '',
          nationality: profileData.kyc.nationality || '',
          address: profileData.kyc.address || '',
          city: profileData.kyc.city || '',
          country: profileData.kyc.country || '',
          postalCode: profileData.kyc.postalCode || '',
          phoneNumber: profileData.kyc.phoneNumber || '',
        });
      }
    } catch (error) {
      console.error('Failed to load profile:', error);
      toast.error('Failed to load profile');
    } finally {
      setProfileLoading(false);
    }
  };

  const loadDevices = async () => {
    try {
      const devicesData = await api.getUserDevices();
      setDevices(devicesData);
    } catch (error) {
      console.error('Failed to load devices:', error);
    } finally {
      setDevicesLoading(false);
    }
  };

  const loadLoginHistory = async () => {
    setLoginHistoryLoading(true);
    try {
      const { data } = await api.getLoginHistory({ limit: 20 });
      setLoginHistory(data);
    } catch (error) {
      console.error('Failed to load login history:', error);
    } finally {
      setLoginHistoryLoading(false);
    }
  };

  const load2FAStatus = async () => {
    try {
      const status = await api.get2FAStatus();
      setTwoFactorStatus(status);
    } catch (error) {
      console.error('Failed to load 2FA status:', error);
    } finally {
      setTwoFactorLoading(false);
    }
  };

  // Device handlers
  const handleRemoveDevice = async (deviceId: string) => {
    try {
      await api.removeDevice(deviceId);
      setDevices((prev) => prev.filter((d) => d.id !== deviceId));
      toast.success('Device removed');
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string } } };
      toast.error(err.response?.data?.error || 'Failed to remove device');
    }
  };

  const handleTrustDevice = async (deviceId: string) => {
    try {
      await api.trustDevice(deviceId);
      setDevices((prev) =>
        prev.map((d) =>
          d.id === deviceId ? { ...d, isTrusted: true, trustScore: 100 } : d
        )
      );
      toast.success('Device trusted');
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string } } };
      toast.error(err.response?.data?.error || 'Failed to trust device');
    }
  };

  // 2FA handlers
  const handleStart2FASetup = async () => {
    setIs2FASubmitting(true);
    try {
      const setup = await api.setup2FA();
      setTwoFactorSetup(setup);
      setTwoFactorStep('setup');
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string } } };
      toast.error(err.response?.data?.error || 'Failed to start 2FA setup');
    } finally {
      setIs2FASubmitting(false);
    }
  };

  const handleVerify2FASetup = async () => {
    if (!twoFactorCode || twoFactorCode.length !== 6) {
      toast.error('Please enter a valid 6-digit code');
      return;
    }
    setIs2FASubmitting(true);
    try {
      const result = await api.verify2FASetup(twoFactorCode);
      setBackupCodes(result.backupCodes);
      setTwoFactorStep('backup');
      toast.success('Two-factor authentication enabled!');
      await load2FAStatus();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string } } };
      toast.error(err.response?.data?.error || 'Invalid verification code');
    } finally {
      setIs2FASubmitting(false);
    }
  };

  const handleDisable2FA = async () => {
    if (!twoFactorPassword) {
      toast.error('Please enter your password');
      return;
    }
    setIs2FASubmitting(true);
    try {
      await api.disable2FA(twoFactorPassword);
      toast.success('Two-factor authentication disabled');
      setShowDisable2FA(false);
      setTwoFactorPassword('');
      await load2FAStatus();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string } } };
      toast.error(err.response?.data?.error || 'Failed to disable 2FA');
    } finally {
      setIs2FASubmitting(false);
    }
  };

  const handleRegenerateBackupCodes = async () => {
    if (!twoFactorPassword) {
      toast.error('Please enter your password');
      return;
    }
    setIs2FASubmitting(true);
    try {
      const result = await api.regenerateBackupCodes(twoFactorPassword);
      setBackupCodes(result.backupCodes);
      setTwoFactorStep('backup');
      setTwoFactorPassword('');
      toast.success('New backup codes generated!');
      await load2FAStatus();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string } } };
      toast.error(err.response?.data?.error || 'Failed to regenerate codes');
    } finally {
      setIs2FASubmitting(false);
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
    if (!verificationCode || verificationCode.length !== 6) {
      toast.error('Please enter a valid 6-digit code');
      return;
    }
    setIsVerifying(true);
    try {
      await api.verifyEmail(verificationCode);
      toast.success('Email verified successfully!');
      await refreshProfile();
      await loadProfile();
      setCodeSent(false);
      setVerificationCode('');
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string } } };
      toast.error(err.response?.data?.error || 'Invalid verification code');
    } finally {
      setIsVerifying(false);
    }
  };

  // Change password handler
  const handleChangePassword = async () => {
    if (!currentPassword) {
      toast.error('Please enter your current password');
      return;
    }
    if (!newPassword) {
      toast.error('Please enter a new password');
      return;
    }
    if (newPassword.length < 8) {
      toast.error('New password must be at least 8 characters');
      return;
    }
    if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(newPassword)) {
      toast.error('Password must contain uppercase, lowercase, and a number');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    setIsChangingPassword(true);
    try {
      await api.changePassword(currentPassword, newPassword);
      toast.success('Password changed successfully! Please log in again.');
      // Clear form
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setShowChangePassword(false);
      // Log out user since all tokens are invalidated
      const { useAuthStore } = await import('@/store/auth.store');
      useAuthStore.getState().logout();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string } } };
      toast.error(err.response?.data?.error || 'Failed to change password');
    } finally {
      setIsChangingPassword(false);
    }
  };

  // KYC handlers
  const handleSubmitPersonalInfo = async () => {
    const required = ['firstName', 'lastName', 'dateOfBirth', 'nationality', 'address', 'city', 'country', 'phoneNumber'];
    const missing = required.filter((field) => !personalInfo[field as keyof typeof personalInfo]);
    if (missing.length > 0) {
      toast.error(`Please fill in: ${missing.join(', ')}`);
      return;
    }

    setIsKycSubmitting(true);
    try {
      await api.submitKYCPersonalInfo(personalInfo);
      setKycStep('documents');
      toast.success('Personal information saved');
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string } } };
      toast.error(err.response?.data?.error || 'Failed to save personal information');
    } finally {
      setIsKycSubmitting(false);
    }
  };

  const handleSubmitDocuments = async () => {
    if (!documentFront || !selfieWithId) {
      toast.error('Please upload document front and selfie with ID');
      return;
    }
    if (!documentInfo.documentNumber) {
      toast.error('Please enter document number');
      return;
    }

    setIsKycSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('documentType', documentInfo.documentType);
      formData.append('documentNumber', documentInfo.documentNumber);
      formData.append('documentFront', documentFront);
      if (documentBack) formData.append('documentBack', documentBack);
      formData.append('selfieWithId', selfieWithId);

      await api.submitKYCDocuments(formData);
      toast.success('Documents submitted for review');
      await loadProfile();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string } } };
      toast.error(err.response?.data?.error || 'Failed to submit documents');
    } finally {
      setIsKycSubmitting(false);
    }
  };

  // Format helpers
  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  if (profileLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-[#1079ff]" />
      </div>
    );
  }

  const kycStatus = profile?.kyc?.status || 'NOT_SUBMITTED';

  return (
    <div className="space-y-6 max-w-5xl pb-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Profile</h1>
        <p className="text-slate-400 mt-1">
          Manage your personal information and account security
        </p>
      </div>

      {/* Profile Header Card */}
      <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          {/* Avatar */}
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#1079ff] to-[#092ab2] flex items-center justify-center text-2xl font-bold text-white">
            {getInitials(profile?.name || user?.name || 'U')}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-semibold text-white truncate">
              {profile?.name || user?.name}
            </h2>
            <p className="text-slate-400 text-sm truncate">{profile?.email || user?.email}</p>
            <div className="flex items-center gap-3 mt-2 text-xs text-slate-500">
              <span>Member since {formatDate(profile?.createdAt || null)}</span>
              <span className="px-2 py-0.5 bg-slate-700 rounded-full">
                {profile?.role || 'USER'}
              </span>
            </div>
          </div>

          {/* Verification Badges */}
          <div className="flex items-center gap-2 flex-wrap">
            {profile?.emailVerified && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-500/20 text-emerald-400 rounded-full text-xs">
                <CheckCircle className="h-3 w-3" />
                Email
              </span>
            )}
            {kycStatus === 'APPROVED' && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-500/20 text-emerald-400 rounded-full text-xs">
                <CheckCircle className="h-3 w-3" />
                KYC
              </span>
            )}
            {profile?.twoFactorEnabled && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-500/20 text-blue-400 rounded-full text-xs">
                <ShieldCheck className="h-3 w-3" />
                2FA
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Verification Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Email Verification */}
        <div
          className={cn(
            'bg-slate-800/50 border rounded-xl p-4',
            profile?.emailVerified
              ? 'border-emerald-500/30'
              : 'border-amber-500/30'
          )}
        >
          <div className="flex items-center gap-3">
            <div
              className={cn(
                'p-2.5 rounded-lg',
                profile?.emailVerified ? 'bg-emerald-500/20' : 'bg-amber-500/20'
              )}
            >
              <Mail
                className={cn(
                  'h-5 w-5',
                  profile?.emailVerified ? 'text-emerald-400' : 'text-amber-400'
                )}
              />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white">Email</p>
              <p
                className={cn(
                  'text-xs',
                  profile?.emailVerified ? 'text-emerald-400' : 'text-amber-400'
                )}
              >
                {profile?.emailVerified ? 'Verified' : 'Pending'}
              </p>
            </div>
            {profile?.emailVerified ? (
              <CheckCircle className="h-5 w-5 text-emerald-400" />
            ) : (
              <Clock className="h-5 w-5 text-amber-400" />
            )}
          </div>
        </div>

        {/* KYC Status */}
        <div
          className={cn(
            'bg-slate-800/50 border rounded-xl p-4',
            kycStatus === 'APPROVED'
              ? 'border-emerald-500/30'
              : kycStatus === 'PENDING'
              ? 'border-amber-500/30'
              : kycStatus === 'REJECTED'
              ? 'border-red-500/30'
              : 'border-slate-700/50'
          )}
        >
          <div className="flex items-center gap-3">
            <div
              className={cn(
                'p-2.5 rounded-lg',
                kycStatus === 'APPROVED'
                  ? 'bg-emerald-500/20'
                  : kycStatus === 'PENDING'
                  ? 'bg-amber-500/20'
                  : kycStatus === 'REJECTED'
                  ? 'bg-red-500/20'
                  : 'bg-slate-700/50'
              )}
            >
              <FileCheck
                className={cn(
                  'h-5 w-5',
                  kycStatus === 'APPROVED'
                    ? 'text-emerald-400'
                    : kycStatus === 'PENDING'
                    ? 'text-amber-400'
                    : kycStatus === 'REJECTED'
                    ? 'text-red-400'
                    : 'text-slate-400'
                )}
              />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white">Identity</p>
              <p
                className={cn(
                  'text-xs',
                  kycStatus === 'APPROVED'
                    ? 'text-emerald-400'
                    : kycStatus === 'PENDING'
                    ? 'text-amber-400'
                    : kycStatus === 'REJECTED'
                    ? 'text-red-400'
                    : 'text-slate-400'
                )}
              >
                {kycStatus === 'APPROVED'
                  ? 'Verified'
                  : kycStatus === 'PENDING'
                  ? 'Under Review'
                  : kycStatus === 'REJECTED'
                  ? 'Rejected'
                  : 'Not Submitted'}
              </p>
            </div>
            {kycStatus === 'APPROVED' ? (
              <CheckCircle className="h-5 w-5 text-emerald-400" />
            ) : kycStatus === 'PENDING' ? (
              <Clock className="h-5 w-5 text-amber-400" />
            ) : kycStatus === 'REJECTED' ? (
              <XCircle className="h-5 w-5 text-red-400" />
            ) : (
              <AlertCircle className="h-5 w-5 text-slate-400" />
            )}
          </div>
        </div>

        {/* 2FA Status */}
        <div
          className={cn(
            'bg-slate-800/50 border rounded-xl p-4',
            profile?.twoFactorEnabled
              ? 'border-blue-500/30'
              : 'border-slate-700/50'
          )}
        >
          <div className="flex items-center gap-3">
            <div
              className={cn(
                'p-2.5 rounded-lg',
                profile?.twoFactorEnabled ? 'bg-blue-500/20' : 'bg-slate-700/50'
              )}
            >
              <Shield
                className={cn(
                  'h-5 w-5',
                  profile?.twoFactorEnabled ? 'text-blue-400' : 'text-slate-400'
                )}
              />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white">2FA</p>
              <p
                className={cn(
                  'text-xs',
                  profile?.twoFactorEnabled ? 'text-blue-400' : 'text-slate-400'
                )}
              >
                {profile?.twoFactorEnabled ? 'Enabled' : 'Disabled'}
              </p>
            </div>
            {profile?.twoFactorEnabled ? (
              <ShieldCheck className="h-5 w-5 text-blue-400" />
            ) : (
              <AlertCircle className="h-5 w-5 text-slate-400" />
            )}
          </div>
        </div>
      </div>

      {/* Email Verification Section */}
      {!profile?.emailVerified && (
        <div className="bg-slate-800/50 border border-amber-500/30 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2.5 bg-amber-500/20 rounded-lg">
              <Mail className="h-5 w-5 text-amber-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">Verify Your Email</h3>
              <p className="text-sm text-slate-400">
                Complete email verification to unlock all features
              </p>
            </div>
          </div>

          {!codeSent ? (
            <button
              onClick={handleSendVerificationCode}
              disabled={isSendingCode}
              className="px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {isSendingCode ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Mail className="h-4 w-4" />
              )}
              Send Verification Code
            </button>
          ) : (
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="Enter 6-digit code"
                className="flex-1 px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              />
              <div className="flex gap-2">
                <button
                  onClick={handleVerifyEmail}
                  disabled={isVerifying || verificationCode.length !== 6}
                  className="px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {isVerifying ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCircle className="h-4 w-4" />
                  )}
                  Verify
                </button>
                <button
                  onClick={handleSendVerificationCode}
                  disabled={isSendingCode}
                  className="px-4 py-2 bg-slate-700 text-slate-300 rounded-lg hover:bg-slate-600 transition-colors disabled:opacity-50"
                >
                  Resend
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Personal Information Section */}
      {kycStatus === 'APPROVED' && profile?.kyc && (
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2.5 bg-[#1079ff]/20 rounded-lg">
              <User className="h-5 w-5 text-[#1079ff]" />
            </div>
            <h3 className="text-lg font-semibold text-white">Personal Information</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <InfoField label="First Name" value={profile.kyc.firstName} />
            <InfoField label="Last Name" value={profile.kyc.lastName} />
            <InfoField
              label="Date of Birth"
              value={profile.kyc.dateOfBirth?.split('T')[0]}
              icon={<Calendar className="h-4 w-4" />}
            />
            <InfoField
              label="Phone"
              value={profile.kyc.phoneNumber}
              icon={<Phone className="h-4 w-4" />}
            />
            <InfoField
              label="Nationality"
              value={profile.kyc.nationality}
              icon={<Globe className="h-4 w-4" />}
            />
            <InfoField
              label="Country"
              value={profile.kyc.country}
              icon={<MapPin className="h-4 w-4" />}
            />
            <div className="md:col-span-2">
              <InfoField
                label="Address"
                value={[profile.kyc.address, profile.kyc.city, profile.kyc.postalCode]
                  .filter(Boolean)
                  .join(', ')}
                icon={<MapPin className="h-4 w-4" />}
              />
            </div>
          </div>

          <p className="text-xs text-slate-500 mt-4">
            To update your personal information, please submit a new KYC verification request.
          </p>
        </div>
      )}

      {/* KYC Form Section */}
      {(kycStatus === 'NOT_SUBMITTED' || kycStatus === 'REJECTED') && (
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2.5 bg-amber-500/20 rounded-lg">
              <FileCheck className="h-5 w-5 text-amber-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">Identity Verification</h3>
              <p className="text-sm text-slate-400">
                Complete KYC to unlock deposits and withdrawals
              </p>
            </div>
          </div>

          {kycStatus === 'REJECTED' && profile?.kyc?.rejectionReason && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
              <div className="flex items-center gap-2 text-red-400 mb-1">
                <XCircle className="h-4 w-4" />
                <span className="font-medium">Previous submission rejected</span>
              </div>
              <p className="text-sm text-red-300">{profile.kyc.rejectionReason}</p>
            </div>
          )}

          {/* Step Indicators */}
          <div className="flex items-center gap-4 mb-6">
            <StepPill stepNumber={1} active={kycStep === 'info'} completed={kycStep === 'documents'} label="Personal Info" />
            <StepPill stepNumber={2} active={kycStep === 'documents'} completed={false} label="Documents" />
          </div>

          {kycStep === 'info' ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <InputField
                  label="First Name"
                  value={personalInfo.firstName}
                  onChange={(v) => setPersonalInfo((p) => ({ ...p, firstName: v }))}
                  required
                />
                <InputField
                  label="Last Name"
                  value={personalInfo.lastName}
                  onChange={(v) => setPersonalInfo((p) => ({ ...p, lastName: v }))}
                  required
                />
                <InputField
                  label="Date of Birth"
                  type="date"
                  value={personalInfo.dateOfBirth}
                  onChange={(v) => setPersonalInfo((p) => ({ ...p, dateOfBirth: v }))}
                  required
                />
                <InputField
                  label="Nationality"
                  value={personalInfo.nationality}
                  onChange={(v) => setPersonalInfo((p) => ({ ...p, nationality: v }))}
                  required
                />
                <InputField
                  label="Phone Number"
                  value={personalInfo.phoneNumber}
                  onChange={(v) => setPersonalInfo((p) => ({ ...p, phoneNumber: v }))}
                  required
                />
                <InputField
                  label="Country"
                  value={personalInfo.country}
                  onChange={(v) => setPersonalInfo((p) => ({ ...p, country: v }))}
                  required
                />
                <InputField
                  label="City"
                  value={personalInfo.city}
                  onChange={(v) => setPersonalInfo((p) => ({ ...p, city: v }))}
                  required
                />
                <InputField
                  label="Postal Code"
                  value={personalInfo.postalCode}
                  onChange={(v) => setPersonalInfo((p) => ({ ...p, postalCode: v }))}
                />
              </div>
              <InputField
                label="Street Address"
                value={personalInfo.address}
                onChange={(v) => setPersonalInfo((p) => ({ ...p, address: v }))}
                required
              />
              <div className="flex justify-end">
                <button
                  onClick={handleSubmitPersonalInfo}
                  disabled={isKycSubmitting}
                  className="px-6 py-2.5 bg-gradient-to-r from-[#1079ff] to-[#092ab2] hover:from-[#3a93ff] hover:to-[#1079ff] text-white rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {isKycSubmitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      Continue
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-slate-400 mb-1.5">Document Type</label>
                  <select
                    value={documentInfo.documentType}
                    onChange={(e) =>
                      setDocumentInfo((p) => ({ ...p, documentType: e.target.value as DocumentType }))
                    }
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-[#1079ff]"
                  >
                    <option value="NATIONAL_ID">National ID</option>
                    <option value="PASSPORT">Passport</option>
                    <option value="DRIVERS_LICENSE">Driver&apos;s License</option>
                  </select>
                </div>
                <InputField
                  label="Document Number"
                  value={documentInfo.documentNumber}
                  onChange={(v) => setDocumentInfo((p) => ({ ...p, documentNumber: v }))}
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FileUpload
                  label="Document Front"
                  file={documentFront}
                  onFileChange={setDocumentFront}
                  required
                />
                <FileUpload
                  label="Document Back (Optional)"
                  file={documentBack}
                  onFileChange={setDocumentBack}
                />
                <FileUpload
                  label="Selfie with ID"
                  file={selfieWithId}
                  onFileChange={setSelfieWithId}
                  required
                />
              </div>

              <div className="flex justify-between">
                <button
                  onClick={() => setKycStep('info')}
                  className="px-4 py-2 bg-slate-700 text-slate-300 rounded-lg hover:bg-slate-600 transition-colors flex items-center gap-2"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back
                </button>
                <button
                  onClick={handleSubmitDocuments}
                  disabled={isKycSubmitting}
                  className="px-6 py-2.5 bg-gradient-to-r from-[#1079ff] to-[#092ab2] hover:from-[#3a93ff] hover:to-[#1079ff] text-white rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {isKycSubmitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <Upload className="h-4 w-4" />
                      Submit for Review
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* KYC Pending Status */}
      {kycStatus === 'PENDING' && (
        <div className="bg-slate-800/50 border border-amber-500/30 rounded-xl p-6">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-500/20 rounded-lg">
              <Clock className="h-5 w-5 text-amber-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">Verification Under Review</h3>
              <p className="text-sm text-slate-400">
                Your documents are being reviewed. This usually takes 24-48 hours.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Security Section */}
      <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2.5 bg-blue-500/20 rounded-lg">
            <Shield className="h-5 w-5 text-blue-400" />
          </div>
          <h3 className="text-lg font-semibold text-white">Security</h3>
        </div>

        {/* 2FA Section */}
        <div className="space-y-4">
          {twoFactorLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
            </div>
          ) : twoFactorStep === 'idle' ? (
            twoFactorStatus?.enabled ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-blue-500/10 rounded-lg border border-blue-500/30">
                  <div className="flex items-center gap-3">
                    <ShieldCheck className="h-5 w-5 text-blue-400" />
                    <div>
                      <p className="text-sm font-medium text-white">Two-Factor Authentication</p>
                      <p className="text-xs text-slate-400">
                        {twoFactorStatus.backupCodesRemaining} backup codes remaining
                      </p>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 bg-blue-500/20 text-blue-400 rounded-full text-xs">
                    Enabled
                  </span>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setTwoFactorStep('setup')}
                    className="px-4 py-2 bg-slate-700 text-slate-300 rounded-lg hover:bg-slate-600 transition-colors flex items-center gap-2 text-sm"
                  >
                    <RefreshCw className="h-4 w-4" />
                    Regenerate Backup Codes
                  </button>
                  <button
                    onClick={() => setShowDisable2FA(true)}
                    className="px-4 py-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors flex items-center gap-2 text-sm"
                  >
                    <XCircle className="h-4 w-4" />
                    Disable 2FA
                  </button>
                </div>

                {showDisable2FA && (
                  <div className="p-4 bg-red-500/10 rounded-lg border border-red-500/30">
                    <p className="text-sm text-red-300 mb-3">
                      Enter your password to disable two-factor authentication:
                    </p>
                    <div className="flex gap-2">
                      <div className="flex-1 relative">
                        <input
                          type={showPassword ? 'text' : 'password'}
                          value={twoFactorPassword}
                          onChange={(e) => setTwoFactorPassword(e.target.value)}
                          placeholder="Your password"
                          className="w-full px-3 py-2 pr-10 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-500"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400"
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                      <button
                        onClick={handleDisable2FA}
                        disabled={is2FASubmitting}
                        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                      >
                        {is2FASubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Disable'}
                      </button>
                      <button
                        onClick={() => {
                          setShowDisable2FA(false);
                          setTwoFactorPassword('');
                        }}
                        className="px-4 py-2 bg-slate-700 text-slate-300 rounded-lg hover:bg-slate-600"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-between p-4 bg-slate-700/30 rounded-lg">
                <div className="flex items-center gap-3">
                  <Shield className="h-5 w-5 text-slate-400" />
                  <div>
                    <p className="text-sm font-medium text-white">Two-Factor Authentication</p>
                    <p className="text-xs text-slate-400">
                      Add an extra layer of security to your account
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleStart2FASetup}
                  disabled={is2FASubmitting}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2 text-sm"
                >
                  {is2FASubmitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <ShieldCheck className="h-4 w-4" />
                      Enable 2FA
                    </>
                  )}
                </button>
              </div>
            )
          ) : twoFactorStep === 'setup' ? (
            <div className="space-y-4">
              {twoFactorSetup && (
                <>
                  <p className="text-sm text-slate-300">
                    Scan this QR code with your authenticator app:
                  </p>
                  <div className="flex justify-center p-4 bg-white rounded-lg w-fit mx-auto">
                    <img
                      src={twoFactorSetup.qrCode}
                      alt="2FA QR Code"
                      className="w-48 h-48"
                    />
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-slate-500 mb-1">Or enter this key manually:</p>
                    <div className="flex items-center justify-center gap-2">
                      <code className="px-3 py-1 bg-slate-700 rounded text-sm text-slate-300 font-mono">
                        {twoFactorSetup.manualEntryKey}
                      </code>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(twoFactorSetup.manualEntryKey);
                          toast.success('Key copied!');
                        }}
                        className="p-1.5 text-slate-400 hover:text-white"
                      >
                        <Copy className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </>
              )}

              <div className="flex flex-col items-center gap-3 pt-4">
                <input
                  type="text"
                  value={twoFactorCode}
                  onChange={(e) => setTwoFactorCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="Enter 6-digit code"
                  className="w-48 px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-center placeholder-slate-500 text-lg tracking-widest"
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleVerify2FASetup}
                    disabled={is2FASubmitting || twoFactorCode.length !== 6}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
                  >
                    {is2FASubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Verify'}
                  </button>
                  <button
                    onClick={() => {
                      setTwoFactorStep('idle');
                      setTwoFactorCode('');
                    }}
                    className="px-4 py-2 bg-slate-700 text-slate-300 rounded-lg hover:bg-slate-600"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          ) : twoFactorStep === 'backup' ? (
            <div className="space-y-4">
              <div className="text-center">
                <CheckCircle className="h-12 w-12 text-emerald-400 mx-auto mb-3" />
                <h4 className="text-lg font-semibold text-white">Backup Codes</h4>
                <p className="text-sm text-slate-400">
                  Save these codes in a secure location. Each code can only be used once.
                </p>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-5 gap-2 p-4 bg-slate-700/30 rounded-lg">
                {backupCodes.map((code, i) => (
                  <code key={i} className="px-2 py-1 bg-slate-700 rounded text-center text-sm font-mono text-slate-300">
                    {code}
                  </code>
                ))}
              </div>

              <div className="flex justify-center gap-2">
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(backupCodes.join('\n'));
                    toast.success('Codes copied!');
                  }}
                  className="px-4 py-2 bg-slate-700 text-slate-300 rounded-lg hover:bg-slate-600 flex items-center gap-2"
                >
                  <Copy className="h-4 w-4" />
                  Copy All
                </button>
                <button
                  onClick={() => {
                    setTwoFactorStep('idle');
                    setBackupCodes([]);
                    setTwoFactorCode('');
                    setTwoFactorPassword('');
                  }}
                  className="px-6 py-2 bg-gradient-to-r from-[#1079ff] to-[#092ab2] hover:from-[#3a93ff] hover:to-[#1079ff] text-white rounded-lg transition-all"
                >
                  Done
                </button>
              </div>
            </div>
          ) : null}

          {/* Change Password Section */}
          <div className="pt-4 mt-4 border-t border-slate-700/50">
            {!showChangePassword ? (
              <div className="flex items-center justify-between p-4 bg-slate-700/30 rounded-lg">
                <div className="flex items-center gap-3">
                  <Lock className="h-5 w-5 text-slate-400" />
                  <div>
                    <p className="text-sm font-medium text-white">Password</p>
                    <p className="text-xs text-slate-400">
                      Change your account password
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowChangePassword(true)}
                  className="px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-500 transition-colors text-sm"
                >
                  Change Password
                </button>
              </div>
            ) : (
              <div className="p-4 bg-slate-700/30 rounded-lg space-y-4">
                <div className="flex items-center gap-3 mb-4">
                  <Lock className="h-5 w-5 text-slate-400" />
                  <p className="text-sm font-medium text-white">Change Password</p>
                </div>

                <div>
                  <label className="block text-sm text-slate-400 mb-1.5">Current Password</label>
                  <div className="relative">
                    <input
                      type={showCurrentPassword ? 'text' : 'password'}
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="Enter current password"
                      className="w-full px-3 py-2 pr-10 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                    >
                      {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm text-slate-400 mb-1.5">New Password</label>
                  <div className="relative">
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Enter new password"
                      className="w-full px-3 py-2 pr-10 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                    >
                      {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Min 8 characters with uppercase, lowercase, and number
                  </p>
                </div>

                <div>
                  <label className="block text-sm text-slate-400 mb-1.5">Confirm New Password</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm new password"
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    onClick={handleChangePassword}
                    disabled={isChangingPassword}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
                  >
                    {isChangingPassword ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Key className="h-4 w-4" />
                    )}
                    Update Password
                  </button>
                  <button
                    onClick={() => {
                      setShowChangePassword(false);
                      setCurrentPassword('');
                      setNewPassword('');
                      setConfirmPassword('');
                    }}
                    className="px-4 py-2 bg-slate-600 text-slate-300 rounded-lg hover:bg-slate-500"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Last Login Info */}
          {profile?.lastLoginAt && (
            <div className="pt-4 mt-4 border-t border-slate-700/50">
              <div className="flex items-center gap-3 text-sm text-slate-400">
                <Clock className="h-4 w-4" />
                <span>Last login: {formatDate(profile.lastLoginAt)}</span>
                {profile.lastKnownCountry && (
                  <>
                    <span className="text-slate-600">|</span>
                    <MapPin className="h-4 w-4" />
                    <span>{profile.lastKnownCountry}</span>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Devices Section */}
      <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2.5 bg-purple-500/20 rounded-lg">
            <Monitor className="h-5 w-5 text-purple-400" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-white">Your Devices</h3>
            <p className="text-sm text-slate-400">{devices.length} devices registered</p>
          </div>
        </div>

        {devicesLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
          </div>
        ) : devices.length === 0 ? (
          <div className="text-center py-8">
            <Monitor className="h-10 w-10 text-slate-600 mx-auto mb-3" />
            <p className="text-slate-400 text-sm">No devices found</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {devices.map((device) => (
              <DeviceCard
                key={device.id}
                device={device}
                onRemove={handleRemoveDevice}
                onTrust={handleTrustDevice}
              />
            ))}
          </div>
        )}
      </div>

      {/* Login History Section */}
      <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl overflow-hidden">
        <button
          onClick={() => {
            if (!showLoginHistory && loginHistory.length === 0) {
              loadLoginHistory();
            }
            setShowLoginHistory(!showLoginHistory);
          }}
          className="w-full p-6 flex items-center justify-between hover:bg-slate-700/20 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-500/20 rounded-lg">
              <History className="h-5 w-5 text-amber-400" />
            </div>
            <div className="text-left">
              <h3 className="text-lg font-semibold text-white">Login History</h3>
              <p className="text-sm text-slate-400">View your recent login activity</p>
            </div>
          </div>
          {showLoginHistory ? (
            <ChevronUp className="h-5 w-5 text-slate-400" />
          ) : (
            <ChevronDown className="h-5 w-5 text-slate-400" />
          )}
        </button>

        {showLoginHistory && (
          <div className="px-6 pb-6">
            <LoginHistoryTable items={loginHistory} isLoading={loginHistoryLoading} />
          </div>
        )}
      </div>

      {/* Account Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="Total Trades" value={stats.totalTrades.toLocaleString()} />
          <StatCard
            label="Win Rate"
            value={`${stats.winRate.toFixed(1)}%`}
            valueColor={stats.winRate >= 50 ? 'text-emerald-400' : 'text-red-400'}
          />
          <StatCard label="Referrals" value={stats.referralCount.toString()} />
          <StatCard
            label="Referral Earnings"
            value={`$${stats.referralEarnings.toFixed(2)}`}
            valueColor="text-emerald-400"
          />
        </div>
      )}
    </div>
  );
}

// Helper Components

function InfoField({
  label,
  value,
  icon,
}: {
  label: string;
  value: string | null | undefined;
  icon?: React.ReactNode;
}) {
  return (
    <div className="bg-slate-700/30 rounded-lg px-3 py-2.5">
      <span className="text-slate-500 text-xs flex items-center gap-1.5">
        {icon}
        {label}
      </span>
      <span className="text-white text-sm block mt-0.5">{value || 'N/A'}</span>
    </div>
  );
}

function InputField({
  label,
  value,
  onChange,
  type = 'text',
  required,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label className="block text-sm text-slate-400 mb-1.5">
        {label}
        {required && <span className="text-red-400 ml-1">*</span>}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:ring-2 focus:ring-[#1079ff] focus:border-transparent"
      />
    </div>
  );
}

function FileUpload({
  label,
  file,
  onFileChange,
  required,
}: {
  label: string;
  file: File | null;
  onFileChange: (file: File | null) => void;
  required?: boolean;
}) {
  return (
    <div>
      <label className="block text-sm text-slate-400 mb-1.5">
        {label}
        {required && <span className="text-red-400 ml-1">*</span>}
      </label>
      <div
        className={cn(
          'border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors',
          file ? 'border-[#1079ff]/50 bg-[#1079ff]/5' : 'border-slate-600 hover:border-slate-500'
        )}
        onClick={() => {
          const input = document.createElement('input');
          input.type = 'file';
          input.accept = 'image/*,.pdf';
          input.onchange = (e) => {
            const f = (e.target as HTMLInputElement).files?.[0];
            if (f) onFileChange(f);
          };
          input.click();
        }}
      >
        {file ? (
          <div className="flex items-center justify-center gap-2 text-[#1079ff]">
            <FileCheck className="h-5 w-5" />
            <span className="text-sm truncate max-w-[150px]">{file.name}</span>
          </div>
        ) : (
          <div className="text-slate-500">
            <Upload className="h-6 w-6 mx-auto mb-1" />
            <span className="text-xs">Click to upload</span>
          </div>
        )}
      </div>
      {file && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onFileChange(null);
          }}
          className="mt-1 text-xs text-red-400 hover:text-red-300"
        >
          Remove
        </button>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  valueColor = 'text-white',
}: {
  label: string;
  value: string;
  valueColor?: string;
}) {
  return (
    <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4">
      <p className="text-xs text-slate-400">{label}</p>
      <p className={cn('text-xl font-bold mt-1', valueColor)}>{value}</p>
    </div>
  );
}
