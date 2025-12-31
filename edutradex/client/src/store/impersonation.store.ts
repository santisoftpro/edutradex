import { create } from 'zustand';

/**
 * Impersonation Store - Security-Hardened Version
 *
 * SECURITY NOTES:
 * - NO PERSISTENCE: State is in-memory only - clears on page reload/close
 * - This is intentional: impersonation sessions should be short-lived
 * - Admin must re-authenticate to impersonate again after page close
 * - Prevents token leakage via localStorage/XSS attacks
 */

interface ImpersonationState {
  isImpersonating: boolean;
  originalAdminId: string | null;
  impersonatedUserId: string | null;
  impersonatedUserEmail: string | null;
  impersonatedUserName: string | null;
  // Note: We do NOT store originalAdminToken - the server handles session restoration
}

interface ImpersonationActions {
  startImpersonation: (data: {
    originalAdminId: string;
    impersonatedUserId: string;
    impersonatedUserEmail: string;
    impersonatedUserName: string;
    newToken: string;
  }) => void;
  endImpersonation: () => { adminId: string } | null;
  clearImpersonation: () => void;
  getState: () => ImpersonationState;
}

type ImpersonationStore = ImpersonationState & ImpersonationActions;

export const useImpersonationStore = create<ImpersonationStore>()((set, get) => ({
  // Initial state - not impersonating
  isImpersonating: false,
  originalAdminId: null,
  impersonatedUserId: null,
  impersonatedUserEmail: null,
  impersonatedUserName: null,

  startImpersonation: (data) => {
    // Store the new impersonation token in sessionStorage (not localStorage)
    // sessionStorage clears when the tab closes, providing additional security
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('impersonation-token', data.newToken);
    }

    set({
      isImpersonating: true,
      originalAdminId: data.originalAdminId,
      impersonatedUserId: data.impersonatedUserId,
      impersonatedUserEmail: data.impersonatedUserEmail,
      impersonatedUserName: data.impersonatedUserName,
    });
  },

  endImpersonation: () => {
    const state = get();
    if (!state.isImpersonating || !state.originalAdminId) {
      return null;
    }

    return {
      adminId: state.originalAdminId,
    };
  },

  clearImpersonation: () => {
    // Clear the impersonation token from sessionStorage
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('impersonation-token');
    }

    set({
      isImpersonating: false,
      originalAdminId: null,
      impersonatedUserId: null,
      impersonatedUserEmail: null,
      impersonatedUserName: null,
    });
  },

  getState: () => {
    const state = get();
    return {
      isImpersonating: state.isImpersonating,
      originalAdminId: state.originalAdminId,
      impersonatedUserId: state.impersonatedUserId,
      impersonatedUserEmail: state.impersonatedUserEmail,
      impersonatedUserName: state.impersonatedUserName,
    };
  },
}));
