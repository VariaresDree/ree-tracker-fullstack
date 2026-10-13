// Selector hooks layered on top of the monolithic useStore. Each hook returns
// only the keys its caller actually reads, and uses `useShallow` so a state
// update outside that slice never re-renders the component.
//
// Usage:
//   const { recordAttempt, startSession } = useEngineActionsSlice();
//
// This costs nothing at runtime vs the direct destructured pattern and cuts
// dashboard-wide re-renders meaningfully when stats updates fire.

import { useShallow } from 'zustand/react/shallow';
import { useStore } from './useStore';

// --- Session-scope: review/pomodoro state ---
export const useSessionSlice = () =>
  useStore(
    useShallow((s) => ({
      pomodoro: s.pomodoro,
      updatePomodoro: s.updatePomodoro,
      startPomodoro: s.startPomodoro,
      pausePomodoro: s.pausePomodoro,
      resetPomodoro: s.resetPomodoro,
      switchPomodoroMode: s.switchPomodoroMode,
      setPomodoroSubject: s.setPomodoroSubject,
      pomodoroWidget: s.pomodoroWidget,
      setPomodoroWidget: s.setPomodoroWidget,
    })),
  );

// --- Notifications (local + in-page) ---
export const useNotificationSlice = () =>
  useStore(
    useShallow((s) => ({
      notifications: s.notifications,
      optInEligible: s.optInEligible,
      setNotificationPrefs: s.setNotificationPrefs,
      markOptInPrompted: s.markOptInPrompted,
    })),
  );

// --- TOS / metadata ---
export const useTOSSlice = () =>
  useStore(useShallow((s) => ({ dynamicTOS: s.dynamicTOS, setDynamicTOS: s.setDynamicTOS })));

// --- Session-engine actions (Board Sim / Active Review / Gauntlet hot path) ---
// These engines run the per-answer loop. Subscribing to the WHOLE store made
// them re-render on every recordAttempt() set() and every syncStatus/syncQueue
// flip — ~300-400 forced re-renders of the question + LaTeX tree over one
// 100-item exam, none of which read those keys. Zustand actions are stable
// references and dynamicTOS changes rarely, so useShallow here is effectively
// re-render-free during a session. Read live VALUES (stats) with a separate
// narrow selector where actually needed.
export const useEngineActionsSlice = () =>
  useStore(
    useShallow((s) => ({
      dynamicTOS: s.dynamicTOS,
      setStats: s.setStats,
      recordAttempt: s.recordAttempt,
      scheduleDebouncedFlush: s.scheduleDebouncedFlush,
      queuePendingWrite: s.queuePendingWrite,
      startSession: s.startSession,
      endSession: s.endSession,
    })),
  );

// --- Feature flags (Phase 4.1) ---
// Missing keys read as disabled. Usage: const battlesV2 = useFlag('battles-v2');
export const useFlag = (key) => useStore((s) => s.featureFlags?.[key]?.enabled ?? false);

// --- UI shell (desktop sidebar collapse + theme read) ---
// Used by the always-mounted MainLayout so per-answer stats/syncQueue pushes
// during a session don't re-render the entire app shell.
export const useUISlice = () =>
  useStore(
    useShallow((s) => ({
      isSidebarCollapsed: s.isSidebarCollapsed,
      toggleSidebarCollapse: s.toggleSidebarCollapse,
      theme: s.theme,
    })),
  );
