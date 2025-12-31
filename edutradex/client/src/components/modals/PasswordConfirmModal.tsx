'use client';

import { useState, useEffect, useCallback } from 'react';
import { Lock, Loader2, X, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PasswordConfirmModalProps {
  isOpen: boolean;
  title: string;
  description: string;
  confirmText?: string;
  confirmColor?: 'red' | 'amber' | 'emerald';
  onConfirm: (password: string) => Promise<void>;
  onCancel: () => void;
}

export function PasswordConfirmModal({
  isOpen,
  title,
  description,
  confirmText = 'Confirm',
  confirmColor = 'amber',
  onConfirm,
  onCancel,
}: PasswordConfirmModalProps) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setPassword('');
      setError(null);
      setIsLoading(false);
    }
  }, [isOpen]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();

    if (!password.trim()) {
      setError('Password is required');
      return;
    }

    setError(null);
    setIsLoading(true);

    try {
      await onConfirm(password);
    } catch (err: any) {
      // Handle specific error codes from the API
      if (err?.response?.data?.code === 'INVALID_PASSWORD') {
        setError('Incorrect password. Please try again.');
      } else if (err?.response?.data?.code === 'PASSWORD_REQUIRED') {
        setError('Password confirmation is required.');
      } else {
        setError(err?.response?.data?.error || err?.message || 'An error occurred');
      }
    } finally {
      setIsLoading(false);
    }
  }, [password, onConfirm]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape' && !isLoading) {
      onCancel();
    }
  }, [isLoading, onCancel]);

  if (!isOpen) return null;

  const colorClasses = {
    red: 'bg-red-600 hover:bg-red-700 focus:ring-red-500',
    amber: 'bg-amber-600 hover:bg-amber-700 focus:ring-amber-500',
    emerald: 'bg-emerald-600 hover:bg-emerald-700 focus:ring-emerald-500',
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onKeyDown={handleKeyDown}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={!isLoading ? onCancel : undefined}
      />

      {/* Modal */}
      <div className="relative bg-slate-800 rounded-xl w-full max-w-md border border-slate-700 shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-700">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-500/20">
              <Lock className="h-5 w-5 text-amber-400" />
            </div>
            <h2 className="text-lg font-semibold text-white">{title}</h2>
          </div>
          <button
            onClick={onCancel}
            disabled={isLoading}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors disabled:opacity-50"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <p className="text-slate-300 text-sm">{description}</p>

          <div>
            <label htmlFor="admin-password" className="block text-sm text-slate-400 mb-1.5">
              Your Password
            </label>
            <input
              id="admin-password"
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError(null);
              }}
              placeholder="Enter your password to confirm"
              disabled={isLoading}
              autoFocus
              className={cn(
                'w-full px-4 py-2.5 bg-slate-700 border rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 transition-colors',
                error
                  ? 'border-red-500 focus:ring-red-500'
                  : 'border-slate-600 focus:ring-amber-500 focus:border-amber-500'
              )}
            />
          </div>

          {/* Error message */}
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
              <AlertTriangle className="h-4 w-4 text-red-400 flex-shrink-0" />
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onCancel}
              disabled={isLoading}
              className="flex-1 px-4 py-2.5 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading || !password.trim()}
              className={cn(
                'flex-1 px-4 py-2.5 text-white rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50',
                colorClasses[confirmColor]
              )}
            >
              {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
              {confirmText}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
