'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Smartphone,
  Bitcoin,
  Loader2,
  CheckCircle,
  XCircle,
  Wallet,
  Copy,
  Check,
  ArrowRight,
  Search,
  Star,
  ChevronLeft,
  QrCode,
  RefreshCw,
  Info,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import { formatCurrency, formatDate, cn } from '@/lib/utils';
import { useDepositUpdates } from '@/hooks/useDepositUpdates';
import type { Deposit, PaymentMethod as PaymentMethodType } from '@/types';

type Step = 1 | 2 | 3;
type PaymentCategory = 'popular' | 'mobile' | 'crypto';

const QUICK_AMOUNTS = [10, 25, 50, 100, 250, 500];

function StepIndicator({ currentStep }: { currentStep: Step }) {
  const steps = [
    { num: 1, label: 'Method' },
    { num: 2, label: 'Details' },
    { num: 3, label: 'Done' },
  ];

  return (
    <div className="flex items-center justify-between max-w-xs sm:max-w-sm mx-auto mb-4 sm:mb-6 px-2">
      {steps.map((step, index) => (
        <div key={step.num} className="flex items-center flex-1">
          <div className="flex flex-col items-center">
            <div className={cn(
              'w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs sm:text-sm font-semibold transition-all',
              currentStep >= step.num
                ? 'bg-emerald-500 text-white'
                : 'bg-slate-700 text-slate-400'
            )}>
              {currentStep > step.num ? <CheckCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> : step.num}
            </div>
            <span className={cn(
              'text-[10px] sm:text-xs mt-1',
              currentStep >= step.num ? 'text-emerald-400' : 'text-slate-500'
            )}>
              {step.label}
            </span>
          </div>
          {index < steps.length - 1 && (
            <div className={cn(
              'flex-1 h-0.5 mx-1 sm:mx-2',
              currentStep > step.num ? 'bg-emerald-500' : 'bg-slate-700'
            )} />
          )}
        </div>
      ))}
    </div>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success('Copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={handleCopy}
      className="p-1.5 hover:bg-slate-700 rounded-lg transition-colors shrink-0"
      title="Copy"
    >
      {copied ? (
        <Check className="h-3.5 w-3.5 text-emerald-400" />
      ) : (
        <Copy className="h-3.5 w-3.5 text-slate-400" />
      )}
    </button>
  );
}

function QRCodeDisplay({ address, name }: { address: string; name: string }) {
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(address)}`;

  return (
    <div className="flex flex-col items-center gap-2 p-3 bg-slate-900 rounded-lg">
      <img src={qrUrl} alt={`QR Code for ${name}`} className="w-24 h-24 sm:w-28 sm:h-28 rounded-lg bg-white p-1.5" />
      <p className="text-[10px] sm:text-xs text-slate-500">Scan to get address</p>
    </div>
  );
}

function StatusBadge({ status }: { status: Deposit['status'] }) {
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

export default function DepositPage() {
  const { user, refreshProfile, isHydrated } = useAuthStore();
  const [step, setStep] = useState<Step>(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<PaymentCategory>('popular');
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethodType | null>(null);
  const [deposits, setDeposits] = useState<Deposit[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethodType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showQR, setShowQR] = useState(false);

  // Form state
  const [amount, setAmount] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');

  const balance = user?.demoBalance || 0;

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
      const [depositsData, methodsData] = await Promise.all([
        api.getMyDeposits({ limit: 5 }),
        api.getActivePaymentMethods(),
      ]);
      setDeposits(depositsData);
      setPaymentMethods(methodsData);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const refreshDeposits = useCallback(async () => {
    try {
      const depositsData = await api.getMyDeposits({ limit: 5 });
      setDeposits(depositsData);
    } catch (error) {
      console.error('Failed to refresh deposits:', error);
    }
  }, []);

  useDepositUpdates(useCallback((depositId: string, status: 'APPROVED' | 'REJECTED') => {
    setDeposits(prev => prev.map(d =>
      d.id === depositId ? { ...d, status } : d
    ));
    refreshDeposits();
    refreshProfile();
  }, [refreshDeposits, refreshProfile]));

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
    if (isNaN(amountNum) || amountNum < selectedMethod.minAmount) {
      toast.error(`Minimum deposit is $${selectedMethod.minAmount}`);
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
        await api.createMobileMoneyDeposit({
          amount: amountNum,
          phoneNumber,
          mobileProvider: selectedMethod.mobileProvider as any,
        });
      } else {
        await api.createCryptoDeposit({
          amount: amountNum,
          cryptoCurrency: selectedMethod.cryptoCurrency as any,
        });
      }

      setStep(3);
      toast.success('Deposit request submitted!');
      fetchData();
      refreshProfile();
    } catch (error) {
      toast.error('Failed to submit deposit');
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
    setShowQR(false);
  };

  const categories: { id: PaymentCategory; label: string; icon: React.ReactNode }[] = [
    { id: 'popular', label: 'Popular', icon: <Star className="h-3.5 w-3.5" /> },
    { id: 'mobile', label: 'Mobile', icon: <Smartphone className="h-3.5 w-3.5" /> },
    { id: 'crypto', label: 'Crypto', icon: <Bitcoin className="h-3.5 w-3.5" /> },
  ];

  // Wait for hydration to prevent mismatch
  if (!isHydrated || isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <Loader2 className="h-8 w-8 text-emerald-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 p-3 sm:p-4 md:p-6">
      <div className="max-w-4xl mx-auto space-y-3 sm:space-y-4">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-lg sm:text-xl font-bold text-white">Deposit Funds</h1>
          <p className="text-slate-400 text-xs sm:text-sm mt-1">Top up your account balance</p>
        </div>

        {/* Balance Card */}
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-3 flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="p-1.5 sm:p-2 bg-emerald-600/20 rounded-lg">
              <Wallet className="h-4 w-4 text-emerald-400" />
            </div>
            <div>
              <p className="text-slate-400 text-[10px] sm:text-xs">Current Balance</p>
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

        {/* Step Indicator */}
        <StepIndicator currentStep={step} />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4">
          {/* Main Content */}
          <div className="lg:col-span-2">
            {/* Step 1: Select Method */}
            {step === 1 && (
              <div className="space-y-3 sm:space-y-4">
                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search payment method..."
                    className="w-full pl-9 pr-3 py-2 sm:py-2.5 bg-slate-800/50 border border-slate-700 rounded-xl text-white text-sm placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                {/* Categories */}
                <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                  {categories.map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => setActiveCategory(cat.id)}
                      className={cn(
                        'flex items-center gap-1.5 px-3 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium whitespace-nowrap transition-all',
                        activeCategory === cat.id
                          ? 'bg-emerald-500 text-white'
                          : 'bg-slate-800/50 text-slate-400 hover:bg-slate-700 border border-slate-700'
                      )}
                    >
                      {cat.icon}
                      {cat.label}
                    </button>
                  ))}
                </div>

                {/* Payment Methods Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
                  {filteredMethods.map((method) => (
                    <button
                      key={method.id}
                      onClick={() => handleMethodSelect(method)}
                      className="flex items-center gap-2.5 sm:gap-3 p-3 sm:p-4 bg-slate-800/50 border border-slate-700 rounded-xl hover:border-emerald-500/50 hover:bg-slate-800 transition-all text-left group"
                    >
                      <div className={cn('w-9 h-9 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center overflow-hidden shrink-0', method.iconBg)}>
                        {method.iconUrl ? (
                          <img
                            src={method.iconUrl}
                            alt={method.name}
                            className="w-6 h-6 sm:w-7 sm:h-7 object-contain"
                          />
                        ) : (
                          <span className="text-white font-bold text-[10px] sm:text-xs flex items-center justify-center">
                            {method.type === 'MOBILE_MONEY'
                              ? getProviderIconText(method.mobileProvider)
                              : method.cryptoCurrency?.slice(0, 3) || '?'}
                          </span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="text-white font-medium text-sm truncate">{method.name}</p>
                          {method.isPopular && <Star className="h-3 w-3 text-amber-400 fill-amber-400 shrink-0" />}
                        </div>
                        <div className="flex items-center gap-2 text-[10px] sm:text-xs text-slate-500 mt-0.5">
                          <span>Min: ${method.minAmount}</span>
                          <span>•</span>
                          <span>{method.processingTime}</span>
                        </div>
                      </div>
                      <ArrowRight className="h-4 w-4 text-slate-600 group-hover:text-emerald-400 transition-colors shrink-0" />
                    </button>
                  ))}
                </div>

                {filteredMethods.length === 0 && (
                  <div className="text-center py-8 sm:py-12">
                    <p className="text-slate-400 text-sm">No payment methods found</p>
                    <p className="text-slate-500 text-xs mt-1">Try a different search or category</p>
                  </div>
                )}
              </div>
            )}

            {/* Step 2: Enter Details */}
            {step === 2 && selectedMethod && (
              <div className="bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden">
                {/* Header */}
                <div className="p-2.5 sm:p-3 border-b border-slate-700 flex items-center justify-between bg-slate-800">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <button
                      onClick={() => setStep(1)}
                      className="p-1.5 hover:bg-slate-700 rounded-lg transition-colors"
                    >
                      <ChevronLeft className="h-4 w-4 text-slate-400" />
                    </button>
                    <div className={cn('w-8 h-8 sm:w-9 sm:h-9 rounded-lg flex items-center justify-center overflow-hidden', selectedMethod.iconBg)}>
                      {selectedMethod.iconUrl ? (
                        <img
                          src={selectedMethod.iconUrl}
                          alt={selectedMethod.name}
                          className="w-5 h-5 sm:w-6 sm:h-6 object-contain"
                        />
                      ) : (
                        <span className="text-white font-bold text-[10px] sm:text-xs flex items-center justify-center">
                          {selectedMethod.type === 'MOBILE_MONEY'
                            ? getProviderIconText(selectedMethod.mobileProvider)
                            : selectedMethod.cryptoCurrency?.slice(0, 3) || '?'}
                        </span>
                      )}
                    </div>
                    <div>
                      <p className="text-white font-medium text-xs sm:text-sm">{selectedMethod.name}</p>
                      <p className="text-slate-500 text-[10px] sm:text-xs">Min: ${selectedMethod.minAmount} • {selectedMethod.processingTime}</p>
                    </div>
                  </div>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-3 sm:p-4 space-y-3 sm:space-y-4">
                  {/* Amount */}
                  <div>
                    <label className="block text-xs sm:text-sm text-slate-400 mb-1.5">Amount (USD)</label>
                    <input
                      type="number"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="0.00"
                      min={selectedMethod.minAmount}
                      className="w-full px-3 py-2 sm:py-2.5 bg-slate-900 border border-slate-700 rounded-lg text-white text-base sm:text-lg placeholder-slate-600 focus:outline-none focus:border-emerald-500"
                      required
                    />
                    <div className="flex flex-wrap gap-1.5 sm:gap-2 mt-2">
                      {QUICK_AMOUNTS.filter(a => a >= selectedMethod.minAmount).map((quickAmount) => (
                        <button
                          key={quickAmount}
                          type="button"
                          onClick={() => setAmount(quickAmount.toString())}
                          className={cn(
                            'px-2.5 sm:px-3 py-1 rounded-lg text-[10px] sm:text-xs font-medium transition-all',
                            amount === quickAmount.toString()
                              ? 'bg-emerald-500 text-white'
                              : 'bg-slate-900 text-slate-400 hover:bg-slate-700 border border-slate-700'
                          )}
                        >
                          ${quickAmount}
                        </button>
                      ))}
                    </div>
                  </div>

                  {selectedMethod.type === 'MOBILE_MONEY' ? (
                    <>
                      {/* Phone Number */}
                      <div>
                        <label className="block text-xs sm:text-sm text-slate-400 mb-1.5">Your Phone Number</label>
                        <input
                          type="tel"
                          value={phoneNumber}
                          onChange={(e) => setPhoneNumber(e.target.value)}
                          placeholder="+255 7XX XXX XXX"
                          className="w-full px-3 py-2 sm:py-2.5 bg-slate-900 border border-slate-700 rounded-lg text-white text-sm placeholder-slate-600 focus:outline-none focus:border-emerald-500"
                          required
                        />
                      </div>

                      {/* Payment Instructions */}
                      {selectedMethod.phoneNumber && (
                        <div className="bg-emerald-900/20 border border-emerald-900/30 rounded-lg p-3">
                          <p className="text-emerald-400 text-xs sm:text-sm font-medium mb-2">Send payment to:</p>
                          <div className="flex items-center justify-between bg-slate-900 rounded-lg px-3 py-2 gap-2">
                            <div className="min-w-0">
                              <span className="text-white font-mono text-sm">{selectedMethod.phoneNumber}</span>
                              {selectedMethod.accountName && (
                                <span className="text-slate-400 text-xs ml-2 hidden sm:inline">({selectedMethod.accountName})</span>
                              )}
                            </div>
                            <CopyButton text={selectedMethod.phoneNumber} />
                          </div>
                          {selectedMethod.accountName && (
                            <p className="text-slate-400 text-xs mt-1.5 sm:hidden">Account: {selectedMethod.accountName}</p>
                          )}
                          <p className="text-slate-500 text-[10px] sm:text-xs mt-2">
                            Send the exact amount, then submit this form.
                          </p>
                        </div>
                      )}
                    </>
                  ) : (
                    <>
                      {/* Deposit Address with QR */}
                      {selectedMethod.walletAddress && (
                        <div className="bg-amber-900/20 border border-amber-900/30 rounded-lg p-3">
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-amber-400 text-xs sm:text-sm font-medium">
                              Send {selectedMethod.cryptoCurrency} to:
                            </p>
                            <button
                              type="button"
                              onClick={() => setShowQR(!showQR)}
                              className={cn(
                                'flex items-center gap-1 px-2 py-1 rounded text-[10px] sm:text-xs transition-colors',
                                showQR ? 'bg-amber-500 text-white' : 'bg-amber-500/20 text-amber-400 hover:bg-amber-500/30'
                              )}
                            >
                              <QrCode className="h-3 w-3" />
                              {showQR ? 'Hide' : 'QR'}
                            </button>
                          </div>

                          {showQR && (
                            <div className="mb-3">
                              <QRCodeDisplay address={selectedMethod.walletAddress} name={selectedMethod.name} />
                            </div>
                          )}

                          <div className="flex items-center justify-between bg-slate-900 rounded-lg px-3 py-2 gap-2">
                            <span className="text-white font-mono text-[10px] sm:text-xs break-all">{selectedMethod.walletAddress}</span>
                            <CopyButton text={selectedMethod.walletAddress} />
                          </div>
                          {selectedMethod.network && (
                            <p className="text-amber-300 text-[10px] sm:text-xs mt-2">
                              Network: <span className="font-medium">{selectedMethod.network}</span>
                            </p>
                          )}
                          <p className="text-slate-500 text-[10px] sm:text-xs mt-2">
                            Send the exact amount to the address above, then click submit.
                          </p>
                        </div>
                      )}
                    </>
                  )}

                  {/* Info Box */}
                  <div className="bg-blue-900/20 border border-blue-900/30 rounded-lg p-3 flex items-start gap-2">
                    <Info className="h-4 w-4 text-blue-400 shrink-0 mt-0.5" />
                    <p className="text-blue-300 text-[10px] sm:text-xs">
                      Your deposit will be credited after admin approval. Processing time: {selectedMethod.processingTime}
                    </p>
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-2 sm:py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        Submit Deposit
                        <ArrowRight className="h-4 w-4" />
                      </>
                    )}
                  </button>
                </form>
              </div>
            )}

            {/* Step 3: Confirmation */}
            {step === 3 && (
              <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 sm:p-6 text-center">
                <div className="w-14 h-14 sm:w-16 sm:h-16 bg-amber-500/20 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
                  <Loader2 className="h-7 w-7 sm:h-8 sm:w-8 text-amber-400 animate-spin" />
                </div>
                <h2 className="text-base sm:text-lg font-bold text-white mb-1">Deposit Pending</h2>
                <p className="text-slate-400 text-xs sm:text-sm mb-2">
                  Your deposit request has been submitted and is awaiting approval.
                </p>
                <div className="bg-slate-900/50 border border-slate-700 rounded-lg p-2.5 sm:p-3 mb-3 sm:mb-4">
                  <p className="text-slate-300 text-xs sm:text-sm font-medium">Estimated Processing Time</p>
                  <p className="text-amber-400 text-base sm:text-lg font-bold">5 minutes - 4 hours</p>
                </div>
                <p className="text-slate-500 text-[10px] sm:text-xs mb-4 sm:mb-6">
                  You will be notified in real-time when it's processed.
                </p>
                <button
                  onClick={handleReset}
                  className="px-5 sm:px-6 py-2 sm:py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium rounded-lg transition-all"
                >
                  Make Another Deposit
                </button>
              </div>
            )}
          </div>

          {/* Recent Deposits Sidebar */}
          <div className="lg:col-span-1 order-first lg:order-last">
            <div className="bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden lg:sticky lg:top-4">
              <div className="p-2.5 sm:p-3 border-b border-slate-700 bg-slate-800">
                <h3 className="text-white font-medium text-xs sm:text-sm">Recent Deposits</h3>
              </div>
              <div className="max-h-[200px] lg:max-h-[300px] overflow-y-auto">
                {deposits.length === 0 ? (
                  <div className="p-4 sm:p-6 text-center">
                    <Wallet className="h-6 w-6 sm:h-8 sm:w-8 text-slate-600 mx-auto mb-2" />
                    <p className="text-slate-500 text-xs sm:text-sm">No deposits yet</p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-700/50">
                    {deposits.map((deposit) => (
                      <div key={deposit.id} className="p-2.5 sm:p-3 hover:bg-slate-800/50 transition-colors">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-white font-medium text-xs sm:text-sm">
                            {formatCurrency(deposit.amount)}
                          </span>
                          <StatusBadge status={deposit.status} />
                        </div>
                        <div className="flex items-center justify-between text-[10px] sm:text-xs text-slate-500">
                          <span>
                            {deposit.method === 'MOBILE_MONEY'
                              ? deposit.mobileProvider
                              : deposit.cryptoCurrency}
                          </span>
                          <span>{formatDate(deposit.createdAt)}</span>
                        </div>
                        {deposit.adminNote && deposit.status !== 'PENDING' && (
                          <div className="mt-1.5 sm:mt-2 p-1.5 sm:p-2 bg-slate-900 rounded text-[10px] sm:text-xs text-slate-400">
                            <span className="text-slate-300">Note:</span> {deposit.adminNote}
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
