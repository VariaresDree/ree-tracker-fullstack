// src/hooks/useSignOut.js
//
// Sign out, then clear this device's local state. Two separate steps on
// purpose: clearing local state must not be able to report the sign-out as
// failed (it once did, toasting "Log out failed" after every successful logout
// while leaving the previous account's stats and unsynced queue behind).
import { useCallback } from 'react';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import { useStore } from '../store/useStore';

export default function useSignOut() {
  const { logout } = useAuth();
  const resetStore = useStore((s) => s.resetStore);

  return useCallback(async () => {
    try {
      await logout();
    } catch {
      toast.error('Log out failed.');
      return;
    }
    try {
      await resetStore();
    } catch (err) {
      console.error('[AUTH] Local state was not fully cleared on logout.', err);
    }
  }, [logout, resetStore]);
}
