'use client';

import { useState, useEffect, useCallback } from 'react';
import { api, ReferralStats, ReferralUser, ReferralCommission, ReferralSettings } from '@/lib/api';
import {
  Users,
  DollarSign,
  Link as LinkIcon,
  Copy,
  Check,
  TrendingUp,
  Banknote,
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function AffiliatePage() {
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [settings, setSettings] = useState<ReferralSettings | null>(null);
  const [referrals, setReferrals] = useState<ReferralUser[]>([]);
  const [commissions, setCommissions] = useState<ReferralCommission[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'referrals' | 'commissions'>('overview');
  const [baseUrl, setBaseUrl] = useState('');

  // Set base URL on client only to avoid hydration mismatch
  useEffect(() => {
    setBaseUrl(window.location.origin);
  }, []);

  const fetchData = useCallback(async () => {
    try {
      const [statsData, settingsData, referralsData, commissionsData] = await Promise.all([
        api.getReferralStats(),
        api.getPublicReferralSettings(),
        api.getMyReferrals({ limit: 10 }),
        api.getCommissionHistory({ limit: 10 }),
      ]);
      setStats(statsData);
      setSettings(settingsData);
      setReferrals(referralsData.data);
      setCommissions(commissionsData.data);
    } catch (error) {
      console.error('Failed to fetch affiliate data:', error);
      toast.error('Failed to load affiliate data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const getReferralLink = () => {
    if (!stats?.referralCode || !baseUrl) return '';
    // Use SEO-friendly referral URL
    return `${baseUrl}/ref/${stats.referralCode}`;
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success('Copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Failed to copy');
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getCommissionTypeLabel = (type: string) => {
    switch (type) {
      case 'TRADE_COMMISSION':
        return 'Profit Commission';
      default:
        return type;
    }
  };

  const getCommissionTypeColor = (type: string) => {
    switch (type) {
      case 'TRADE_COMMISSION':
        return 'bg-[#1079ff]/20 text-[#1079ff]';
      default:
        return 'bg-gray-500/20 text-gray-400';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#1079ff]"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Affiliate Program</h1>
        <p className="text-gray-400 mt-1">Invite friends and earn commissions on their activity</p>
      </div>

      {/* Referral Link Card */}
      <div className="bg-gradient-to-r from-[#1079ff]/20 to-[#092ab2]/20 rounded-xl p-6 border border-[#1079ff]/30">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-[#1079ff]/20 rounded-lg">
            <LinkIcon className="w-6 h-6 text-[#1079ff]" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">Your Referral Link</h2>
            <p className="text-sm text-gray-400">Share this link to earn commissions</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex-1 bg-slate-800/50 rounded-lg px-4 py-3 border border-slate-700">
            <p className="text-sm text-gray-300 truncate font-mono">{getReferralLink()}</p>
          </div>
          <button
            onClick={() => copyToClipboard(getReferralLink())}
            className="px-4 py-3 bg-gradient-to-r from-[#1079ff] to-[#092ab2] hover:from-[#3a93ff] hover:to-[#1079ff] rounded-lg transition-all flex items-center gap-2"
          >
            {copied ? (
              <Check className="w-5 h-5 text-white" />
            ) : (
              <Copy className="w-5 h-5 text-white" />
            )}
            <span className="text-white font-medium">{copied ? 'Copied!' : 'Copy'}</span>
          </button>
        </div>

        <div className="mt-4 flex items-center gap-4">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-gray-400">Your Code:</span>
            <span className="font-mono text-[#1079ff] bg-[#1079ff]/10 px-2 py-1 rounded">
              {stats?.referralCode}
            </span>
            <button
              onClick={() => copyToClipboard(stats?.referralCode || '')}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <Copy className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Commission Rates */}
      {settings && (
        <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700/50">
          <h3 className="text-lg font-semibold text-white mb-4">Commission Rate</h3>
          <div className="flex justify-center">
            <div className="bg-gradient-to-r from-[#1079ff]/20 to-[#092ab2]/20 rounded-lg p-6 text-center border border-[#1079ff]/30 max-w-sm w-full">
              <TrendingUp className="w-10 h-10 text-[#1079ff] mx-auto mb-3" />
              <p className="text-3xl font-bold text-white">{settings.tradeCommission}%</p>
              <p className="text-sm text-gray-400 mt-1">Of Referral's Trading Profits</p>
              <p className="text-xs text-gray-500 mt-3">Calculated and credited every 24 hours</p>
            </div>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700/50">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Total Referrals</p>
              <p className="text-2xl font-bold text-white mt-1">{stats?.totalReferrals || 0}</p>
            </div>
            <div className="p-3 bg-[#1079ff]/20 rounded-lg">
              <Users className="w-6 h-6 text-[#1079ff]" />
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            {stats?.activeReferrals || 0} active
          </p>
        </div>

        <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700/50">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Total Earnings</p>
              <p className="text-2xl font-bold text-green-400 mt-1">
                {formatCurrency(stats?.totalEarnings || 0)}
              </p>
            </div>
            <div className="p-3 bg-green-500/20 rounded-lg">
              <DollarSign className="w-6 h-6 text-green-400" />
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            All time
          </p>
        </div>

        <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700/50">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">This Month</p>
              <p className="text-2xl font-bold text-[#1079ff] mt-1">
                {formatCurrency(stats?.thisMonthEarnings || 0)}
              </p>
            </div>
            <div className="p-3 bg-[#1079ff]/20 rounded-lg">
              <TrendingUp className="w-6 h-6 text-[#1079ff]" />
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Current period
          </p>
        </div>

        <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700/50">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Pending</p>
              <p className="text-2xl font-bold text-yellow-400 mt-1">
                {formatCurrency(stats?.pendingEarnings || 0)}
              </p>
            </div>
            <div className="p-3 bg-yellow-500/20 rounded-lg">
              <Banknote className="w-6 h-6 text-yellow-400" />
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Awaiting credit
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-slate-800/50 rounded-xl border border-slate-700/50">
        <div className="border-b border-slate-700/50">
          <div className="flex">
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-6 py-4 text-sm font-medium transition-colors ${
                activeTab === 'overview'
                  ? 'text-[#1079ff] border-b-2 border-[#1079ff]'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveTab('referrals')}
              className={`px-6 py-4 text-sm font-medium transition-colors ${
                activeTab === 'referrals'
                  ? 'text-[#1079ff] border-b-2 border-[#1079ff]'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              My Referrals
            </button>
            <button
              onClick={() => setActiveTab('commissions')}
              className={`px-6 py-4 text-sm font-medium transition-colors ${
                activeTab === 'commissions'
                  ? 'text-[#1079ff] border-b-2 border-[#1079ff]'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Commission History
            </button>
          </div>
        </div>

        <div className="p-6">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-white mb-4">How It Works</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-slate-700/30 rounded-lg p-4">
                    <div className="w-8 h-8 bg-[#1079ff]/20 rounded-full flex items-center justify-center mb-3">
                      <span className="text-[#1079ff] font-bold">1</span>
                    </div>
                    <h4 className="font-medium text-white mb-1">Share Your Link</h4>
                    <p className="text-sm text-gray-400">
                      Copy your unique referral link and share it with friends
                    </p>
                  </div>
                  <div className="bg-slate-700/30 rounded-lg p-4">
                    <div className="w-8 h-8 bg-[#1079ff]/20 rounded-full flex items-center justify-center mb-3">
                      <span className="text-[#1079ff] font-bold">2</span>
                    </div>
                    <h4 className="font-medium text-white mb-1">They Start Trading</h4>
                    <p className="text-sm text-gray-400">
                      When they register and start making profitable trades
                    </p>
                  </div>
                  <div className="bg-slate-700/30 rounded-lg p-4">
                    <div className="w-8 h-8 bg-[#1079ff]/20 rounded-full flex items-center justify-center mb-3">
                      <span className="text-[#1079ff] font-bold">3</span>
                    </div>
                    <h4 className="font-medium text-white mb-1">Earn Profit Share</h4>
                    <p className="text-sm text-gray-400">
                      Earn {settings?.tradeCommission || 10}% of their trading profits daily
                    </p>
                  </div>
                </div>
              </div>

              {/* Recent Activity Summary */}
              <div>
                <h3 className="text-lg font-semibold text-white mb-4">Recent Activity</h3>
                {commissions.length > 0 ? (
                  <div className="space-y-2">
                    {commissions.slice(0, 5).map((commission) => (
                      <div
                        key={commission.id}
                        className="flex items-center justify-between bg-slate-700/30 rounded-lg p-3"
                      >
                        <div className="flex items-center gap-3">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${getCommissionTypeColor(commission.type)}`}>
                            {getCommissionTypeLabel(commission.type)}
                          </span>
                          <span className="text-gray-400 text-sm">{commission.generatorName}</span>
                        </div>
                        <div className="text-right">
                          <p className="text-green-400 font-medium">+{formatCurrency(commission.amount)}</p>
                          <p className="text-xs text-gray-500">{formatDate(commission.createdAt)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-400">
                    <p>No commissions yet. Start sharing your referral link!</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'referrals' && (
            <div>
              {referrals.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="text-left text-gray-400 text-sm border-b border-slate-700/50">
                        <th className="pb-3 font-medium">User</th>
                        <th className="pb-3 font-medium">Joined</th>
                        <th className="pb-3 font-medium text-right">Total Profit</th>
                        <th className="pb-3 font-medium text-right">Your Earnings</th>
                      </tr>
                    </thead>
                    <tbody>
                      {referrals.map((referral) => (
                        <tr key={referral.id} className="border-b border-slate-700/30">
                          <td className="py-4">
                            <p className="font-medium text-white">{referral.name}</p>
                            <p className="text-sm text-gray-400">{referral.email}</p>
                          </td>
                          <td className="py-4 text-gray-400">
                            {formatDate(referral.createdAt)}
                          </td>
                          <td className="py-4 text-right text-gray-300">
                            {formatCurrency(referral.totalProfit)}
                          </td>
                          <td className="py-4 text-right text-green-400 font-medium">
                            {formatCurrency(referral.commissionsGenerated)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-12 text-gray-400">
                  <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No referrals yet</p>
                  <p className="text-sm mt-1">Share your referral link to get started!</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'commissions' && (
            <div>
              {commissions.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="text-left text-gray-400 text-sm border-b border-slate-700/50">
                        <th className="pb-3 font-medium">Type</th>
                        <th className="pb-3 font-medium">From</th>
                        <th className="pb-3 font-medium">Description</th>
                        <th className="pb-3 font-medium text-right">Amount</th>
                        <th className="pb-3 font-medium text-right">Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {commissions.map((commission) => (
                        <tr key={commission.id} className="border-b border-slate-700/30">
                          <td className="py-4">
                            <span className={`px-2 py-1 rounded text-xs font-medium ${getCommissionTypeColor(commission.type)}`}>
                              {getCommissionTypeLabel(commission.type)}
                            </span>
                          </td>
                          <td className="py-4 text-gray-300">
                            {commission.generatorName}
                          </td>
                          <td className="py-4 text-gray-400 text-sm">
                            {commission.description || '-'}
                          </td>
                          <td className="py-4 text-right text-green-400 font-medium">
                            +{formatCurrency(commission.amount)}
                          </td>
                          <td className="py-4 text-right text-gray-400">
                            {formatDate(commission.createdAt)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-12 text-gray-400">
                  <DollarSign className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No commissions yet</p>
                  <p className="text-sm mt-1">Commissions are calculated daily from your referrals' trading profits</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
