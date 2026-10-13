// src/features/diagnostic/usePlacement.js
//
// The placement test's status for Today: whether it's taken, in progress or
// not started, and where the learner should start (startingPlan), worked out
// from the saved result. One read shared by the placement prompt and Today's
// actions, which each used to need it; cached per account, so Today paints it
// offline. Only asked while it matters: a new learner, or a test not yet
// waved away.
import { useCallback, useState } from 'react';
import { useSyncedUserData } from '../../hooks/useSyncedUserData';
import { startingPlan } from '../exams/startingPlan';

// Answers under which a learner counts as new: the prompt shows, and Today's
// actions follow the placement plan.
export const NEW_LEARNER_MAX = 30;

const dismissKey = (uid) => `ree_placement_dismissed:${uid}`;
const readDismissed = (uid) => {
  try { return localStorage.getItem(dismissKey(uid)) === '1'; } catch { return false; }
};

const NO_WRITES = (value) => ({ value, count: 0 });

export function usePlacement({ uid, answered = 0 }) {
  const [dismissedFor, setDismissedFor] = useState(() => (uid && readDismissed(uid) ? uid : null));
  const dismissed = !!uid && (dismissedFor === uid || readDismissed(uid));
  const isNew = answered < NEW_LEARNER_MAX;

  const { value: status, status: syncStatus } = useSyncedUserData({
    endpoint: '/api/diagnostic/status',
    cacheName: 'placement',
    overlay: NO_WRITES,
    enabled: !!uid && (isNew || !dismissed),
  });

  // The finished result, or the one behind a retake in progress.
  const result = status?.status === 'completed' ? status.result : status?.lastResult || null;

  const dismiss = useCallback(() => {
    if (!uid) return;
    try { localStorage.setItem(dismissKey(uid), '1'); } catch { /* private mode: dismiss for this view only */ }
    setDismissedFor(uid);
  }, [uid]);

  // Known by now: a copy is on screen, or the read finished either way. Until
  // then Today holds the cards that depend on it, so the exam-plan card
  // doesn't flash before the placement prompt that outranks it.
  const settled = status != null || syncStatus !== 'loading';

  return { status, result, plan: startingPlan(result), dismissed, dismiss, isNew, settled };
}
