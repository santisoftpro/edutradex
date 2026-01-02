'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Loader2, Mail, Lock, Shield, ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuthStore, TwoFactorRequiredError } from '@/store/auth.store';
import { api } from '@/lib/api';
import { getErrorMessage } from '@/lib/utils';
import type { User } from '@/types';

export function LoginForm() {
  const router = useRouter();
  const { login, setUser, setToken, isLoading } = useAuthStore();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });

  // 2FA state
  const [requires2FA, setRequires2FA] = useState(false);
  const [tempToken, setTempToken] = useState('');
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [isVerifying2FA, setIsVerifying2FA] = useState(false);
  const [useBackupCode, setUseBackupCode] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isLoading) {
      return;
    }

    try {
      await login(formData.email, formData.password);
      toast.success('Welcome back!');
      router.push('/dashboard/trade');
    } catch (error) {
      if (error instanceof TwoFactorRequiredError) {
        setTempToken(error.tempToken);
        setRequires2FA(true);
      } else {
        toast.error(getErrorMessage(error));
      }
    }
  };

  const handle2FASubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!twoFactorCode.trim()) {
      toast.error(useBackupCode ? 'Please enter a backup code' : 'Please enter your 2FA code');
      return;
    }

    setIsVerifying2FA(true);
    try {
      const response = await api.verify2FALogin(
        tempToken,
        useBackupCode ? undefined : twoFactorCode,
        useBackupCode ? twoFactorCode : undefined
      );

      // Set user and token in store
      api.setToken(response.token);
      setToken(response.token);
      // Cast user to User type (API returns role as string but User expects literal types)
      setUser(response.user as User);

      toast.success('Welcome back!');
      router.push('/dashboard/trade');
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsVerifying2FA(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleBack = () => {
    setRequires2FA(false);
    setTempToken('');
    setTwoFactorCode('');
    setUseBackupCode(false);
  };

  // 2FA verification form
  if (requires2FA) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 px-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="flex items-center justify-center gap-3 mb-4">
              <Image src="/logo.png" alt="OptigoBroker" width={48} height={48} />
              <h1 className="text-3xl font-bold text-white">OptigoBroker</h1>
            </div>
            <p className="text-slate-400">Online Trading Platform</p>
          </div>

          <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-8 shadow-xl border border-slate-700">
            <button
              onClick={handleBack}
              className="flex items-center gap-2 text-slate-400 hover:text-white mb-4 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to login
            </button>

            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-[#1079ff]/10 rounded-full">
                <Shield className="h-6 w-6 text-[#1079ff]" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-white">Two-Factor Authentication</h2>
                <p className="text-sm text-slate-400">
                  {useBackupCode
                    ? 'Enter one of your backup codes'
                    : 'Enter the 6-digit code from your authenticator app'}
                </p>
              </div>
            </div>

            <form onSubmit={handle2FASubmit} className="space-y-5">
              <div>
                <label htmlFor="twoFactorCode" className="block text-sm font-medium text-slate-300 mb-2">
                  {useBackupCode ? 'Backup Code' : 'Authentication Code'}
                </label>
                <input
                  id="twoFactorCode"
                  type="text"
                  value={twoFactorCode}
                  onChange={(e) => setTwoFactorCode(e.target.value.toUpperCase())}
                  placeholder={useBackupCode ? 'Enter backup code' : '000000'}
                  maxLength={useBackupCode ? 20 : 6}
                  className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-lg text-white text-center text-2xl tracking-widest placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#1079ff] focus:border-transparent transition-all"
                  autoFocus
                  autoComplete="one-time-code"
                />
              </div>

              <button
                type="submit"
                disabled={isVerifying2FA}
                className="w-full py-3 px-4 bg-gradient-to-r from-[#1079ff] to-[#092ab2] hover:from-[#3a93ff] hover:to-[#1079ff] disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-all flex items-center justify-center gap-2"
              >
                {isVerifying2FA ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  'Verify'
                )}
              </button>
            </form>

            <div className="mt-6 text-center">
              <button
                onClick={() => {
                  setUseBackupCode(!useBackupCode);
                  setTwoFactorCode('');
                }}
                className="text-sm text-[#1079ff] hover:text-[#3a93ff]"
              >
                {useBackupCode ? 'Use authenticator app instead' : 'Use a backup code instead'}
              </button>
            </div>
          </div>

          <p className="text-center text-slate-500 text-sm mt-6">
            Trade responsibly. Your capital is at risk.
          </p>
        </div>
      </div>
    );
  }

  // Normal login form
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Image src="/logo.png" alt="OptigoBroker" width={48} height={48} />
            <h1 className="text-3xl font-bold text-white">OptigoBroker</h1>
          </div>
          <p className="text-slate-400">Online Trading Platform</p>
        </div>

        <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-8 shadow-xl border border-slate-700">
          <h2 className="text-2xl font-semibold text-white mb-6">Sign In</h2>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-300 mb-2">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500" />
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="you@example.com"
                  className="w-full pl-10 pr-4 py-3 bg-slate-900/50 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#1079ff] focus:border-transparent transition-all"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label htmlFor="password" className="block text-sm font-medium text-slate-300">
                  Password
                </label>
                <Link href="/forgot-password" className="text-sm text-[#1079ff] hover:text-[#3a93ff]">
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500" />
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Enter your password"
                  className="w-full pl-10 pr-4 py-3 bg-slate-900/50 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#1079ff] focus:border-transparent transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 px-4 bg-gradient-to-r from-[#1079ff] to-[#092ab2] hover:from-[#3a93ff] hover:to-[#1079ff] disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-all flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Signing in...
                </>
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-slate-400">
              Don&apos;t have an account?{' '}
              <Link href="/register" className="text-[#1079ff] hover:text-[#3a93ff] font-medium">
                Create one
              </Link>
            </p>
          </div>
        </div>

        <p className="text-center text-slate-500 text-sm mt-6">
          Trade responsibly. Your capital is at risk.
        </p>
      </div>
    </div>
  );
}
