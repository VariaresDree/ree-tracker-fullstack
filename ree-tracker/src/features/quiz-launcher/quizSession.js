// src/features/quiz-launcher/quizSession.js
//
// The imported quizzes, for this tab only: the files loaded and the one being
// run. A plain module store (never src/store — this feature stays isolated,
// and nothing here is persisted), so:
//   - the list survives switching Library tabs (it was component state, gone
//     the moment you looked at Formula cards);
//   - a run can live on its own route (/library/quiz) with the exam layout,
//     instead of an exam layout nested inside the app shell's <main>.
// Reloading the tab still discards everything, as the picker says.
import { useSyncExternalStore } from 'react';

let state = { entries: [], activeId: null };
const listeners = new Set();
const emit = () => listeners.forEach((l) => l());

const subscribe = (l) => { listeners.add(l); return () => listeners.delete(l); };
const getState = () => state;

export function setQuizEntries(update) {
  const entries = typeof update === 'function' ? update(state.entries) : update;
  const activeId = entries.some((e) => e.id === state.activeId) ? state.activeId : null;
  state = { entries, activeId };
  emit();
}

export function setActiveQuiz(id) {
  state = { ...state, activeId: id };
  emit();
}

/** The loaded files and the active run's entry (null when none). */
export function useQuizSession() {
  const s = useSyncExternalStore(subscribe, getState, getState);
  return { entries: s.entries, active: s.entries.find((e) => e.id === s.activeId && e.status === 'ready') || null };
}

/** Test seam. */
export function __resetQuizSession() {
  state = { entries: [], activeId: null };
  emit();
}
