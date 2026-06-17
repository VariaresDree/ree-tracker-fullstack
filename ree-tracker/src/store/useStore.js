// src/store/useStore.js
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { auth } from '../config/firebaseDb';

export const useStore = create(
  persist(
    (set, get) => ({
      // ==========================================
      // 1. TELEMETRY & STATS SLICE
      // ==========================================
      stats: null,
      syncStatus: 'synced', 
      syncQueue: [],        

      setStats: (newStats) => set({ stats: newStats }),

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
        const { syncQueue, syncStatus } = get();
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
                    sessionId: get().currentSessionId || (crypto.randomUUID ? crypto.randomUUID() : 'temp-session'),
                    mode: get().currentSessionMode || 'ADAPTIVE_QUIZ',
                    targetSubject: get().currentSubject || 'BLENDED',
                    attempts: syncQueue 
                })
            });

            if (!response.ok) throw new Error("Backend synchronization transaction rejected.");
            
            const serverResult = await response.json();

            set({
                syncQueue: [],
                syncStatus: 'synced',
                stats: {
                    ...get().stats,
                    thetaRating: serverResult.updatedTheta,
                    cloudTimestamp: Date.now()
                }
            });
        } catch (error) {
            console.error("[SYNC FATAL ERROR] Processing batch data failed:", error);
            set({ syncStatus: 'error' });
        }
      },

      // CRITICAL FIX: Ensure Daily Quotas can be reset locally by the UI
      resetDailyQuotas: () => set((state) => {
        if (!state.stats) return state;
        return {
            stats: {
                ...state.stats,
                dailyMath: 0,
                dailyESAS: 0,
                dailyEE: 0
            }
        };
      }),

      // CRITICAL FIX: Ping PostgreSQL to purge all analytic history securely
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

      // ==========================================
      // 2. POMODORO PROTOCOL SLICE
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
      // 3. UI & UX STATE SLICE 
      // ==========================================
      dynamicTOS: {
        'Mathematics': [
          'Algebra & Complex Numbers', 'Trigonometry', 'Analytic Geometry', 
          'Probability & Statistics', 'Calculus 1', 'Calculus 2', 
          'Engineering Data Analytics', 'Differential Equations', 'Numerical Methods & Analysis'
        ],
        'ESAS': [
          'Chemistry for Engineers', 'Physics for Engineers', 'Computer Programming', 
          'Microprocessor Systems and Logic Circuits', 'Material Science', 
          'Environmental Science & Engineering', 'Fluid Mechanics', 
          'Fundamentals of Deformable Bodies', 'Basic Thermodynamics', 
          'EE Laws, Codes, & Professional Ethics', 'Engineering Economics', 
          'Technopreneurship & Project Management'
        ],
        'EE': [
          'Electromagnetism', 'Electric Circuits 1', 'Electric Circuits 2', 
          'Fundamentals of Electronic Communications', 'Electronics 1 and 2', 
          'Electrical Apparatus & Devices', 'Industrial Electronics', 
          'Electrical Machinery 1', 'Electrical Machinery 2', 'Instrumentation & Control', 
          'Feedback Control Systems', 'Electrical System & Illumination Design', 
          'Power Plant Engineering', 'Distribution Systems & Substation Design', 
          'Power System Analysis'
        ]
      },

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
      partialize: (state) => ({
        syncQueue: state.syncQueue,
        stats: state.stats,
        pomodoro: state.pomodoro,
        theme: state.theme
      })
    }
  )
);