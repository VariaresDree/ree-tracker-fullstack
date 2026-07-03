// src/store/useStore.js
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { get, set, del } from 'idb-keyval';
import { auth } from '../config/firebaseDb';
import { TOS as fallbackTOS } from '../config/constants';
import { updateCommandParameters } from '../services/dbQueries';
import { calculateUpdatedStats } from '../utils/irtMath';
import { stableBatchKey } from '../utils/contentHash';

// Module-scope debounce handle for the per-answer event-driven sync.
// Lives outside the store so multiple resets just call clearTimeout on the
// same handle without leaking timers.
let debouncedFlushHandle = null;
const DEBOUNCE_FLUSH_MS = 1500;

// Tracks the in-flight flush so concurrent callers (debounced timer + endSession)
// serialize onto a single POST instead of racing — the race used to let a
// later flush clobber attempts queued during an earlier one's round-trip.
let inFlightFlush = null;

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

      // 2. TELEMETRY & STATS SLICE
      stats: null,
      syncStatus: 'synced',
      syncQueue: [],

      // Session lifecycle — set by startSession() when the user enters a
      // quiz surface (Active Review / Board Sim / Gauntlet / Combat). The
      // sessionId rides every staged attempt so the backend can upsert the
      // ExamSession row before recording attempts (keystone FK fix).
      currentSessionId: null,
      currentSessionMode: null,   // 'ACTIVE_REVIEW' | 'BOARD_SIM' | 'GAUNTLET' | 'COMBAT' | 'BATTLE'
      currentSubject: null,        // 'Mathematics' | 'ESAS' | 'EE' | 'BLENDED'

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
            syncQueue: [...state.syncQueue, payload],
            syncStatus: 'offline_queued'
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
          isCorrect, confidenceLevel = 'MED', timeSpentMs = 0,
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
            syncQueue: [...state.syncQueue, payload],
            syncStatus: state.syncStatus === 'syncing' ? 'syncing' : 'offline_queued',
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

            const token = await currentUser.getIdToken();
            const apiUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';

            // currentSessionId is populated by startSession() when a quiz surface
            // mounts; we deliberately do NOT mint a fresh UUID per flush, because
            // each new UUID would create a phantom ExamSession row.
            const sessionId = getStore().currentSessionId || newId();
            const mode = getStore().currentSessionMode || 'ACTIVE_REVIEW';
            const targetSubject = getStore().currentSubject || 'BLENDED';

            // Content-derived key: a RETRY of this exact batch (network flake,
            // timeout abort, app reopen) reuses the identical key, so the
            // server replays the cached response instead of double-writing.
            // The old random-per-flush key made every retry look like new data.
            const batchKey = stableBatchKey(sessionId, batch.map((a) => a.id));

            const response = await fetch(`${apiUrl}/api/analytics/telemetry-bulk`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
                'Idempotency-Key': batchKey,
              },
              body: JSON.stringify({
                sessionId,
                mode,
                targetSubject,
                // clientAttemptId gives the server a durable per-attempt dedupe
                // handle that outlives the idempotency cache's 10-min TTL.
                attempts: batch.map((a) => ({ ...a, clientAttemptId: a.id })),
              })
            });

            if (!response.ok) throw new Error("Backend synchronization transaction rejected.");

            const serverResult = await response.json();

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
            return true;
          } catch (error) {
            if (error.message?.includes('[OFFLINE]')) {
              console.warn("[SYNC] Backend offline — queue preserved for retry.");
              set({ syncStatus: 'offline_queued' });
            } else {
              console.error("[SYNC FATAL ERROR] Processing batch data failed:", error);
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

      resetDailyQuotas: () => set((state) => {
        if (!state.stats) return state;
        return { stats: { ...state.stats, dailyMath: 0, dailyESAS: 0, dailyEE: 0 } };
      }),

      purgeAnalytics: async () => {
        const currentUser = auth.currentUser;
        if (!currentUser) throw new Error('Authentication required.');
        const token = await currentUser.getIdToken();
        const apiUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';
        const resp = await fetch(`${apiUrl}/api/analytics/purge`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!resp.ok) {
            const body = await resp.json().catch(() => ({}));
            throw new Error(body.error || `Purge failed (${resp.status}).`);
        }
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
            syncStatus: 'synced',
        });
      },

      // 3. POMODORO PROTOCOL SLICE
      pomodoro: { workDuration: 25, breakDuration: 5, timeLeft: 25 * 60, isRunning: false, isWork: true },
      updatePomodoro: (config) => set((state) => ({ pomodoro: { ...state.pomodoro, ...config } })),
      togglePomodoro: () => set((state) => ({ pomodoro: { ...state.pomodoro, isRunning: !state.pomodoro.isRunning } })),
      resetPomodoro: () => set((state) => ({
        pomodoro: { ...state.pomodoro, isRunning: false, timeLeft: state.pomodoro.isWork ? state.pomodoro.workDuration * 60 : state.pomodoro.breakDuration * 60 }
      })),
      tickPomodoro: () => set((state) => {
        const p = state.pomodoro;
        if (!p.isRunning || p.timeLeft <= 0) return state;
        return { pomodoro: { ...p, timeLeft: p.timeLeft - 1 } };
      }),
      switchPomodoroMode: () => set((state) => {
        const p = state.pomodoro;
        const nextMode = !p.isWork;
        return {
          pomodoro: { ...p, isWork: nextMode, timeLeft: nextMode ? p.workDuration * 60 : p.breakDuration * 60, isRunning: false }
        };
      }),

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
      }
    }),
    {
      name: 'ree-tracker-secure-storage',
      storage: createJSONStorage(() => idbStorage),
      partialize: (state) => ({
        syncQueue: state.syncQueue,
        stats: state.stats,
        pomodoro: state.pomodoro,
        theme: state.theme,
        isAdmin: state.isAdmin,
        dynamicTOS: state.dynamicTOS // 🚀 CRITICAL: Tells the store to remember your changes
      })
    }
  )
);