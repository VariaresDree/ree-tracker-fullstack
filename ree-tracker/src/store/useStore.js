// src/store/useStore.js
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { doc, updateDoc } from 'firebase/firestore';
import { db, auth } from '../config/firebaseDb'; 
import { fetchDynamicTOS } from '../services/dbQueries';
import { TOS as fallbackTOS } from '../config/constants';
import { del } from 'idb-keyval';

let syncTimeout = null;

export const useStore = create(
  persist(
    (set, get) => ({
      // ==========================================
      // 1. TELEMETRY & STATS SLICE
      // ==========================================
      stats: null,
      syncStatus: 'synced', 
      pendingSyncData: null, 
      
      setStats: (newStats) => {
        // Strip out root quotas returned by atomic irtMath to set them correctly
        const { dailyMath, dailyESAS, dailyEE, lastActiveDate, ...restStats } = newStats;
        
        const payload = JSON.parse(JSON.stringify({
          ...restStats,
          localTimestamp: Date.now() 
        }));

        const rootUpdates = {};
        if (dailyMath !== undefined) rootUpdates.dailyMath = dailyMath;
        if (dailyESAS !== undefined) rootUpdates.dailyESAS = dailyESAS;
        if (dailyEE !== undefined) rootUpdates.dailyEE = dailyEE;
        if (lastActiveDate !== undefined) rootUpdates.lastActiveDate = lastActiveDate;

        set({ stats: payload, ...rootUpdates });
        get().triggerAutoSync({ ...payload, ...rootUpdates }); 
      },

      purgeAnalytics: async () => {
        const state = get();
        if (!state.stats) return;

        const uid = auth.currentUser?.uid;
        const today = new Date().toISOString().split('T')[0];

        // Ensure every UI element relying on the matrix is explicitly wiped
        const purgedStats = {
            ...state.stats,
            irt: { theta: 0, standardError: 0.5 },
            history: [],
            thetaHistory: [],
            activityCalendar: {},
            blindSpots: [],
            timeSinks: [],
            topicMastery: {},
            microTopics: {},
            matrix: { hc: 0, hw: 0, lc: 0, lw: 0 }, 
            subjectMastery: { Math: {correct:0, total:0}, ESAS: {correct:0, total:0}, EE: {correct:0, total:0} },
            confidenceTracker: { highCorrect: 0, highWrong: 0, medCorrect: 0, medWrong: 0, lowCorrect: 0, lowWrong: 0 },
            confidenceMatrix: { highCorrect: 0, highWrong: 0, lowCorrect: 0, lowWrong: 0 },
            globalStreak: 0,
            totalAnswered: 0,
            totalCorrect: 0,
            gauntletLevel: 1,
            gauntletLockUntil: null,
            lastActiveDate: today
        };

        const rootUpdates = {
            dailyMath: 0,
            dailyESAS: 0,
            dailyEE: 0,
            lastActiveDate: today
        };

        set({ 
            stats: JSON.parse(JSON.stringify(purgedStats)),
            ...rootUpdates,
            syncStatus: 'syncing'
        });

        try {
            await del('ree_seen_q_ids');
        } catch (e) {
            console.warn("IDB memory wipe skipped.", e);
        }

        if (uid && navigator.onLine) {
            try {
                const docRef = doc(db, 'userData', uid);
                await updateDoc(docRef, { 
                    ...purgedStats, 
                    ...rootUpdates, 
                    cloudTimestamp: Date.now() 
                });

                const leaderRef = doc(db, 'leaderboard', uid);
                await updateDoc(leaderRef, {
                    thetaRating: 0,
                    streak: 0,
                    gauntletLevel: 1,
                    lastActive: today
                });

                set({ syncStatus: 'synced', pendingSyncData: null });
            } catch (error) {
                console.error("Critical Purge Error:", error);
                set({ syncStatus: 'error', pendingSyncData: { ...purgedStats, ...rootUpdates } });
                throw error;
            }
        }
      },

      triggerAutoSync: (updatedStats) => {
        set({ syncStatus: 'syncing' });
        clearTimeout(syncTimeout);
        
        syncTimeout = setTimeout(async () => {
          const uid = auth.currentUser?.uid;
          if (!uid || !navigator.onLine) {
            set({ syncStatus: 'offline_queued', pendingSyncData: updatedStats });
            return;
          }
          try {
            const docRef = doc(db, 'userData', uid);
            await updateDoc(docRef, { ...updatedStats, cloudTimestamp: Date.now() });
            set({ syncStatus: 'synced', pendingSyncData: null });
          } catch (error) {
            console.error("Auto-sync failed:", error);
            set({ syncStatus: 'error', pendingSyncData: updatedStats });
          }
        }, 3000); 
      },

      retrySync: () => {
         const state = get();
         if (state.pendingSyncData && navigator.onLine) {
             get().triggerAutoSync(state.pendingSyncData);
         } else if (navigator.onLine) {
             set({ syncStatus: 'synced' });
         }
      },

      // ==========================================
      // 2. DAILY QUOTA TRACKING SLICE
      // ==========================================
      dailyMath: 0,
      dailyESAS: 0,
      dailyEE: 0,
      lastActiveDate: new Date().toISOString().split('T')[0],

      checkAndResetDailyQuotas: () => set((state) => {
        const today = new Date().toISOString().split('T')[0];
        if (state.lastActiveDate !== today) {
            return { dailyMath: 0, dailyESAS: 0, dailyEE: 0, lastActiveDate: today };
        }
        return {};
      }),

      // CRITICAL FIX: Explicit action that resets AND syncs to Firebase
      resetDailyQuotas: () => {
        const today = new Date().toISOString().split('T')[0];
        const updates = { dailyMath: 0, dailyESAS: 0, dailyEE: 0, lastActiveDate: today };
        set(updates);
        
        const currentStats = get().stats || {};
        get().triggerAutoSync({ ...currentStats, ...updates });
      },

      // ==========================================
      // 3. POMODORO PROTOCOL SLICE
      // ==========================================
      pomodoro: {
        workDuration: 25,
        breakDuration: 5,
        timeLeft: 25 * 60,
        isRunning: false,
        isWork: true,
      },
      
      updatePomodoro: (config) => set((state) => ({
        pomodoro: { ...state.pomodoro, ...config }
      })),
      
      togglePomodoro: () => set((state) => ({
        pomodoro: { ...state.pomodoro, isRunning: !state.pomodoro.isRunning }
      })),
      
      resetPomodoro: () => set((state) => ({
        pomodoro: {
          ...state.pomodoro,
          isRunning: false,
          timeLeft: state.pomodoro.isWork ? state.pomodoro.workDuration * 60 : state.pomodoro.breakDuration * 60
        }
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
          pomodoro: {
            ...p,
            isWork: nextMode,
            timeLeft: nextMode ? p.workDuration * 60 : p.breakDuration * 60,
            isRunning: false
          }
        };
      }),

      // ==========================================
      // 4. UI & UX STATE SLICE 
      // ==========================================
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

      // ==========================================
      // 5. DYNAMIC TOS SLICE
      // ==========================================
      dynamicTOS: fallbackTOS, 
      
      initializeTOS: async () => {
        if (navigator.onLine) {
          const liveTOS = await fetchDynamicTOS();
          if (liveTOS) {
            const { lastUpdated, ...cleanTOS } = liveTOS;
            if (cleanTOS.Mathematics && !cleanTOS.Mathematics.includes('Vector Analysis')) {
                cleanTOS.Mathematics.push('Vector Analysis');
            }
            set({ dynamicTOS: cleanTOS });
          }
        }
      },
      
      setDynamicTOS: (updatedTOS) => set({ dynamicTOS: updatedTOS })

    }),
    {
      name: 'ree-tracker-storage',
      partialize: (state) => ({
        stats: state.stats,
        dailyMath: state.dailyMath,
        dailyESAS: state.dailyESAS,
        dailyEE: state.dailyEE,
        lastActiveDate: state.lastActiveDate,
        dynamicTOS: state.dynamicTOS, 
        pomodoro: {
          workDuration: state.pomodoro.workDuration,
          breakDuration: state.pomodoro.breakDuration,
          isWork: state.pomodoro.isWork,
          timeLeft: state.pomodoro.timeLeft || (state.pomodoro.isWork ? state.pomodoro.workDuration * 60 : state.pomodoro.breakDuration * 60)
        }
      })
    }
  )
);

if (typeof window !== 'undefined') {
    window.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') {
            const state = useStore.getState();
            if (state.syncStatus === 'syncing' && state.stats && navigator.onLine) {
                const uid = auth.currentUser?.uid;
                if (uid) {
                    const docRef = doc(db, 'userData', uid);
                    updateDoc(docRef, { ...state.stats, cloudTimestamp: Date.now() })
                        .catch(err => console.error("Emergency sync failed", err));
                }
            }
        }
    });
}