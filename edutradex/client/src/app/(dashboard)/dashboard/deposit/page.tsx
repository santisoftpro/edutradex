'use client';

import { useState, useEffect } from 'react';
import {
  Smartphone,
  Bitcoin,
  Loader2,
  CheckCircle,
  XCircle,
  Clock,
  Wallet,
  Copy,
  Check,
  ArrowRight,
  Search,
  Star,
  ChevronRight,
  X,
  QrCode,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import { formatCurrency, formatDate, cn } from '@/lib/utils';
import type { Deposit, PaymentMethod as PaymentMethodType } from '@/types';

type Step = 1 | 2 | 3;
type PaymentCategory = 'popular' | 'mobile' | 'crypto';

const QUICK_AMOUNTS = [10, 25, 50, 100, 250, 500];

function StepIndicator({ currentStep }: { currentStep: Step }) {
  const steps = [
    { num: 1, label: 'Payment method' },
    { num: 2, label: 'Payment details' },
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
                ? 'bg-emerald-500 text-white'
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
      className="p-2 hover:bg-[#3d3d5c] rounded-lg transition-colors"
      title="Copy"
    >
      {copied ? (
        <Check className="h-4 w-4 text-emerald-400" />
      ) : (
        <Copy className="h-4 w-4 text-gray-400" />
      )}
    </button>
  );
}

function QRCodeDisplay({ address, name }: { address: string; name: string }) {
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(address)}`;

  return (
    <div className="flex flex-col items-center gap-3 p-4 bg-[#252542] rounded-lg">
      <img src={qrUrl} alt={`QR Code for ${name}`} className="w-32 h-32 rounded-lg bg-white p-2" />
      <p className="text-xs text-gray-400">Scan QR code to get address</p>
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
  const { user, refreshProfile } = useAuthStore();
  const [step, setStep] = useState<Step>(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<PaymentCategory>('popular');
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethodType | null>(null);
  const [deposits, setDeposits] = useState<Deposit[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethodType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showQR, setShowQR] = useState(false);

  // Form state
  const [amount, setAmount] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');

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

  const fetchData = async () => {
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
  };

  useEffect(() => {
    fetchData();
    refreshProfile();
  }, [refreshProfile]);

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
    { id: 'popular', label: 'Popular', icon: <Star className="h-4 w-4" /> },
    { id: 'mobile', label: 'Mobile', icon: <Smartphone className="h-4 w-4" /> },
    { id: 'crypto', label: 'Crypto', icon: <Bitcoin className="h-4 w-4" /> },
  ];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0f0f1a] flex items-center justify-center">
        <Loader2 className="h-8 w-8 text-emerald-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f0f1a] p-4 md:p-6">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white">Account Top-up</h1>
          <p className="text-gray-400 text-sm mt-1">Add funds to your trading account</p>
        </div>

        {/* Step Indicator */}
        <StepIndicator currentStep={step} />

        {/* Balance Card */}
        <div className="bg-gradient-to-r from-emerald-600/20 to-emerald-500/10 border border-emerald-500/30 rounded-xl p-4 mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500/20 rounded-lg">
              <Wallet className="h-5 w-5 text-emerald-400" />
            </div>
            <div>
              <p className="text-emerald-300 text-sm">Current Balance</p>
              <p className="text-white text-xl font-bold">{formatCurrency(user?.demoBalance || 0)}</p>
            </div>
          </div>
        </div>

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
                    placeholder="Search payment method..."
                    className="w-full pl-10 pr-4 py-3 bg-[#1a1a2e] border border-[#2d2d44] rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                {/* Categories */}
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {categories.map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => setActiveCategory(cat.id)}
                      className={cn(
                        'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all',
                        activeCategory === cat.id
                          ? 'bg-emerald-500 text-white'
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
                      className="flex items-center gap-3 p-4 bg-[#1a1a2e] border border-[#2d2d44] rounded-xl hover:border-emerald-500/50 hover:bg-[#1a1a2e]/80 transition-all text-left group"
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
                      <ChevronRight className="h-4 w-4 text-gray-500 group-hover:text-emerald-400 transition-colors" />
                    </button>
                  ))}
                </div>

                {filteredMethods.length === 0 && (
                  <div className="text-center py-12">
                    <p className="text-gray-400">No payment methods found</p>
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
                      className="w-full px-4 py-3 bg-[#252542] border border-[#3d3d5c] rounded-lg text-white text-lg placeholder-gray-500 focus:outline-none focus:border-emerald-500"
                      required
                    />
                    <div className="flex flex-wrap gap-2 mt-2">
                      {QUICK_AMOUNTS.filter(a => a >= selectedMethod.minAmount).map((quickAmount) => (
                        <button
                          key={quickAmount}
                          type="button"
                          onClick={() => setAmount(quickAmount.toString())}
                          className={cn(
                            'px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                            amount === quickAmount.toString()
                              ? 'bg-emerald-500 text-white'
                              : 'bg-[#252542] text-gray-400 hover:bg-[#3d3d5c]'
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
                        <label className="block text-sm text-gray-400 mb-2">Your Phone Number</label>
                        <input
                          type="tel"
                          value={phoneNumber}
                          onChange={(e) => setPhoneNumber(e.target.value)}
                          placeholder="+255 7XX XXX XXX"
                          className="w-full px-4 py-3 bg-[#252542] border border-[#3d3d5c] rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500"
                          required
                        />
                      </div>

                      {/* Payment Instructions */}
                      {selectedMethod.phoneNumber && (
                        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-4">
                          <p className="text-emerald-400 text-sm font-medium mb-2">Send payment to:</p>
                          <div className="flex items-center justify-between bg-[#1a1a2e] rounded-lg px-3 py-2">
                            <div>
                              <span className="text-white font-mono">{selectedMethod.phoneNumber}</span>
                              {selectedMethod.accountName && (
                                <span className="text-gray-400 text-sm ml-2">({selectedMethod.accountName})</span>
                              )}
                            </div>
                            <CopyButton text={selectedMethod.phoneNumber} />
                          </div>
                          <p className="text-gray-400 text-xs mt-2">
                            Send the exact amount, then submit this form.
                          </p>
                        </div>
                      )}
                    </>
                  ) : (
                    <>
                      {/* Deposit Address with QR */}
                      {selectedMethod.walletAddress && (
                        <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-4">
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-orange-400 text-sm font-medium">
                              Send {selectedMethod.cryptoCurrency} to:
                            </p>
                            <button
                              type="button"
                              onClick={() => setShowQR(!showQR)}
                              className={cn(
                                'flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors',
                                showQR ? 'bg-orange-500 text-white' : 'bg-orange-500/20 text-orange-400 hover:bg-orange-500/30'
                              )}
                            >
                              <QrCode className="h-3 w-3" />
                              {showQR ? 'Hide QR' : 'Show QR'}
                            </button>
                          </div>

                          {showQR && (
                            <div className="mb-3">
                              <QRCodeDisplay address={selectedMethod.walletAddress} name={selectedMethod.name} />
                            </div>
                          )}

                          <div className="flex items-center justify-between bg-[#1a1a2e] rounded-lg px-3 py-2 gap-2">
                            <span className="text-white font-mono text-xs break-all">{selectedMethod.walletAddress}</span>
                            <CopyButton text={selectedMethod.walletAddress} />
                          </div>
                          {selectedMethod.network && (
                            <p className="text-orange-300 text-xs mt-2">
                              Network: <span className="font-medium">{selectedMethod.network}</span>
                            </p>
                          )}
                          <p className="text-gray-400 text-xs mt-3">
                            Send the exact amount to the address above, then click submit.
                          </p>
                        </div>
                      )}
                    </>
                  )}

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-white font-semibold rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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

            {step === 3 && (
              <div className="bg-[#1a1a2e] border border-[#2d2d44] rounded-xl p-8 text-center">
                <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="h-8 w-8 text-emerald-400" />
                </div>
                <h2 className="text-xl font-bold text-white mb-2">Deposit Submitted!</h2>
                <p className="text-gray-400 mb-6">
                  Your deposit request has been submitted and is pending approval.
                  You will be notified once it's processed.
                </p>
                <button
                  onClick={handleReset}
                  className="px-6 py-3 bg-emerald-500 hover:bg-emerald-400 text-white font-medium rounded-lg transition-all"
                >
                  Make Another Deposit
                </button>
              </div>
            )}
          </div>

          {/* Recent Deposits Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-[#1a1a2e] border border-[#2d2d44] rounded-xl overflow-hidden sticky top-6">
              <div className="p-4 border-b border-[#2d2d44]">
                <h2 className="text-white font-semibold">Recent Deposits</h2>
              </div>
              <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
                {deposits.length === 0 ? (
                  <div className="p-6 text-center">
                    <Wallet className="h-10 w-10 text-gray-600 mx-auto mb-2" />
                    <p className="text-gray-500 text-sm">No deposits yet</p>
                  </div>
                ) : (
                  <div className="divide-y divide-[#2d2d44]">
                    {deposits.map((deposit) => (
                      <div key={deposit.id} className="p-3 hover:bg-[#252542]/50 transition-colors">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-white font-medium text-sm">
                            {formatCurrency(deposit.amount)}
                          </span>
                          <StatusBadge status={deposit.status} />
                        </div>
                        <div className="flex items-center justify-between text-xs text-gray-500">
                          <span>
                            {deposit.method === 'MOBILE_MONEY'
                              ? deposit.mobileProvider
                              : deposit.cryptoCurrency}
                          </span>
                          <span>{formatDate(deposit.createdAt)}</span>
                        </div>
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
