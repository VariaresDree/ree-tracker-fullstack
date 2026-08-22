// src/store/useStore.js
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { get, set, del } from 'idb-keyval';
import { auth } from '../config/firebaseDb';
import { TOS as fallbackTOS } from '../config/constants';
import { updateCommandParameters, apiRequest } from '../services/dbQueries';
import { calculateUpdatedStats } from '../utils/irtMath';
import { stableBatchKey } from '../utils/contentHash';
import { startTimer, pauseTimer, resetTimer, switchMode, migratePomodoro } from '../utils/pomodoroLogic';

// Module-scope debounce handle for the per-answer event-driven sync.
// Lives outside the store so multiple resets just call clearTimeout on the
// same handle without leaking timers.
let debouncedFlushHandle = null;
const DEBOUNCE_FLUSH_MS = 1500;

// Tracks the in-flight flush so concurrent callers (debounced timer + endSession)
// serialize onto a single POST instead of racing — the race used to let a
// later flush clobber attempts queued during an earlier one's round-trip.
let inFlightFlush = null;

// Serializes reconnect replays of the durable pendingWrites queue. `online` is
// handled in two hooks and useNetworkStatus is mounted by many components, so
// one reconnect used to fire flushPendingWrites 3+ times concurrently, each
// re-POSTing the same writes off an identical snapshot.
let inFlightPending = null;

// Safety-valve caps so a poison pill or a long offline stretch can't grow the
// IDB-persisted queues without bound. Sized far above any real session so
// normal use never evicts a genuine un-synced attempt.
const MAX_SYNC_QUEUE = 5000;
const MAX_PENDING_WRITES = 500;
const MAX_DEAD_LETTERS = 50;

// Sync mirror of syncQueue written on pagehide/hide (see useSyncLifecycle) so a
// fast offline tab-close can't lose the last attempt(s) in the async IDB write
// window. Recovered + merged back in onRehydrateStorage below.
const OFFLINE_MIRROR_KEY = 'ree_pending_sync';

// Capped exponential backoff for the safety-net sync retry. A persistently
// failing backend used to be re-hit every 15s forever; now failed flushes back
// off 2s → 4s → 8s … capped at 60s. The interval in useSyncLifecycle consults
// syncBackoff.canAttempt() before flushing; a fresh `online` event bypasses it.
const BACKOFF_BASE_MS = 1000;
const BACKOFF_MAX_MS = 60000;
let syncRetryCount = 0;
let nextSyncAllowedAt = 0;
const syncBackoff = {
  canAttempt: () => Date.now() >= nextSyncAllowedAt,
  reset: () => { syncRetryCount = 0; nextSyncAllowedAt = 0; },
  recordFailure: () => {
    syncRetryCount = Math.min(syncRetryCount + 1, 16);
    nextSyncAllowedAt = Date.now() + Math.min(BACKOFF_BASE_MS * 2 ** syncRetryCount, BACKOFF_MAX_MS);
  },
};

const newId = () => (crypto?.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2));

// HIGH-PERFORMANCE ASYNC STORAGE ADAPTER
const idbStorage = {
  getItem: async (name) => {
    const value = await get(name);
    return value || null;
  },
  setItem: async (name, value) => await set(name, value),
  removeItem: async (name) => await del(name),
};

