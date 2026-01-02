'use client';

import { useState, useEffect } from 'react';
import {
  Trophy,
  Users,
  TrendingUp,
  Edit2,
  Loader2,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';
import type { CopyTradingLeader, FollowerInfo, LeaderStatus } from '@/types';

export function MyLeaderProfile() {
  const [leaderProfile, setLeaderProfile] = useState<CopyTradingLeader | null>(null);
  const [followers, setFollowers] = useState<FollowerInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showApplyForm, setShowApplyForm] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    setIsLoading(true);
    try {
      const profile = await api.getMyLeaderProfile();
      setLeaderProfile(profile);
      if (profile) {
        const followersData = await api.getMyFollowers();
        setFollowers(followersData.followers);
      }
    } catch (error) {
      console.error('Failed to load profile:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 text-[#1079ff] animate-spin" />
      </div>
    );
  }

  if (!leaderProfile) {
    return showApplyForm ? (
      <ApplyToBeLeaderForm
        onCancel={() => setShowApplyForm(false)}
        onSuccess={() => {
          setShowApplyForm(false);
          loadProfile();
        }}
      />
    ) : (
      <div className="text-center py-16 bg-slate-800 rounded-xl border border-slate-700">
        <Trophy className="h-16 w-16 text-slate-600 mx-auto" />
        <h3 className="text-xl font-semibold text-white mt-4">Become a Leader</h3>
        <p className="text-slate-400 mt-2 max-w-md mx-auto">
          Share your trading expertise and let others copy your trades.
          Apply to become a leader and start building your following.
        </p>
        <button
          onClick={() => setShowApplyForm(true)}
          className="mt-6 px-6 py-3 bg-gradient-to-r from-[#1079ff] to-[#092ab2] hover:from-[#3a93ff] hover:to-[#1079ff] text-white rounded-lg transition-all font-medium"
        >
          Apply to Become a Leader
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Profile Card */}
      <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 bg-gradient-to-br from-[#1079ff] to-[#092ab2] rounded-full flex items-center justify-center text-white font-bold text-2xl">
              {leaderProfile.displayName.charAt(0).toUpperCase()}
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">{leaderProfile.displayName}</h2>
              <StatusBadge status={leaderProfile.status as LeaderStatus} />
            </div>
          </div>
          {leaderProfile.status === 'APPROVED' && (
            <button
              onClick={() => setIsEditing(!isEditing)}
              className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
            >
              <Edit2 className="h-4 w-4" />
              Edit Profile
            </button>
          )}
        </div>

        {leaderProfile.description && (
          <p className="text-slate-400 mb-6">{leaderProfile.description}</p>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-slate-700/50 rounded-lg p-4 text-center">
            <p className="text-slate-400 text-sm">Win Rate</p>
            <p className="text-2xl font-bold text-emerald-400">{leaderProfile.winRate.toFixed(1)}%</p>
          </div>
          <div className="bg-slate-700/50 rounded-lg p-4 text-center">
            <p className="text-slate-400 text-sm">Total Trades</p>
            <p className="text-2xl font-bold text-white">{leaderProfile.totalTrades}</p>
          </div>
          <div className="bg-slate-700/50 rounded-lg p-4 text-center">
            <p className="text-slate-400 text-sm">Total Profit</p>
            <p className={cn(
              'text-2xl font-bold',
              leaderProfile.totalProfit >= 0 ? 'text-emerald-400' : 'text-red-400'
            )}>
              {leaderProfile.totalProfit >= 0 ? '+' : ''}${leaderProfile.totalProfit.toFixed(0)}
            </p>
          </div>
          <div className="bg-slate-700/50 rounded-lg p-4 text-center">
            <p className="text-slate-400 text-sm">Followers</p>
            <p className="text-2xl font-bold text-white">{leaderProfile.followerCount}</p>
          </div>
        </div>

        {/* Edit Form */}
        {isEditing && (
          <EditProfileForm
            profile={leaderProfile}
            onCancel={() => setIsEditing(false)}
            onSuccess={() => {
              setIsEditing(false);
              loadProfile();
            }}
          />
        )}
      </div>

      {/* Followers List */}
      {leaderProfile.status === 'APPROVED' && followers.length > 0 && (
        <div className="bg-slate-800 rounded-xl border border-slate-700">
          <div className="p-4 border-b border-slate-700">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <Users className="h-5 w-5 text-[#1079ff]" />
              Your Followers ({followers.length})
            </h3>
          </div>
          <div className="divide-y divide-slate-700">
            {followers.map((follower) => (
              <div key={follower.id} className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 bg-slate-700 rounded-full flex items-center justify-center text-white font-medium">
                    {(follower.follower?.name || follower.user?.name || 'U').charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-white font-medium">{follower.follower?.name || follower.user?.name}</p>
                    <p className="text-slate-400 text-sm">
                      {follower.copyMode === 'PERCENTAGE' ? `${follower.percentageAmount}%` : `$${follower.fixedAmount}`}/trade
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-white">{follower.totalCopied} trades copied</p>
                  <p className={cn(
                    'text-sm',
                    follower.totalProfit >= 0 ? 'text-emerald-400' : 'text-red-400'
                  )}>
                    {follower.totalProfit >= 0 ? '+' : ''}${follower.totalProfit.toFixed(2)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: LeaderStatus }) {
  const config = {
    PENDING: { icon: Clock, color: 'text-yellow-400 bg-yellow-600/20', label: 'Pending Approval' },
    APPROVED: { icon: CheckCircle, color: 'text-emerald-400 bg-emerald-600/20', label: 'Approved' },
    REJECTED: { icon: XCircle, color: 'text-red-400 bg-red-600/20', label: 'Rejected' },
    SUSPENDED: { icon: AlertCircle, color: 'text-orange-400 bg-orange-600/20', label: 'Suspended' },
  };

  const { icon: Icon, color, label } = config[status];

  return (
    <span className={cn('inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium mt-1', color)}>
      <Icon className="h-3 w-3" />
      {label}
    </span>
  );
}

function ApplyToBeLeaderForm({
  onCancel,
  onSuccess,
}: {
  onCancel: () => void;
  onSuccess: () => void;
}) {
  const [displayName, setDisplayName] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (displayName.length < 2) {
      toast.error('Display name must be at least 2 characters');
      return;
    }

    setIsSubmitting(true);
    try {
      await api.becomeLeader({ displayName, description: description || undefined });
      toast.success('Application submitted! Awaiting admin approval.');
      onSuccess();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to submit application');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
      <h3 className="text-lg font-semibold text-white mb-4">Apply to Become a Leader</h3>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Display Name *
          </label>
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="e.g., ProTrader2024"
            maxLength={50}
            className="w-full px-4 py-2.5 bg-slate-900 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#1079ff]"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Description (optional)
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Tell potential followers about your trading experience and strategy..."
            maxLength={500}
            rows={3}
            className="w-full px-4 py-2.5 bg-slate-900 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#1079ff] resize-none"
          />
        </div>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 px-4 py-2.5 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-[#1079ff] to-[#092ab2] hover:from-[#3a93ff] hover:to-[#1079ff] disabled:opacity-50 text-white rounded-lg transition-all"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Submitting...
              </>
            ) : (
              'Submit Application'
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

function EditProfileForm({
  profile,
  onCancel,
  onSuccess,
}: {
  profile: CopyTradingLeader;
  onCancel: () => void;
  onSuccess: () => void;
}) {
  const [displayName, setDisplayName] = useState(profile.displayName);
  const [description, setDescription] = useState(profile.description || '');
  const [isPublic, setIsPublic] = useState(profile.isPublic);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setIsSubmitting(true);
    try {
      await api.updateMyLeaderProfile({
        displayName,
        description: description || undefined,
        isPublic,
      });
      toast.success('Profile updated!');
      onSuccess();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to update profile');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mt-6 pt-6 border-t border-slate-700 space-y-4">
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-2">
          Display Name
        </label>
        <input
          type="text"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          maxLength={50}
          className="w-full px-4 py-2.5 bg-slate-900 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#1079ff]"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-2">
          Description
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={500}
          rows={3}
          className="w-full px-4 py-2.5 bg-slate-900 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#1079ff] resize-none"
        />
      </div>
      <div className="flex items-center gap-3">
        <input
          type="checkbox"
          id="isPublic"
          checked={isPublic}
          onChange={(e) => setIsPublic(e.target.checked)}
          className="h-4 w-4 rounded border-slate-600 bg-slate-900 text-[#1079ff] focus:ring-[#1079ff]"
        />
        <label htmlFor="isPublic" className="text-sm text-slate-300">
          Public profile (visible in leader discovery)
        </label>
      </div>
      <div className="flex gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 px-4 py-2.5 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-[#1079ff] to-[#092ab2] hover:from-[#3a93ff] hover:to-[#1079ff] disabled:opacity-50 text-white rounded-lg transition-all"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            'Save Changes'
          )}
        </button>
      </div>
    </form>
  );
}
