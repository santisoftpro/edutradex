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
  ArrowRight,
  Shield,
  Zap,
  RefreshCw,
  AlertTriangle,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import { formatCurrency, formatDate, cn } from '@/lib/utils';
import type { Withdrawal, MobileProvider, CryptoCurrency } from '@/types';

const mobileProviders: { value: MobileProvider; label: string; color: string }[] = [
  { value: 'MPESA', label: 'M-Pesa', color: 'bg-green-500' },
  { value: 'AIRTEL', label: 'Airtel Money', color: 'bg-red-500' },
  { value: 'MTN', label: 'MTN MoMo', color: 'bg-yellow-500' },
  { value: 'VODAFONE', label: 'Vodafone Cash', color: 'bg-red-600' },
  { value: 'ORANGE', label: 'Orange Money', color: 'bg-orange-500' },
  { value: 'TIGO', label: 'Tigo Pesa', color: 'bg-blue-500' },
];

const cryptoCurrencies: { value: CryptoCurrency; label: string; symbol: string; color: string }[] = [
  { value: 'BTC', label: 'Bitcoin', symbol: 'BTC', color: 'bg-orange-500' },
  { value: 'ETH', label: 'Ethereum', symbol: 'ETH', color: 'bg-indigo-500' },
  { value: 'USDT', label: 'USDT (TRC20)', symbol: 'USDT', color: 'bg-emerald-500' },
  { value: 'USDC', label: 'USD Coin', symbol: 'USDC', color: 'bg-blue-500' },
];

function StatusBadge({ status }: { status: Withdrawal['status'] }) {
  if (status === 'PENDING') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border text-amber-400 bg-amber-500/20 border-amber-500/30">
        <Loader2 className="h-3 w-3 animate-spin" />
        Pending
      </span>
    );
  }

  const config = {
    APPROVED: { icon: CheckCircle, color: 'text-emerald-400 bg-emerald-500/20 border-emerald-500/30', label: 'Completed' },
    REJECTED: { icon: XCircle, color: 'text-red-400 bg-red-500/20 border-red-500/30', label: 'Rejected' },
  };
  const { icon: Icon, color, label } = config[status];
  return (
    <span className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border', color)}>
      <Icon className="h-3 w-3" />
      {label}
    </span>
  );
}

