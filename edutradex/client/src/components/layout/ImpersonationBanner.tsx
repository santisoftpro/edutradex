'use client';

import { useState } from 'react';
import { Eye, X, Loader2 } from 'lucide-react';
import { useImpersonationStore } from '@/store/impersonation.store';
import { api } from '@/lib/api';

export function ImpersonationBanner() {
  const [isEnding, setIsEnding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    isImpersonating,
    impersonatedUserName,
    originalAdminId,
    clearImpersonation,
  } = useImpersonationStore();

  const handleEndImpersonation = async () => {
    if (!originalAdminId || isEnding) return;

    setIsEnding(true);
    setError(null);

    try {
      // CRITICAL: Wait for the API call to complete for proper audit logging
      // This ensures the server records the end of impersonation session
      await api.endImpersonation(originalAdminId);

      // Only clear state AFTER successful API call
      clearImpersonation();

      // Close this tab (opened by admin panel)
      window.close();

      // If window.close() doesn't work (some browsers block it), redirect
      setTimeout(() => {
        // Try to redirect to admin panel if close fails
        window.location.href = '/admin/users';
      }, 500);
    } catch (err) {
      // Show error to user - don't silently fail
      console.error('Failed to end impersonation:', err);
      setError('Failed to end impersonation session. Please try again.');
      setIsEnding(false);
    }
  };

  if (!isImpersonating) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[100]">
      <div className="bg-gradient-to-r from-amber-600 to-orange-600 text-white shadow-lg rounded-full px-4 py-2">
        <div className="flex items-center gap-3">
          <Eye className="h-4 w-4 flex-shrink-0" />
          <span className="text-sm">
            <span className="font-medium">Viewing as </span>
            <span className="font-bold">{impersonatedUserName}</span>
          </span>
          <button
            onClick={handleEndImpersonation}
            disabled={isEnding}
            className="flex items-center gap-1.5 px-3 py-1 bg-white/20 hover:bg-white/30 disabled:opacity-50 disabled:cursor-not-allowed rounded-full font-medium text-xs transition-colors"
          >
            {isEnding ? (
              <>
                <Loader2 className="h-3 w-3 animate-spin" />
                Ending...
              </>
            ) : (
              <>
                <X className="h-3 w-3" />
                Close
              </>
            )}
          </button>
        </div>
      </div>
      {error && (
        <div className="mt-2 bg-red-600 text-white text-xs px-3 py-1.5 rounded-full text-center">
          {error}
        </div>
      )}
    </div>
  );
}
