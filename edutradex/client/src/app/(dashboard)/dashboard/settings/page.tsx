'use client';

import { useState, useEffect } from 'react';
import {
  Bell,
  Shield,
  Palette,
  Save,
  User,
  ArrowRight,
} from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { cn } from '@/lib/utils';

export default function SettingsPage() {
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

  // Load settings on mount
  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = () => {
    try {
      const saved = localStorage.getItem('optigobroker-settings');
      if (saved) {
        const parsed = JSON.parse(saved);
        setSettings((prev) => ({
          ...prev,
          ...parsed,
          notifications: { ...prev.notifications, ...parsed.notifications },
          trading: { ...prev.trading, ...parsed.trading },
          display: { ...prev.display, ...parsed.display },
        }));
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  };

  const handleSaveSettings = () => {
    try {
      localStorage.setItem('optigobroker-settings', JSON.stringify(settings));
      toast.success('Settings saved successfully');
    } catch (error) {
      toast.error('Failed to save settings');
    }
  };

  return (
    <div className="space-y-6 max-w-3xl pb-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Settings</h1>
        <p className="text-slate-400 mt-1">
          Customize your trading experience and preferences
        </p>
      </div>

      {/* Profile Link Card */}
      <Link
        href="/dashboard/profile"
        className="block bg-slate-800/50 border border-slate-700/50 rounded-xl p-4 hover:border-[#1079ff]/30 hover:bg-slate-800 transition-all group"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-[#1079ff]/20 rounded-lg">
              <User className="h-5 w-5 text-[#1079ff]" />
            </div>
            <div>
              <h3 className="text-sm font-medium text-white">Profile & Security</h3>
              <p className="text-xs text-slate-400">
                Manage your personal info, verification, and security settings
              </p>
            </div>
          </div>
          <ArrowRight className="h-5 w-5 text-slate-400 group-hover:text-[#1079ff] transition-colors" />
        </div>
      </Link>

      {/* Notifications */}
      <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex items-center justify-center w-7 h-7 bg-blue-500/10 rounded-lg">
            <Bell className="h-4 w-4 text-blue-400" />
          </div>
          <h2 className="text-sm font-medium text-white">Notifications</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <ToggleSetting
            label="Trade Opened"
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
      <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex items-center justify-center w-7 h-7 bg-[#1079ff]/10 rounded-lg">
            <Shield className="h-4 w-4 text-[#1079ff]" />
          </div>
          <h2 className="text-sm font-medium text-white">Trading Preferences</h2>
        </div>
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <ToggleSetting
              label="Confirm Trades"
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
              checked={settings.trading.soundEffects}
              onChange={(checked) =>
                setSettings((s) => ({
                  ...s,
                  trading: { ...s.trading, soundEffects: checked },
                }))
              }
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            <div>
              <label className="block text-slate-400 text-xs mb-1.5">
                Default Amount ($)
              </label>
              <input
                type="number"
                min="1"
                value={settings.trading.defaultAmount}
                onChange={(e) =>
                  setSettings((s) => ({
                    ...s,
                    trading: {
                      ...s.trading,
                      defaultAmount: parseInt(e.target.value) || 1,
                    },
                  }))
                }
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm focus:ring-2 focus:ring-[#1079ff] focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-slate-400 text-xs mb-1.5">
                Default Duration
              </label>
              <select
                value={settings.trading.defaultDuration}
                onChange={(e) =>
                  setSettings((s) => ({
                    ...s,
                    trading: {
                      ...s.trading,
                      defaultDuration: parseInt(e.target.value),
                    },
                  }))
                }
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm focus:ring-2 focus:ring-[#1079ff] focus:border-transparent"
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
      <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex items-center justify-center w-7 h-7 bg-purple-500/10 rounded-lg">
            <Palette className="h-4 w-4 text-purple-400" />
          </div>
          <h2 className="text-sm font-medium text-white">Display</h2>
        </div>
        <ToggleSetting
          label="Compact Mode"
          checked={settings.display.compactMode}
          onChange={(checked) =>
            setSettings((s) => ({
              ...s,
              display: { ...s.display, compactMode: checked },
            }))
          }
          inline
        />
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          onClick={handleSaveSettings}
          className="flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-[#1079ff] to-[#092ab2] hover:from-[#3a93ff] hover:to-[#1079ff] text-white text-sm font-medium rounded-lg transition-colors"
        >
          <Save className="h-4 w-4" />
          Save Settings
        </button>
      </div>
    </div>
  );
}

function ToggleSetting({
  label,
  checked,
  onChange,
  inline,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  inline?: boolean;
}) {
  return (
    <div
      className={cn(
        'flex items-center justify-between gap-3',
        !inline && 'py-2 px-3 rounded-lg hover:bg-slate-700/30 transition-colors'
      )}
    >
      <span className="text-slate-300 text-sm">{label}</span>
      <button
        onClick={() => onChange(!checked)}
        className={cn(
          'relative w-9 h-5 rounded-full transition-colors flex-shrink-0',
          checked ? 'bg-[#1079ff]' : 'bg-slate-600'
        )}
      >
        <div
          className={cn(
            'absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform shadow-sm',
            checked && 'translate-x-4'
          )}
        />
      </button>
    </div>
  );
}
