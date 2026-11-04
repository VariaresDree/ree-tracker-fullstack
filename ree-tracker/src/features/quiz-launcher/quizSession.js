// src/features/quiz-launcher/quizSession.js
//
// The list on Library › Imported quizzes: what's saved on this device, plus files
// still being read and any that failed. A plain module store (never src/store:
// this feature stays isolated), so the list doesn't flicker on switching tabs.
import { useSyncExternalStore } from 'react';
import { __clearQuizMemory, carryAttempts, deleteQuiz, getQuiz, getRun, listQuizzes, mergeAttempts, quizIdFor, saveQuiz, saveRun } from './quizStore';
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

/** Parse the bytes and keep them. The same bytes are the same quiz, whatever they're called. */
async function keepQuiz(uid, { buffer, fileName, shared, expectedId }) {
  const result = await parseCaqArchive(buffer);
  const id = await quizIdFor(buffer);
  if (expectedId && id.length === expectedId.length && id !== expectedId) throw new Error('That download didn’t arrive whole. Try again.');
  const kept = await saveQuiz(uid, {
    id,
    fileName,
    addedAt: Date.now(),
    file: new Blob([buffer], { type: 'application/zip' }),
    result,
    shared: shared || (await getQuiz(uid, id))?.shared || null,
  });
  return { id, kept };
}

/**
 * A quiz someone shared, downloaded elsewhere and handed over as bytes. `replaces`
 * is the older version it updates: its scores carry over, and its unfinished run
 * doesn't, since the questions may have changed.
 */
export async function addDownloadedQuiz(uid, { buffer, fileName, shared, replaces }) {
  const { id, kept } = await keepQuiz(uid, { buffer, fileName, shared, expectedId: shared.checksum.slice(0, 32) });
  if (replaces && replaces !== id) {
    await carryAttempts(uid, replaces, id);
    await deleteQuiz(uid, replaces);
  }
  await refreshQuizzes(uid);
  if (!kept) setEntries((entries) => entries.map((e) => (e.id === id ? { ...e, onlyInMemory: true } : e)));
  return id;
}

/** A quiz from a backup: kept if it's new, its scores merged, and its run back if none is here. */
export async function restoreQuiz(uid, { buffer, fileName, addedAt, shared, attempts, run }) {
  const id = await quizIdFor(buffer);
  const existing = await getQuiz(uid, id);
  if (!existing) {
    await saveQuiz(uid, {
      id,
      fileName,
      addedAt,
      file: new Blob([buffer], { type: 'application/zip' }),
      result: await parseCaqArchive(buffer),
      shared: shared || null,
    });
  }
  await mergeAttempts(uid, id, attempts);
  if (run && !(await getRun(uid, id))) await saveRun(uid, id, run);
  return id;
}

/** Read each file on its own, so one bad file doesn't stop the rest. */
export function addQuizFiles(uid, files) {
  files.forEach(async (file) => {
    const tempId = `temp-${nextTempId++}`;
    setEntries((entries) => [{ id: tempId, fileName: file.name, status: 'parsing' }, ...entries]);
    try {
      const { id, kept } = await keepQuiz(uid, { buffer: await file.arrayBuffer(), fileName: file.name });
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
