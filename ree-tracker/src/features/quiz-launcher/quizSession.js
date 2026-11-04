// src/features/quiz-launcher/quizSession.js
//
// The list on Library › Imported quizzes: what's saved on this device, plus files
// still being read and any that failed. A plain module store (never src/store:
// this feature stays isolated), so the list doesn't flicker on switching tabs.
import { useSyncExternalStore } from 'react';
import { __clearQuizMemory, deleteQuiz, listQuizzes, quizIdFor, saveQuiz } from './quizStore';
import { parseCaqArchive } from './caqParser';

let state = { entries: [], loaded: false };
const listeners = new Set();
const emit = () => listeners.forEach((l) => l());
const subscribe = (l) => { listeners.add(l); return () => listeners.delete(l); };
const getState = () => state;
const setEntries = (update) => {
  state = { ...state, entries: update(state.entries) };
  emit();
};

let nextTempId = 0;

/** Reload the list from the device, keeping files still being read or refused. */
export async function refreshQuizzes(uid) {
  const saved = await listQuizzes(uid);
  const ready = saved.map((q) => ({ ...q, status: 'ready' }));
  state = {
    entries: [...state.entries.filter((e) => e.status !== 'ready'), ...ready],
    loaded: true,
  };
  emit();
}

/** Read each file on its own, so one bad file doesn't stop the rest. */
export function addQuizFiles(uid, files) {
  files.forEach(async (file) => {
    const tempId = `temp-${nextTempId++}`;
    setEntries((entries) => [{ id: tempId, fileName: file.name, status: 'parsing' }, ...entries]);
    try {
      const buffer = await file.arrayBuffer();
      const result = await parseCaqArchive(buffer);
      const id = await quizIdFor(buffer);
      const kept = await saveQuiz(uid, {
        id,
        fileName: file.name,
        addedAt: Date.now(),
        file: new Blob([buffer], { type: 'application/zip' }),
        result,
      });
      setEntries((entries) => entries.filter((e) => e.id !== tempId));
      await refreshQuizzes(uid);
      if (!kept) setEntries((entries) => entries.map((e) => (e.id === id ? { ...e, onlyInMemory: true } : e)));
    } catch (err) {
      setEntries((entries) => entries.map((e) => (
        e.id === tempId ? { ...e, status: 'error', error: err?.message || "This doesn't look like a valid quiz file." } : e
      )));
    }
  });
}

export async function removeQuiz(uid, id) {
  setEntries((entries) => entries.filter((e) => e.id !== id));
  await deleteQuiz(uid, id);
}

export const dismissQuizError = (id) => setEntries((entries) => entries.filter((e) => e.id !== id));

export const useQuizSession = () => useSyncExternalStore(subscribe, getState, getState);

/** Test seam. */
export function __resetQuizSession() {
  state = { entries: [], loaded: false };
  __clearQuizMemory();
  emit();
}
