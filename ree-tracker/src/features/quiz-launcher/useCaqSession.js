// src/features/quiz-launcher/useCaqSession.js
//
// Session state for one CAQ quiz run. Deliberately plain React state, NOT
// Zustand and NOT anything under src/store — that's the whole point of this
// feature. No persistence, no sync, no telemetry write: reloading the tab or
// navigating away during a session loses it, by design (see quizLauncher.
// isolation.test.js, which statically verifies this file never reaches
// useStore/dbQueries/useSimulatorEngine/etc).
//
// Scoring is by option TEXT, not index — the parser already de-duplicates
// byte-identical choices (see caqParser.js), so comparing text here is what
// makes "either copy of a duplicate counts as correct" fall out for free,
// with no special-casing needed at this layer.
import { useCallback, useMemo, useRef, useState } from 'react';

export function useCaqSession(questions) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState({}); // questionId -> selected option text
  const [finished, setFinished] = useState(false);
  const [elapsedMs, setElapsedMs] = useState(0);
  // Always overwritten by startClock before being read, so no initial
  // Date.now() call is needed here — that read during render is impure and
  // would make this hook's first render non-idempotent for no benefit.
  const startedAtRef = useRef(null);
  const intervalRef = useRef(null);

  // Count-up clock. Untimed by design — the source format carries no real
  // per-question timing (every times.inf value observed across real sample
  // files was 0), so there is nothing authentic to count DOWN from.
  const startClock = useCallback(() => {
    if (intervalRef.current) return;
    startedAtRef.current = Date.now() - elapsedMs;
    intervalRef.current = setInterval(() => {
      setElapsedMs(Date.now() - startedAtRef.current);
    }, 1000);
  }, [elapsedMs]);

  const stopClock = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const currentQuestion = questions[currentIndex] || null;

  const selectAnswer = useCallback((questionId, optionText) => {
    setAnswers((prev) => ({ ...prev, [questionId]: optionText }));
  }, []);

  const goTo = useCallback((index) => {
    setCurrentIndex(Math.max(0, Math.min(questions.length - 1, index)));
  }, [questions.length]);

  const next = useCallback(() => goTo(currentIndex + 1), [goTo, currentIndex]);
  const prev = useCallback(() => goTo(currentIndex - 1), [goTo, currentIndex]);

  const submit = useCallback(() => {
    stopClock();
    setFinished(true);
  }, [stopClock]);

  const score = useMemo(() => {
    let correct = 0;
    for (const q of questions) {
      if (answers[q.id] != null && answers[q.id] === q.answer) correct += 1;
    }
    return { correct, total: questions.length, answered: Object.keys(answers).length };
  }, [questions, answers]);

  return {
    currentQuestion,
    currentIndex,
    total: questions.length,
    answers,
    selectAnswer,
    goTo,
    next,
    prev,
    finished,
    submit,
    elapsedMs,
    startClock,
    stopClock,
    score,
  };
}
