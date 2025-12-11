'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Smartphone,
  Bitcoin,
  Loader2,
  CheckCircle,
  XCircle,
  Wallet,
  ArrowRight,
  RefreshCw,
  AlertTriangle,
  Mail,
  Shield,
  Info,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import { formatCurrency, formatDate, cn } from '@/lib/utils';
import { useWithdrawalUpdates } from '@/hooks/useWithdrawalUpdates';
import type { Withdrawal, PaymentMethod as PaymentMethodType } from '@/types';

type Step = 1 | 2 | 3 | 4;

type DepositMethodWithPhone = PaymentMethodType & { userPhoneNumber?: string };

function StepIndicator({ currentStep, totalSteps = 4 }: { currentStep: Step; totalSteps?: number }) {
  const steps = [
    { num: 1, label: 'Method' },
    { num: 2, label: 'Details' },
    { num: 3, label: 'Verify' },
    { num: 4, label: 'Done' },
  ].slice(0, totalSteps);

  return (
    <div className="flex items-center justify-between max-w-sm sm:max-w-md mx-auto mb-4 sm:mb-6 px-2">
      {steps.map((step, index) => (
        <div key={step.num} className="flex items-center flex-1">
          <div className="flex flex-col items-center">
            <div className={cn(
              'w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs sm:text-sm font-semibold transition-all',
              currentStep >= step.num
                ? 'bg-purple-500 text-white'
                : 'bg-slate-700 text-slate-400'
            )}>
              {currentStep > step.num ? <CheckCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> : step.num}
            </div>
            <span className={cn(
              'text-[10px] sm:text-xs mt-1',
              currentStep >= step.num ? 'text-purple-400' : 'text-slate-500'
            )}>
              {step.label}
            </span>
          </div>
          {index < steps.length - 1 && (
            <div className={cn(
              'flex-1 h-0.5 mx-1 sm:mx-2',
              currentStep > step.num ? 'bg-purple-500' : 'bg-slate-700'
            )} />
          )}
        </div>
      ))}
    </div>
  );
}

function StatusBadge({ status }: { status: Withdrawal['status'] }) {
  if (status === 'PENDING') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium text-amber-400 bg-amber-500/20">
        <Loader2 className="h-3 w-3 animate-spin" />
        Pending
      </span>
    );
  }

  const config = {
    APPROVED: { icon: CheckCircle, color: 'text-emerald-400 bg-emerald-500/20', label: 'Completed' },
    REJECTED: { icon: XCircle, color: 'text-red-400 bg-red-500/20', label: 'Rejected' },
  };
  const { icon: Icon, color, label } = config[status];
  return (
    <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium', color)}>
      <Icon className="h-3 w-3" />
      {label}
    </span>
  );
}

function getProviderIconText(provider?: string): string {
  if (!provider) return '?';
  const icons: Record<string, string> = {
    MTN: 'MTN',
    MPESA: 'M',
    AIRTEL: 'A',
    VODAFONE: 'V',
    ORANGE: 'O',
    TIGO: 'T',
  };
  return icons[provider] || provider.slice(0, 3);
}

