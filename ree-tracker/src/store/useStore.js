// src/store/useStore.js
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { get, set, del } from 'idb-keyval';
import { auth } from '../config/firebaseDb';
import { TOS as fallbackTOS } from '../config/constants';
import { updateCommandParameters } from '../services/dbQueries';

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

      setStats: (newStats) => set({ stats: newStats }),

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
            id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2),
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

            const response = await fetch(`${apiUrl}/api/analytics/telemetry-bulk`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    sessionId: getStore().currentSessionId || (crypto.randomUUID ? crypto.randomUUID() : 'temp-session'),
                    // Server requires a known mode enum; default queue items
                    // to ACTIVE_REVIEW (the only path that uses this flush).
                    mode: getStore().currentSessionMode || 'ACTIVE_REVIEW',
                    targetSubject: getStore().currentSubject || 'BLENDED',
                    attempts: syncQueue
                })
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
        try {
            const currentUser = auth.currentUser;
            if (currentUser) {
                const token = await currentUser.getIdToken();
                const apiUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';
                await fetch(`${apiUrl}/api/analytics/purge`, {
                    method: 'DELETE',
                    headers: { 'Authorization': `Bearer ${token}` }
                });
            }
            set({ stats: null, syncQueue: [], syncStatus: 'synced' });
        } catch (e) {
            console.error("Purge failed", e);
        }
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