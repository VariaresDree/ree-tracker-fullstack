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
import { useEffect } from 'react';
import { useStore } from '../store/useStore';
import { auth } from '../config/firebaseDb';
import { stableBatchKey } from '../utils/contentHash';

const KEEPALIVE_MAX_ATTEMPTS = 100; // keepalive bodies are capped at ~64KB

export function useSyncLifecycle() {
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

    // 1. Safety-net interval
    const interval = setInterval(() => {
      if (navigator.onLine && hasPending()) flush();
    }, 15000);

    // 2. Reconnect flush
    const onOnline = () => {
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
      try {
        if (syncQueue.length > 0) {
          localStorage.setItem('ree_pending_sync', JSON.stringify(syncQueue.slice(-5000)));
        }
      } catch (_) { /* quota/serialization — best effort */ }

      const user = auth.currentUser;
      if (!user || syncQueue.length === 0 || !navigator.onLine) return;

      const batch = syncQueue.slice(0, KEEPALIVE_MAX_ATTEMPTS);
      // getIdToken() is async, but Firebase caches the current token — read
      // the cached accessToken synchronously; if unavailable, skip (the IDB
      // queue re-flushes on next open either way).
      const token = user.stsTokenManager?.accessToken || user.accessToken;
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