function OTPInput({
  value,
  onChange,
  disabled
}: {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const handleChange = (index: number, inputValue: string) => {
    const digit = inputValue.replace(/\D/g, '').slice(-1);

    const currentDigits = value.split('');
    while (currentDigits.length < 6) currentDigits.push('');
    currentDigits[index] = digit;

    const newValue = currentDigits.join('').replace(/\s/g, '');
    onChange(newValue);

    if (digit && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace') {
      e.preventDefault();
      const currentDigits = value.split('');
      while (currentDigits.length < 6) currentDigits.push('');

      if (currentDigits[index]) {
        currentDigits[index] = '';
        onChange(currentDigits.join(''));
      } else if (index > 0) {
        currentDigits[index - 1] = '';
        onChange(currentDigits.join(''));
        inputRefs.current[index - 1]?.focus();
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    onChange(pastedData);
    const focusIndex = Math.min(pastedData.length, 5);
    inputRefs.current[focusIndex]?.focus();
  };

  const getDigit = (index: number): string => {
    return value[index] || '';
  };

  return (
    <div className="flex gap-2 sm:gap-3 justify-center">
      {[0, 1, 2, 3, 4, 5].map((index) => (
        <input
          key={index}
          ref={(el) => { inputRefs.current[index] = el; }}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={getDigit(index)}
          onChange={(e) => handleChange(index, e.target.value)}
          onKeyDown={(e) => handleKeyDown(index, e)}
          onPaste={handlePaste}
          disabled={disabled}
          autoComplete="off"
          style={{ caretColor: 'white' }}
          className={cn(
            'w-10 h-12 sm:w-12 sm:h-14 text-center text-xl sm:text-2xl font-bold rounded-lg sm:rounded-xl border-2 transition-all',
            'bg-slate-900 focus:outline-none',
            getDigit(index) ? 'border-purple-500 text-white' : 'border-slate-600 text-white',
            'focus:border-purple-400 focus:ring-2 focus:ring-purple-500/30',
            disabled && 'opacity-50 cursor-not-allowed'
          )}
        />
      ))}
    </div>
  );
}

export default function WithdrawPage() {
  const { user, refreshProfile, isHydrated } = useAuthStore();
  const [step, setStep] = useState<Step>(1);
  const [depositMethod, setDepositMethod] = useState<DepositMethodWithPhone | null>(null);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSendingCode, setIsSendingCode] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [canResendCode, setCanResendCode] = useState(true);
  const [resendCountdown, setResendCountdown] = useState(0);
  const [lastWithdrawalId, setLastWithdrawalId] = useState<string | null>(null);
  const [lastWithdrawalStatus, setLastWithdrawalStatus] = useState<'PENDING' | 'APPROVED' | 'REJECTED'>('PENDING');
  const [hasNoDeposit, setHasNoDeposit] = useState(false);

  // Form state
  const [amount, setAmount] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [walletAddress, setWalletAddress] = useState('');

  const balance = user?.demoBalance || 0;

  const getQuickAmounts = () => {
    if (balance <= 0) return [];
    const amounts = [];
    if (balance >= 10) amounts.push(Math.floor(balance * 0.25));
    if (balance >= 20) amounts.push(Math.floor(balance * 0.5));
    if (balance >= 30) amounts.push(Math.floor(balance * 0.75));
    if (balance >= 10) amounts.push(Math.floor(balance));
    return [...new Set(amounts.filter(a => a >= 1))];
  };

  const quickAmounts = getQuickAmounts();
  const quickLabels = ['25%', '50%', '75%', 'Max'];

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [withdrawalsData, depositMethodData] = await Promise.all([
        api.getMyWithdrawals({ limit: 5 }),
        api.getMyDepositMethod(),
      ]);
      setWithdrawals(withdrawalsData);

      if (depositMethodData) {
        setDepositMethod(depositMethodData);
        // Pre-fill phone number if available from deposit
        if (depositMethodData.userPhoneNumber) {
          setPhoneNumber(depositMethodData.userPhoneNumber);
        }
        setHasNoDeposit(false);
      } else {
        setHasNoDeposit(true);
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const refreshWithdrawals = useCallback(async () => {
    try {
      const withdrawalsData = await api.getMyWithdrawals({ limit: 5 });
      setWithdrawals(withdrawalsData);
    } catch (error) {
      console.error('Failed to refresh withdrawals:', error);
    }
  }, []);

  useWithdrawalUpdates(useCallback((withdrawalId: string, status: 'APPROVED' | 'REJECTED') => {
    setWithdrawals(prev => prev.map(w =>
      w.id === withdrawalId ? { ...w, status } : w
    ));

    if (withdrawalId === lastWithdrawalId) {
      setLastWithdrawalStatus(status);
      if (status === 'APPROVED') {
        toast.success('Your withdrawal has been approved!');
      } else if (status === 'REJECTED') {
        toast.error('Your withdrawal has been rejected.');
      }
    }

    refreshWithdrawals();
    refreshProfile();
  }, [refreshWithdrawals, refreshProfile, lastWithdrawalId]));

  const handleRefreshBalance = async () => {
    setIsRefreshing(true);
    try {
      await refreshProfile();
      toast.success('Balance updated');
    } catch {
      toast.error('Failed to refresh balance');
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
    refreshProfile();
  }, [fetchData, refreshProfile]);

  useEffect(() => {
    if (resendCountdown > 0) {
      const timer = setTimeout(() => setResendCountdown(resendCountdown - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      setCanResendCode(true);
    }
  }, [resendCountdown]);

  const isMobileMoney = depositMethod?.type === 'MOBILE_MONEY' || depositMethod?.mobileProvider;

  const validateForm = (): boolean => {
    if (!depositMethod) return false;

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum < (depositMethod.minAmount || 1)) {
      toast.error(`Minimum withdrawal is $${depositMethod.minAmount || 1}`);
      return false;
    }

    if (amountNum > balance) {
      toast.error('Insufficient balance');
      return false;
    }

    if (isMobileMoney) {
      if (!phoneNumber || phoneNumber.length < 10) {
        toast.error('Please enter a valid phone number');
        return false;
      }
    } else {
      if (!walletAddress || walletAddress.length < 20) {
        toast.error('Please enter a valid wallet address');
        return false;
      }
      if (!depositMethod.network) {
        toast.error('Network information is missing. Please contact support.');
        return false;
      }
    }

    return true;
  };

  const handleSendVerificationCode = async () => {
    if (!validateForm() || !depositMethod) return;

    setIsSendingCode(true);
    try {
      await api.sendWithdrawalVerificationCode({
        amount: parseFloat(amount),
        method: depositMethod.name,
      });
      toast.success('Verification code sent to your email');
      setStep(3);
      setCanResendCode(false);
      setResendCountdown(60);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to send verification code';
      toast.error(errorMessage);
    } finally {
      setIsSendingCode(false);
    }
  };

  const handleResendCode = async () => {
    if (!canResendCode || !depositMethod) return;

    setIsSendingCode(true);
    try {
      await api.sendWithdrawalVerificationCode({
        amount: parseFloat(amount),
        method: depositMethod.name,
      });
      toast.success('New verification code sent');
      setCanResendCode(false);
      setResendCountdown(60);
      setVerificationCode('');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to resend code';
      toast.error(errorMessage);
    } finally {
      setIsSendingCode(false);
    }
  };

  const handleVerifyAndSubmit = async () => {
    if (verificationCode.length !== 6) {
      toast.error('Please enter a valid 6-digit code');
      return;
    }

    if (!depositMethod) return;

    setIsVerifying(true);
    try {
      await api.verifyWithdrawalCode(verificationCode);

      setIsSubmitting(true);

      let withdrawal: Withdrawal;
      if (isMobileMoney) {
        withdrawal = await api.createMobileMoneyWithdrawal({
          amount: parseFloat(amount),
          phoneNumber,
          mobileProvider: depositMethod.mobileProvider as any,
        });
      } else {
        withdrawal = await api.createCryptoWithdrawal({
          amount: parseFloat(amount),
          cryptoCurrency: depositMethod.cryptoCurrency as any,
          walletAddress,
          network: depositMethod.network!,
        });
      }

      setLastWithdrawalId(withdrawal.id);
      setLastWithdrawalStatus('PENDING');

      setStep(4);
      toast.success('Withdrawal request submitted!');
      fetchData();
      refreshProfile();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Verification failed';
      toast.error(errorMessage);
    } finally {
      setIsVerifying(false);
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setStep(1);
    setAmount('');
    setPhoneNumber(depositMethod?.userPhoneNumber || '');
    setWalletAddress('');
    setVerificationCode('');
    setLastWithdrawalId(null);
    setLastWithdrawalStatus('PENDING');
  };

  const handleContinueToDetails = () => {
    setStep(2);
  };

  // Wait for hydration to prevent mismatch
  if (!isHydrated || isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <Loader2 className="h-8 w-8 text-purple-500 animate-spin" />
      </div>
    );
  }

  // No deposit - show message
  if (hasNoDeposit) {
    return (
      <div className="min-h-screen bg-slate-900 p-3 sm:p-4 md:p-6">
        <div className="max-w-lg mx-auto">
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 text-center">
            <div className="w-16 h-16 bg-amber-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="h-8 w-8 text-amber-400" />
            </div>
            <h2 className="text-lg font-bold text-white mb-2">No Deposit Found</h2>
            <p className="text-slate-400 text-sm mb-4">
              You need to make a deposit first before you can withdraw funds.
              Your withdrawal method will be the same as your deposit method.
            </p>
            <a
              href="/dashboard/deposit"
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-purple-600 hover:bg-purple-500 text-white font-medium rounded-lg transition-all"
            >
              Make a Deposit
              <ArrowRight className="h-4 w-4" />
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 p-3 sm:p-4 md:p-6">
      <div className="max-w-4xl mx-auto space-y-3 sm:space-y-4">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-lg sm:text-xl font-bold text-white">Withdraw Funds</h1>
          <p className="text-slate-400 text-xs sm:text-sm mt-1">Securely transfer your balance</p>
        </div>

        {/* Balance Card */}
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-3 flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="p-1.5 sm:p-2 bg-purple-600/20 rounded-lg">
              <Wallet className="h-4 w-4 text-purple-400" />
            </div>
            <div>
              <p className="text-slate-400 text-[10px] sm:text-xs">Available</p>
              <p className="text-white text-base sm:text-lg font-bold">{formatCurrency(balance)}</p>
            </div>
          </div>
          <button
            onClick={handleRefreshBalance}
            disabled={isRefreshing}
            className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
          >
            <RefreshCw className={cn('h-4 w-4 text-slate-400', isRefreshing && 'animate-spin')} />
          </button>
        </div>

        {/* Low Balance Warning */}
        {balance < 1 && (
          <div className="bg-amber-900/20 border border-amber-900/30 rounded-xl p-3 flex items-start sm:items-center gap-2 sm:gap-3">
            <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5 sm:mt-0" />
            <p className="text-amber-300 text-xs sm:text-sm">Minimum withdrawal is $1. Continue trading to increase your balance.</p>
          </div>
        )}

        {/* Step Indicator */}
        <StepIndicator currentStep={step} />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4">
          {/* Main Content */}
          <div className="lg:col-span-2">
            {/* Step 1: Show Deposit Method */}
            {step === 1 && depositMethod && (
              <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 sm:p-6">
                <div className="text-center mb-4">
                  <h2 className="text-white font-medium text-sm sm:text-base mb-1">Your Withdrawal Method</h2>
                  <p className="text-slate-400 text-xs sm:text-sm">
                    Based on your deposit, you can only withdraw using:
                  </p>
                </div>

                {/* Method Card */}
                <div className="bg-slate-900 border border-purple-500/50 rounded-xl p-4 mb-4">
                  <div className="flex items-center gap-3">
                    <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center overflow-hidden', depositMethod.iconBg)}>
                      {depositMethod.iconUrl ? (
                        <img src={depositMethod.iconUrl} alt={depositMethod.name} className="w-8 h-8 object-contain" />
                      ) : (
                        <span className="text-white font-bold text-sm">
                          {isMobileMoney
                            ? getProviderIconText(depositMethod.mobileProvider)
                            : depositMethod.cryptoCurrency?.slice(0, 3) || '?'}
                        </span>
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="text-white font-semibold">{depositMethod.name}</p>
                      <p className="text-slate-400 text-sm">
                        {isMobileMoney ? 'Mobile Money' : 'Cryptocurrency'}
                      </p>
                      {depositMethod.network && (
                        <p className="text-purple-400 text-xs">Network: {depositMethod.network}</p>
                      )}
                    </div>
                    <div className="text-right">
                      {isMobileMoney ? (
                        <Smartphone className="h-6 w-6 text-purple-400" />
                      ) : (
                        <Bitcoin className="h-6 w-6 text-purple-400" />
                      )}
                    </div>
                  </div>
                </div>

                {/* Info Box */}
                <div className="bg-blue-900/20 border border-blue-900/30 rounded-lg p-3 mb-4 flex items-start gap-2">
                  <Info className="h-4 w-4 text-blue-400 shrink-0 mt-0.5" />
                  <p className="text-blue-300 text-xs">
                    For security, withdrawals must use the same method as your deposit.
                    Min: ${depositMethod.minAmount} • Processing: {depositMethod.processingTime}
                  </p>
                </div>

                <button
                  onClick={handleContinueToDetails}
                  disabled={balance < 1}
                  className="w-full py-2.5 bg-purple-600 hover:bg-purple-500 text-white font-medium rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  Continue
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            )}

            {/* Step 2: Enter Details */}
            {step === 2 && depositMethod && (
              <div className="bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden">
                {/* Header */}
                <div className="p-2.5 sm:p-3 border-b border-slate-700 flex items-center justify-between bg-slate-800">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <div className={cn('w-8 h-8 sm:w-9 sm:h-9 rounded-lg flex items-center justify-center overflow-hidden', depositMethod.iconBg)}>
                      {depositMethod.iconUrl ? (
                        <img src={depositMethod.iconUrl} alt={depositMethod.name} className="w-5 h-5 sm:w-6 sm:h-6 object-contain" />
                      ) : (
                        <span className="text-white font-bold text-[10px] sm:text-xs">
                          {isMobileMoney
                            ? getProviderIconText(depositMethod.mobileProvider)
                            : depositMethod.cryptoCurrency?.slice(0, 3) || '?'}
                        </span>
                      )}
                    </div>
                    <div>
                      <p className="text-white font-medium text-xs sm:text-sm">{depositMethod.name}</p>
                      <p className="text-slate-500 text-[10px] sm:text-xs">Min: ${depositMethod.minAmount}</p>
                    </div>
                  </div>
                </div>

                {/* Form */}
                <div className="p-3 sm:p-4 space-y-3 sm:space-y-4">
                  {/* Amount */}
                  <div>
                    <label className="block text-xs sm:text-sm text-slate-400 mb-1.5">Amount (USD)</label>
                    <input
                      type="number"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="0.00"
                      min={depositMethod.minAmount}
                      max={balance}
                      className="w-full px-3 py-2 sm:py-2.5 bg-slate-900 border border-slate-700 rounded-lg text-white text-base sm:text-lg placeholder-slate-600 focus:outline-none focus:border-purple-500"
                    />
                    {quickAmounts.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 sm:gap-2 mt-2">
                        {quickAmounts.map((quickAmount, index) => (
                          <button
                            key={quickAmount}
                            type="button"
                            onClick={() => setAmount(quickAmount.toString())}
                            className={cn(
                              'px-2.5 sm:px-3 py-1 rounded-lg text-[10px] sm:text-xs font-medium transition-all',
                              amount === quickAmount.toString()
                                ? 'bg-purple-500 text-white'
                                : 'bg-slate-900 text-slate-400 hover:bg-slate-700 border border-slate-700'
                            )}
                          >
                            {quickLabels[index] || `$${quickAmount}`}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {isMobileMoney ? (
                    <div>
                      <label className="block text-xs sm:text-sm text-slate-400 mb-1.5">Phone Number</label>
                      <input
                        type="tel"
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                        placeholder="+255 7XX XXX XXX"
                        className="w-full px-3 py-2 sm:py-2.5 bg-slate-900 border border-slate-700 rounded-lg text-white text-sm placeholder-slate-600 focus:outline-none focus:border-purple-500"
                      />
                      <p className="text-[10px] sm:text-xs text-slate-500 mt-1">
                        Phone number registered with {depositMethod.name}
                      </p>
                    </div>
                  ) : (
                    <div>
                      <label className="block text-xs sm:text-sm text-slate-400 mb-1.5">
                        {depositMethod.cryptoCurrency} Wallet Address
                      </label>
                      <input
                        type="text"
                        value={walletAddress}
                        onChange={(e) => setWalletAddress(e.target.value)}
                        placeholder="Enter wallet address"
                        className="w-full px-3 py-2 sm:py-2.5 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-600 focus:outline-none focus:border-purple-500 font-mono text-xs sm:text-sm"
                      />
                      {depositMethod.network && (
                        <p className="text-[10px] sm:text-xs text-purple-400 mt-1">
                          Network: <span className="font-medium">{depositMethod.network}</span>
                        </p>
                      )}
                      <p className="text-[10px] sm:text-xs text-slate-500 mt-1">
                        Double-check your address. Incorrect addresses may result in loss of funds.
                      </p>
                    </div>
                  )}

                  <button
                    onClick={handleSendVerificationCode}
                    disabled={isSendingCode}
                    className="w-full py-2 sm:py-2.5 bg-purple-600 hover:bg-purple-500 text-white text-sm font-medium rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {isSendingCode ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Mail className="h-4 w-4" />
                        Send Verification Code
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* Step 3: Verify Code */}
            {step === 3 && depositMethod && (
              <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 sm:p-6 text-center">
                <div className="w-12 h-12 sm:w-14 sm:h-14 bg-purple-500/20 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
                  <Shield className="h-6 w-6 sm:h-7 sm:w-7 text-purple-400" />
                </div>
                <h2 className="text-base sm:text-lg font-bold text-white mb-1">Verify Your Withdrawal</h2>
                <p className="text-slate-400 text-xs sm:text-sm mb-4 sm:mb-6">
                  Enter the 6-digit code sent to<br />
                  <span className="text-purple-400 font-medium break-all">{user?.email}</span>
                </p>

                <OTPInput
                  value={verificationCode}
                  onChange={setVerificationCode}
                  disabled={isVerifying || isSubmitting}
                />

                <div className="mt-3 sm:mt-4 text-xs sm:text-sm">
                  {canResendCode ? (
                    <button
                      onClick={handleResendCode}
                      disabled={isSendingCode}
                      className="text-purple-400 hover:text-purple-300 transition-colors"
                    >
                      {isSendingCode ? 'Sending...' : "Didn't receive code? Resend"}
                    </button>
                  ) : (
                    <p className="text-slate-500">
                      Resend code in <span className="text-purple-400">{resendCountdown}s</span>
                    </p>
                  )}
                </div>

                <div className="mt-4 sm:mt-6 space-y-2">
                  <button
                    onClick={handleVerifyAndSubmit}
                    disabled={verificationCode.length !== 6 || isVerifying || isSubmitting}
                    className="w-full py-2 sm:py-2.5 bg-purple-600 hover:bg-purple-500 text-white text-sm font-medium rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {isVerifying || isSubmitting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        {isVerifying ? 'Verifying...' : 'Processing...'}
                      </>
                    ) : (
                      <>
                        Confirm Withdrawal
                        <ArrowRight className="h-4 w-4" />
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => setStep(2)}
                    className="w-full py-2 sm:py-2.5 text-slate-400 hover:text-white text-xs sm:text-sm transition-colors"
                  >
                    Go Back
                  </button>
                </div>
              </div>
            )}

            {/* Step 4: Status */}
            {step === 4 && (
              <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 sm:p-6 text-center">
                {lastWithdrawalStatus === 'PENDING' && (
                  <>
                    <div className="w-14 h-14 sm:w-16 sm:h-16 bg-amber-500/20 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
                      <Loader2 className="h-7 w-7 sm:h-8 sm:w-8 text-amber-400 animate-spin" />
                    </div>
                    <h2 className="text-base sm:text-lg font-bold text-white mb-1">Withdrawal Pending</h2>
                    <p className="text-slate-400 text-xs sm:text-sm mb-2">
                      Your withdrawal request has been submitted and is awaiting approval.
                    </p>
                    <div className="bg-slate-900/50 border border-slate-700 rounded-lg p-2.5 sm:p-3 mb-3 sm:mb-4">
                      <p className="text-slate-300 text-xs sm:text-sm font-medium">Estimated Processing Time</p>
                      <p className="text-amber-400 text-base sm:text-lg font-bold">5 minutes - 4 hours</p>
                    </div>
                    <p className="text-slate-500 text-[10px] sm:text-xs mb-4 sm:mb-6">
                      You will be notified in real-time when it's processed.
                    </p>
                  </>
                )}

                {lastWithdrawalStatus === 'APPROVED' && (
                  <>
                    <div className="w-14 h-14 sm:w-16 sm:h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4 animate-in zoom-in duration-300">
                      <CheckCircle className="h-7 w-7 sm:h-8 sm:w-8 text-emerald-400" />
                    </div>
                    <h2 className="text-base sm:text-lg font-bold text-white mb-1">Withdrawal Approved!</h2>
                    <p className="text-slate-400 text-xs sm:text-sm mb-2">
                      Your withdrawal has been approved and is being processed.
                    </p>
                    <p className="text-emerald-400 text-[10px] sm:text-xs mb-4 sm:mb-6">
                      Funds will be sent to your account shortly.
                    </p>
                  </>
                )}

                {lastWithdrawalStatus === 'REJECTED' && (
                  <>
                    <div className="w-14 h-14 sm:w-16 sm:h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4 animate-in zoom-in duration-300">
                      <XCircle className="h-7 w-7 sm:h-8 sm:w-8 text-red-400" />
                    </div>
                    <h2 className="text-base sm:text-lg font-bold text-white mb-1">Withdrawal Rejected</h2>
                    <p className="text-slate-400 text-xs sm:text-sm mb-2">
                      Unfortunately, your withdrawal request was not approved.
                    </p>
                    <p className="text-red-400 text-[10px] sm:text-xs mb-4 sm:mb-6">
                      Your funds have been returned to your balance.
                    </p>
                  </>
                )}

                <button
                  onClick={handleReset}
                  className="px-5 sm:px-6 py-2 sm:py-2.5 bg-purple-600 hover:bg-purple-500 text-white text-sm font-medium rounded-lg transition-all"
                >
                  {lastWithdrawalStatus === 'PENDING' ? 'Make Another Withdrawal' : 'Done'}
                </button>
              </div>
            )}
          </div>

          {/* Recent Withdrawals Sidebar */}
          <div className="lg:col-span-1 order-first lg:order-last">
            <div className="bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden lg:sticky lg:top-4">
              <div className="p-2.5 sm:p-3 border-b border-slate-700 bg-slate-800">
                <h3 className="text-white font-medium text-xs sm:text-sm">Recent Withdrawals</h3>
              </div>
              <div className="max-h-[200px] lg:max-h-[300px] overflow-y-auto">
                {withdrawals.length === 0 ? (
                  <div className="p-4 sm:p-6 text-center">
                    <Wallet className="h-6 w-6 sm:h-8 sm:w-8 text-slate-600 mx-auto mb-2" />
                    <p className="text-slate-500 text-xs sm:text-sm">No withdrawals yet</p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-700/50">
                    {withdrawals.map((withdrawal) => (
                      <div key={withdrawal.id} className="p-2.5 sm:p-3 hover:bg-slate-800/50 transition-colors">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-white font-medium text-xs sm:text-sm">
                            {formatCurrency(withdrawal.amount)}
                          </span>
                          <StatusBadge status={withdrawal.status} />
                        </div>
                        <div className="flex items-center justify-between text-[10px] sm:text-xs text-slate-500">
                          <span>
                            {withdrawal.method === 'MOBILE_MONEY'
                              ? withdrawal.mobileProvider
                              : withdrawal.cryptoCurrency}
                          </span>
                          <span>{formatDate(withdrawal.createdAt)}</span>
                        </div>
                        {withdrawal.adminNote && withdrawal.status !== 'PENDING' && (
                          <div className="mt-1.5 sm:mt-2 p-1.5 sm:p-2 bg-slate-900 rounded text-[10px] sm:text-xs text-slate-400">
                            <span className="text-slate-300">Note:</span> {withdrawal.adminNote}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
