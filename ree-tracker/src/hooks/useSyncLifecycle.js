// src/hooks/useSyncLifecycle.js
// Headless, app-lifetime sync guardian, mounted ONCE in App.jsx. The old
// safety-net flush lived in TelemetrySync.jsx — a component that was never
// mounted anywhere, so the 15s interval and online-transition flush were
// dead code and the debounced queue could sit unsent until the next visit.
//
// Three layers:
//   1. 15s safety-net interval — catches anything the 1.5s debounce missed.
//   2. online-transition flush — drains the queue the moment we reconnect.
//   3. pagehide/visibility flush — a last-gasp keepalive POST when the tab
//      closes or backgrounds. The queue is NOT cleared optimistically; the
//      server's clientAttemptId dedupe makes the next-open re-flush harmless
//      whether or not this delivery succeeded.
import { useEffect, useRef } from 'react';
import { useStore } from '../store/useStore';
import { auth } from '../config/firebaseDb';
import { stableBatchKey } from '../utils/contentHash';
import { syncDashboardStats } from '../services/analyticsSync';

const KEEPALIVE_MAX_ATTEMPTS = 100; // keepalive bodies are capped at ~64KB

export function useSyncLifecycle() {
  // A background flush here (15s safety net / reconnect / pagehide, all
  // below) used to update ONLY stats.thetaRating on success — the full
  // aggregate reconcile (activityCalendar/microTopics/matrix/totalAnswered)
  // happened ONLY as a side effect of Dashboard.jsx's own local `syncTick`
  // effect, which watches syncStatus but only exists while Dashboard is
  // mounted. So an offline batch that synced while the user was on Review,
  // Profile, or Arena left those surfaces' cached numbers stale until the
  // user happened to visit Dashboard again — read as "offline answers don't
  // tally." This mirrors Dashboard's exact syncing->synced watch, but here,
  // mounted once app-wide in App.jsx regardless of route.
  const syncStatus = useStore((s) => s.syncStatus);
  const prevSyncStatusRef = useRef(syncStatus);
  useEffect(() => {
    if (prevSyncStatusRef.current === 'syncing' && syncStatus === 'synced') {
      const uid = auth.currentUser?.uid;
      if (uid) syncDashboardStats(uid).catch(() => { /* best-effort — the next successful sync retries */ });
    }
    prevSyncStatusRef.current = syncStatus;
  }, [syncStatus]);

  useEffect(() => {
    // Drain BOTH queues: per-attempt telemetry (syncQueue) AND deferred whole
    // writes (pendingWrites — session summaries + offline mock-exam telemetry),
    // so a transient failure self-heals without needing a connectivity toggle.
    const flush = () => {
      const s = useStore.getState();
      s.flushQueueToCloud();
      if ((s.pendingWrites?.length || 0) > 0) s.flushPendingWrites?.();
    };
    const hasPending = () => {
      const s = useStore.getState();
      return s.syncQueue.length > 0 || (s.pendingWrites?.length || 0) > 0;
    };

    // 1. Safety-net interval — respects the store's exponential backoff so a
    // persistently-failing backend isn't re-hit every 15s.
    const interval = setInterval(() => {
      if (navigator.onLine && hasPending() && useStore.getState().canAttemptSync()) flush();
    }, 15000);

    // 2. Reconnect flush — a fresh `online` event is a strong signal, so clear
    // any accrued backoff and try immediately (bypassing the interval gate).
    const onOnline = () => {
      useStore.getState().resetSyncBackoff();
      if (hasPending()) flush();
    };
    window.addEventListener('online', onOnline);

    // 3. Last-gasp flush on hide/close
    const onHide = () => {
      const { syncQueue, currentSessionId, currentSessionMode, currentSubject } = useStore.getState();

      // Durability FIRST, offline-safe: mirror the live queue to localStorage
      // (a SYNCHRONOUS API) so a fast close can't lose the last attempt(s) in
      // the async IDB-persist window. Recovered + merged in the store's
      // onRehydrateStorage on next open. Runs regardless of connectivity.
      // The `else` branch is load-bearing. Without it the mirror was written
      // on every hide but only ever REMOVED at cold boot, so this sequence
      // resurrected already-synced attempts: answer 10 -> hide (mirror written)
      // -> return -> safety-net flush succeeds and empties syncQueue -> close
      // (queue empty, so the old code skipped the write AND any cleanup, and
      // the stale mirror survived) -> next open merges those 10 synced attempts
      // back into the queue. They were re-POSTed, and the pending-count badge
      // showed a phantom backlog indefinitely. Server-side clientAttemptId
      // dedupe stopped it corrupting data, but the client was doing needless
      // at-least-once delivery of work it had already completed.
      try {
        if (syncQueue.length > 0) {
          localStorage.setItem('ree_pending_sync', JSON.stringify(syncQueue.slice(-5000)));
        } else {
          localStorage.removeItem('ree_pending_sync');
        }
      } catch (_) { /* quota/serialization — best effort */ }

      const user = auth.currentUser;
      if (!user || syncQueue.length === 0 || !navigator.onLine) return;

      const batch = syncQueue.slice(0, KEEPALIVE_MAX_ATTEMPTS);
      // getIdToken() is async, but Firebase caches the current token — read
      // the cached accessToken synchronously; if unavailable, skip (the IDB
      // queue re-flushes on next open either way).
      // `user.accessToken` is the supported surface for the cached ID token.
      // The previous `user.stsTokenManager?.accessToken` reached into an
      // undocumented SDK internal that can disappear on any minor bump — and
      // this request is fire-and-forget with an empty catch, so the resulting
      // 401 would never have been observed. getIdToken() can't be used here:
      // it's async and pagehide gives us no await budget. The IDB queue remains
      // the source of truth if this token is stale.
      const token = user.accessToken;
      if (!token) return;

      const apiUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';
      const sessionId = currentSessionId || 'pagehide';
      try {
        fetch(`${apiUrl}/api/analytics/telemetry-bulk`, {
          method: 'POST',
          keepalive: true,
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
            'Idempotency-Key': stableBatchKey(sessionId, batch.map((a) => a.id)),
          },
          body: JSON.stringify({
            sessionId: currentSessionId || undefined,
            mode: currentSessionMode || 'ACTIVE_REVIEW',
            targetSubject: currentSubject || 'BLENDED',
            attempts: batch.map((a) => ({ ...a, clientAttemptId: a.id })),
          }),
        });
      } catch {
        // Best effort only — the persisted queue is the source of truth.
      }
    };
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') onHide();
    };
    window.addEventListener('pagehide', onHide);
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      clearInterval(interval);
      window.removeEventListener('online', onOnline);
      window.removeEventListener('pagehide', onHide);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);
}
