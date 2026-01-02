'use client';

import { useEffect, useState } from 'react';
import {
  Settings,
  Plus,
  Trash2,
  Edit2,
  Loader2,
  AlertCircle,
  Save,
  X,
  ToggleLeft,
  ToggleRight,
  History,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAdminStore } from '@/store/admin.store';
import { formatDate, cn } from '@/lib/utils';
import type { SystemSetting } from '@/types';

function SettingModal({
  setting,
  onSave,
  onCancel,
}: {
  setting: SystemSetting | null;
  onSave: (key: string, value: string) => void;
  onCancel: () => void;
}) {
  const [key, setKey] = useState(setting?.key || '');
  const [value, setValue] = useState(setting?.value || '');
  const isEditing = !!setting;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!key.trim()) {
      toast.error('Key is required');
      return;
    }
    if (!value.trim()) {
      toast.error('Value is required');
      return;
    }
    onSave(key.trim(), value.trim());
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onCancel} />
      <div className="relative bg-slate-800 rounded-xl p-6 max-w-md w-full mx-4 border border-slate-700">
        <h3 className="text-lg font-semibold text-white">
          {isEditing ? 'Edit Setting' : 'Add New Setting'}
        </h3>
        <p className="text-sm text-slate-400 mt-1">
          {isEditing ? 'Modify the setting value' : 'Create a new system setting'}
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-1">
              Key
            </label>
            <input
              type="text"
              value={key}
              onChange={(e) => setKey(e.target.value)}
              disabled={isEditing}
              placeholder="e.g., MAX_TRADE_AMOUNT"
              className={cn(
                'w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1079ff]',
                isEditing && 'opacity-50 cursor-not-allowed'
              )}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-400 mb-1">
              Value
            </label>
            <textarea
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="Enter value..."
              rows={3}
              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1079ff] resize-none"
            />
          </div>

          <div className="flex gap-3 justify-end pt-4">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-slate-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#1079ff] to-[#092ab2] hover:from-[#3a93ff] hover:to-[#1079ff] text-white rounded-lg font-medium transition-all"
            >
              <Save className="h-4 w-4" />
              {isEditing ? 'Save Changes' : 'Create Setting'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

interface FeatureToggle {
  key: string;
  label: string;
  description: string;
  icon: React.ReactNode;
}

const FEATURE_TOGGLES: FeatureToggle[] = [
  {
    key: 'USER_CLEAR_HISTORY_ENABLED',
    label: 'Allow Users to Clear History',
    description: 'When enabled, users can clear their trade history from the history page',
    icon: <History className="h-5 w-5" />,
  },
];

function FeatureToggleItem({
  toggle,
  value,
  onChange,
  isLoading,
}: {
  toggle: FeatureToggle;
  value: boolean;
  onChange: (enabled: boolean) => void;
  isLoading: boolean;
}) {
  return (
    <div className="flex items-center justify-between p-4 bg-slate-700/50 rounded-lg">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-slate-600 rounded-lg text-slate-300">
          {toggle.icon}
        </div>
        <div>
          <p className="text-white font-medium">{toggle.label}</p>
          <p className="text-slate-400 text-sm">{toggle.description}</p>
        </div>
      </div>
      <button
        onClick={() => onChange(!value)}
        disabled={isLoading}
        className={cn(
          'relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-[#1079ff] focus:ring-offset-2 focus:ring-offset-slate-800',
          value ? 'bg-emerald-600' : 'bg-slate-600',
          isLoading && 'opacity-50 cursor-not-allowed'
        )}
      >
        <span
          className={cn(
            'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
            value ? 'translate-x-6' : 'translate-x-1'
          )}
        />
      </button>
    </div>
  );
}

function DeleteConfirmModal({
  settingKey,
  onConfirm,
  onCancel,
}: {
  settingKey: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onCancel} />
      <div className="relative bg-slate-800 rounded-xl p-6 max-w-md w-full mx-4 border border-slate-700">
        <h3 className="text-lg font-semibold text-white">Delete Setting</h3>
        <p className="mt-2 text-slate-400">
          Are you sure you want to delete the setting &quot;{settingKey}&quot;? This action cannot be undone.
        </p>
        <div className="mt-6 flex gap-3 justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-slate-400 hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

export default function SystemSettingsPage() {
  const {
    systemSettings,
    isLoading,
    error,
    fetchSystemSettings,
    setSystemSetting,
    deleteSystemSetting,
    clearError,
  } = useAdminStore();

  const [editingSetting, setEditingSetting] = useState<SystemSetting | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [deletingKey, setDeletingKey] = useState<string | null>(null);
  const [togglingKeys, setTogglingKeys] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchSystemSettings();
  }, [fetchSystemSettings]);

  const getToggleValue = (key: string): boolean => {
    const setting = systemSettings.find((s) => s.key === key);
    return setting?.value === 'true';
  };

  const handleToggle = async (key: string, enabled: boolean) => {
    setTogglingKeys((prev) => new Set(prev).add(key));
    try {
      await setSystemSetting(key, enabled ? 'true' : 'false');
      toast.success(`${enabled ? 'Enabled' : 'Disabled'} successfully`);
    } catch {
      toast.error('Failed to update setting');
    } finally {
      setTogglingKeys((prev) => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
    }
  };

  const handleSave = async (key: string, value: string) => {
    try {
      await setSystemSetting(key, value);
      toast.success(editingSetting ? 'Setting updated' : 'Setting created');
      setEditingSetting(null);
      setIsAddingNew(false);
    } catch {
      toast.error('Failed to save setting');
    }
  };

  const handleDelete = async () => {
    if (!deletingKey) return;
    try {
      await deleteSystemSetting(deletingKey);
      toast.success('Setting deleted');
      setDeletingKey(null);
    } catch {
      toast.error('Failed to delete setting');
    }
  };

  if (isLoading && systemSettings.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 text-[#1079ff] animate-spin" />
      </div>
    );
  }

  if (error && systemSettings.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto" />
          <p className="mt-4 text-slate-400">{error}</p>
          <button
            onClick={() => {
              clearError();
              fetchSystemSettings();
            }}
            className="mt-4 px-4 py-2 bg-gradient-to-r from-[#1079ff] to-[#092ab2] hover:from-[#3a93ff] hover:to-[#1079ff] text-white rounded-lg transition-all"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">System Settings</h1>
          <p className="text-slate-400 mt-1">Configure platform-wide settings</p>
        </div>
        <button
          onClick={() => setIsAddingNew(true)}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#1079ff] to-[#092ab2] hover:from-[#3a93ff] hover:to-[#1079ff] text-white rounded-lg font-medium transition-all"
        >
          <Plus className="h-4 w-4" />
          Add Setting
        </button>
      </div>

      {/* Feature Toggles */}
      <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Feature Toggles</h2>
        <p className="text-slate-400 text-sm mb-4">
          Enable or disable specific features for users
        </p>
        <div className="space-y-3">
          {FEATURE_TOGGLES.map((toggle) => (
            <FeatureToggleItem
              key={toggle.key}
              toggle={toggle}
              value={getToggleValue(toggle.key)}
              onChange={(enabled) => handleToggle(toggle.key, enabled)}
              isLoading={togglingKeys.has(toggle.key)}
            />
          ))}
        </div>
      </div>

      <div className="bg-slate-800 rounded-xl border border-slate-700">
        {systemSettings.length === 0 ? (
          <div className="p-8 text-center">
            <Settings className="h-12 w-12 text-slate-500 mx-auto" />
            <p className="mt-4 text-slate-400">No system settings configured</p>
            <p className="text-sm text-slate-500 mt-1">
              Click &quot;Add Setting&quot; to create your first setting
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-700">
                  <th className="px-6 py-4 text-left text-sm font-medium text-slate-400">Key</th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-slate-400">Value</th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-slate-400">Updated</th>
                  <th className="px-6 py-4 text-right text-sm font-medium text-slate-400">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700">
                {systemSettings.map((setting) => (
                  <tr key={setting.id} className="hover:bg-slate-700/50 transition-colors">
                    <td className="px-6 py-4">
                      <code className="text-[#1079ff] bg-slate-700/50 px-2 py-1 rounded text-sm">
                        {setting.key}
                      </code>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-white max-w-xs truncate block">
                        {setting.value}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-400 text-sm">
                      {formatDate(setting.updatedAt)}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setEditingSetting(setting)}
                          className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setDeletingKey(setting.key)}
                          className="p-2 text-red-400 hover:text-red-300 hover:bg-red-900/30 rounded-lg transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Common Settings</h2>
        <p className="text-slate-400 text-sm mb-4">
          Here are some commonly used setting keys you might want to configure:
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-slate-700/50 rounded-lg p-4">
            <code className="text-[#1079ff] text-sm">DEFAULT_DEMO_BALANCE</code>
            <p className="text-slate-400 text-sm mt-1">Initial balance for new users</p>
          </div>
          <div className="bg-slate-700/50 rounded-lg p-4">
            <code className="text-[#1079ff] text-sm">DEFAULT_PAYOUT_PERCENTAGE</code>
            <p className="text-slate-400 text-sm mt-1">Default payout for winning trades</p>
          </div>
          <div className="bg-slate-700/50 rounded-lg p-4">
            <code className="text-[#1079ff] text-sm">MIN_TRADE_AMOUNT</code>
            <p className="text-slate-400 text-sm mt-1">Minimum allowed trade amount</p>
          </div>
          <div className="bg-slate-700/50 rounded-lg p-4">
            <code className="text-[#1079ff] text-sm">MAX_TRADE_AMOUNT</code>
            <p className="text-slate-400 text-sm mt-1">Maximum allowed trade amount</p>
          </div>
          <div className="bg-slate-700/50 rounded-lg p-4">
            <code className="text-[#1079ff] text-sm">MAINTENANCE_MODE</code>
            <p className="text-slate-400 text-sm mt-1">Enable/disable maintenance mode</p>
          </div>
          <div className="bg-slate-700/50 rounded-lg p-4">
            <code className="text-[#1079ff] text-sm">REGISTRATION_ENABLED</code>
            <p className="text-slate-400 text-sm mt-1">Allow new user registrations</p>
          </div>
        </div>
      </div>

      {(isAddingNew || editingSetting) && (
        <SettingModal
          setting={editingSetting}
          onSave={handleSave}
          onCancel={() => {
            setEditingSetting(null);
            setIsAddingNew(false);
          }}
        />
      )}

      {deletingKey && (
        <DeleteConfirmModal
          settingKey={deletingKey}
          onConfirm={handleDelete}
          onCancel={() => setDeletingKey(null)}
        />
      )}
    </div>
  );
}