export default function WithdrawPage() {
  const { user, refreshProfile } = useAuthStore();
  const [activeMethod, setActiveMethod] = useState<'mobile' | 'crypto'>('mobile');
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Mobile Money form state
  const [mobileAmount, setMobileAmount] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [mobileProvider, setMobileProvider] = useState<MobileProvider>('MPESA');

  // Crypto form state
  const [cryptoAmount, setCryptoAmount] = useState('');
  const [cryptoCurrency, setCryptoCurrency] = useState<CryptoCurrency>('USDT');
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

  const fetchWithdrawals = async () => {
    setIsLoading(true);
    try {
      const data = await api.getMyWithdrawals({ limit: 10 });
      setWithdrawals(data);
    } catch (error) {
      console.error('Failed to fetch withdrawals:', error);
    } finally {
      setIsLoading(false);
    }
  };

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
    fetchWithdrawals();
    refreshProfile();
  }, [refreshProfile]);

  const handleMobileMoneySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(mobileAmount);
    if (isNaN(amount) || amount < 1) {
      toast.error('Minimum withdrawal is $1');
      return;
    }
    if (amount > balance) {
      toast.error('Insufficient balance');
      return;
    }
    if (!phoneNumber || phoneNumber.length < 10) {
      toast.error('Please enter a valid phone number');
      return;
    }

    setIsSubmitting(true);
    try {
      await api.createMobileMoneyWithdrawal({
        amount,
        phoneNumber,
        mobileProvider,
      });
      toast.success('Withdrawal request submitted successfully!');
      setMobileAmount('');
      setPhoneNumber('');
      fetchWithdrawals();
      refreshProfile();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to submit withdrawal request';
      toast.error(errorMessage);
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCryptoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(cryptoAmount);
    if (isNaN(amount) || amount < 1) {
      toast.error('Minimum withdrawal is $1');
      return;
    }
    if (amount > balance) {
      toast.error('Insufficient balance');
      return;
    }
    if (!walletAddress || walletAddress.length < 20) {
      toast.error('Please enter a valid wallet address');
      return;
    }

    setIsSubmitting(true);
    try {
      await api.createCryptoWithdrawal({
        amount,
        cryptoCurrency,
        walletAddress,
      });
      toast.success('Withdrawal request submitted successfully!');
      setCryptoAmount('');
      setWalletAddress('');
      fetchWithdrawals();
      refreshProfile();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to submit withdrawal request';
      toast.error(errorMessage);
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 p-4 md:p-6">
      {/* Header with Balance */}
      <div className="bg-gradient-to-r from-purple-600 to-purple-700 rounded-2xl p-6 md:p-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-white">Withdraw Funds</h1>
            <p className="text-purple-100 mt-1">Transfer your earnings to your preferred account</p>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 min-w-[200px]">
            <div className="flex items-center justify-between">
              <span className="text-purple-100 text-sm">Available Balance</span>
              <button
                onClick={handleRefreshBalance}
                disabled={isRefreshing}
                className="p-1 hover:bg-white/10 rounded transition-colors"
                title="Refresh balance"
              >
                <RefreshCw className={cn('h-4 w-4 text-purple-100', isRefreshing && 'animate-spin')} />
              </button>
            </div>
            <div className="text-3xl font-bold text-white mt-1">
              {formatCurrency(balance)}
            </div>
          </div>
        </div>
      </div>

      {/* Low Balance Warning */}
      {balance < 1 && (
        <div className="bg-amber-900/30 border border-amber-900/50 rounded-xl p-4 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-amber-300 font-medium">Insufficient Balance</p>
            <p className="text-amber-400/80 text-sm mt-1">
              You need at least $1 to make a withdrawal. Continue trading to increase your balance.
            </p>
          </div>
        </div>
      )}

      {/* Features */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-slate-800/50 rounded-xl p-4 flex items-center gap-3 border border-slate-700">
          <div className="p-2 bg-purple-500/20 rounded-lg">
            <Shield className="h-5 w-5 text-purple-400" />
          </div>
          <div>
            <p className="text-white font-medium text-sm">Secure</p>
            <p className="text-slate-400 text-xs">Verified withdrawals</p>
          </div>
        </div>
        <div className="bg-slate-800/50 rounded-xl p-4 flex items-center gap-3 border border-slate-700">
          <div className="p-2 bg-blue-500/20 rounded-lg">
            <Zap className="h-5 w-5 text-blue-400" />
          </div>
          <div>
            <p className="text-white font-medium text-sm">Fast Processing</p>
            <p className="text-slate-400 text-xs">Usually within 24 hours</p>
          </div>
        </div>
        <div className="bg-slate-800/50 rounded-xl p-4 flex items-center gap-3 border border-slate-700">
          <div className="p-2 bg-emerald-500/20 rounded-lg">
            <Wallet className="h-5 w-5 text-emerald-400" />
          </div>
          <div>
            <p className="text-white font-medium text-sm">Multiple Methods</p>
            <p className="text-slate-400 text-xs">Mobile Money & Crypto</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Withdrawal Form */}
        <div className="lg:col-span-2 space-y-6">
          {/* Method Selection */}
          <div className="bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden">
            <div className="grid grid-cols-2 border-b border-slate-700">
              <button
                onClick={() => setActiveMethod('mobile')}
                className={cn(
                  'flex items-center justify-center gap-3 px-6 py-4 font-medium transition-all',
                  activeMethod === 'mobile'
                    ? 'text-white bg-purple-600'
                    : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
                )}
              >
                <Smartphone className="h-5 w-5" />
                <span>Mobile Money</span>
              </button>
              <button
                onClick={() => setActiveMethod('crypto')}
                className={cn(
                  'flex items-center justify-center gap-3 px-6 py-4 font-medium transition-all',
                  activeMethod === 'crypto'
                    ? 'text-white bg-purple-600'
                    : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
                )}
              >
                <Bitcoin className="h-5 w-5" />
                <span>Cryptocurrency</span>
              </button>
            </div>

            <div className="p-6">
              {activeMethod === 'mobile' ? (
                <form onSubmit={handleMobileMoneySubmit} className="space-y-5">
                  {/* Amount */}
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Withdrawal Amount (USD)
                    </label>
                    <input
                      type="number"
                      value={mobileAmount}
                      onChange={(e) => setMobileAmount(e.target.value)}
                      placeholder="Enter amount"
                      min="1"
                      max={balance}
                      step="1"
                      className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white text-lg placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      required
                      disabled={balance < 1}
                    />
                    {quickAmounts.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-3">
                        {quickAmounts.map((amount, index) => {
                          const labels = ['25%', '50%', '75%', 'Max'];
                          return (
                            <button
                              key={amount}
                              type="button"
                              onClick={() => setMobileAmount(amount.toString())}
                              className={cn(
                                'px-4 py-2 rounded-lg text-sm font-medium transition-all',
                                mobileAmount === amount.toString()
                                  ? 'bg-purple-600 text-white'
                                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                              )}
                            >
                              {labels[index] || `$${amount}`}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Provider Selection */}
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Select Provider
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {mobileProviders.map((provider) => (
                        <button
                          key={provider.value}
                          type="button"
                          onClick={() => setMobileProvider(provider.value)}
                          className={cn(
                            'flex items-center gap-2 px-4 py-3 rounded-xl border transition-all',
                            mobileProvider === provider.value
                              ? 'border-purple-500 bg-purple-500/10 text-white'
                              : 'border-slate-600 bg-slate-700/50 text-slate-300 hover:border-slate-500'
                          )}
                        >
                          <div className={cn('w-2 h-2 rounded-full', provider.color)} />
                          <span className="text-sm font-medium">{provider.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Phone Number */}
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Receiving Phone Number
                    </label>
                    <input
                      type="tel"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      placeholder="+255 7XX XXX XXX"
                      className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      required
                      disabled={balance < 1}
                    />
                    <p className="text-xs text-slate-500 mt-2">
                      Make sure the phone number is registered with your selected mobile money provider.
                    </p>
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting || balance < 1}
                    className="w-full py-4 bg-purple-600 hover:bg-purple-500 text-white font-semibold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-lg"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="h-5 w-5 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        Submit Withdrawal Request
                        <ArrowRight className="h-5 w-5" />
                      </>
                    )}
                  </button>
                </form>
              ) : (
                <form onSubmit={handleCryptoSubmit} className="space-y-5">
                  {/* Amount */}
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Withdrawal Amount (USD equivalent)
                    </label>
                    <input
                      type="number"
                      value={cryptoAmount}
                      onChange={(e) => setCryptoAmount(e.target.value)}
                      placeholder="Enter amount"
                      min="1"
                      max={balance}
                      step="1"
                      className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white text-lg placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      required
                      disabled={balance < 1}
                    />
                    {quickAmounts.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-3">
                        {quickAmounts.map((amount, index) => {
                          const labels = ['25%', '50%', '75%', 'Max'];
                          return (
                            <button
                              key={amount}
                              type="button"
                              onClick={() => setCryptoAmount(amount.toString())}
                              className={cn(
                                'px-4 py-2 rounded-lg text-sm font-medium transition-all',
                                cryptoAmount === amount.toString()
                                  ? 'bg-purple-600 text-white'
                                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                              )}
                            >
                              {labels[index] || `$${amount}`}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Crypto Selection */}
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Select Cryptocurrency
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {cryptoCurrencies.map((crypto) => (
                        <button
                          key={crypto.value}
                          type="button"
                          onClick={() => setCryptoCurrency(crypto.value)}
                          className={cn(
                            'flex items-center gap-3 px-4 py-3 rounded-xl border transition-all',
                            cryptoCurrency === crypto.value
                              ? 'border-purple-500 bg-purple-500/10 text-white'
                              : 'border-slate-600 bg-slate-700/50 text-slate-300 hover:border-slate-500'
                          )}
                        >
                          <div className={cn('w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold', crypto.color)}>
                            {crypto.symbol.slice(0, 3)}
                          </div>
                          <div className="text-left">
                            <p className="font-medium">{crypto.label}</p>
                            <p className="text-xs text-slate-400">{crypto.symbol}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Wallet Address */}
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Your Wallet Address
                    </label>
                    <input
                      type="text"
                      value={walletAddress}
                      onChange={(e) => setWalletAddress(e.target.value)}
                      placeholder="Enter your wallet address"
                      className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent font-mono text-sm"
                      required
                      disabled={balance < 1}
                    />
                    <p className="text-xs text-slate-500 mt-2">
                      Double-check your wallet address. Incorrect addresses may result in permanent loss of funds.
                    </p>
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting || balance < 1}
                    className="w-full py-4 bg-purple-600 hover:bg-purple-500 text-white font-semibold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-lg"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="h-5 w-5 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        Submit Withdrawal Request
                        <ArrowRight className="h-5 w-5" />
                      </>
                    )}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>

        {/* Withdrawal History */}
        <div className="lg:col-span-1">
          <div className="bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden sticky top-6">
            <div className="p-4 border-b border-slate-700 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">Recent Withdrawals</h2>
              <button
                onClick={fetchWithdrawals}
                disabled={isLoading}
                className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
              >
                <RefreshCw className={cn('h-4 w-4 text-slate-400', isLoading && 'animate-spin')} />
              </button>
            </div>
            <div className="max-h-[500px] overflow-y-auto">
              {isLoading ? (
                <div className="p-8 text-center">
                  <Loader2 className="h-8 w-8 text-purple-500 animate-spin mx-auto" />
                  <p className="text-slate-400 text-sm mt-2">Loading withdrawals...</p>
                </div>
              ) : withdrawals.length === 0 ? (
                <div className="p-8 text-center">
                  <Wallet className="h-12 w-12 text-slate-600 mx-auto mb-3" />
                  <p className="text-slate-400">No withdrawals yet</p>
                  <p className="text-slate-500 text-sm mt-1">Make a withdrawal to see it here</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-700">
                  {withdrawals.map((withdrawal) => (
                    <div key={withdrawal.id} className="p-4 hover:bg-slate-700/30 transition-colors">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            'p-2 rounded-lg',
                            withdrawal.method === 'MOBILE_MONEY'
                              ? 'bg-blue-500/20'
                              : 'bg-orange-500/20'
                          )}>
                            {withdrawal.method === 'MOBILE_MONEY' ? (
                              <Smartphone className="h-5 w-5 text-blue-400" />
                            ) : (
                              <Bitcoin className="h-5 w-5 text-orange-400" />
                            )}
                          </div>
                          <div>
                            <p className="text-white font-semibold">
                              {formatCurrency(withdrawal.amount)}
                            </p>
                            <p className="text-sm text-slate-400">
                              {withdrawal.method === 'MOBILE_MONEY'
                                ? withdrawal.mobileProvider
                                : withdrawal.cryptoCurrency}
                            </p>
                          </div>
                        </div>
                        <StatusBadge status={withdrawal.status} />
                      </div>
                      <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
                        <span>{formatDate(withdrawal.createdAt)}</span>
                        {withdrawal.status === 'PENDING' && (
                          <span className="text-amber-400">Processing...</span>
                        )}
                      </div>
                      {withdrawal.adminNote && withdrawal.status !== 'PENDING' && (
                        <div className="mt-2 p-2 bg-slate-700/50 rounded-lg text-xs text-slate-400">
                          <span className="font-medium text-slate-300">Note:</span> {withdrawal.adminNote}
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
  );
}
