// src/pages/Focus.jsx
// /focus: the full-screen focus timer, outside the app shell (beside
// /simulator in App.jsx), so nothing but the timer is on screen. MainLayout
// isn't mounted here, so this page carries what it would: the theme and
// background (useAppearance) and the timer's ONE owner clock (completion,
// chime, sending logged blocks). A paper exam keeps the screen awake.
//
// `?mode=exam&section=EE` (the exam export's "Time this paper") sets up a
// paper exam, but only when no block is in progress: a running block is never
// thrown away by a link. Close returns to the page the timer was opened from.
import { useEffect, useRef } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useStore } from '../store/useStore';
import { usePomodoroClock } from '../hooks/usePomodoroClock';
import { usePomodoroControls } from '../hooks/usePomodoroControls';
import { useAppearance } from '../hooks/useAppearance';
import { EXAM_SECTIONS, isInProgress } from '../utils/pomodoroLogic';
import { primeChime } from '../utils/chime';
import FocusView from '../features/focus/FocusView';
import { useWakeLock } from '../features/focus/useWakeLock';

export default function Focus() {
  useAppearance();
  const { pomodoro, remaining, duration, progress } = usePomodoroClock({ owner: true });
  const controls = usePomodoroControls();
  const navigate = useNavigate();
  const location = useLocation();
  const [params] = useSearchParams();
  useWakeLock(pomodoro.isRunning && pomodoro.mode === 'exam');

  // The link's request, read once.
  const handled = useRef(false);
  useEffect(() => {
    if (handled.current) return;
    handled.current = true;
    if (params.get('mode') !== 'exam') return;
    const section = params.get('section');
    if (isInProgress(useStore.getState().pomodoro)) {
      toast('A block is in progress. Reset it to time the paper.');
    } else {
      controls.setMode('exam');
      if (EXAM_SECTIONS.includes(section)) controls.setExamSection(section);
    }
    // Done with: a reload shouldn't ask again.
    navigate(location.pathname, { replace: true, state: location.state });
  }, [params, controls, navigate, location.pathname, location.state]);

  // Back when the timer was opened from a page of the app; to the page it
  // was opened from (or Today) when it was opened on its own (a notification,
  // a bookmark), where Back would leave the app. The router's own history
  // index says which (the query clean-up above replaces, so it doesn't count).
  const exit = () => {
    const idx = window.history.state?.idx;
    const canGoBack = typeof idx === 'number' ? idx > 0 : location.key !== 'default';
    if (canGoBack) navigate(-1);
    else navigate(location.state?.from || '/', { replace: true });
  };

  return (
    // Any touch or click wakes the chime's audio, so a block that ends after
    // a reload still sounds (utils/chime).
    <div onPointerDownCapture={primeChime}>
      <FocusView
        pomodoro={pomodoro}
        remaining={remaining}
        duration={duration}
        progress={progress}
        controls={controls}
        onExit={exit}
      />
    </div>
  );
}
