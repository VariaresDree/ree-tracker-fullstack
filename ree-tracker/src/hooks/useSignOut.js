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
  const { logout, currentUser } = useAuth();
  const resetStore = useStore((s) => s.resetStore);

  // `removeDeviceFiles`: also clear this account's files and quizzes from this device.
  // They stay otherwise, for when they sign back in. Loaded only when asked for.
  return useCallback(async ({ removeDeviceFiles = false } = {}) => {
    const uid = currentUser?.uid;
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
    if (removeDeviceFiles && uid) {
      try {
        const { deleteDeviceData } = await import('../services/deviceStore');
        await deleteDeviceData(uid);
      } catch (err) {
        console.error('[AUTH] Device files were not removed on logout.', err);
        toast.error('Your files couldn’t be removed from this device.');
      }
    }
  }, [logout, resetStore, currentUser?.uid]);
}
