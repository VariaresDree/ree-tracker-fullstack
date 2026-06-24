// src/store/useStore.js
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { get, set, del } from 'idb-keyval';
import { auth } from '../config/firebaseDb';
import { TOS as fallbackTOS } from '../config/constants';
import { updateCommandParameters } from '../services/dbQueries';
import { calculateUpdatedStats } from '../utils/irtMath';

// Module-scope debounce handle for the per-answer event-driven sync.
// Lives outside the store so multiple resets just call clearTimeout on the
// same handle without leaking timers.
let debouncedFlushHandle = null;
const DEBOUNCE_FLUSH_MS = 1500;

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

        // 1. Stage for backend sync
        getStore().stageAttemptTelemetry({ questionId, subject, subtopic, isCorrect, confidenceLevel, timeSpentMs });

        // 2. Optimistic local update — dashboard widgets tick before the network resolves
        const currentStats = getStore().stats || {};
        const updated = calculateUpdatedStats(
          currentStats,
          !!isCorrect,
          String(confidenceLevel || 'MED').toLowerCase(),
          subtopic,
          subject,
          questionId,
          Math.floor((timeSpentMs || 0) / 1000),
        );
        set({ stats: updated });

        // 3. Debounced flush — see scheduleDebouncedFlush below
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

      flushQueueToCloud: async () => {
        const { syncQueue, syncStatus } = getStore();
        if (syncQueue.length === 0 || syncStatus === 'syncing') return;

        if (!navigator.onLine) {
            set({ syncStatus: 'offline_queued' });
            return;
        }

        set({ syncStatus: 'syncing' });

        try {
            const currentUser = auth.currentUser;
            if (!currentUser) throw new Error("No authenticated session located.");

            const token = await currentUser.getIdToken();
            const apiUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';

            // currentSessionId is populated by startSession() when a quiz
            // surface mounts; we deliberately do NOT mint a fresh UUID here
            // anymore, because each new UUID would create a phantom
            // ExamSession row. Falling back to a single per-flush UUID still
            // beats throwing — backend upserts will tolerate it — but the
            // expected path is "session lifecycle bracket each batch."
            const sessionId = getStore().currentSessionId || newId();
            const mode = getStore().currentSessionMode || 'ACTIVE_REVIEW';
            const targetSubject = getStore().currentSubject || 'BLENDED';

            const response = await fetch(`${apiUrl}/api/analytics/telemetry-bulk`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ sessionId, mode, targetSubject, attempts: syncQueue })
            });

            if (!response.ok) throw new Error("Backend synchronization transaction rejected.");
            
            const serverResult = await response.json();

            set({
                syncQueue: [],
                syncStatus: 'synced',
                stats: {
                    ...getStore().stats,
                    thetaRating: serverResult.updatedTheta,
                    cloudTimestamp: Date.now()
                }
            });
        } catch (error) {
            if (error.message?.includes('[OFFLINE]')) {
                console.warn("[SYNC] Backend offline — queue preserved for retry.");
                set({ syncStatus: 'offline_queued' });
            } else {
                console.error("[SYNC FATAL ERROR] Processing batch data failed:", error);
                set({ syncStatus: 'error' });
            }
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