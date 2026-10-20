// src/hooks/usePomodoroControls.js
// The focus timer's actions, for the controls that drive it (the /focus page,
// the floating pill). Start goes through here so the chime's audio is woken
// inside the click that starts the block: browsers refuse sound that no
// interaction led to (utils/chime).
import { useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useStore } from '../store/useStore';
import { primeChime } from '../utils/chime';

export function usePomodoroControls() {
  const a = useStore(useShallow((s) => ({
    start: s.startPomodoro,
    pause: s.pausePomodoro,
    reset: s.resetPomodoro,
    skip: s.skipPomodoro,
    setMode: s.setPomodoroMode,
    setExamSection: s.setPomodoroExamSection,
    setExamFullBoard: s.setPomodoroExamFullBoard,
    update: s.updatePomodoro,
    setSubject: s.setPomodoroSubject,
  })));

  return useMemo(() => {
    const play = () => { primeChime(); a.start(); };
    return {
      ...a,
      play,
      toggle: () => (useStore.getState().pomodoro.isRunning ? a.pause() : play()),
    };
  }, [a]);
}