export const useStore = create(
  persist(
    (set, getStore) => ({
      
      // 1. MASTER ADMIN STATE
      isAdmin: false,
      setIsAdmin: (status) => set({ isAdmin: status }),

      // 🚀 RESTORED: DYNAMIC TOS STATE
      dynamicTOS: fallbackTOS,
      setDynamicTOS: (newTOS) => set({ dynamicTOS: newTOS }),

      // Feature flags (Phase 4.1): { [key]: { enabled, payload } }, fetched at
      // auth and persisted so offline sessions keep the last-known state.
      // Missing keys read as disabled.
      featureFlags: {},
      setFeatureFlags: (flags) => set({ featureFlags: flags || {} }),

      // 2. TELEMETRY & STATS SLICE
      stats: null,
      syncStatus: 'synced',
      syncQueue: [],
      // Durable queue for whole-request writes that must survive going offline —
      // e.g. the Active Review study-session summary and an offline mock-exam's
      // telemetry batch (which carries its own sessionId + mode). Distinct from
      // syncQueue (per-attempt telemetry); replayed by flushPendingWrites on
      // reconnect. Persisted via partialize below.
      pendingWrites: [],
      // Writes the server permanently rejected (non-retryable 4xx). Quarantined
      // here so a single poison-pill payload can't wedge the replay queues
      // forever; kept for diagnostics, capped to the most recent MAX_DEAD_LETTERS.
      deadLetters: [],

      // Which account the persisted queues and stats belong to. Persisted.
      // The store lives under ONE IndexedDB key with no user scoping, so
      // without this a device where account A signed out holding un-synced
      // attempts would flush them under account B's token — A's answers landing
      // in B's analytics — and B would see A's streak/theta/heatmap until the
      // first server reconcile. Set on the first staged attempt; checked before
      // every flush; cleared by resetStore() on logout.
      ownerUid: null,

      // Session lifecycle — set by startSession() when the user enters a
      // quiz surface (Active Review / Board Sim / Gauntlet / Combat). The
      // sessionId rides every staged attempt so the backend can upsert the
      // ExamSession row before recording attempts (keystone FK fix).
      currentSessionId: null,
      currentSessionMode: null,   // 'ACTIVE_REVIEW' | 'BOARD_SIM' | 'GAUNTLET' | 'COMBAT' | 'BATTLE'
      currentSubject: null,        // 'Mathematics' | 'ESAS' | 'EE' | 'BLENDED'

      // Optimistic-then-reconcile contract: recordAttempt() updates `stats`
      // locally for instant UI, but every session end (Active Review endSession,
      // Board Sim submit) rehydrates from getAnalyticsProfile and calls setStats
      // with the server's canonical payload — a FULL replace, so client theta /
      // matrix can't drift from the server's authoritative recompute. The theta
      // formula itself lives once in utils/irtMath (client) mirroring the
      // backend's calculateUpdatedTheta; the server value always wins on reconcile.
      setStats: (newStats) => set({ stats: newStats }),

      // Start a new quiz session — call this when the surface mounts so the
      // sessionId, mode, and targetSubject are available to per-answer events.
      // Returns the generated sessionId so the surface can persist it locally
      // if it wants to (Simulator stores it on the session object for resume).
      startSession: ({ mode, subject } = {}) => {
        const sessionId = newId();
        set({
          currentSessionId: sessionId,
          currentSessionMode: mode || 'LEGACY',
          currentSubject: subject || 'BLENDED',
        });
        return sessionId;
      },

      // End the current session — flushes any pending debounced batch and
      // clears the session pointer. Safe to call when no session is active.
      endSession: async () => {
        if (debouncedFlushHandle) {
          clearTimeout(debouncedFlushHandle);
          debouncedFlushHandle = null;
        }
        const { syncQueue, flushQueueToCloud } = getStore();
        if (syncQueue.length > 0) await flushQueueToCloud();
        set({ currentSessionId: null, currentSessionMode: null, currentSubject: null });
        // Contextual notification opt-in: the user just finished a session, so
        // they've shown intent. Flip the transient eligibility flag (not
        // persisted) so NotificationOptIn can surface — but only if they haven't
        // already answered the prompt (`promptedForOptIn` is persisted).
        if (!getStore().notifications.promptedForOptIn) set({ optInEligible: true });
      },

      // SINGLE SOURCE OF TRUTH for the target board-exam date + daily quota.
      // Persists to the backend (User.examDate / User.dailyTarget) AND mirrors
      // the values into local `stats`, so every editor — Dashboard "Command
      // Parameters", Profile "Edit Identity Matrix", and the Strategic Planner —
      // can call this one action and stay in sync. Throws on failure so the
      // caller can surface a real error toast (no more false "write failure").
      saveExamConfig: async ({ examDate, dailyTarget } = {}) => {
        const currentUser = auth.currentUser;
        if (!currentUser) throw new Error('Authentication required.');

        const payload = {};
        if (examDate !== undefined && examDate !== null) payload.examDate = examDate;
        if (dailyTarget !== undefined && dailyTarget !== null) payload.dailyTarget = Number(dailyTarget);
        if (Object.keys(payload).length === 0) return;

        await updateCommandParameters(currentUser.uid, payload);

        set((state) => ({ stats: { ...(state.stats || {}), ...payload } }));
      },

      stageAttemptTelemetry: (attemptData) => {
        const payload = {
            id: newId(),
            questionId: attemptData.questionId,
            subject: attemptData.subject,
            subtopic: attemptData.subtopic,
            isCorrect: attemptData.isCorrect,
            confidenceLevel: attemptData.confidenceLevel?.toUpperCase() || 'MED',
            timeSpentMs: attemptData.timeSpentMs,
            createdAt: new Date().toISOString()
        };

        set((state) => ({
            syncQueue: [...state.syncQueue, payload].slice(-MAX_SYNC_QUEUE),
            syncStatus: 'offline_queued',
            ownerUid: state.ownerUid || auth.currentUser?.uid || null,
        }));
      },

      // High-level per-answer event handler — the single entry point every
      // quiz surface should call right after the user locks in a choice. It:
      //
      //   1. Stages the attempt into the IDB-persisted syncQueue.
      //   2. Optimistically updates local `stats` so the dashboard counters,
      //      theta history, matrix buckets, streak, etc. tick INSTANTLY —
      //      before the network request resolves.
      //   3. Schedules a debounced flush so 100 simulator answers in 90s
      //      coalesce into ONE HTTP request, not 100.
      //
      // Reuses `calculateUpdatedStats` (utils/irtMath.js) for the optimistic
      // update — same function the existing post-sync rehydrate already uses,
      // so the optimistic state is consistent with the eventual server state.
      // PR #18's vitest suite locks down its invariants.
      recordAttempt: (event) => {
        const {
          questionId, subject = 'General', subtopic = 'General',
          isCorrect, confidenceLevel = 'MED', timeSpentMs = 0, userAnswer = null,
        } = event || {};
        if (!questionId) return;

        // Atomic update so two answers in the same JS tick can't both read
        // the same `stats` snapshot and the second overwrite the first's
        // optimistic update. Without this, fast users (10 items in 5s) saw
        // their tally come up 1-2 short of what they actually answered.
        set((state) => {
          const payload = {
            id: newId(),
            questionId,
            subject,
            subtopic,
            isCorrect: !!isCorrect,
            confidenceLevel: String(confidenceLevel || 'MED').toUpperCase(),
            timeSpentMs: Number(timeSpentMs) || 0,
            // Selected option (MCQ) so the server re-grades authoritatively on
            // sync. OMITTED (not null) for flashcards — the bulk schema's
            // userAnswer is an optional string (null would 400 the batch); the
            // server falls back to the client isCorrect when it's absent.
            ...(typeof userAnswer === 'string' ? { userAnswer } : {}),
            createdAt: new Date().toISOString(),
          };
          const updatedStats = calculateUpdatedStats(
            state.stats || {},
            !!isCorrect,
            String(confidenceLevel || 'MED').toLowerCase(),
            subtopic,
            subject,
            questionId,
            // Milliseconds, matching the server payload's microTopics.totalTime —
            // the old ÷1000 made local topic times 1000× smaller than the
            // server's, so the dashboard merge produced garbage speed data.
            Number(timeSpentMs) || 0,
          );
          return {
            stats: updatedStats,
            syncQueue: [...state.syncQueue, payload].slice(-MAX_SYNC_QUEUE),
            syncStatus: state.syncStatus === 'syncing' ? 'syncing' : 'offline_queued',
            ownerUid: state.ownerUid || auth.currentUser?.uid || null,
          };
        });

        // Debounced flush — see scheduleDebouncedFlush below
        getStore().scheduleDebouncedFlush();
      },

      // Resets the debounce timer; once the user pauses for DEBOUNCE_FLUSH_MS
      // milliseconds (default 1500), flushQueueToCloud fires. Each new answer
      // pushes the timer forward, so a contiguous burst flushes once.
      scheduleDebouncedFlush: (delay = DEBOUNCE_FLUSH_MS) => {
        if (debouncedFlushHandle) clearTimeout(debouncedFlushHandle);
        debouncedFlushHandle = setTimeout(() => {
          debouncedFlushHandle = null;
          getStore().flushQueueToCloud();
        }, delay);
      },

      // Sends the staged attempts to the backend. Hardened so a 10-item burst
      // never under-counts:
      //   • Serializes on `inFlightFlush` so the debounced timer and endSession
      //     can't POST concurrently.
      //   • Snapshots the exact batch and removes ONLY those ids on success, so
      //     attempts staged DURING the round-trip are preserved (the old code
      //     blindly cleared the whole queue and lost them).
      //   • Sends an Idempotency-Key so a network-retried batch is replayed by
      //     the backend, not double-inserted.
      //   • Drains trailing items via a guarded re-flush (only on success +
      //     online, so an error can't spin a tight retry loop).
      flushQueueToCloud: async () => {
        // If a flush is already running, wait for it (its success path will have
        // cleared its own ids) before we evaluate what's left to send.
        if (inFlightFlush) {
          await inFlightFlush.catch(() => {});
        }

        const run = async () => {
          const { syncQueue } = getStore();
          if (syncQueue.length === 0) return true;

          if (!navigator.onLine) {
            set({ syncStatus: 'offline_queued' });
            return false;
          }

          const batch = syncQueue.slice();
          const sentIds = new Set(batch.map((a) => a.id));

          set({ syncStatus: 'syncing' });

          try {
            const currentUser = auth.currentUser;
            if (!currentUser) throw new Error("No authenticated session located.");

            // Cross-account guard. The persisted queue is one IndexedDB record
            // with no user scoping, so when account A signed out holding
            // un-synced attempts and account B signed in on the same device,
            // this flush POSTed A's answers under B's token and they landed in
            // B's analytics. Those attempts belong to a user we can no longer
            // authenticate as, so they cannot be sent at all — quarantine them
            // visibly rather than mis-attributing them or dropping them silently.
            const owner = getStore().ownerUid;
            if (owner && owner !== currentUser.uid) {
              console.error('[SYNC] Queue belongs to a different account; quarantining.');
              set((state) => ({
                syncQueue: [],
                deadLetters: [
                  ...state.deadLetters,
                  { type: 'telemetry-orphaned', ids: [...sentIds], error: 'queue owner mismatch', at: Date.now() },
                ].slice(-MAX_DEAD_LETTERS),
                ownerUid: currentUser.uid,
                syncStatus: 'error',
              }));
              return false;
            }

            // currentSessionId is populated by startSession() when a quiz
            // surface mounts, and is now PERSISTED so a restart mid-queue keeps
            // the same id. When there genuinely is no session (a stray attempt,
            // or a queue restored after the session ended) we mint one ONCE and
            // store it — minting per flush gave every retry a different id,
            // which both created phantom ExamSession rows and changed the
            // idempotency key, defeating the exactly-once replay it exists for.
            let sessionId = getStore().currentSessionId;
            if (!sessionId) {
              sessionId = newId();
              set({ currentSessionId: sessionId });
            }
            const mode = getStore().currentSessionMode || 'ACTIVE_REVIEW';
            const targetSubject = getStore().currentSubject || 'BLENDED';

            // Content-derived key: a RETRY of this exact batch (network flake,
            // timeout abort, app reopen) reuses the identical key, so the
            // server replays the cached response instead of double-writing.
            const batchKey = stableBatchKey(sessionId, batch.map((a) => a.id));

            // Routed through apiRequest instead of a bare fetch. The bare fetch
            // had no AbortController, so a stalled backend left this promise —
            // and therefore `inFlightFlush`, which every subsequent flush awaits
            // — pending for the OS-level TCP timeout: the queue stopped
            // draining entirely and "End session" spun forever. It also
            // bypassed the circuit breaker and never produced the '[OFFLINE]'
            // sentinel, so the triage below could not recognise a plain
            // connectivity drop and showed a red "Sync error" instead of the
            // calm "Offline — changes queued".
            const serverResult = await apiRequest('/api/analytics/telemetry-bulk', 'POST', {
              sessionId,
              mode,
              targetSubject,
              // clientAttemptId gives the server a durable per-attempt dedupe
              // handle that outlives the idempotency record's TTL.
              attempts: batch.map((a) => ({ ...a, clientAttemptId: a.id })),
            }, { idempotencyKey: batchKey });

            // Surface silent drops (e.g. questions the server couldn't match)
            // instead of letting sessions quietly undercount.
            if (serverResult.skipped > 0) {
              console.warn(`[SYNC] Server skipped ${serverResult.skipped} attempt(s) with unknown question ids.`);
            }

            set((state) => {
              const remaining = state.syncQueue.filter((a) => !sentIds.has(a.id));
              return {
                syncQueue: remaining,
                syncStatus: remaining.length > 0 ? 'offline_queued' : 'synced',
                stats: {
                  ...state.stats,
                  // Guard: a fully-deduped replay returns the CURRENT theta;
                  // never let a null response wipe the local value.
                  thetaRating: serverResult.updatedTheta ?? state.stats?.thetaRating,
                  cloudTimestamp: Date.now()
                }
              };
            });
            syncBackoff.reset(); // healthy round-trip — clear any accrued backoff
            return true;
          } catch (error) {
            const status = error?.status;
            const permanent = typeof status === 'number' && status >= 400 && status < 500 && status !== 408 && status !== 429;
            if (error.message?.includes('[OFFLINE]') || error.message?.includes('[TIMEOUT]')) {
              // Transient — preserve the whole batch for the next flush/reconnect,
              // and back off so we don't hammer a flaky/offline backend.
              console.warn("[SYNC] Backend offline — queue preserved for retry.");
              syncBackoff.recordFailure();
              set({ syncStatus: 'offline_queued' });
            } else if (permanent) {
              // Non-retryable rejection (e.g. a malformed batch). Quarantine it so
              // it can't wedge the queue forever AND keep the optimistic stats
              // inflated indefinitely — the next session-end reconcile full-
              // replaces stats from the server, correcting the local counters.
              console.error(`[SYNC] Batch permanently rejected (${status}); quarantining ${sentIds.size} attempt(s).`, error);
              set((state) => ({
                syncQueue: state.syncQueue.filter((a) => !sentIds.has(a.id)),
                deadLetters: [
                  ...state.deadLetters,
                  { type: 'telemetry', ids: [...sentIds], status, error: error.message, at: Date.now() },
                ].slice(-MAX_DEAD_LETTERS),
                syncStatus: 'error',
              }));
            } else {
              // Unknown/5xx — treat as transient, keep the batch and back off.
              console.error("[SYNC FATAL ERROR] Processing batch data failed:", error);
              syncBackoff.recordFailure();
              set({ syncStatus: 'error' });
            }
            return false;
          }
        };

        inFlightFlush = run();
        let succeeded = false;
        try {
          succeeded = await inFlightFlush;
        } finally {
          inFlightFlush = null;
        }

        // Drain anything that landed mid-flush. Bounded: each successful pass
        // removes its batch, so the queue strictly shrinks until empty.
        if (succeeded && navigator.onLine && getStore().syncQueue.length > 0) {
          await getStore().flushQueueToCloud();
        }
      },

      // Backoff gate for the safety-net interval (useSyncLifecycle). Returns
      // false while we're inside a post-failure backoff window; a fresh `online`
      // event flushes directly and bypasses this. resetSyncBackoff lets the
      // reconnect handler clear the window on a fresh connectivity signal.
      canAttemptSync: () => syncBackoff.canAttempt(),
      resetSyncBackoff: () => syncBackoff.reset(),

      // Defer a full write (endpoint + body) until we're back online. Used for
      // session summaries and offline mock-exam telemetry so nothing is dropped
      // when the user finishes a session with no connection.
      queuePendingWrite: (endpoint, method, body) => {
        set((state) => ({
          pendingWrites: [
            ...state.pendingWrites,
            { id: newId(), endpoint, method: method || 'POST', body, createdAt: new Date().toISOString() },
          ].slice(-MAX_PENDING_WRITES),
        }));
      },

      // Replays queued writes one at a time on reconnect. apiRequest attaches a
      // stable Idempotency-Key, and each write is removed only on success, so a
      // replay lands at-least-once (practically exactly-once for our writes).
      //
      // Error handling distinguishes TRANSIENT from PERMANENT failures:
      //   • transient ([OFFLINE]/[TIMEOUT]/5xx) → stop and keep the whole queue
      //     so the next reconnect retries it (no tight loop).
      //   • permanent 4xx (a payload the server will always reject) → quarantine
      //     that one write and CONTINUE, so a single poison pill can't block
      //     every later session summary / offline exam batch forever.
      // Guarded by inFlightPending so the many-mounted reconnect handlers can't
      // replay the same writes concurrently.
      flushPendingWrites: async () => {
        if (inFlightPending) { await inFlightPending.catch(() => {}); return; }
        if (!navigator.onLine) return;
        const { pendingWrites } = getStore();
        if (!pendingWrites || pendingWrites.length === 0) return;

        const run = async () => {
          for (const w of getStore().pendingWrites.slice()) {
            try {
              await apiRequest(w.endpoint, w.method, w.body);
              set((state) => ({ pendingWrites: state.pendingWrites.filter((p) => p.id !== w.id) }));
            } catch (err) {
              const status = err?.status;
              const permanent = typeof status === 'number' && status >= 400 && status < 500 && status !== 408 && status !== 429;
              if (permanent) {
                console.error(`[SYNC] Pending write permanently rejected (${status}); quarantining.`, w.endpoint, err);
                set((state) => ({
                  pendingWrites: state.pendingWrites.filter((p) => p.id !== w.id),
                  deadLetters: [
                    ...state.deadLetters,
                    { type: 'pendingWrite', endpoint: w.endpoint, status, error: err.message, at: Date.now() },
                  ].slice(-MAX_DEAD_LETTERS),
                }));
                continue; // advance past the poison pill
              }
              break; // transient — retry the rest on the next reconnect
            }
          }
        };

        inFlightPending = run();
        try { await inFlightPending; } finally { inFlightPending = null; }
      },

      resetDailyQuotas: () => set((state) => {
        if (!state.stats) return state;
        return { stats: { ...state.stats, dailyMath: 0, dailyESAS: 0, dailyEE: 0 } };
      }),

      // Wipe every trace of the current account from the device. Profile.jsx
      // has always called this on logout and on account deletion — but the
      // action did not exist, so the call threw AFTER Firebase had already
      // signed the user out. Two visible consequences: a successful logout
      // reported "Log out failed", and nothing was ever cleared, so the next
      // account on the device inherited the previous user's stats and
      // un-synced queue.
      //
      // Deliberately synchronous-then-async: state is cleared first so no
      // subsequent flush can observe the old queue, then the IndexedDB record
      // and the localStorage mirror are removed.
      resetStore: async () => {
        if (debouncedFlushHandle) {
          clearTimeout(debouncedFlushHandle);
          debouncedFlushHandle = null;
        }
        inFlightFlush = null;
        inFlightPending = null;
        syncBackoff.reset();
        set({
          ownerUid: null,
          stats: null,
          syncQueue: [],
          pendingWrites: [],
          deadLetters: [],
          syncStatus: 'synced',
          isAdmin: false,
          currentSessionId: null,
          currentSessionMode: null,
          currentSubject: null,
        });
        try { localStorage.removeItem(OFFLINE_MIRROR_KEY); } catch (_) {}
        try { await useStore.persist?.clearStorage?.(); } catch (_) {}
      },

      purgeAnalytics: async () => {
        // apiRequest, not a bare fetch: this used to duplicate token fetch, URL
        // resolution and error parsing, and had no timeout or circuit-breaker
        // participation.
        await apiRequest('/api/analytics/purge', 'DELETE');
        // Reset to a clean baseline stats object instead of `null`. A null
        // stats traps the Dashboard on its skeleton until the page reloads,
        // because `if (!activeStats) return <DashboardSkeleton />`. Giving
        // the user a zeroed-out object lets them keep navigating; the next
        // dashboard fetch (or telemetry sync) will hydrate fresh numbers.
        set({
            stats: {
                globalStreak: 0,
                lastActiveDate: null,
                dailyMath: 0,
                dailyESAS: 0,
                dailyEE: 0,
                matrix: { hc: 0, hw: 0, lc: 0, lw: 0 },
                blindSpots: [],
                microTopics: {},
                activityCalendar: {},
                thetaHistory: [],
                totalAnswered: 0,
                totalCorrect: 0,
                irt: { theta: 0, consecutiveCorrect: 0, consecutiveWrong: 0 },
            },
            syncQueue: [],
            pendingWrites: [],
            deadLetters: [],
            syncStatus: 'synced',
        });
      },

      // 3. POMODORO PROTOCOL SLICE — timestamp model (utils/pomodoroLogic).
      // Remaining time is DERIVED from `endsAt`, never ticked into the store,
      // so the timer survives sidebar unmounts, route changes, and reloads.
      pomodoro: { workDuration: 25, breakDuration: 5, isWork: true, isRunning: false, endsAt: null, pausedRemaining: 25 * 60 },
      updatePomodoro: (config) => set((state) => ({ pomodoro: { ...state.pomodoro, ...config } })),
      startPomodoro: () => set((state) => ({
        pomodoro: startTimer(state.pomodoro),
        // A fresh start un-dismisses the floating widget.
        pomodoroWidget: { ...state.pomodoroWidget, dismissed: false },
      })),
      pausePomodoro: () => set((state) => ({ pomodoro: pauseTimer(state.pomodoro) })),
      resetPomodoro: () => set((state) => ({ pomodoro: resetTimer(state.pomodoro) })),
      switchPomodoroMode: () => set((state) => ({ pomodoro: switchMode(state.pomodoro) })),

      // Floating timer widget: pin keeps it visible while paused; dismissed
      // hides it until the next start; x/y persist the dragged position.
      pomodoroWidget: { pinned: false, dismissed: false, x: null, y: null },
      setPomodoroWidget: (patch) => set((state) => ({ pomodoroWidget: { ...state.pomodoroWidget, ...patch } })),

      // 4. UI & UX STATE SLICE 
      isSidebarOpen: false, 
      isSidebarCollapsed: false, 
      toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
      setSidebarOpen: (isOpen) => set({ isSidebarOpen: isOpen }),
      toggleSidebarCollapse: () => set((state) => ({ isSidebarCollapsed: !state.isSidebarCollapsed })),
      setSidebarCollapsed: (isCollapsed) => set({ isSidebarCollapsed: isCollapsed }),
      theme: localStorage.getItem('ree-theme') || 'dark',
      setTheme: (newTheme) => {
        localStorage.setItem('ree-theme', newTheme);
        if (newTheme === 'dark' || !newTheme) {
          document.documentElement.removeAttribute('data-theme');
        } else {
          document.documentElement.setAttribute('data-theme', newTheme);
        }
        set({ theme: newTheme });
      },

      // 5. NOTIFICATIONS SLICE — prefs for local + in-page notifications.
      // `enabled` gates the in-page Pomodoro "session over" system notification;
      // the daily review reminder is native-only (scheduled via
      // services/localReminders.js using reminderHour/reminderMinute).
      // `promptedForOptIn` guarantees the contextual opt-in is offered once,
      // after a real session — never on a cold load.
      notifications: {
        enabled: false,
        dailyReminderEnabled: false,
        reminderHour: 19,
        reminderMinute: 0,
        promptedForOptIn: false,
      },
      // Transient (NOT persisted): set true by endSession() once per fresh load
      // so the contextual opt-in appears in-session, never on a cold start.
      optInEligible: false,
      setNotificationPrefs: (patch) => set((state) => ({ notifications: { ...state.notifications, ...patch } })),
      markOptInPrompted: () => set((state) => ({ notifications: { ...state.notifications, promptedForOptIn: true } })),
    }),
    {
      name: 'ree-tracker-secure-storage',
      storage: createJSONStorage(() => idbStorage),
      partialize: (state) => ({
        // Persisted so a flush after a restart can still prove who the queued
        // attempts belong to.
        ownerUid: state.ownerUid,
        // Persisted so a queue restored after a restart keeps the SAME session
        // id. It used to be transient, so every retry minted a fresh UUID —
        // which changed stableBatchKey and therefore the Idempotency-Key,
        // defeating exactly-once replay in precisely the crash-recovery case it
        // was built for, and creating a phantom ExamSession row per attempt.
        currentSessionId: state.currentSessionId,
        syncQueue: state.syncQueue,
        pendingWrites: state.pendingWrites,
        deadLetters: state.deadLetters,
        stats: state.stats,
        pomodoro: state.pomodoro,
        pomodoroWidget: state.pomodoroWidget,
        theme: state.theme,
        notifications: state.notifications,
        // isAdmin is deliberately NOT persisted. Rehydrating it meant anyone who
        // edited the IndexedDB record in DevTools got the full admin UI on the
        // next load. Server mutations still 403, so this was UI-only exposure —
        // but it advertised the admin surface, and it combined badly with the
        // admin-intent read endpoints that are only authenticated, not
        // authorized. AuthContext sets it from the server role on every boot.
        dynamicTOS: state.dynamicTOS, // 🚀 CRITICAL: Tells the store to remember your changes
        featureFlags: state.featureFlags // last-known flags survive offline restarts
      }),
      // Offline tab-close recovery: useSyncLifecycle mirrors the live syncQueue
      // to localStorage (a SYNC API) on pagehide, because the IDB persist above
      // is async and a fast close can drop the last attempt(s). This runs AFTER
      // IDB hydration completes, so merging is race-free; dedupe by id.
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        // Legacy pomodoro shape ({ timeLeft } counter) → timestamp model, and
        // clean up a block that expired while the app was closed.
        state.pomodoro = migratePomodoro(state.pomodoro);
        try {
          const raw = localStorage.getItem(OFFLINE_MIRROR_KEY);
          if (raw) {
            const recovered = JSON.parse(raw);
            if (Array.isArray(recovered) && recovered.length) {
              const seen = new Set((state.syncQueue || []).map((a) => a?.id));
              const merged = [...(state.syncQueue || [])];
              for (const a of recovered) if (a && a.id && !seen.has(a.id)) merged.push(a);
              state.syncQueue = merged.slice(-MAX_SYNC_QUEUE);
            }
          }
        } catch (_) { /* corrupt mirror — ignore */ }
        try { localStorage.removeItem(OFFLINE_MIRROR_KEY); } catch (_) {}
      }
    }
  )
);