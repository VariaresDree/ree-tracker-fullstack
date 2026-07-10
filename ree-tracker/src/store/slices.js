// Selector hooks layered on top of the monolithic useStore. Each hook returns
// only the keys its caller actually reads, and uses `useShallow` so a state
// update outside that slice never re-renders the component.
//
// Usage:
//   const { stats, setStats } = useTelemetrySlice();
//
// This costs nothing at runtime vs the direct destructured pattern and cuts
// dashboard-wide re-renders meaningfully when stats updates fire.

import { useShallow } from 'zustand/react/shallow';
import { useStore } from './useStore';

// --- Auth / admin ---
export const useAuthSlice = () =>
  useStore(useShallow((s) => ({ isAdmin: s.isAdmin, setIsAdmin: s.setIsAdmin })));

// --- Telemetry & stats ---
export const useTelemetrySlice = () =>
  useStore(
    useShallow((s) => ({
      stats: s.stats,
      setStats: s.setStats,
      saveExamConfig: s.saveExamConfig,
      syncStatus: s.syncStatus,
      syncQueue: s.syncQueue,
      flushQueueToCloud: s.flushQueueToCloud,
      resetDailyQuotas: s.resetDailyQuotas,
      purgeAnalytics: s.purgeAnalytics,
      // Event-driven analytics: per-answer entry point + manual debounce
      // trigger. Used by Active Review / Board Sim / Gauntlet / Combat to
      // fire optimistic UI updates + debounced backend sync.
      recordAttempt: s.recordAttempt,
      scheduleDebouncedFlush: s.scheduleDebouncedFlush,
      // Session lifecycle — bracket each quiz surface so the backend can
      // upsert the ExamSession row before persisting attempts.
      startSession: s.startSession,
      endSession: s.endSession,
      currentSessionId: s.currentSessionId,
      currentSessionMode: s.currentSessionMode,
      currentSubject: s.currentSubject,
    })),
  );

// --- Session-scope: review/pomodoro state ---
export const useSessionSlice = () =>
  useStore(
    useShallow((s) => ({
      pomodoro: s.pomodoro,
      updatePomodoro: s.updatePomodoro,
      switchPomodoroMode: s.switchPomodoroMode,
    })),
  );

// --- TOS / metadata ---
export const useTOSSlice = () =>
  useStore(useShallow((s) => ({ dynamicTOS: s.dynamicTOS, setDynamicTOS: s.setDynamicTOS })));

// --- Feature flags (Phase 4.1) ---
// Missing keys read as disabled. Usage: const battlesV2 = useFlag('battles-v2');
export const useFlag = (key) => useStore((s) => s.featureFlags?.[key]?.enabled ?? false);
export const useFlagsSlice = () =>
  useStore(useShallow((s) => ({ featureFlags: s.featureFlags, setFeatureFlags: s.setFeatureFlags })));

// --- Theme / preferences ---
export const useThemeSlice = () =>
  useStore(useShallow((s) => ({ theme: s.theme, setTheme: s.setTheme })));

// --- UI shell (sidebar + theme read) ---
// Used by the always-mounted MainLayout so per-answer stats/syncQueue pushes
// during a session don't re-render the entire app shell.
export const useUISlice = () =>
  useStore(
    useShallow((s) => ({
      isSidebarOpen: s.isSidebarOpen,
      setSidebarOpen: s.setSidebarOpen,
      isSidebarCollapsed: s.isSidebarCollapsed,
      toggleSidebarCollapse: s.toggleSidebarCollapse,
      theme: s.theme,
    })),
  );
