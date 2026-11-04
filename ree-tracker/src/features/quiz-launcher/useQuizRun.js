// src/features/quiz-launcher/useQuizRun.js
//
// A run in progress: plain React state, saved on the device as it changes so a
// closed tab can pick up where it was. Never Zustand and never src/store (see
// quizLauncher.isolation.test.js): nothing here reaches your progress.
import { useCallback, useEffect, useMemo, useState } from 'react';
import { runQuestions, scoreRun } from './quizRun';

export function useQuizRun({ initialRun, questions, onSave, onFinish }) {
  const [run, setRun] = useState(initialRun);
  // Time spent before this visit, and when this visit began. Time away isn't
  // counted, unless the run has a deadline, which keeps running like a real clock.
  const [openedAt] = useState(() => Date.now());
  const elapsedNow = useCallback(() => initialRun.elapsedMs + (Date.now() - openedAt), [initialRun.elapsedMs, openedAt]);

  const shown = useMemo(() => runQuestions(run, questions), [run, questions]);
  const score = useMemo(() => scoreRun(run, shown), [run, shown]);

  useEffect(() => {
    onSave(run.finished ? run : { ...run, elapsedMs: elapsedNow() });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- saves when the run changes, not when the callbacks do
  }, [run]);

  const select = useCallback((id, option) => setRun((r) => ({ ...r, answers: { ...r.answers, [id]: option } })), []);
  const goTo = useCallback((index) => setRun((r) => ({ ...r, index: Math.max(0, Math.min(r.items.length - 1, index)) })), []);
  const toggleMark = useCallback((id) => setRun((r) => ({
    ...r,
    marked: r.marked.includes(id) ? r.marked.filter((m) => m !== id) : [...r.marked, id],
  })), []);

  const finish = useCallback(({ timedOut = false } = {}) => {
    if (run.finished) return;
    const elapsedMs = elapsedNow();
    setRun({ ...run, finished: true, timedOut, elapsedMs, index: 0 });
    onFinish({ at: Date.now(), mode: run.setup.mode, correct: score.correct, total: score.total, answered: score.answered, pct: score.pct, elapsedMs, timedOut });
  }, [run, score, elapsedNow, onFinish]);

  return { run, shown, score, select, goTo, toggleMark, finish, openedAt };
}
