'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Smartphone,
  Bitcoin,
  Loader2,
  CheckCircle,
  XCircle,
  Wallet,
  ArrowRight,
  Search,
  Star,
  ChevronRight,
  X,
  Check,
  RefreshCw,
  AlertTriangle,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import { formatCurrency, formatDate, cn } from '@/lib/utils';
import { useWithdrawalUpdates } from '@/hooks/useWithdrawalUpdates';
import type { Withdrawal, PaymentMethod as PaymentMethodType } from '@/types';

type Step = 1 | 2 | 3;
type PaymentCategory = 'popular' | 'mobile' | 'crypto';

function StepIndicator({ currentStep }: { currentStep: Step }) {
  const steps = [
    { num: 1, label: 'Select method' },
    { num: 2, label: 'Enter details' },
    { num: 3, label: 'Confirmation' },
  ];

  return (
    <div className="flex items-center justify-center gap-2 md:gap-4 mb-8">
      {steps.map((step, index) => (
        <div key={step.num} className="flex items-center">
          <div className="flex items-center gap-2">
            <div className={cn(
              'w-7 h-7 rounded-full flex items-center justify-center text-sm font-medium transition-all',
              currentStep >= step.num
                ? 'bg-purple-500 text-white'
                : 'bg-[#252542] text-gray-500'
            )}>
              {currentStep > step.num ? <Check className="h-4 w-4" /> : step.num}
            </div>
            <span className={cn(
              'text-sm hidden sm:block',
              currentStep >= step.num ? 'text-white' : 'text-gray-500'
            )}>
              {step.label}
            </span>
          </div>
          {index < steps.length - 1 && (
            <ChevronRight className="h-4 w-4 text-gray-600 mx-2 md:mx-4" />
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

export default function WithdrawPage() {
  const { user, refreshProfile } = useAuthStore();
  const [step, setStep] = useState<Step>(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<PaymentCategory>('popular');
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethodType | null>(null);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethodType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

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

  const filteredMethods = paymentMethods.filter(method => {
    const matchesSearch = method.name.toLowerCase().includes(searchQuery.toLowerCase());

    if (activeCategory === 'popular') {
      return matchesSearch && method.isPopular;
    } else if (activeCategory === 'mobile') {
      return matchesSearch && method.type === 'MOBILE_MONEY';
    } else if (activeCategory === 'crypto') {
      return matchesSearch && method.type === 'CRYPTO';
    }
    return matchesSearch;
  });

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [withdrawalsData, methodsData] = await Promise.all([
        api.getMyWithdrawals({ limit: 5 }),
        api.getActivePaymentMethods(),
      ]);
      setWithdrawals(withdrawalsData);
      setPaymentMethods(methodsData);
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

  // Listen for real-time withdrawal updates
  useWithdrawalUpdates(useCallback((withdrawalId: string, status: 'APPROVED' | 'REJECTED') => {
    // Update the withdrawal status in local state immediately
    setWithdrawals(prev => prev.map(w =>
      w.id === withdrawalId ? { ...w, status } : w
    ));
    // Also refresh to ensure we have latest data
    refreshWithdrawals();
    refreshProfile();
  }, [refreshWithdrawals, refreshProfile]));

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

  const handleMethodSelect = (method: PaymentMethodType) => {
    setSelectedMethod(method);
    setStep(2);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMethod) return;

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum < (selectedMethod.minAmount || 1)) {
      toast.error(`Minimum withdrawal is $${selectedMethod.minAmount || 1}`);
      return;
    }

    if (amountNum > balance) {
      toast.error('Insufficient balance');
      return;
    }

    setIsSubmitting(true);
    try {
      if (selectedMethod.type === 'MOBILE_MONEY') {
        if (!phoneNumber || phoneNumber.length < 10) {
          toast.error('Please enter a valid phone number');
          setIsSubmitting(false);
          return;
        }
        await api.createMobileMoneyWithdrawal({
          amount: amountNum,
          phoneNumber,
          mobileProvider: selectedMethod.mobileProvider as any,
        });
      } else {
        if (!walletAddress || walletAddress.length < 20) {
          toast.error('Please enter a valid wallet address');
          setIsSubmitting(false);
          return;
        }

        if (!selectedMethod.network) {
          toast.error('Network information is missing. Please contact support.');
          setIsSubmitting(false);
          return;
        }

        await api.createCryptoWithdrawal({
          amount: amountNum,
          cryptoCurrency: selectedMethod.cryptoCurrency as any,
          walletAddress,
          network: selectedMethod.network,
        });
      }

      setStep(3);
      toast.success('Withdrawal request submitted!');
      fetchData();
      refreshProfile();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to submit withdrawal';
      toast.error(errorMessage);
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setStep(1);
    setSelectedMethod(null);
    setAmount('');
    setPhoneNumber('');
    setWalletAddress('');
  };

  const categories: { id: PaymentCategory; label: string; icon: React.ReactNode }[] = [
    { id: 'popular', label: 'Popular', icon: <Star className="h-4 w-4" /> },
    { id: 'mobile', label: 'Mobile', icon: <Smartphone className="h-4 w-4" /> },
    { id: 'crypto', label: 'Crypto', icon: <Bitcoin className="h-4 w-4" /> },
  ];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <Loader2 className="h-8 w-8 text-purple-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 p-4 md:p-6">
      <div className="max-w-5xl mx-auto space-y-5">
        {/* Header */}
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-bold text-white">Withdraw Funds</h1>
          <p className="text-gray-400 text-sm">Move your balance to your preferred account securely.</p>
        </div>

        {/* Step Indicator */}
        <StepIndicator currentStep={step} />

        {/* Balance Card */}
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-600/20 rounded-lg">
              <Wallet className="h-5 w-5 text-purple-400" />
            </div>
            <div>
              <p className="text-purple-300 text-sm">Available Balance</p>
              <p className="text-white text-xl font-bold">{formatCurrency(balance)}</p>
            </div>
          </div>
          <button
            onClick={handleRefreshBalance}
            disabled={isRefreshing}
            className="p-2 hover:bg-purple-500/20 rounded-lg transition-colors"
            title="Refresh balance"
          >
            <RefreshCw className={cn('h-5 w-5 text-purple-400', isRefreshing && 'animate-spin')} />
          </button>
        </div>

        {/* Low Balance Warning */}
        {balance < 1 && (
          <div className="bg-amber-900/30 border border-amber-900/50 rounded-xl p-4 mb-6 flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-amber-300 font-medium">Insufficient Balance</p>
              <p className="text-amber-400/80 text-sm mt-1">
                You need at least $1 to make a withdrawal. Continue trading to increase your balance.
              </p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2">
            {step === 1 && (
              <div className="space-y-4">
                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search withdrawal method..."
                    className="w-full pl-10 pr-4 py-3 bg-[#1a1a2e] border border-[#2d2d44] rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
                  />
                </div>

                {/* Categories */}
                <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
                  {categories.map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => setActiveCategory(cat.id)}
                      className={cn(
                        'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all',
                        activeCategory === cat.id
                          ? 'bg-purple-500 text-white'
                          : 'bg-[#1a1a2e] text-gray-400 hover:bg-[#252542] hover:text-white'
                      )}
                    >
                      {cat.icon}
                      {cat.label}
                    </button>
                  ))}
                </div>

                {/* Payment Methods Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {filteredMethods.map((method) => (
                    <button
                      key={method.id}
                      onClick={() => handleMethodSelect(method)}
                      disabled={balance < 1}
                      className="flex items-center gap-3 p-4 bg-[#1a1a2e] border border-[#2d2d44] rounded-xl hover:border-purple-500/50 hover:bg-[#1a1a2e]/80 transition-all text-left group disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center overflow-hidden', method.iconBg)}>
                        {method.iconUrl ? (
                          <img
                            src={method.iconUrl}
                            alt={method.name}
                            className="w-7 h-7 object-contain"
                            onError={(e) => {
                              const target = e.currentTarget;
                              target.style.display = 'none';
                              const fallback = target.nextElementSibling as HTMLElement;
                              if (fallback) fallback.style.display = 'flex';
                            }}
                          />
                        ) : null}
                        <span
                          className="text-white font-bold text-xs items-center justify-center"
                          style={{ display: method.iconUrl ? 'none' : 'flex' }}
                        >
                          {method.type === 'MOBILE_MONEY'
                            ? getProviderIconText(method.mobileProvider)
                            : method.cryptoCurrency?.slice(0, 3) || '?'}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-white font-medium truncate">{method.name}</p>
                          {method.isPopular && <Star className="h-3 w-3 text-amber-400 fill-amber-400 flex-shrink-0" />}
                        </div>
                        <div className="flex items-center gap-3 text-xs text-gray-500 mt-0.5">
                          <span>Min: ${method.minAmount}</span>
                          <span>{method.processingTime}</span>
                        </div>
                      </div>
                      <ChevronRight className="h-4 w-4 text-gray-500 group-hover:text-purple-400 transition-colors" />
                    </button>
                  ))}
                </div>

                {filteredMethods.length === 0 && (
                  <div className="text-center py-12">
                    <p className="text-gray-400">No withdrawal methods found</p>
                    <p className="text-gray-500 text-sm mt-1">Try a different search or category</p>
                  </div>
                )}
              </div>
            )}

            {step === 2 && selectedMethod && (
              <div className="bg-[#1a1a2e] border border-[#2d2d44] rounded-xl overflow-hidden">
                {/* Selected Method Header */}
                <div className="p-4 border-b border-[#2d2d44] flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center overflow-hidden', selectedMethod.iconBg)}>
                      {selectedMethod.iconUrl ? (
                        <img
                          src={selectedMethod.iconUrl}
                          alt={selectedMethod.name}
                          className="w-7 h-7 object-contain"
                          onError={(e) => {
                            const target = e.currentTarget;
                            target.style.display = 'none';
                            const fallback = target.nextElementSibling as HTMLElement;
                            if (fallback) fallback.style.display = 'flex';
                          }}
                        />
                      ) : null}
                      <span
                        className="text-white font-bold text-xs items-center justify-center"
                        style={{ display: selectedMethod.iconUrl ? 'none' : 'flex' }}
                      >
                        {selectedMethod.type === 'MOBILE_MONEY'
                          ? getProviderIconText(selectedMethod.mobileProvider)
                          : selectedMethod.cryptoCurrency?.slice(0, 3) || '?'}
                      </span>
                    </div>
                    <div>
                      <p className="text-white font-medium">{selectedMethod.name}</p>
                      <p className="text-xs text-gray-500">Min: ${selectedMethod.minAmount} • {selectedMethod.processingTime}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setStep(1)}
                    className="p-2 hover:bg-[#252542] rounded-lg transition-colors"
                  >
                    <X className="h-4 w-4 text-gray-400" />
                  </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-4 space-y-4">
                  {/* Amount */}
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">Amount (USD)</label>
                    <input
                      type="number"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="Enter amount"
                      min={selectedMethod.minAmount}
                      max={balance}
                      className="w-full px-4 py-3 bg-[#252542] border border-[#3d3d5c] rounded-lg text-white text-lg placeholder-gray-500 focus:outline-none focus:border-purple-500"
                      required
                    />
                    {quickAmounts.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {quickAmounts.map((quickAmount, index) => (
                          <button
                            key={quickAmount}
                            type="button"
                            onClick={() => setAmount(quickAmount.toString())}
                            className={cn(
                              'px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                              amount === quickAmount.toString()
                                ? 'bg-purple-500 text-white'
                                : 'bg-[#252542] text-gray-400 hover:bg-[#3d3d5c]'
                            )}
                          >
                            {quickLabels[index] || `$${quickAmount}`}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {selectedMethod.type === 'MOBILE_MONEY' ? (
                    <>
                      {/* Phone Number */}
                      <div>
                        <label className="block text-sm text-gray-400 mb-2">Your Phone Number</label>
                        <input
                          type="tel"
                          value={phoneNumber}
                          onChange={(e) => setPhoneNumber(e.target.value)}
                          placeholder="+255 7XX XXX XXX"
                          className="w-full px-4 py-3 bg-[#252542] border border-[#3d3d5c] rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
                          required
                        />
                        <p className="text-xs text-gray-500 mt-2">
                          Enter the phone number registered with {selectedMethod.name}
                        </p>
                      </div>
                    </>
                  ) : (
                    <>
                      {/* Wallet Address */}
                      <div>
                        <label className="block text-sm text-gray-400 mb-2">
                          Your {selectedMethod.cryptoCurrency} Wallet Address
                        </label>
                        <input
                          type="text"
                          value={walletAddress}
                          onChange={(e) => setWalletAddress(e.target.value)}
                          placeholder="Enter your wallet address"
                          className="w-full px-4 py-3 bg-[#252542] border border-[#3d3d5c] rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 font-mono text-sm"
                          required
                        />
                        {selectedMethod.network && (
                          <p className="text-xs text-purple-400 mt-2">
                            Network: <span className="font-medium">{selectedMethod.network}</span>
                          </p>
                        )}
                        <p className="text-xs text-gray-500 mt-1">
                          Double-check your wallet address. Incorrect addresses may result in permanent loss of funds.
                        </p>
                      </div>
                    </>
                  )}

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-3 bg-purple-600 hover:bg-purple-500 text-white font-semibold rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        Submit Withdrawal
                        <ArrowRight className="h-4 w-4" />
                      </>
                    )}
                  </button>
                </form>
              </div>
            )}

            {step === 3 && (
              <div className="bg-[#1a1a2e] border border-[#2d2d44] rounded-xl p-8 text-center">
                <div className="w-16 h-16 bg-purple-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="h-8 w-8 text-purple-400" />
                </div>
                <h2 className="text-xl font-bold text-white mb-2">Withdrawal Submitted!</h2>
                <p className="text-gray-400 mb-6">
                  Your withdrawal request has been submitted and is pending approval.
                  You will be notified once it's processed.
                </p>
                <button
                  onClick={handleReset}
                  className="px-6 py-3 bg-purple-600 hover:bg-purple-500 text-white font-medium rounded-lg transition-all"
                >
                  Make Another Withdrawal
                </button>
              </div>
            )}
          </div>

          {/* Recent Withdrawals Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-[#1a1a2e] border border-[#2d2d44] rounded-xl overflow-hidden sticky top-6">
              <div className="p-4 border-b border-[#2d2d44]">
                <h2 className="text-white font-semibold">Recent Withdrawals</h2>
              </div>
              <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
                {withdrawals.length === 0 ? (
                  <div className="p-6 text-center">
                    <Wallet className="h-10 w-10 text-gray-600 mx-auto mb-2" />
                    <p className="text-gray-500 text-sm">No withdrawals yet</p>
                  </div>
                ) : (
                  <div className="divide-y divide-[#2d2d44]">
                    {withdrawals.map((withdrawal) => (
                      <div key={withdrawal.id} className="p-3 hover:bg-[#252542]/50 transition-colors">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-white font-medium text-sm">
                            {formatCurrency(withdrawal.amount)}
                          </span>
                          <StatusBadge status={withdrawal.status} />
                        </div>
                        <div className="flex items-center justify-between text-xs text-gray-500">
                          <span>
                            {withdrawal.method === 'MOBILE_MONEY'
                              ? withdrawal.mobileProvider
                              : withdrawal.cryptoCurrency}
                          </span>
                          <span>{formatDate(withdrawal.createdAt)}</span>
                        </div>
                        {withdrawal.adminNote && withdrawal.status !== 'PENDING' && (
                          <div className="mt-2 p-2 bg-[#252542] rounded text-xs text-gray-400">
                            <span className="font-medium text-gray-300">Note:</span> {withdrawal.adminNote}
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
